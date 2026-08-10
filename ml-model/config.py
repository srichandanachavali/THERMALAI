import os

SEQUENCE_LENGTH = 10

# Full feature vector (engineering layer). The 5 trailing sensor parameters
# (flow_rate..emissions_co2_ppm) are IEC 61511 mandatory additions. Existing
# saved models are still trained on the original 10, so inference falls back
# to ORIGINAL_FEATURES when a model rejects the wider vector.
FEATURES = [
    'temperature', 'pressure', 'reaction_rate',
    'cooling_efficiency', 'temp_rate_of_change',
    'temp_rolling_avg', 'pressure_rolling_avg',
    'temp_acceleration', 'pressure_temp_ratio', 'cooling_danger',
    'flow_rate', 'material_level', 'gas_concentration',
    'ph_level', 'emissions_co2_ppm'
]

# Columns the existing RF/LSTM artifacts were trained on. Used as the fallback
# slice when a loaded model has not yet been retrained for the full 15.
ORIGINAL_FEATURES = FEATURES[:10]

# Per-reading vector fed to the LSTM sequence buffer (app.py reactor_buffers).
# The LSTM input size grows from 5 to 10 with the new sensors.
LSTM_SEQUENCE_FIELDS = [
    'temperature', 'pressure', 'reaction_rate', 'cooling_efficiency',
    'temp_rate_of_change',
    'flow_rate', 'material_level', 'gas_concentration', 'ph_level',
    'emissions_co2_ppm'
]

# Sensor safe-range / default-value table (IEC 61511 parameter checks).
SENSOR_DEFAULTS = {
    'flow_rate': 150.0,          # L/min, range 0-500
    'material_level': 75.0,      # %, range 0-100
    'gas_concentration': 0.0,    # ppm, range 0-1000
    'ph_level': 7.0,             # 0-14, safe 4-10
    'emissions_co2_ppm': 400.0,  # ppm, range 0-5000
}

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


def ml_api_key():
    """Shared secret required via X-ML-Key (1H). Empty disables the gate (dev)."""
    return os.environ.get('ML_API_KEY', '').strip()
