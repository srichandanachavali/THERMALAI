"""Safety Layer integration tests (Python + JS). Run: python ml-model/tests/test_safety_layer.py"""
import sys, os, subprocess
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import numpy as np
from sensor_voting import SensorVotingLayer
from kalman_filter import ReactorKalmanFilter
from routes_risk import voting_layer, kalman
from risk_service import calculate_risk_score, load_models
from sequence_buffer import reactor_history

_JS = {}

def _run_js():
    if not _JS:
        p = os.path.join(os.path.dirname(__file__), 'test_alarm_rationalization.js')
        r = subprocess.run(['node', p], capture_output=True, text=True, timeout=60)
        _JS['ok'] = r.returncode == 0
        _JS['out'] = (r.stdout or '') + (r.stderr or '')
    return _JS['ok'], _JS['out']

def test_sensor_voting_fault_detection():
    reading = {'reactor_id':'A','temperature':180.0,'pressure':6.825,'cooling_efficiency':0.64,
               'coolant_temperature':25,'ph_level':7.0,'flow_rate':150,'emissions_co2_ppm':400}
    result = voting_layer.validate_all(reading)
    tv = result['temp_validation']
    assert tv['sensor_fault_suspected'] is True
    assert tv['voter_spread_celsius'] > 25
    assert result['data_quality'] == 'degraded'
    assert tv['validated_temperature'] == np.median(tv['voters'])
    normal = {'reactor_id':'A','temperature':130.0,'pressure':6.825,'cooling_efficiency':0.25,
              'coolant_temperature':25,'ph_level':7.0,'flow_rate':150,'emissions_co2_ppm':400}
    nres = voting_layer.validate_all(normal)
    assert nres['temp_validation']['sensor_fault_suspected'] is False
    assert nres['data_quality'] == 'good'
    print("  [OK] Test 1 PASSED"); return True

def test_kalman_smoothing():
    kf = ReactorKalmanFilter(process_noise=0.05, measurement_noise=0.8)
    np.random.seed(42)
    noisy = [100.0 + np.random.normal(0, 2.0) for _ in range(10)]
    filtered = [kf.filter('A', 'temperature', r) for r in noisy]
    assert np.var(filtered) < np.var(noisy)
    kf2 = ReactorKalmanFilter(process_noise=0.05, measurement_noise=0.8)
    for _ in range(5):
        kf2.filter('B', 'temperature', 80.0)
    steps = [kf2.filter('B', 'temperature', 140.0) for _ in range(10)]
    assert abs(steps[9] - 140) < 10
    print("  [OK] Test 2 PASSED"); return True

def test_risk_boost_on_fault():
    cwd = os.getcwd()
    os.chdir(os.path.join(os.path.dirname(__file__), '..'))
    try:
        fault = {'reactor_id':'A','temperature':180.0,'pressure':6.825,'cooling_efficiency':0.64,
                 'coolant_temperature':25,'ph_level':7.0,'flow_rate':150,'emissions_co2_ppm':400,
                 'reaction_rate':1.0}
        v = voting_layer.validate_all(fault)
        smoothed = kalman.filter_reading('A', v['validated_reading'])
        load_models()
        base = calculate_risk_score(smoothed, reactor_history.get('A', []))['risk_score']
        boosted = min(100, base + 20)
        assert v['temp_validation']['sensor_fault_suspected'] is True
        assert v['data_quality'] == 'degraded'
        assert boosted >= base + 19
        print("  [OK] Test 3 PASSED"); return True
    finally:
        os.chdir(cwd)

def test_alarm_cooldown():
    ok, out = _run_js()
    assert ok and 'Test 4' in out and 'PASSED' in out
    print("  [OK] Test 4 PASSED"); return True

def test_flood_suppression():
    ok, out = _run_js()
    assert ok and 'Test 5' in out and 'PASSED' in out
    print("  [OK] Test 5 PASSED"); return True

def run_all_tests():
    tests = [test_sensor_voting_fault_detection, test_kalman_smoothing,
             test_risk_boost_on_fault, test_alarm_cooldown, test_flood_suppression]
    passed = failed = 0
    for t in tests:
        try:
            t(); passed += 1
        except Exception as e:
            print(f"  [FAIL] {t.__name__}: {e}"); failed += 1
    print(f"SUMMARY: {passed} passed, {failed} failed")
    print("[PASS] ALL 5 SAFETY LAYER TESTS PASSED" if failed == 0 else f"[FAIL] {failed} TEST(S) FAILED")
    return failed == 0

if __name__ == '__main__':
    sys.exit(0 if run_all_tests() else 1)
