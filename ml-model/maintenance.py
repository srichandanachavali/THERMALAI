from collections import deque

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

from config import (
    MAINT_BUFFER_LEN,
    COOLING_FAILURE_THRESHOLD,
    PRESSURE_DANGER_THRESHOLD,
    REACTION_DANGER_THRESHOLD,
)

maintenance_buffers = {}


def run_maintenance_prediction(reactor_data):
    if len(reactor_data) < 5:
        return None
    df_r = pd.DataFrame(reactor_data)
    results = []

    # Cooling efficiency trend
    cooling_values = df_r['cooling_efficiency'].values
    x = np.arange(len(cooling_values)).reshape(-1, 1)
    cooling_model = LinearRegression()
    cooling_model.fit(x, cooling_values)
    cooling_slope = cooling_model.coef_[0]
    current_cooling = cooling_values[-1]
    if cooling_slope < 0 and current_cooling > COOLING_FAILURE_THRESHOLD:
        readings_to_failure = (COOLING_FAILURE_THRESHOLD - current_cooling) / cooling_slope if cooling_slope != 0 else 999
        days_to_failure = max(0, round(readings_to_failure * 2 / 86400, 1))
        urgency = 'CRITICAL' if days_to_failure < 1 else 'WARNING' if days_to_failure < 3 else 'MONITOR'
        message = "Cooling system failing — maintenance required immediately!" if urgency == 'CRITICAL' else f"Cooling efficiency declining — schedule maintenance within {days_to_failure} days"
        results.append({
            'component': 'Coolant Pump', 'icon': '🔄',
            'current_health': round(current_cooling * 100, 1),
            'trend': round(cooling_slope * 100, 4),
            'days_to_maintenance': days_to_failure,
            'rul_hours': round(days_to_failure * 24),
            'urgency': urgency, 'message': message,
            'recommendation': 'Inspect cooling pump, check coolant levels, clean heat exchangers'
        })

    # Pressure valve
    pressure_values = df_r['pressure'].values
    current_pressure = pressure_values[-1]
    pressure_trend = float(np.mean(np.diff(pressure_values)))
    if current_pressure > 5.0 or pressure_trend > 0.1:
        urgency = 'CRITICAL' if current_pressure > PRESSURE_DANGER_THRESHOLD else 'WARNING' if current_pressure > 5.5 else 'MONITOR'
        pressure_days = round(max(0, (PRESSURE_DANGER_THRESHOLD - current_pressure) / max(0.01, pressure_trend) * 2 / 86400), 1)
        results.append({
            'component': 'Valve Seal', 'icon': '🔧',
            'current_health': round(max(0, (8 - current_pressure) / 8 * 100), 1),
            'trend': round(pressure_trend, 4),
            'days_to_maintenance': pressure_days,
            'rul_hours': round(pressure_days * 24),
            'urgency': urgency,
            'message': f"Pressure at {round(current_pressure, 1)} bar — valve inspection needed",
            'recommendation': 'Test pressure relief valve, check for blockages, inspect seals'
        })

    # Reaction rate
    reaction_values = df_r['reaction_rate'].values
    current_reaction = reaction_values[-1]
    reaction_trend = float(np.mean(np.diff(reaction_values)))
    if current_reaction > 0.80 or reaction_trend > 0.05:
        urgency = 'WARNING' if current_reaction > REACTION_DANGER_THRESHOLD else 'MONITOR'
        reaction_days = round(max(0, (REACTION_DANGER_THRESHOLD - current_reaction) / max(0.01, reaction_trend) * 2 / 86400), 1)
        results.append({
            'component': 'Agitator Bearing', 'icon': '⚙️',
            'current_health': round(max(0, (1 - current_reaction) * 100), 1),
            'trend': round(reaction_trend, 4),
            'days_to_maintenance': reaction_days,
            'rul_hours': round(reaction_days * 24),
            'urgency': urgency,
            'message': f"Reaction rate at {round(current_reaction * 100)}% — controller inspection recommended",
            'recommendation': 'Calibrate reaction controller, check catalyst levels'
        })

    if len(results) == 0:
        overall_health = 95
        overall_status = 'HEALTHY'
        overall_message = 'All components operating within normal parameters'
    else:
        critical_count = sum(1 for r in results if r['urgency'] == 'CRITICAL')
        warning_count = sum(1 for r in results if r['urgency'] == 'WARNING')
        if critical_count > 0:
            overall_health = 30
            overall_status = 'CRITICAL'
            overall_message = f'{critical_count} component(s) require immediate attention!'
        elif warning_count > 0:
            overall_health = 60
            overall_status = 'WARNING'
            overall_message = f'{warning_count} component(s) need scheduled maintenance'
        else:
            overall_health = 80
            overall_status = 'MONITOR'
            overall_message = 'Minor maintenance recommended'

    return {
        'overall_health': overall_health,
        'overall_status': overall_status,
        'overall_message': overall_message,
        'components': results,
        'next_maintenance': min([r['days_to_maintenance'] for r in results], default=30)
    }


def buffer_for(reactor_id):
    """Return the per-reactor rolling maintenance buffer, creating it on demand."""
    if reactor_id not in maintenance_buffers:
        maintenance_buffers[reactor_id] = deque(maxlen=MAINT_BUFFER_LEN)
    return maintenance_buffers[reactor_id]
