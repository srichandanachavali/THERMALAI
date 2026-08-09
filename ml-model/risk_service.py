import logging
import pickle

import numpy as np
import pandas as pd

from config import FEATURES, ORIGINAL_FEATURES, LSTM_SEQUENCE_FIELDS, SEQUENCE_LENGTH

logger = logging.getLogger('thermalai.ml')

# Per-reactor rolling sequence buffer for the LSTM path. Each reading appends
# a 10-field vector (5 original + 5 IEC 61511 sensors); trimmed to
# SEQUENCE_LENGTH entries. Kept here so routes_risk and app.py share one store.
reactor_buffers = {}


def lstm_sequence_vector(reading):
    """Build the per-reading vector in LSTM_SEQUENCE_FIELDS order (10 fields)."""
    temp = reading['temperature']
    values = {
        'temperature': temp,
        'pressure': reading['pressure'],
        'reaction_rate': reading.get('reaction_rate', 0.5),
        'cooling_efficiency': reading.get('cooling_efficiency', 0.5),
        'temp_rate_of_change': reading.get('temp_rate_of_change', 0),
        'flow_rate': reading.get('flow_rate', 150.0),
        'material_level': reading.get('material_level', 75.0),
        'gas_concentration': reading.get('gas_concentration', 0.0),
        'ph_level': reading.get('ph_level', 7.0),
        'emissions_co2_ppm': reading.get('emissions_co2_ppm', 400.0),
    }
    return [values[f] for f in LSTM_SEQUENCE_FIELDS]


def update_sequence_buffer(reactor_id, reading):
    """Append a reading to the reactor's sequence buffer, trimming the tail."""
    buf = reactor_buffers.setdefault(reactor_id, [])
    buf.append(lstm_sequence_vector(reading))
    if len(buf) > SEQUENCE_LENGTH:
        del buf[:-SEQUENCE_LENGTH]
    return buf

# RF model is lazy-loaded on first request so the app starts instantly.
# LSTM removed — tensorflow-cpu is too large for free-tier deployment.
model = None
explainer = None


def load_models():
    global model, explainer
    if model is not None:
        return
    with open('saved-models/rf_model.pkl', 'rb') as f:
        model = pickle.load(f)
    try:
        import shap
        explainer = shap.TreeExplainer(model)
    except ImportError:
        explainer = None
    print("✅ RF model loaded!")


def build_feature_vector(reading):
    """Return the ordered feature vector the RF expects (config.FEATURES).

    Mirrors the engineering in calculate_risk_score so SHAP attributions
    align with the exact inputs the model saw at train time.
    """
    temp = reading['temperature']
    pressure = reading['pressure']
    cooling = reading['cooling_efficiency']
    values = [
        temp, pressure, reading.get('reaction_rate', 0.5), cooling,
        reading.get('temp_rate_of_change', 0),
        reading.get('temp_rolling_avg', temp),
        reading.get('pressure_rolling_avg', pressure),
        reading.get('temp_acceleration', 0),
        round(pressure / temp, 4),
        round((1 - cooling) * temp, 2),
        # IEC 61511 sensor additions (defaulted so old callers keep working)
        reading.get('flow_rate', 150.0),
        reading.get('material_level', 75.0),
        reading.get('gas_concentration', 0.0),
        reading.get('ph_level', 7.0),
        reading.get('emissions_co2_ppm', 400.0),
    ]
    return values


def shap_top_drivers(reading):
    """Return (top_drivers, explanation_confidence) using SHAP values.

    Uses the predicted class's attributions so the explanation matches the
    decision the model actually made.
    """
    if explainer is None:
        return [], 'medium'
    engineered = build_feature_vector(reading)
    # Probe the full 15-feature vector; fall back to the trained 10 columns if
    # the loaded model hasn't been retrained yet.
    try:
        X = np.array([engineered])
        model.predict(X)
        active_features = FEATURES
    except ValueError:
        X = np.array([engineered[:len(ORIGINAL_FEATURES)]])
        active_features = ORIGINAL_FEATURES
    pred = model.predict(X)[0]
    class_idx = list(model.classes_).index(pred)
    shap_values = explainer.shap_values(X)
    # Multiclass RF: newer shap returns a single (samples, features, classes)
    # array; older returns a list (one array per class). Normalize to the
    # predicted class's per-feature contributions.
    if isinstance(shap_values, list):
        vals = np.asarray(shap_values[class_idx][0])
    else:
        sv = np.asarray(shap_values)
        if sv.ndim == 3:
            vals = sv[0, :, class_idx]
        else:
            vals = sv[0]
    top = sorted(zip(active_features, vals), key=lambda x: abs(x[1]), reverse=True)[:3]
    proba = model.predict_proba(X)[0]
    confidence = 'high' if max(proba) > 0.7 else 'medium'
    drivers = []
    for rank, (name, contribution) in enumerate(top, start=1):
        label = name.replace('_', ' ').title()
        direction = 'increasing' if contribution >= 0 else 'decreasing'
        current_value = engineered[active_features.index(name)]
        drivers.append({
            'sensor': name,
            'contribution': round(float(contribution), 4),
            'direction': direction,
            'current_value': round(float(current_value), 2),
            'human_readable': (
                f"{label} is the {rank}{_ordinal(rank)} strongest driver "
                f"(current {current_value:.2f}) pushing risk "
                f"{'up' if direction == 'increasing' else 'down'}"
            ),
        })
    return drivers, confidence


def _ordinal(n):
    if 10 <= n % 100 <= 20:
        return 'th'
    return {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')


def calculate_risk_score(reading):
    temp = reading['temperature']
    pressure = reading['pressure']
    cooling = reading['cooling_efficiency']
    features = {
        'temperature': temp, 'pressure': pressure,
        'reaction_rate': reading.get('reaction_rate', 0.5),
        'cooling_efficiency': cooling,
        'temp_rate_of_change': reading.get('temp_rate_of_change', 0),
        'temp_rolling_avg': reading.get('temp_rolling_avg', temp),
        'pressure_rolling_avg': reading.get('pressure_rolling_avg', pressure),
        'temp_acceleration': reading.get('temp_acceleration', 0),
        'pressure_temp_ratio': round(pressure / temp, 4),
        'cooling_danger': round((1 - cooling) * temp, 2),
        # IEC 61511 sensor additions (defaulted so old callers keep working)
        'flow_rate': reading.get('flow_rate', 150.0),
        'material_level': reading.get('material_level', 75.0),
        'gas_concentration': reading.get('gas_concentration', 0.0),
        'ph_level': reading.get('ph_level', 7.0),
        'emissions_co2_ppm': reading.get('emissions_co2_ppm', 400.0)
    }
    df = pd.DataFrame([features])
    try:
        prediction = model.predict(df)[0]
        probabilities = model.predict_proba(df)[0]
    except ValueError:
        # Loaded model is still trained on the original 10 features — score on
        # those to keep inference working until the model is retrained.
        df = df[ORIGINAL_FEATURES]
        prediction = model.predict(df)[0]
        probabilities = model.predict_proba(df)[0]
    classes = model.classes_
    prob_dict = dict(zip(classes, probabilities))
    safe_prob = prob_dict.get('SAFE', 0)
    warning_prob = prob_dict.get('WARNING', 0)
    critical_prob = prob_dict.get('CRITICAL', 0)
    risk_score = round((warning_prob * 50) + (critical_prob * 100), 1)
    risk_score = min(100, max(0, risk_score))
    if risk_score < 30:
        status = 'SAFE'
    elif risk_score < 70:
        status = 'WARNING'
    else:
        status = 'CRITICAL'
    return {
        'risk_score': risk_score, 'status': status, 'prediction': prediction,
        'probabilities': {
            'safe': round(safe_prob * 100, 1),
            'warning': round(warning_prob * 100, 1),
            'critical': round(critical_prob * 100, 1)
        }
    }


def parameter_alerts(reading):
    """IEC 61511 safety checks for the 5 mandatory sensor additions.

    Returns a list of {param, value, severity, reason} for any sensor outside
    its safe operating envelope; empty list means all within range.
    """
    alerts = []
    flow = reading.get('flow_rate', 150.0)
    level = reading.get('material_level', 75.0)
    gas = reading.get('gas_concentration', 0.0)
    ph = reading.get('ph_level', 7.0)
    co2 = reading.get('emissions_co2_ppm', 400.0)

    if flow < 10:
        alerts.append({'param': 'flow_rate', 'value': flow, 'severity': 'WARNING',
                       'reason': 'Low coolant flow — heat removal compromised'})
    elif flow > 480:
        alerts.append({'param': 'flow_rate', 'value': flow, 'severity': 'WARNING',
                       'reason': 'High flow rate — check for pipe surge'})

    if level < 5:
        alerts.append({'param': 'material_level', 'value': level, 'severity': 'CRITICAL',
                       'reason': 'Tank near empty — reaction starvation risk'})
    elif level > 95:
        alerts.append({'param': 'material_level', 'value': level, 'severity': 'WARNING',
                       'reason': 'Tank near full — overflow risk'})

    if gas > 500:
        alerts.append({'param': 'gas_concentration', 'value': gas, 'severity': 'CRITICAL',
                       'reason': 'Hydrogen above abort threshold (500 ppm) — auto-abort'})
    elif gas > 25:
        alerts.append({'param': 'gas_concentration', 'value': gas, 'severity': 'CRITICAL',
                       'reason': 'Toxic gas above safe threshold (25 ppm) — evacuate'})

    if ph < 4:
        alerts.append({'param': 'ph_level', 'value': ph, 'severity': 'CRITICAL',
                       'reason': 'Runaway acidification — below safe pH floor (4)'})
    elif ph > 10:
        alerts.append({'param': 'ph_level', 'value': ph, 'severity': 'CRITICAL',
                       'reason': 'Strongly caustic — above safe pH ceiling (10)'})

    if co2 > 4000:
        alerts.append({'param': 'emissions_co2_ppm', 'value': co2, 'severity': 'CRITICAL',
                       'reason': 'Stack CO₂ far above limit — vent / scrubber fault'})
    elif co2 > 2500:
        alerts.append({'param': 'emissions_co2_ppm', 'value': co2, 'severity': 'WARNING',
                       'reason': 'Elevated stack CO₂ — check vent scrubber'})

    return alerts
