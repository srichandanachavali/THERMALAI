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
]


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
    }

    df = pd.DataFrame([features])

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
