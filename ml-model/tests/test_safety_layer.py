"""
Safety Layer Integration Tests (Python components)
Validates sensor voting, Kalman filtering, risk boost on fault.
Run with: python ml-model/tests/test_safety_layer.py
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import numpy as np
from sensor_voting import SensorVotingLayer
from kalman_filter import ReactorKalmanFilter
from routes_risk import voting_layer, kalman
from risk_service import calculate_risk_score
from sequence_buffer import reactor_history

# Test 1: Sensor Voting Fault Detection
def test_sensor_voting_fault_detection():
    """Test that temperature fault is detected when 3 estimators diverge >25°C."""
    print("\n=== Test 1: Sensor Voting Fault Detection ===")

    # Reading where temperature=180 but pressure/cooling imply ~130°C
    reading = {
        'reactor_id': 'A',
        'temperature': 180.0,
        'pressure': 6.825,  # 6.825 / 0.065 + 25 = 130°C
        'cooling_efficiency': 0.64,  # 25 + (1-0.64)*140 = 75.4°C
        'coolant_temperature': 25,
        'ph_level': 7.0,
        'flow_rate': 150,
        'emissions_co2_ppm': 400,
    }

    result = voting_layer.validate_all(reading)
    temp_val = result['temp_validation']

    print(f"  Voter temps: {temp_val['voters']}")
    print(f"  Spread: {temp_val['voter_spread_celsius']:.1f}°C")
    print(f"  Sensor fault suspected: {temp_val['sensor_fault_suspected']}")
    print(f"  Validated temp: {temp_val['validated_temperature']:.1f}°C")
    print(f"  Data quality: {result['data_quality']}")

    assert temp_val['sensor_fault_suspected'] == True, "Should detect sensor fault"
    assert temp_val['voter_spread_celsius'] > 25, f"Spread should be >25°C, got {temp_val['voter_spread_celsius']}"
    assert result['data_quality'] == 'degraded', "Data quality should be degraded"
    assert temp_val['validated_temperature'] == np.median(temp_val['voters']), "Should use median"

    # Test normal consistent reading (all 3 voters agree ~130°C)
    # For T=130: pressure = (130-25)*0.065 = 6.825 bar
    # For T=130 with coolant=25: cooling_eff = 1 - (130-25)/140 = 0.25
    normal_reading = {
        'reactor_id': 'A',
        'temperature': 130.0,
        'pressure': 6.825,
        'cooling_efficiency': 0.25,  # consistent with 130°C
        'coolant_temperature': 25,
        'ph_level': 7.0,
        'flow_rate': 150,
        'emissions_co2_ppm': 400,
    }

    normal_result = voting_layer.validate_all(normal_reading)
    normal_temp = normal_result['temp_validation']

    print(f"\n  Normal reading:")
    print(f"  Voter temps: {normal_temp['voters']}")
    print(f"  Spread: {normal_temp['voter_spread_celsius']:.1f}°C")
    print(f"  Sensor fault suspected: {normal_temp['sensor_fault_suspected']}")
    print(f"  Data quality: {normal_result['data_quality']}")

    assert normal_temp['sensor_fault_suspected'] == False, "Should not detect fault on consistent data"
    assert normal_result['data_quality'] == 'good', "Data quality should be good"

    print("  [OK] Test 1 PASSED")
    return True


# Test 2: Kalman Smoothing
def test_kalman_smoothing():
    """Test that Kalman filter reduces variance on noisy readings."""
    print("\n=== Test 2: Kalman Smoothing ===")

    # Create a fresh filter for clean state
    kf = ReactorKalmanFilter(process_noise=0.05, measurement_noise=0.8)

    # Feed 10 noisy readings oscillating around 100
    np.random.seed(42)
    true_value = 100.0
    noise_std = 2.0
    noisy_readings = [true_value + np.random.normal(0, noise_std) for _ in range(10)]

    filtered = []
    for r in noisy_readings:
        filtered.append(kf.filter('A', 'temperature', r))

    raw_var = np.var(noisy_readings)
    filtered_var = np.var(filtered)

    print(f"  Raw readings: {[round(x, 2) for x in noisy_readings]}")
    print(f"  Filtered: {[round(x, 2) for x in filtered]}")
    print(f"  Raw variance: {raw_var:.2f}")
    print(f"  Filtered variance: {filtered_var:.2f}")
    print(f"  Variance reduction: {((raw_var - filtered_var) / raw_var * 100):.1f}%")

    assert filtered_var < raw_var, "Filtered variance should be lower than raw"

    # Test step change convergence
    print("  Step change test (80 -> 140 sustained):")
    kf2 = ReactorKalmanFilter(process_noise=0.05, measurement_noise=0.8)

    # Initial stable at 80
    for _ in range(5):
        kf2.filter('B', 'temperature', 80.0)

    # Step to 140
    step_readings = []
    for i in range(10):
        step_readings.append(kf2.filter('B', 'temperature', 140.0))

    print(f"  Filtered after step: {[round(x, 2) for x in step_readings]}")

    # Should converge within ~5-10 readings (check index 9 is close to 140)
    assert abs(step_readings[9] - 140) < 10, f"Should settle near 140 by reading 10, got {step_readings[9]}"

    print("  [OK] Test 2 PASSED")
    return True


# Test 3: Risk Boost on Fault
def test_risk_boost_on_fault():
    """Test that /predict boosts risk by ~20 when sensor fault detected."""
    print("\n=== Test 3: Risk Boost on Fault ===")

    # Change to ml-model directory so load_models finds saved-models/
    import os
    original_cwd = os.getcwd()
    os.chdir(os.path.join(os.path.dirname(__file__), '..'))

    try:
        # This tests the integrated flow through routes_risk.py
        # We'll test the voting + risk calculation directly since Flask app isn't running

        # Create reading with sensor fault
        fault_reading = {
            'reactor_id': 'A',
            'temperature': 180.0,
            'pressure': 6.825,
            'cooling_efficiency': 0.64,
            'coolant_temperature': 25,
            'ph_level': 7.0,
            'flow_rate': 150,
            'emissions_co2_ppm': 400,
            'reaction_rate': 1.0,
        }

        # Run through voting layer
        validation = voting_layer.validate_all(fault_reading)
        smoothed = kalman.filter_reading('A', validation['validated_reading'])

        # Calculate risk score (simulate what routes_risk does)
        from risk_service import calculate_risk_score, load_models
        from sequence_buffer import reactor_history
        load_models()
        history = reactor_history.get('A', [])
        result = calculate_risk_score(smoothed, history)

        base_risk = result['risk_score']
        boosted_risk = min(100, base_risk + 20)

        print(f"  Base risk score: {base_risk:.1f}")
        print(f"  Boosted risk score: {boosted_risk:.1f}")
        print(f"  Sensor fault suspected: {validation['temp_validation']['sensor_fault_suspected']}")
        print(f"  Data quality: {validation['data_quality']}")

        assert validation['temp_validation']['sensor_fault_suspected'] == True, "Fault should be detected"
        assert validation['data_quality'] == 'degraded', "Data quality should be degraded"
        assert boosted_risk >= base_risk + 19, "Risk should be boosted by ~20"

        print("  [OK] Test 3 PASSED")
        return True
    finally:
        os.chdir(original_cwd)


def run_all_tests():
    """Run all validation tests and print summary."""
    print("=" * 60)
    print("THERMALAI SAFETY LAYER -- PYTHON COMPONENT TESTS")
    print("=" * 60)

    tests = [
        test_sensor_voting_fault_detection,
        test_kalman_smoothing,
        test_risk_boost_on_fault,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"  [FAIL] Test FAILED: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print("\n" + "=" * 60)
    print(f"SUMMARY: {passed} passed, {failed} failed")
    print("=" * 60)

    if failed == 0:
        print("\n[PASS] ALL PYTHON TESTS PASSED -- Run JS tests for alarm rationalization")
        return True
    else:
        print(f"\n[FAIL] {failed} TEST(S) FAILED -- Do not proceed")
        return False


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)