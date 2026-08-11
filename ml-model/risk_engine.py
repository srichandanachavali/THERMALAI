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
                        prediction (str), probabilities (dict), parameter_alerts (list).
    """
    temp = float(reading.get('temperature', 25.0))
    pressure = float(reading.get('pressure', 1.0))
    cooling = float(reading.get('cooling_efficiency', 1.0))

    pressure_temp_ratio = round(pressure / temp, 4) if temp != 0 else 0.0

    features = {
        'temperature': temp,
        'pressure': pressure,
        'reaction_rate': reading.get('reaction_rate', 0.5),
        'cooling_efficiency': cooling,
        'temp_rate_of_change': reading.get('temp_rate_of_change', 0),
        'temp_rolling_avg': reading.get('temp_rolling_avg', temp),
        'pressure_rolling_avg': reading.get('pressure_rolling_avg', pressure),
        'temp_acceleration': reading.get('temp_acceleration', 0),
        'pressure_temp_ratio': pressure_temp_ratio,
        'cooling_danger': round((1 - cooling) * temp, 2),
        # IEC 61511 sensor additions
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
        # Loaded model is still trained on original 10 features
        df = pd.DataFrame([features])[ORIGINAL_FEATURES]
        prediction = model.predict(df)[0]

    probabilities = model.predict_proba(df)[0]
    prob_dict = dict(zip(model.classes_, probabilities))

    safe_prob = prob_dict.get('SAFE', 0)
    warning_prob = prob_dict.get('WARNING', 0)
    critical_prob = prob_dict.get('CRITICAL', 0)

    risk_score = round((warning_prob * 50) + (critical_prob * 100), 1)

    # Check IEC 61511 rule alerts
    alerts = parameter_alerts(reading)

    # Apply safety floor overrides if rule alerts breach critical limits
    has_critical_alert = any(a['severity'] == 'CRITICAL' for a in alerts)
    has_warning_alert = any(a['severity'] == 'WARNING' for a in alerts)

    if has_critical_alert:
        risk_score = max(risk_score, 75.0)
    elif has_warning_alert:
        risk_score = max(risk_score, 45.0)

    risk_score = min(100.0, max(0.0, risk_score))

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
        'parameter_alerts': alerts,
    }


def parameter_alerts(reading):
    """
    IEC 61511 parameter safety checks for the 5 mandatory sensor additions.

    Returns a list of dicts {param, value, severity, reason} for any sensor
    outside its safe operating envelope. Empty list means all within range.
    """
    alerts = []
    flow = float(reading.get('flow_rate', 150.0))
    level = float(reading.get('material_level', 75.0))
    gas = float(reading.get('gas_concentration', 0.0))
    ph = float(reading.get('ph_level', 7.0))
    co2 = float(reading.get('emissions_co2_ppm', 400.0))

    # Flow Rate Checks
    if flow < 10:
        alerts.append({
            'param': 'flow_rate',
            'value': flow,
            'severity': 'WARNING',
            'reason': 'Low coolant flow — heat removal compromised',
        })
    elif flow > 480:
        alerts.append({
            'param': 'flow_rate',
            'value': flow,
            'severity': 'WARNING',
            'reason': 'High flow rate — check for pipe surge',
        })

    # Material Level Checks
    if level < 5:
        alerts.append({
            'param': 'material_level',
            'value': level,
            'severity': 'CRITICAL',
            'reason': 'Tank near empty — reaction starvation risk',
        })
    elif level > 95:
        alerts.append({
            'param': 'material_level',
            'value': level,
            'severity': 'WARNING',
            'reason': 'Tank near full — overflow risk',
        })

    # Gas Concentration Checks (Ordered High to Low)
    if gas >= 500:
        alerts.append({
            'param': 'gas_concentration',
            'value': gas,
            'severity': 'CRITICAL',
            'reason': 'Hydrogen/Off-gas above abort threshold (500 ppm) — auto-abort',
        })
    elif gas >= 25:
        alerts.append({
            'param': 'gas_concentration',
            'value': gas,
            'severity': 'WARNING',
            'reason': 'Toxic gas above safe threshold (25 ppm) — inspect seals',
        })

    # pH Level Checks
    if ph < 4.0:
        alerts.append({
            'param': 'ph_level',
            'value': ph,
            'severity': 'CRITICAL',
            'reason': 'Runaway acidification — below safe pH floor (4.0)',
        })
    elif ph < 5.0:
        alerts.append({
            'param': 'ph_level',
            'value': ph,
            'severity': 'WARNING',
            'reason': 'Slight acidification trend — below pH warning threshold (5.0)',
        })
    elif ph > 10.0:
        alerts.append({
            'param': 'ph_level',
            'value': ph,
            'severity': 'CRITICAL',
            'reason': 'Strongly caustic — above safe pH ceiling (10.0)',
        })
    elif ph > 9.0:
        alerts.append({
            'param': 'ph_level',
            'value': ph,
            'severity': 'WARNING',
            'reason': 'Elevated alkalinity — above pH warning threshold (9.0)',
        })

    # CO2 Effluent Checks
    if co2 > 4000:
        alerts.append({
            'param': 'emissions_co2_ppm',
            'value': co2,
            'severity': 'CRITICAL',
            'reason': 'Stack CO₂ far above limit — vent / scrubber fault',
        })
    elif co2 > 2500:
        alerts.append({
            'param': 'emissions_co2_ppm',
            'value': co2,
            'severity': 'WARNING',
            'reason': 'Elevated stack CO₂ — check vent scrubber',
        })

    return alerts