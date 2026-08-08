"""Unit tests for edge-agent protocol_bridge, using mocked protocol libs.

pymodbus and paho-mqtt are not required to be installed — the tests inject
fakes into the module namespace via unittest.mock.
"""

import sys
import os
import json
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import protocol_bridge


class FakeModbusResponse:
    def __init__(self, registers, is_error=False):
        self.registers = registers
        self._is_error = is_error

    def isError(self):
        return self._is_error


class FakeModbusClient:
    """Stands in for pymodbus.client.ModbusTcpClient."""

    def __init__(self, *args, **kwargs):
        self.host = args[0] if args else kwargs.get("host")
        self.connected = False
        self.reads = {}  # address -> FakeModbusResponse

    def connect(self):
        self.connected = True
        return True

    def read_holding_registers(self, address, count, unit=None):
        return self.reads.get(address, FakeModbusResponse([0]))

    def close(self):
        self.connected = False


class FakePahoModule:
    """Stands in for the paho.mqtt.client module."""

    class Client:
        def __init__(self, *args, **kwargs):
            self.on_message = None
            self.subscribed = []

        def connect(self, *args, **kwargs):
            return 0

        def subscribe(self, topic):
            self.subscribed.append(topic)


class ModbusTCPReaderTest(unittest.TestCase):
    REGISTER_MAP = {
        "temperature": {"address": 0, "scale": 0.1, "offset": 0.0},
        "pressure": {"address": 2, "scale": 0.01, "offset": 0.0},
        "reaction_rate": {"address": 4, "scale": 0.001, "offset": 0.0},
        "cooling_efficiency": {"address": 6, "scale": 0.1, "offset": 5.0},
        "vibration": {"address": 8, "scale": 0.001, "offset": 0.0},
    }

    def _make_reader(self, fake_client):
        with mock.patch("protocol_bridge._ModbusTcpClient", FakeModbusClient):
            reader = protocol_bridge.ModbusTCPReader("127.0.0.1", port=502, unit_id=1)
            reader.client = fake_client
            return reader

    def test_scale_and_offset_math(self):
        fake = FakeModbusClient()
        # raw values: temp 500 -> 50.0, pressure 300 -> 3.0, rate 8000 -> 8.0,
        # cooling 100 -> 15.0 (scale 0.1*100 + offset 5), vibration 1200 -> 1.2
        fake.reads = {
            0: FakeModbusResponse([500]),
            2: FakeModbusResponse([300]),
            4: FakeModbusResponse([8000]),
            6: FakeModbusResponse([100]),
            8: FakeModbusResponse([1200]),
        }
        reader = self._make_reader(fake)
        result = reader.read_reactor_sensors(self.REGISTER_MAP)
        self.assertEqual(result["temperature"], 50.0)
        self.assertEqual(result["pressure"], 3.0)
        self.assertEqual(result["reaction_rate"], 8.0)
        self.assertEqual(result["cooling_efficiency"], 15.0)
        self.assertEqual(result["vibration"], 1.2)

    def test_returns_all_expected_keys(self):
        fake = FakeModbusClient()
        reader = self._make_reader(fake)
        result = reader.read_reactor_sensors(self.REGISTER_MAP)
        self.assertEqual(set(result.keys()), set(self.REGISTER_MAP.keys()))

    def test_health_check_true_when_connected(self):
        fake = FakeModbusClient()
        fake.reads[0] = FakeModbusResponse([1])
        reader = self._make_reader(fake)
        self.assertTrue(reader.health_check())

    def test_health_check_false_on_error(self):
        fake = FakeModbusClient()
        fake.reads[0] = FakeModbusResponse([1], is_error=True)
        reader = self._make_reader(fake)
        self.assertFalse(reader.health_check())

    def test_read_raises_when_not_connected(self):
        fake = FakeModbusClient()
        fake.connected = False
        with mock.patch("protocol_bridge._ModbusTcpClient", FakeModbusClient):
            reader = protocol_bridge.ModbusTCPReader("127.0.0.1")
            reader.client = fake
            reader._connected = False
        with self.assertRaises(ConnectionError):
            reader.read_reactor_sensors(self.REGISTER_MAP)


class MQTTSensorReaderTest(unittest.TestCase):
    VALID_PAYLOAD = {
        "temperature": 25.0,
        "pressure": 1.2,
        "reaction_rate": 0.5,
        "cooling_efficiency": 88.0,
        "vibration": 0.9,
    }

    @mock.patch("protocol_bridge._paho", FakePahoModule)
    def _make_reader(self, topic_prefix="plant/alpha"):
        return protocol_bridge.MQTTSensorReader("127.0.0.1", port=1883, topic_prefix=topic_prefix)

    def test_decode_valid_payload(self):
        reader = self._make_reader()
        data = reader._decode("plant/alpha/A/sensors", json.dumps(self.VALID_PAYLOAD).encode("utf-8"))
        self.assertEqual(data["temperature"], 25.0)

    def test_missing_keys_raises_value_error(self):
        reader = self._make_reader()
        incomplete = dict(self.VALID_PAYLOAD)
        del incomplete["pressure"]
        payload = json.dumps(incomplete).encode("utf-8")
        with self.assertRaises(ValueError) as ctx:
            reader._decode("plant/alpha/A/sensors", payload)
        self.assertIn("pressure", str(ctx.exception))

    def test_invalid_json_raises_value_error(self):
        reader = self._make_reader()
        with self.assertRaises(ValueError):
            reader._decode("plant/alpha/A/sensors", b"not-json{{")

    def test_non_object_payload_raises_value_error(self):
        reader = self._make_reader()
        with self.assertRaises(ValueError):
            reader._decode("plant/alpha/A/sensors", b"[1,2,3]")

    def test_get_latest_reading_returns_buffered_value(self):
        reader = self._make_reader()
        reader._buffer["A"] = {"payload": self.VALID_PAYLOAD, "ts": 0}
        result = reader.get_latest_reading("A", timeout=1)
        self.assertEqual(result["temperature"], 25.0)

    def test_get_latest_reading_returns_none_on_timeout(self):
        reader = self._make_reader()
        result = reader.get_latest_reading("A", timeout=0.2)
        self.assertIsNone(result)

    def test_subscribes_to_wildcard_topic(self):
        reader = self._make_reader(topic_prefix="plant/alpha")
        self.assertIn("plant/alpha/+/sensors", reader.client.subscribed)


class OPCUAReaderTest(unittest.TestCase):
    def test_raises_not_implemented(self):
        with self.assertRaises(NotImplementedError):
            protocol_bridge.OPCUAReader("opc.tcp://127.0.0.1:4840")


if __name__ == "__main__":
    unittest.main()
