from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import pickle
import tensorflow as tf
from collections import deque

app = Flask(__name__)
CORS(app)

# ==============================
# Load Random Forest Model
# ==============================
with open('saved-models/rf_model.pkl', 'rb') as f:
    model = pickle.load(f)

print("✅ ThermalAI RF model loaded!")

# ==============================
# Load LSTM Model
# ==============================
lstm_model = tf.keras.models.load_model(
    'saved-models/lstm_model.h5'
)

with open('saved-models/lstm_scaler.pkl', 'rb') as f:
    lstm_scaler = pickle.load(f)

with open('saved-models/lstm_label_encoder.pkl', 'rb') as f:
    lstm_le = pickle.load(f)

print("✅ LSTM model loaded and ready!")

# ==============================
# Sequence Buffer
# ==============================
SEQUENCE_LENGTH = 10
reactor_buffers = {}

# ==============================
# Features
# ==============================
FEATURES = [
    'temperature',
    'pressure',
    'reaction_rate',
    'cooling_efficiency',
    'temp_rate_of_change',
    'temp_rolling_avg',
    'pressure_rolling_avg',
    'temp_acceleration',
    'pressure_temp_ratio',
    'cooling_danger'
]

# ==============================
# Risk Calculation
# ==============================
def calculate_risk_score(reading):

    temp = reading['temperature']
    pressure = reading['pressure']
    cooling = reading['cooling_efficiency']

    features = {
        'temperature': temp,
        'pressure': pressure,
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

    risk_score = round(
        (warning_prob * 50) +
        (critical_prob * 100),
        1
    )

    risk_score = min(100, max(0, risk_score))

    if risk_score < 30:
        status = 'SAFE'
    elif risk_score < 70:
        status = 'WARNING'
    else:
        status = 'CRITICAL'

    return {
        'risk_score': risk_score,
        'status': status,
        'prediction': prediction,
        'probabilities': {
            'safe': round(safe_prob * 100, 1),
            'warning': round(warning_prob * 100, 1),
            'critical': round(critical_prob * 100, 1)
        }
    }

# ==============================
# Home Route
# ==============================
@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'message': 'ThermalAI ML Service Running 🔥',
        'status': 'ready'
    })

# ==============================
# Random Forest Prediction
# ==============================
@app.route('/predict', methods=['POST'])
def predict():

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                'error': 'No data provided'
            }), 400

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
        return jsonify({
            'error': str(e)
        }), 500

# ==============================
# LSTM Prediction
# ==============================
@app.route('/predict-lstm', methods=['POST'])
def predict_lstm():

    try:
        data = request.get_json()

        reactor_id = data.get('reactor_id', 'unknown')

        temp = data['temperature']
        pressure = data['pressure']
        cooling = data['cooling_efficiency']

        feature_dict = {
            'temperature': temp,
            'pressure': pressure,
            'reaction_rate': data.get('reaction_rate', 0.5),
            'cooling_efficiency': cooling,
            'temp_rate_of_change': data.get('temp_rate_of_change', 0),
            'temp_rolling_avg': data.get('temp_rolling_avg', temp),
            'pressure_rolling_avg': data.get('pressure_rolling_avg', pressure),
            'temp_acceleration': data.get('temp_acceleration', 0),
            'pressure_temp_ratio': round(pressure / temp, 4),
            'cooling_danger': round((1 - cooling) * temp, 2)
        }

        feature_values = [
            feature_dict[f]
            for f in FEATURES
        ]

        # Create reactor buffer
        if reactor_id not in reactor_buffers:

            reactor_buffers[reactor_id] = deque(
                maxlen=SEQUENCE_LENGTH
            )

            for _ in range(SEQUENCE_LENGTH):
                reactor_buffers[reactor_id].append(
                    feature_values
                )

        # Add latest reading
        reactor_buffers[reactor_id].append(
            feature_values
        )

        # Build sequence
        sequence = np.array(
            list(reactor_buffers[reactor_id])
        )

        # Normalize
        sequence_normalized = lstm_scaler.transform(
            sequence
        )

        sequence_input = sequence_normalized.reshape(
            1,
            SEQUENCE_LENGTH,
            len(FEATURES)
        )

        # Predict
        predictions = lstm_model.predict(
            sequence_input,
            verbose=0
        )[0]

        predicted_class = np.argmax(predictions)

        predicted_label = lstm_le.classes_[
            predicted_class
        ]

        confidence = float(
            predictions[predicted_class]
        )

        class_to_risk = {
            'SAFE': predictions[
                list(lstm_le.classes_).index('SAFE')
            ] if 'SAFE' in lstm_le.classes_ else 0,

            'WARNING': predictions[
                list(lstm_le.classes_).index('WARNING')
            ] if 'WARNING' in lstm_le.classes_ else 0,

            'CRITICAL': predictions[
                list(lstm_le.classes_).index('CRITICAL')
            ] if 'CRITICAL' in lstm_le.classes_ else 0,
        }

        lstm_risk_score = round(
            (
                float(class_to_risk['WARNING']) * 50
            ) +
            (
                float(class_to_risk['CRITICAL']) * 100
            ),
            1
        )

        return jsonify({
            'success': True,
            'reactor_id': reactor_id,
            'lstm_prediction': predicted_label,
            'lstm_risk_score': lstm_risk_score,
            'lstm_confidence': round(
                confidence * 100,
                1
            ),
            'lstm_probabilities': {
                'safe': round(
                    float(class_to_risk['SAFE']) * 100,
                    1
                ),
                'warning': round(
                    float(class_to_risk['WARNING']) * 100,
                    1
                ),
                'critical': round(
                    float(class_to_risk['CRITICAL']) * 100,
                    1
                )
            }
        })

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

# ==============================
# Batch Prediction
# ==============================
@app.route('/predict/batch', methods=['POST'])
def predict_batch():

    try:
        readings = request.get_json()

        results = []

        for reading in readings:

            result = calculate_risk_score(
                reading
            )

            results.append({
                'reactor_id': reading.get(
                    'reactor_id'
                ),
                'risk_score': result['risk_score'],
                'status': result['status']
            })

        return jsonify({
            'success': True,
            'results': results
        })

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

# ==============================
# Predict Time to Critical
# ==============================
@app.route('/predict-time', methods=['POST'])
def predict_time():

    try:
        data = request.get_json()

        temp = data['temperature']
        temp_roc = data.get(
            'temp_rate_of_change',
            0
        )

        risk_score = data.get(
            'risk_score',
            0
        )

        status = data.get(
            'status',
            'SAFE'
        )

        CRITICAL_TEMP = 162

        if status == 'CRITICAL':

            minutes = 0

            message = (
                "🔴 CRITICAL — "
                "Thermal runaway in progress!"
            )

            urgency = "CRITICAL"

        elif status == 'WARNING' and temp_roc > 0:

            degrees_remaining = (
                CRITICAL_TEMP - temp
            )

            if degrees_remaining <= 0:

                minutes = 0

                message = (
                    "🔴 CRITICAL — "
                    "Thermal runaway in progress!"
                )

                urgency = "CRITICAL"

            else:

                cycles_remaining = (
                    degrees_remaining / temp_roc
                )

                minutes = round(
                    (cycles_remaining * 2) / 60,
                    1
                )

                if minutes < 5:

                    message = (
                        f"🔴 CRITICAL in "
                        f"{minutes} minutes"
                    )

                    urgency = "CRITICAL"

                elif minutes < 15:

                    message = (
                        f"⚠️ Estimated critical "
                        f"in {minutes} minutes"
                    )

                    urgency = "WARNING"

                else:

                    message = (
                        f"⚠️ Estimated critical "
                        f"in {minutes} minutes"
                    )

                    urgency = "CAUTION"

        else:

            minutes = None

            message = (
                "✅ Reactor operating safely"
            )

            urgency = "SAFE"

        return jsonify({
            'success': True,
            'minutes_to_critical': minutes,
            'message': message,
            'urgency': urgency,
            'current_temp': temp,
            'temp_rate_of_change': temp_roc,
            'status': status
        })

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

# ==============================
# Explain Prediction
# ==============================
@app.route('/explain', methods=['POST'])
def explain():

    try:
        data = request.get_json()

        temp = data['temperature']
        pressure = data['pressure']
        cooling = data['cooling_efficiency']
        risk_score = data.get('risk_score', 0)

        reasons = []
        recommendations = []

        if temp > 200:

            reasons.append(
                f"🌡️ Temperature critically "
                f"high at {temp}°C"
            )

            recommendations.append(
                "Immediately reduce reaction rate"
            )

        elif temp > 160:

            reasons.append(
                f"🌡️ Temperature dangerously "
                f"elevated at {temp}°C"
            )

            recommendations.append(
                "Increase cooling flow rate"
            )

        if cooling < 0.5:

            reasons.append(
                f"❄️ Cooling efficiency "
                f"dangerously low"
            )

            recommendations.append(
                "Inspect cooling system"
            )

        if pressure > 6:

            reasons.append(
                f"💨 Pressure elevated "
                f"at {pressure} bar"
            )

            recommendations.append(
                "Reduce reaction rate"
            )

        if risk_score >= 70:

            overall = (
                "IMMEDIATE ACTION REQUIRED"
            )

        elif risk_score >= 30:

            overall = (
                "CAUTION — Reactor unstable"
            )

        else:

            overall = (
                "Reactor operating safely"
            )

        if not reasons:

            reasons.append(
                "✅ All parameters normal"
            )

            recommendations.append(
                "Continue normal operations"
            )

        return jsonify({
            'success': True,
            'overall': overall,
            'reasons': reasons,
            'recommendations': recommendations,
            'risk_score': risk_score
        })

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

# ==============================
# Start Server
# ==============================
if __name__ == '__main__':

    print(
        "🚀 Starting ThermalAI ML API "
        "on port 5001..."
    )

    app.run(
        port=5001,
        debug=True
    )