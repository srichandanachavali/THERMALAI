import logging
import pickle

import numpy as np
import pandas as pd

from config import FEATURES, ORIGINAL_FEATURES

logger = logging.getLogger('thermalai.ml')

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
