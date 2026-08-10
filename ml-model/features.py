"""Online feature engineering for a single live reading.

Mirrors feature_engineering.py so the vector fed to inference exactly matches
the columns the RF saw at train time (config.FEATURES, 22 features). Rolling
statistics are computed from the reactor's buffered history; when history is
too short the windows degrade gracefully to the current reading.
"""

import numpy as np

from config import FEATURES, CRITICAL_TEMP


def _series(history, key, current, default=0.0):
    vals = [h.get(key, default) for h in (history or [])] + [current]
    return vals


def build_feature_vector(reading, history=None):
    temp = reading['temperature']
    pressure = reading['pressure']
    cooling = reading['cooling_efficiency']
    roc = reading.get('temp_rate_of_change', 0)

    temps = _series(history, 'temperature', temp)
    pressures = _series(history, 'pressure', pressure)
    coolings = _series(history, 'cooling_efficiency', cooling)
    rocs = _series(history, 'temp_rate_of_change', roc)

    temp_avg = float(np.mean(temps))
    pressure_avg = float(np.mean(pressures))
    temp_std = float(np.std(temps)) if len(temps) > 1 else 0.0
    cooling_min = float(min(coolings))
    temp_accel = roc - (rocs[-2] if len(rocs) > 1 else 0.0)

    flow = reading.get('flow_rate', 150.0)
    level = reading.get('material_level', 75.0)
    gas = reading.get('gas_concentration', 0.0)
    ph = reading.get('ph_level', 7.0)
    co2 = reading.get('emissions_co2_ppm', 400.0)
    rate = reading.get('reaction_rate', 0.5)

    return [
        temp, pressure, rate, cooling, roc,          # base (10)
        flow, level, gas, ph, co2,
        round((1 - cooling) * temp, 3),              # cooling_danger
        round(flow * cooling * 0.012, 3),            # heat_removal_proxy
        round(max(0.0, (temp - 130.0) / 20.0), 4),   # runaway_proximity_nitration
        round(pressure / max(temp, 1.0), 4),         # pressure_temp_ratio
        round(abs(ph - 7.0), 3),                     # ph_deviation
        round(min(1.0, gas / 500.0), 4),             # gas_risk
        1 if (level < 10 or level > 92) else 0,      # material_criticality
        round(temp_accel, 4),                        # temp_acceleration
        round(temp_avg, 3),                          # rolling
        round(pressure_avg, 3),
        round(temp_std, 3),
        round(cooling_min, 3),
    ]


def compute_minutes_to_runaway(reading, risk_score=0, status='SAFE'):
    """Inline /predict-time logic — estimated minutes to CRITICAL, or null."""
    temp = reading['temperature']
    temp_roc = reading.get('temp_rate_of_change', 0)
    if status == 'CRITICAL':
        return 0.0
    if status == 'WARNING' and temp_roc > 0:
        degrees_remaining = CRITICAL_TEMP - temp
        if degrees_remaining <= 0:
            return 0.0
        cycles_remaining = degrees_remaining / temp_roc
        return round((cycles_remaining * 2) / 60, 1)
    return None
