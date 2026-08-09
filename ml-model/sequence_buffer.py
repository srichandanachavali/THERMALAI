"""Per-reactor rolling sequence buffer for the LSTM path.

Each reading appends a 10-field vector (5 original + 5 IEC 61511 sensors),
trimmed to SEQUENCE_LENGTH entries. The shared store lets routes_risk and
app.py read the same buffers without importing the full prediction core.
"""

from config import LSTM_SEQUENCE_FIELDS, SEQUENCE_LENGTH

reactor_buffers = {}


def lstm_sequence_vector(reading):
    """Build the per-reading vector in LSTM_SEQUENCE_FIELDS order (10 fields)."""
    values = {
        'temperature': reading['temperature'],
        'pressure': reading['pressure'],
        'reaction_rate': reading.get('reaction_rate', 0.5),
        'cooling_efficiency': reading.get('cooling_efficiency', 0.5),
        'temp_rate_of_change': reading.get('temp_rate_of_change', 0),
        'flow_rate': reading.get('flow_rate', 150.0),
        'material_level': reading.get('material_level', 75.0),
        'gas_concentration': reading.get('gas_concentration', 0.0),
        'ph_level': reading.get('ph_level', 7.0),
        'emissions_co2_ppm': reading.get('emissions_co2_ppm', 400.0),
    }
    return [values[f] for f in LSTM_SEQUENCE_FIELDS]


def update_sequence_buffer(reactor_id, reading):
    """Append a reading to the reactor's sequence buffer, trimming the tail."""
    buf = reactor_buffers.setdefault(reactor_id, [])
    buf.append(lstm_sequence_vector(reading))
    if len(buf) > SEQUENCE_LENGTH:
        del buf[:-SEQUENCE_LENGTH]
    return buf
