import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
import pickle
import os

print("=== PREDICTIVE MAINTENANCE MODEL ===\n")

# Load data
df = pd.read_csv('data/reactor_data_enriched.csv')
df = df.sort_values(['reactor_id', 'timestamp']).reset_index(drop=True)

# Maintenance thresholds
COOLING_FAILURE_THRESHOLD = 0.50  # Below this = cooling needs maintenance
PRESSURE_DANGER_THRESHOLD = 7.0   # Above this = pressure valve needs check
REACTION_DANGER_THRESHOLD = 0.90  # Above this = reaction control needs check

def predict_maintenance(reactor_data):
    """
    Analyzes reactor trends and predicts maintenance needs.
    reactor_data = list of recent readings for one reactor
    """
    if len(reactor_data) < 5:
        return None

    df_r = pd.DataFrame(reactor_data)
    results = []

    # 1 — Cooling efficiency trend
    cooling_values = df_r['cooling_efficiency'].values
    x = np.arange(len(cooling_values)).reshape(-1, 1)
    
    cooling_model = LinearRegression()
    cooling_model.fit(x, cooling_values)
    cooling_slope = cooling_model.coef_[0]
    current_cooling = cooling_values[-1]
    
    if cooling_slope < 0 and current_cooling > COOLING_FAILURE_THRESHOLD:
        # Predict when cooling will hit threshold
        if cooling_slope != 0:
            readings_to_failure = (COOLING_FAILURE_THRESHOLD - current_cooling) / cooling_slope
            days_to_failure = max(0, round(readings_to_failure * 2 / 86400, 1))
        else:
            days_to_failure = 999

        if days_to_failure < 1:
            urgency = 'CRITICAL'
            message = f"Cooling system failing — maintenance required immediately!"
        elif days_to_failure < 3:
            urgency = 'WARNING'
            message = f"Cooling efficiency declining — schedule maintenance within {days_to_failure} days"
        else:
            urgency = 'MONITOR'
            message = f"Cooling efficiency trending down — monitor closely"

        results.append({
            'component': 'Coolant Pump',
            'icon': '🔄',
            'current_health': round(current_cooling * 100, 1),
            'trend': round(cooling_slope * 100, 4),
            'days_to_maintenance': days_to_failure,
            'rul_hours': round(days_to_failure * 24),
            'urgency': urgency,
            'message': message,
            'recommendation': 'Inspect cooling pump, check coolant levels, clean heat exchangers'
        })

    # 2 — Pressure valve analysis
    pressure_values = df_r['pressure'].values
    current_pressure = pressure_values[-1]
    pressure_trend = np.mean(np.diff(pressure_values))

    if current_pressure > 5.0 or pressure_trend > 0.1:
        if current_pressure > PRESSURE_DANGER_THRESHOLD:
            urgency = 'CRITICAL'
            message = f"Pressure at {round(current_pressure, 1)} bar — valve inspection critical!"
        elif current_pressure > 5.5:
            urgency = 'WARNING'
            message = f"Pressure trending high — schedule valve inspection"
        else:
            urgency = 'MONITOR'
            message = f"Pressure slowly rising — monitor pressure relief valve"

        pressure_days = round(max(0, (PRESSURE_DANGER_THRESHOLD - current_pressure) / max(0.01, pressure_trend) * 2 / 86400), 1)
        results.append({
            'component': 'Valve Seal',
            'icon': '🔧',
            'current_health': round(max(0, (8 - current_pressure) / 8 * 100), 1),
            'trend': round(pressure_trend, 4),
            'days_to_maintenance': pressure_days,
            'rul_hours': round(pressure_days * 24),
            'urgency': urgency,
            'message': message,
            'recommendation': 'Test pressure relief valve, check for blockages, inspect seals'
        })

    # 3 — Reaction rate analysis
    reaction_values = df_r['reaction_rate'].values
    current_reaction = reaction_values[-1]
    reaction_trend = np.mean(np.diff(reaction_values))

    if current_reaction > 0.80 or reaction_trend > 0.05:
        urgency = 'WARNING' if current_reaction > REACTION_DANGER_THRESHOLD else 'MONITOR'
        reaction_days = round(max(0, (REACTION_DANGER_THRESHOLD - current_reaction) / max(0.01, reaction_trend) * 2 / 86400), 1)
        results.append({
            'component': 'Agitator Bearing',
            'icon': '⚙️',
            'current_health': round(max(0, (1 - current_reaction) * 100), 1),
            'trend': round(reaction_trend, 4),
            'days_to_maintenance': reaction_days,
            'rul_hours': round(reaction_days * 24),
            'urgency': urgency,
            'message': f"Reaction rate at {round(current_reaction * 100)}% — controller inspection recommended",
            'recommendation': 'Calibrate reaction controller, check catalyst levels'
        })

    # Overall health score
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

# Test with sample data
print("Testing maintenance predictor...")
sample_data = []
cooling = 0.85
pressure = 4.2
reaction = 0.55

for i in range(20):
    cooling -= 0.008
    pressure += 0.05
    reaction += 0.01
    sample_data.append({
        'cooling_efficiency': round(cooling, 3),
        'pressure': round(pressure, 2),
        'reaction_rate': round(reaction, 3),
        'temperature': 130 + i
    })

result = predict_maintenance(sample_data)
print(f"\nOverall Health: {result['overall_health']}%")
print(f"Status: {result['overall_status']}")
print(f"Message: {result['overall_message']}")
print(f"\nComponents needing attention: {len(result['components'])}")
for comp in result['components']:
    print(f"  {comp['icon']} {comp['component']}: {comp['urgency']} — {comp['message']}")

# Save the function for use in Flask
os.makedirs('saved-models', exist_ok=True)
print("\n✅ Predictive maintenance model ready!")