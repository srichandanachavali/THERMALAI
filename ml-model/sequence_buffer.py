"""Per-reactor rolling sequence buffers for the LSTM + feature-engineering paths.

Each reading appends (a) a 9-field LSTM vector and (b) the raw reading dict.
Both are trimmed to SEQUENCE_LENGTH entries. reactor_history feeds online
rolling statistics (mean/std/min) and temp_acceleration in risk_service.
"""

from config import LSTM_SEQUENCE_FIELDS, SEQUENCE_LENGTH

reactor_buffers = {}      # reactor_id -> list of 9-field LSTM vectors
reactor_history = {}      # reactor_id -> list of raw reading dicts


def lstm_sequence_vector(reading):
    """Build the per-reading vector in LSTM_SEQUENCE_FIELDS order (9 fields)."""
    values = {
        'temperature': reading['temperature'],
        'pressure': reading['pressure'],
        'reaction_rate': reading.get('reaction_rate', 0.5),
        'cooling_efficiency': reading.get('cooling_efficiency', 0.5),
        'flow_rate': reading.get('flow_rate', 150.0),
        'material_level': reading.get('material_level', 75.0),
        'gas_concentration': reading.get('gas_concentration', 0.0),
        'ph_level': reading.get('ph_level', 7.0),
        'emissions_co2_ppm': reading.get('emissions_co2_ppm', 400.0),
    }
    return [values[f] for f in LSTM_SEQUENCE_FIELDS]


def update_sequence_buffer(reactor_id, reading):
    """Append a reading (LSTM vector + raw dict), trimming the tail."""
    buf = reactor_buffers.setdefault(reactor_id, [])
    buf.append(lstm_sequence_vector(reading))
    if len(buf) > SEQUENCE_LENGTH:
        del buf[:-SEQUENCE_LENGTH]

    hist = reactor_history.setdefault(reactor_id, [])
    hist.append(dict(reading))
    if len(hist) > SEQUENCE_LENGTH:
        del hist[:-SEQUENCE_LENGTH]
    return buf
