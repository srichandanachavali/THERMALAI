"""
Triconex-style 2-of-3 sensor voting layer for temperature validation.
Three independent estimators cross-validate the raw temperature reading.
"""

import statistics


class SensorVotingLayer:
    """Physics cross-validation voting for temperature sensors."""

    def validate_temperature(self, reading: dict) -> dict:
        """
        Three independent temperature estimates:
        Voter 1: raw temperature sensor value
        Voter 2: pressure-derived estimate — T_est = (pressure / 0.065) + 25
                 (inverse of the dP/dT relationship already used in stream_data.py)
        Voter 3: cooling-mass-balance estimate —
                 T_est = T_coolant + (1 - cooling_efficiency) * 140
        """
        raw_temp = reading.get('temperature', 0)
        pressure = reading.get('pressure', 0)
        cooling_efficiency = reading.get('cooling_efficiency', 1.0)
        coolant_temp = reading.get('coolant_temperature', 25)

        # Voter 2: Pressure-derived (inverse of dP/dT ~ 0.065 bar/°C)
        pressure_derived = (pressure / 0.065) + 25 if pressure > 0 else raw_temp

        # Voter 3: Cooling mass-balance derived
        cooling_derived = coolant_temp + (1 - cooling_efficiency) * 140

        votes = [raw_temp, pressure_derived, cooling_derived]
        median = statistics.median(votes)
        spread = max(votes) - min(votes)

        if spread > 25:
            sensor_fault_suspected = True
            validated_temp = median
            fault_note = (
                f"Temperature spread {spread:.1f}°C across 3 estimators — "
                f"sensor fault suspected"
            )
        else:
            sensor_fault_suspected = False
            validated_temp = raw_temp
            fault_note = None

        return {
            'validated_temperature': round(validated_temp, 1),
            'sensor_fault_suspected': sensor_fault_suspected,
            'voter_spread_celsius': round(spread, 1),
            'voters': [round(v, 1) for v in votes],
            'fault_note': fault_note,
        }

    def validate_all(self, reading: dict) -> dict:
        """Validate temperature and check other sensors for physical bounds."""
        temp_result = self.validate_temperature(reading)
        faults = []

        # Pressure bounds: 0-30 bar
        pressure = reading.get('pressure', 0)
        if not (0 <= pressure <= 30):
            faults.append({'sensor': 'pressure', 'reason': 'out of physical bounds'})

        # pH bounds: 0-14
        ph = reading.get('ph_level', 7)
        if not (0 <= ph <= 14):
            faults.append({'sensor': 'ph_level', 'reason': 'impossible pH value'})

        # Flow rate: non-negative
        flow = reading.get('flow_rate', 0)
        if flow < 0:
            faults.append({'sensor': 'flow_rate', 'reason': 'negative flow impossible'})

        # Cooling efficiency: 0-1
        cooling = reading.get('cooling_efficiency', 1)
        if not (0 <= cooling <= 1):
            faults.append({'sensor': 'cooling_efficiency', 'reason': 'outside 0-1 range'})

        validated_reading = {**reading, 'temperature': temp_result['validated_temperature']}

        data_quality = 'good'
        if temp_result['sensor_fault_suspected'] or faults:
            data_quality = 'degraded'

        return {
            'validated_reading': validated_reading,
            'temp_validation': temp_result,
            'sensor_faults': faults,
            'data_quality': data_quality,
        }