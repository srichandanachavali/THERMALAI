"""
1D Kalman filter per sensor per reactor.
Smooths noise while preserving real step-changes.
Does NOT filter reaction_rate or gas_concentration — spikes are safety-relevant.
"""


class ReactorKalmanFilter:
    """1D Kalman filter per sensor per reactor."""

    def __init__(self, process_noise=0.05, measurement_noise=0.8):
        self.Q = process_noise
        self.R = measurement_noise
        self.states = {}  # {"{reactor_id}_{sensor}": {'x': estimate, 'P': covariance}}

    def filter(self, reactor_id, sensor, measurement) -> float:
        """Apply 1D Kalman filter update for a single measurement."""
        key = f"{reactor_id}_{sensor}"
        if key not in self.states:
            self.states[key] = {'x': measurement, 'P': 1.0}
            return measurement

        state = self.states[key]
        x_pred = state['x']
        P_pred = state['P'] + self.Q
        K = P_pred / (P_pred + self.R)
        x_new = x_pred + K * (measurement - x_pred)
        P_new = (1 - K) * P_pred
        self.states[key] = {'x': x_new, 'P': P_new}
        return round(x_new, 3)

    def filter_reading(self, reactor_id, reading: dict) -> dict:
        """Filter a complete reading dict, returning a new dict with filtered values."""
        sensors_to_filter = [
            'temperature', 'pressure', 'cooling_efficiency',
            'flow_rate', 'ph_level', 'emissions_co2_ppm'
        ]
        filtered = dict(reading)
        for s in sensors_to_filter:
            if reading.get(s) is not None:
                filtered[s] = self.filter(reactor_id, s, reading[s])
        filtered['kalman_applied'] = True
        return filtered