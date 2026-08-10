import os

from flask import Flask, jsonify, request
from flask_cors import CORS

import risk_service
from sequence_buffer import reactor_buffers
from config import frontend_origins, service_port, ml_api_key
from routes_risk import risk_bp
from routes_maintenance import maintenance_bp
from routes_simulation import simulation_bp

app = Flask(__name__)
# 1H: reject oversized payloads early (10KB) before they reach model inference.
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024

# CORS locked to allow-list (default: local dev). Multiple origins allowed via comma.
CORS(app, origins=frontend_origins())


@app.before_request
def _require_api_key():
    # 1H: when ML_API_KEY is set, every non-/health request must present it.
    # Health stays open so the backend watchdog can poll liveness.
    expected = ml_api_key()
    if expected and request.endpoint != 'health':
        key = request.headers.get('X-ML-Key')
        if key != expected:
            return jsonify({'error': 'unauthorized'}), 401


@app.after_request
def _apply_security_headers(response):
    response.headers.setdefault('X-Content-Type-Options', 'nosniff')
    response.headers.setdefault('X-Frame-Options', 'DENY')
    response.headers.setdefault('Referrer-Policy', 'no-referrer')
    response.headers.setdefault('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    return response


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'models_loaded': risk_service.model is not None,
        'reactor_buffers': len(reactor_buffers),
        'extended_sensors': True
    })


@app.route('/', methods=['GET'])
def home():
    return jsonify({'message': 'ThermalAI ML Service Running 🔥', 'status': 'ready'})


app.register_blueprint(risk_bp)
app.register_blueprint(maintenance_bp)
app.register_blueprint(simulation_bp)


if __name__ == '__main__':
    print("Starting ThermalAI ML API...")  # ASCII only — emoji crashes Windows cp1252 console
    app.run(host='0.0.0.0', port=service_port(), debug=False, threaded=True)
