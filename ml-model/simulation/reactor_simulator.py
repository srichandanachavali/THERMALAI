"""ReactorSimulator: independent physics-based risk validation layer.

Runs a simplified exothermic batch-reactor model alongside live sensor
readings to sanity-check the ML ensemble. This is deliberately independent
of the trained models so a stale/failed ML prediction can be cross-checked
against basic reaction kinetics.

Units follow the ThermalAI sensor feed: temperature in degC, time in
seconds, energy terms in arbitrary consistent units (see the JSON kinetics
files for the assumed magnitudes).
"""

import json
import logging
import math
import os

logger = logging.getLogger(__name__)

GAS_CONSTANT = 8.314  # J/mol/K

# Required kinetics keys; validated on load so bad JSON fails fast.
KINETICS_KEYS = (
    "activation_energy",
    "pre_exponential_factor",
    "heat_of_reaction",
    "heat_transfer_coefficient",
    "cooling_capacity_nominal",
    "runaway_temperature_threshold",
)

STATE_KEYS = (
    "temperature",
    "pressure",
    "reaction_rate",
    "cooling_efficiency",
)


def _kinetics_path(reactor_type):
    base = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base, "kinetics", f"{reactor_type}.json")


class ReactorSimulator:
    def __init__(self, reactor_type="nitration"):
        self.reactor_type = reactor_type
        path = _kinetics_path(reactor_type)
        try:
            with open(path, "r", encoding="utf-8") as fh:
                params = json.load(fh)
        except FileNotFoundError:
            raise ValueError(
                f"Unknown reactor_type '{reactor_type}' — no kinetics file at "
                f"{path}. Choose one of: nitration, hydrogenation."
            )
        missing = [k for k in KINETICS_KEYS if k not in params]
        if missing:
            raise ValueError(
                f"Kinetics file {path} missing required keys: {', '.join(missing)}"
            )
        self.activation_energy = float(params["activation_energy"])
        self.pre_exponential_factor = float(params["pre_exponential_factor"])
        self.heat_of_reaction = float(params["heat_of_reaction"])
        self.heat_transfer_coefficient = float(params["heat_transfer_coefficient"])
        self.cooling_capacity_nominal = float(params["cooling_capacity_nominal"])
        self.runaway_temperature_threshold = float(
            params["runaway_temperature_threshold"]
        )

    def arrhenius_rate(self, temp_celsius):
        """Arrhenius rate constant k = A * exp(-Ea / (R * T_kelvin))."""
        kelvin = temp_celsius + 273.15
        return self.pre_exponential_factor * math.exp(
            -self.activation_energy / (GAS_CONSTANT * kelvin)
        )

    def simulate_step(self, current_state, dt_seconds=5):
        """Advance the reactor model by dt_seconds and assess runaway risk.

        current_state must contain temperature and cooling_efficiency. The
        other STATE_KEYS are optional and only gate simulation_valid.
        Returns a dict with predicted temperature, heat terms, a 0-100
        runaway risk score, and validity flags.
        """
        try:
            temperature = float(current_state["temperature"])
            cooling_efficiency = float(current_state["cooling_efficiency"])
        except (KeyError, TypeError, ValueError):
            return {
                "predicted_temperature": None,
                "heat_generation_rate": None,
                "heat_removal_rate": None,
                "runaway_risk_score": 0,
                "simulation_valid": False,
                "dt_seconds": dt_seconds,
            }

        valid = all(k in current_state for k in STATE_KEYS)
        rate = self.arrhenius_rate(temperature)
        heat_generated = rate * self.heat_of_reaction
        heat_removed = (cooling_efficiency / 100.0) * self.heat_transfer_coefficient * (
            temperature - 25.0
        )
        dt = (heat_generated - heat_removed) * dt_seconds / 1000.0
        predicted_temp = temperature + dt
        runaway_ratio = max(
            0.0, (predicted_temp - self.runaway_temperature_threshold)
            / self.runaway_temperature_threshold
        )
        runaway_risk_score = round(min(100.0, runaway_ratio * 100.0), 1)

        return {
            "predicted_temperature": round(predicted_temp, 2),
            "heat_generation_rate": round(heat_generated, 2),
            "heat_removal_rate": round(heat_removed, 2),
            "runaway_risk_score": runaway_risk_score,
            "simulation_valid": valid,
            "dt_seconds": dt_seconds,
        }

    def validate_against_live(self, simulated, actual):
        """Compare a simulated step against a live sensor reading.

        Returns deviation_celsius, sensor_fault_suspected (>15 degC gap),
        and a simulation_confidence band:
          high:   deviation <= 15  (model agrees with sensor)
          medium: 15 < deviation <= 40
          low:    deviation > 40
        """
        sim_temp = simulated.get("predicted_temperature")
        actual_temp = actual.get("temperature")
        if sim_temp is None or actual_temp is None:
            return {
                "deviation_celsius": None,
                "sensor_fault_suspected": False,
                "simulation_confidence": "low",
            }
        deviation = abs(float(sim_temp) - float(actual_temp))
        if deviation <= 15:
            confidence = "high"
        elif deviation <= 40:
            confidence = "medium"
        else:
            confidence = "low"
        return {
            "deviation_celsius": round(deviation, 2),
            "sensor_fault_suspected": deviation > 15,
            "simulation_confidence": confidence,
        }
