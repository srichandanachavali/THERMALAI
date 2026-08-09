"""
risk_engine.py — Pure scoring logic for ThermalAI.

Provides calculate_risk_score(reading, model) given a sensor reading dict and
a pre-loaded sklearn RandomForestClassifier. The caller is responsible for
loading the model; this module never touches the filesystem.

Used as a reference implementation. Production scoring runs inside app.py
via its own calculate_risk_score that uses the module-level lazy-loaded model.
"""

import pandas as pd

FEATURES = [
    'temperature',
    'pressure',
    'reaction_rate',
    'cooling_efficiency',
    'temp_rate_of_change',
    'temp_rolling_avg',
    'pressure_rolling_avg',
    'temp_acceleration',
    'pressure_temp_ratio',
    'cooling_danger',
    'flow_rate',
    'material_level',
    'gas_concentration',
    'ph_level',
    'emissions_co2_ppm',
]

# Columns existing trained artifacts expect; used when a model rejects the
# full 15-feature vector (not yet retrained).
ORIGINAL_FEATURES = FEATURES[:10]


def calculate_risk_score(reading, model):
    """
    Score a single reactor reading against a pre-loaded RF model.

    Args:
        reading: dict with at minimum temperature, pressure, cooling_efficiency.
                 All other FEATURES default gracefully if absent.
        model:   fitted sklearn RandomForestClassifier with classes_
                 ['SAFE', 'WARNING', 'CRITICAL'].

    Returns:
        dict with keys: risk_score (float 0-100), status (str),
                        prediction (str), probabilities (dict).
    """
    temp = reading['temperature']
    pressure = reading['pressure']
    cooling = reading['cooling_efficiency']

    features = {
        'temperature': temp,
        'pressure': pressure,
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
        'emissions_co2_ppm': reading.get('emissions_co2_ppm', 400.0),
    }

    try:
        df = pd.DataFrame([features])
        prediction = model.predict(df)[0]
    except ValueError:
        # Loaded model is still trained on the original 10 features — score on
        # those to keep inference working until the model is retrained.
        df = pd.DataFrame([features])[ORIGINAL_FEATURES]
        prediction = model.predict(df)[0]
    probabilities = model.predict_proba(df)[0]
    prob_dict = dict(zip(model.classes_, probabilities))

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
        'risk_score': risk_score,
        'status': status,
        'prediction': prediction,
        'probabilities': {
            'safe': round(safe_prob * 100, 1),
            'warning': round(warning_prob * 100, 1),
            'critical': round(critical_prob * 100, 1),
        },
    }


def parameter_alerts(reading):
    """
    IEC 61511 parameter safety checks for the 5 mandatory sensor additions.

    Returns a list of dicts {param, value, severity, reason} for any sensor
    outside its safe operating envelope. Empty list means all within range.
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
