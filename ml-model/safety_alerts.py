"""IEC 61511 safety checks for the 5 mandatory sensor additions.

parameter_alerts returns a list of {param, value, severity, reason} for any
sensor outside its safe operating envelope; an empty list means all within
range. Kept separate from risk_service.py so the prediction core stays lean.
"""


def parameter_alerts(reading):
    """Evaluate flow / level / gas / pH / CO₂ against safe operating envelopes."""
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
