import os

SEQUENCE_LENGTH = 20

# Full feature vector (engineering layer). 22 features = 10 base sensors
# (9 IEC 61511 sensor parameters + temp_rate_of_change) + 8 physics-derived +
# 4 rolling statistics. Kept in this exact order so train_model and
# risk_service.build_feature_vector stay aligned with the model at train time.
FEATURES = [
    # BASE SENSORS (10)
    'temperature', 'pressure', 'reaction_rate', 'cooling_efficiency',
    'temp_rate_of_change',
    'flow_rate', 'material_level', 'gas_concentration', 'ph_level',
    'emissions_co2_ppm',
    # PHYSICS-DERIVED (8)
    'cooling_danger', 'heat_removal_proxy', 'runaway_proximity_nitration',
    'pressure_temp_ratio', 'ph_deviation', 'gas_risk', 'material_criticality',
    'temp_acceleration',
    # ROLLING STATISTICS (4) — 20-reading window
    'temp_rolling_avg', 'pressure_rolling_avg', 'temp_rolling_std',
    'cooling_rolling_min',
]

# 5-class target labels produced by the physics simulator / RF / LSTM.
CLASSES = ['NOMINAL', 'DEGRADING', 'WARNING', 'CRITICAL', 'RECOVERY']

# First 10 base features — used to build online rolling stats from the
# sequence buffer before physics features are derived.
BASE_FEATURES = FEATURES[:10]

# Backward-compat alias (the 10 base features the pre-2.0 models trained on).
ORIGINAL_FEATURES = FEATURES[:10]

# Per-reading vector fed to the LSTM sequence buffer. 9 raw sensors; the LSTM
# consumes (SEQUENCE_LENGTH, 9) sequences.
LSTM_SEQUENCE_FIELDS = [
    'temperature', 'pressure', 'reaction_rate', 'cooling_efficiency',
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
