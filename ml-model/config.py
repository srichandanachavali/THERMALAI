import os

SEQUENCE_LENGTH = 10

FEATURES = [
    'temperature', 'pressure', 'reaction_rate',
    'cooling_efficiency', 'temp_rate_of_change',
    'temp_rolling_avg', 'pressure_rolling_avg',
    'temp_acceleration', 'pressure_temp_ratio', 'cooling_danger'
]

# Thermal runaway critical temperature (°C)
CRITICAL_TEMP = 162

# Maintenance prediction tuning
MAINT_BUFFER_LEN = 20
COOLING_FAILURE_THRESHOLD = 0.50
PRESSURE_DANGER_THRESHOLD = 7.0
REACTION_DANGER_THRESHOLD = 0.90


def frontend_origins():
    """Comma-separated FRONTEND_ORIGIN allow-list (default: local dev)."""
    _frontend_origin = os.environ.get('FRONTEND_ORIGIN', 'http://localhost:3000')
    return [o.strip() for o in _frontend_origin.split(',') if o.strip()]


def service_port():
    return int(os.environ.get('PORT', 5001))
