import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import pickle
import tensorflow as tf
from collections import deque
from sklearn.linear_model import LinearRegression

app = Flask(__name__)
CORS(app)

# Load Random Forest Model
with open('saved-models/rf_model.pkl', 'rb') as f:
    model = pickle.load(f)
print("✅ ThermalAI RF model loaded!")

# Load LSTM Model
lstm_model = tf.keras.models.load_model('saved-models/lstm_model.h5')
with open('saved-models/lstm_scaler.pkl', 'rb') as f:
    lstm_scaler = pickle.load(f)
with open('saved-models/lstm_label_encoder.pkl', 'rb') as f:
    lstm_le = pickle.load(f)
print("✅ LSTM model loaded and ready!")

# Buffers
SEQUENCE_LENGTH = 10
reactor_buffers = {}
maintenance_buffers = {}

FEATURES = [
    'temperature', 'pressure', 'reaction_rate',
    'cooling_efficiency', 'temp_rate_of_change',
    'temp_rolling_avg', 'pressure_rolling_avg',
    'temp_acceleration', 'pressure_temp_ratio', 'cooling_danger'
]

def calculate_risk_score(reading):
    temp = reading['temperature']
    pressure = reading['pressure']
    cooling = reading['cooling_efficiency']
    features = {
        'temperature': temp, 'pressure': pressure,
        'reaction_rate': reading.get('reaction_rate', 0.5),
        'cooling_efficiency': cooling,
        'temp_rate_of_change': reading.get('temp_rate_of_change', 0),
        'temp_rolling_avg': reading.get('temp_rolling_avg', temp),
        'pressure_rolling_avg': reading.get('pressure_rolling_avg', pressure),
        'temp_acceleration': reading.get('temp_acceleration', 0),
        'pressure_temp_ratio': round(pressure / temp, 4),
        'cooling_danger': round((1 - cooling) * temp, 2)
    }
    df = pd.DataFrame([features])
    prediction = model.predict(df)[0]
    probabilities = model.predict_proba(df)[0]
    classes = model.classes_
    prob_dict = dict(zip(classes, probabilities))
    safe_prob = prob_dict.get('SAFE', 0)
    warning_prob = prob_dict.get('WARNING', 0)
    critical_prob = prob_dict.get('CRITICAL', 0)
    risk_score = round((warning_prob * 50) + (critical_prob * 100), 1)
    risk_score = min(100, max(0, risk_score))
    if risk_score < 30: status = 'SAFE'
    elif risk_score < 70: status = 'WARNING'
    else: status = 'CRITICAL'
    return {
        'risk_score': risk_score, 'status': status, 'prediction': prediction,
        'probabilities': {
            'safe': round(safe_prob * 100, 1),
            'warning': round(warning_prob * 100, 1),
            'critical': round(critical_prob * 100, 1)
        }
    }

def run_maintenance_prediction(reactor_data):
    if len(reactor_data) < 5:
        return None
    df_r = pd.DataFrame(reactor_data)
    results = []
    COOLING_FAILURE_THRESHOLD = 0.50
    PRESSURE_DANGER_THRESHOLD = 7.0
    REACTION_DANGER_THRESHOLD = 0.90

    # Cooling efficiency trend
    cooling_values = df_r['cooling_efficiency'].values
    x = np.arange(len(cooling_values)).reshape(-1, 1)
    cooling_model = LinearRegression()
    cooling_model.fit(x, cooling_values)
    cooling_slope = cooling_model.coef_[0]
    current_cooling = cooling_values[-1]
    if cooling_slope < 0 and current_cooling > COOLING_FAILURE_THRESHOLD:
        readings_to_failure = (COOLING_FAILURE_THRESHOLD - current_cooling) / cooling_slope if cooling_slope != 0 else 999
        days_to_failure = max(0, round(readings_to_failure * 2 / 86400, 1))
        urgency = 'CRITICAL' if days_to_failure < 1 else 'WARNING' if days_to_failure < 3 else 'MONITOR'
        message = "Cooling system failing — maintenance required immediately!" if urgency == 'CRITICAL' else f"Cooling efficiency declining — schedule maintenance within {days_to_failure} days"
        results.append({
            'component': 'Cooling System', 'icon': '❄️',
            'current_health': round(current_cooling * 100, 1),
            'trend': round(cooling_slope * 100, 4),
            'days_to_maintenance': days_to_failure,
            'urgency': urgency, 'message': message,
            'recommendation': 'Inspect cooling pump, check coolant levels, clean heat exchangers'
        })

    # Pressure valve
    pressure_values = df_r['pressure'].values
    current_pressure = pressure_values[-1]
    pressure_trend = float(np.mean(np.diff(pressure_values)))
    if current_pressure > 5.0 or pressure_trend > 0.1:
        urgency = 'CRITICAL' if current_pressure > PRESSURE_DANGER_THRESHOLD else 'WARNING' if current_pressure > 5.5 else 'MONITOR'
        results.append({
            'component': 'Pressure Relief Valve', 'icon': '💨',
            'current_health': round(max(0, (8 - current_pressure) / 8 * 100), 1),
            'trend': round(pressure_trend, 4),
            'days_to_maintenance': round(max(0, (PRESSURE_DANGER_THRESHOLD - current_pressure) / max(0.01, pressure_trend) * 2 / 86400), 1),
            'urgency': urgency,
            'message': f"Pressure at {round(current_pressure, 1)} bar — valve inspection needed",
            'recommendation': 'Test pressure relief valve, check for blockages, inspect seals'
        })

    # Reaction rate
    reaction_values = df_r['reaction_rate'].values
    current_reaction = reaction_values[-1]
    reaction_trend = float(np.mean(np.diff(reaction_values)))
    if current_reaction > 0.80 or reaction_trend > 0.05:
        urgency = 'WARNING' if current_reaction > REACTION_DANGER_THRESHOLD else 'MONITOR'
        results.append({
            'component': 'Reaction Controller', 'icon': '⚡',
            'current_health': round(max(0, (1 - current_reaction) * 100), 1),
            'trend': round(reaction_trend, 4),
            'days_to_maintenance': round(max(0, (REACTION_DANGER_THRESHOLD - current_reaction) / max(0.01, reaction_trend) * 2 / 86400), 1),
            'urgency': urgency,
            'message': f"Reaction rate at {round(current_reaction * 100)}% — controller inspection recommended",
            'recommendation': 'Calibrate reaction controller, check catalyst levels'
        })

    if len(results) == 0:
        overall_health = 95
        overall_status = 'HEALTHY'
        overall_message = 'All components operating within normal parameters'
    else:
        critical_count = sum(1 for r in results if r['urgency'] == 'CRITICAL')
        warning_count = sum(1 for r in results if r['urgency'] == 'WARNING')
        if critical_count > 0:
            overall_health = 30
            overall_status = 'CRITICAL'
            overall_message = f'{critical_count} component(s) require immediate attention!'
        elif warning_count > 0:
            overall_health = 60
            overall_status = 'WARNING'
            overall_message = f'{warning_count} component(s) need scheduled maintenance'
        else:
            overall_health = 80
            overall_status = 'MONITOR'
            overall_message = 'Minor maintenance recommended'

    return {
        'overall_health': overall_health,
        'overall_status': overall_status,
        'overall_message': overall_message,
        'components': results,
        'next_maintenance': min([r['days_to_maintenance'] for r in results], default=30)
    }

@app.route('/', methods=['GET'])
def home():
    return jsonify({'message': 'ThermalAI ML Service Running 🔥', 'status': 'ready'})

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        result = calculate_risk_score(data)
        return jsonify({
            'success': True,
            'reactor_id': data.get('reactor_id', 'unknown'),
            'risk_score': result['risk_score'],
            'status': result['status'],
            'prediction': result['prediction'],
            'probabilities': result['probabilities']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict-lstm', methods=['POST'])
def predict_lstm():
    try:
        data = request.get_json()
        reactor_id = data.get('reactor_id', 'unknown')
        temp = data['temperature']
        pressure = data['pressure']
        cooling = data['cooling_efficiency']
        feature_dict = {
            'temperature': temp, 'pressure': pressure,
            'reaction_rate': data.get('reaction_rate', 0.5),
            'cooling_efficiency': cooling,
            'temp_rate_of_change': data.get('temp_rate_of_change', 0),
            'temp_rolling_avg': data.get('temp_rolling_avg', temp),
            'pressure_rolling_avg': data.get('pressure_rolling_avg', pressure),
            'temp_acceleration': data.get('temp_acceleration', 0),
            'pressure_temp_ratio': round(pressure / temp, 4),
            'cooling_danger': round((1 - cooling) * temp, 2)
        }
        feature_values = [feature_dict[f] for f in FEATURES]
        if reactor_id not in reactor_buffers:
            reactor_buffers[reactor_id] = deque(maxlen=SEQUENCE_LENGTH)
            for _ in range(SEQUENCE_LENGTH):
                reactor_buffers[reactor_id].append(feature_values)
        reactor_buffers[reactor_id].append(feature_values)
        sequence = np.array(list(reactor_buffers[reactor_id]))
        sequence_normalized = lstm_scaler.transform(sequence)
        sequence_input = sequence_normalized.reshape(1, SEQUENCE_LENGTH, len(FEATURES))
        predictions = lstm_model.predict(sequence_input, verbose=0)[0]
        predicted_class = np.argmax(predictions)
        predicted_label = lstm_le.classes_[predicted_class]
        confidence = float(predictions[predicted_class])
        class_to_risk = {
            'SAFE': predictions[list(lstm_le.classes_).index('SAFE')] if 'SAFE' in lstm_le.classes_ else 0,
            'WARNING': predictions[list(lstm_le.classes_).index('WARNING')] if 'WARNING' in lstm_le.classes_ else 0,
            'CRITICAL': predictions[list(lstm_le.classes_).index('CRITICAL')] if 'CRITICAL' in lstm_le.classes_ else 0,
        }
        lstm_risk_score = round((float(class_to_risk['WARNING']) * 50) + (float(class_to_risk['CRITICAL']) * 100), 1)
        return jsonify({
            'success': True, 'reactor_id': reactor_id,
            'lstm_prediction': predicted_label,
            'lstm_risk_score': lstm_risk_score,
            'lstm_confidence': round(confidence * 100, 1),
            'lstm_probabilities': {
                'safe': round(float(class_to_risk['SAFE']) * 100, 1),
                'warning': round(float(class_to_risk['WARNING']) * 100, 1),
                'critical': round(float(class_to_risk['CRITICAL']) * 100, 1)
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    try:
        readings = request.get_json()
        results = []
        for reading in readings:
            result = calculate_risk_score(reading)
            results.append({'reactor_id': reading.get('reactor_id'), 'risk_score': result['risk_score'], 'status': result['status']})
        return jsonify({'success': True, 'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict-time', methods=['POST'])
def predict_time():
    try:
        data = request.get_json()
        temp = data['temperature']
        temp_roc = data.get('temp_rate_of_change', 0)
        risk_score = data.get('risk_score', 0)
        status = data.get('status', 'SAFE')
        CRITICAL_TEMP = 162
        if status == 'CRITICAL':
            minutes = 0
            message = "🔴 CRITICAL — Thermal runaway in progress!"
            urgency = "CRITICAL"
        elif status == 'WARNING' and temp_roc > 0:
            degrees_remaining = CRITICAL_TEMP - temp
            if degrees_remaining <= 0:
                minutes = 0
                message = "🔴 CRITICAL — Thermal runaway in progress!"
                urgency = "CRITICAL"
            else:
                cycles_remaining = degrees_remaining / temp_roc
                minutes = round((cycles_remaining * 2) / 60, 1)
                if minutes < 5:
                    message = f"🔴 CRITICAL in {minutes} minutes — Immediate action required!"
                    urgency = "CRITICAL"
                elif minutes < 15:
                    message = f"⚠️ Estimated critical in {minutes} minutes — Act now!"
                    urgency = "WARNING"
                else:
                    message = f"⚠️ Estimated critical in {minutes} minutes — Monitor closely"
                    urgency = "CAUTION"
        else:
            minutes = None
            message = "✅ Reactor operating safely — no imminent danger"
            urgency = "SAFE"
        return jsonify({
            'success': True, 'minutes_to_critical': minutes,
            'message': message, 'urgency': urgency,
            'current_temp': temp, 'temp_rate_of_change': temp_roc, 'status': status
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/explain', methods=['POST'])
def explain():
    try:
        data = request.get_json()
        temp = data['temperature']
        pressure = data['pressure']
        cooling = data['cooling_efficiency']
        risk_score = data.get('risk_score', 0)
        temp_roc = data.get('temp_rate_of_change', 0)
        reasons = []
        recommendations = []
        if temp > 200:
            reasons.append(f"🌡️ Temperature critically high at {temp}°C — safe limit is 135°C")
            recommendations.append("Immediately reduce reaction rate")
        elif temp > 160:
            reasons.append(f"🌡️ Temperature dangerously elevated at {temp}°C")
            recommendations.append("Increase cooling flow rate")
        elif temp > 135:
            reasons.append(f"🌡️ Temperature above safe threshold at {temp}°C")
            recommendations.append("Monitor temperature closely")
        if temp_roc > 5:
            reasons.append(f"⚡ Temperature accelerating rapidly — rising {round(temp_roc, 1)}°C per cycle")
            recommendations.append("Emergency cooling activation required")
        elif temp_roc > 2:
            reasons.append(f"⚡ Temperature rising faster than normal — {round(temp_roc, 1)}°C per cycle")
            recommendations.append("Reduce heat input immediately")
        if cooling < 0.3:
            reasons.append(f"❄️ Cooling system critically failing — only {round(cooling*100)}% efficiency")
            recommendations.append("Switch to backup cooling system")
        elif cooling < 0.5:
            reasons.append(f"❄️ Cooling efficiency dangerously low at {round(cooling*100)}%")
            recommendations.append("Inspect and repair cooling system")
        elif cooling < 0.7:
            reasons.append(f"❄️ Cooling efficiency below normal at {round(cooling*100)}%")
            recommendations.append("Check cooling system performance")
        if pressure > 8:
            reasons.append(f"💨 Pressure critically high at {pressure} bar — safe limit is 4.5 bar")
            recommendations.append("Open pressure relief valve immediately")
        elif pressure > 6:
            reasons.append(f"💨 Pressure elevated at {pressure} bar")
            recommendations.append("Reduce reaction rate to lower pressure")
        elif pressure > 4.5:
            reasons.append(f"💨 Pressure above safe threshold at {pressure} bar")
            recommendations.append("Monitor pressure closely")
        if risk_score >= 70:
            overall = "IMMEDIATE ACTION REQUIRED — Thermal runaway imminent"
        elif risk_score >= 30:
            overall = "CAUTION — Reactor showing signs of instability"
        else:
            overall = "Reactor operating within safe parameters"
        if not reasons:
            reasons.append("✅ All parameters within safe operating range")
            recommendations.append("Continue normal operations")
        return jsonify({
            'success': True, 'overall': overall,
            'reasons': reasons, 'recommendations': recommendations, 'risk_score': risk_score
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict-maintenance', methods=['POST'])
def predict_maintenance_endpoint():
    try:
        data = request.get_json()
        reactor_id = data.get('reactor_id', 'unknown')
        if reactor_id not in maintenance_buffers:
            maintenance_buffers[reactor_id] = deque(maxlen=20)
        maintenance_buffers[reactor_id].append({
            'cooling_efficiency': data.get('cooling_efficiency', 0.9),
            'pressure': data.get('pressure', 4.0),
            'reaction_rate': data.get('reaction_rate', 0.5),
            'temperature': data.get('temperature', 120)
        })
        buffer_data = list(maintenance_buffers[reactor_id])
        if len(buffer_data) < 5:
            return jsonify({'success': False, 'message': f'Building maintenance buffer... {len(buffer_data)}/5'})
        result = run_maintenance_prediction(buffer_data)
        if result is None:
            return jsonify({'success': False, 'message': 'Not enough data'})
        return jsonify({
            'success': True, 'reactor_id': reactor_id,
            'overall_health': result['overall_health'],
            'overall_status': result['overall_status'],
            'overall_message': result['overall_message'],
            'components': result['components'],
            'next_maintenance': result['next_maintenance']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/maintenance-bulk', methods=['POST'])
def maintenance_bulk():
    try:
        data = request.get_json()
        reactor_id = data.get('reactor_id')
        readings = data.get('readings', [])

        if len(readings) < 5:
            return jsonify({
                'success': False,
                'message': f'Need at least 5 readings, got {len(readings)}'
            })

        result = run_maintenance_prediction(readings)

        if result is None:
            return jsonify({'success': False, 'message': 'Prediction failed'})

        return jsonify({
            'success': True,
            'reactor_id': reactor_id,
            'overall_health': result['overall_health'],
            'overall_status': result['overall_status'],
            'overall_message': result['overall_message'],
            'components': result['components'],
            'next_maintenance': result['next_maintenance']
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
if __name__ == '__main__':
    print("🚀 Starting ThermalAI ML API...")
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)