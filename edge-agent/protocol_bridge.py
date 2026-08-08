"""Protocol translation layer for ThermalAI edge agents.

Normalizes readings from industrial field protocols (Modbus TCP, MQTT)
into the canonical ThermalAI sensor format:

    {temperature, pressure, reaction_rate, cooling_efficiency, vibration}

External libraries (pymodbus, paho-mqtt) are imported lazily inside the
class methods so the module loads and the test suite runs even when they
are not installed. Tests mock the protocol-specific classes.
"""

import json
import logging
import time

logger = logging.getLogger(__name__)

# Imported lazily to keep this module import-safe when the libraries are
# not present. The protocol classes below reference these names at call
# time; tests patch the module-level names with fakes.
try:
    from pymodbus.client import ModbusTcpClient as _ModbusTcpClient
except ImportError:
    _ModbusTcpClient = None

try:
    import paho.mqtt.client as _paho
except ImportError:
    _paho = None


def _require_modbus():
    if _ModbusTcpClient is None:
        raise RuntimeError(
            "pymodbus is not installed. Install it in the edge-agent env: "
            "pip install pymodbus"
        )
    return _ModbusTcpClient


def _require_paho():
    if _paho is None:
        raise RuntimeError(
            "paho-mqtt is not installed. Install it in the edge-agent env: "
            "pip install paho-mqtt"
        )
    return _paho


# Canonical sensor keys ThermalAI expects.
SENSOR_KEYS = (
    "temperature",
    "pressure",
    "reaction_rate",
    "cooling_efficiency",
    "vibration",
)


class ModbusTCPReader:
    """Reads scaled sensor values from a Modbus TCP holding-register map."""

    def __init__(self, host, port=502, unit_id=1):
        self.host = host
        self.port = port
        self.unit_id = unit_id
        client_cls = _require_modbus()
        self.client = client_cls(host, port=port)
        self._connected = self.client.connect()

    def read_reactor_sensors(self, register_map):
        """Read holding registers per register_map and apply scale/offset.

        register_map: {sensor_key: {address, scale, offset}}
        Returns a normalized dict of {sensor_key: value} for each key
        present in the map, where value = raw * scale + offset.
        """
        if not self._connected:
            raise ConnectionError(
                f"Modbus connection to {self.host}:{self.port} is not established"
            )
        result = {}
        for sensor, cfg in register_map.items():
            address = cfg["address"]
            scale = cfg.get("scale", 1.0)
            offset = cfg.get("offset", 0.0)
            response = self.client.read_holding_registers(address, 1, unit=self.unit_id)
            if response.isError():
                raise IOError(
                    f"Modbus read error at address {address} for {sensor}: "
                    f"{response}"
                )
            raw = response.registers[0]
            result[sensor] = raw * scale + offset
        return result

    def health_check(self):
        """Ping register 0; True if a valid response comes back."""
        try:
            response = self.client.read_holding_registers(0, 1, unit=self.unit_id)
            return response is not None and not response.isError()
        except Exception:
            return False


class MQTTSensorReader:
    """Subscribes to {topic_prefix}/+/sensors and buffers validated readings."""

    REQUIRED_KEYS = SENSOR_KEYS

    def __init__(self, broker, port=1883, topic_prefix=""):
        _require_paho()
        self.broker = broker
        self.port = port
        self.topic_prefix = topic_prefix
        self.client = _paho.Client()
        self.client.on_message = self._on_message
        self._buffer = {}  # reactor_id -> {payload, ts}
        self.client.connect(broker, port, 60)
        self.client.subscribe(f"{topic_prefix}/+/sensors")

    def _on_message(self, client, userdata, message):
        payload = self._decode(message.topic, message.payload)
        reactor_id = self._reactor_id_from_topic(message.topic)
        self._buffer[reactor_id] = {"payload": payload, "ts": time.time()}

    @staticmethod
    def _reactor_id_from_topic(topic):
        parts = topic.split("/")
        return parts[-2] if len(parts) >= 2 else "unknown"

    @classmethod
    def _decode(cls, topic, raw_payload):
        """Parse and validate a sensor payload; raise ValueError if invalid."""
        if isinstance(raw_payload, (bytes, bytearray)):
            try:
                raw_payload = raw_payload.decode("utf-8")
            except UnicodeDecodeError as exc:
                raise ValueError(f"MQTT payload not UTF-8: {exc}") from exc
        try:
            data = json.loads(raw_payload)
        except (json.JSONDecodeError, TypeError) as exc:
            raise ValueError(f"MQTT payload is not valid JSON: {exc}") from exc
        if not isinstance(data, dict):
            raise ValueError("MQTT payload must be a JSON object")
        missing = [k for k in cls.REQUIRED_KEYS if k not in data]
        if missing:
            raise ValueError(
                f"MQTT payload missing required keys: {', '.join(missing)}"
            )
        return data

    def get_latest_reading(self, reactor_id, timeout=10):
        """Return the most recent valid reading for reactor_id, else None.

        Waits up to `timeout` seconds for a reading to arrive.
        """
        deadline = time.time() + timeout
        while time.time() < deadline:
            entry = self._buffer.get(reactor_id)
            if entry is not None:
                return entry["payload"]
            time.sleep(0.05)
        return None


class OPCUAReader:
    """Stub for a future OPC-UA integration. Not yet implemented."""

    def __init__(self, endpoint_url):
        logger.info("OPC-UA integration pending — endpoint: %s", endpoint_url)
        raise NotImplementedError(
            "OPC-UA support is on the ThermalAI roadmap; not implemented yet. "
            f"Configured endpoint: {endpoint_url}"
        )
