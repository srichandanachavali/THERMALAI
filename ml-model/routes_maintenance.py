from flask import Blueprint, request, jsonify

from maintenance import run_maintenance_prediction, buffer_for
from risk_service import load_models
from schedule_service import build_schedule

maintenance_bp = Blueprint('maintenance', __name__)


@maintenance_bp.route('/maintenance-schedule', methods=['POST'])
def maintenance_schedule():
    try:
        load_models()
        data = request.get_json() or {}
        result = build_schedule(data.get('reactor_id'), data.get('history', []) or [])
        if isinstance(result, dict) and result.get('error'):
            return jsonify(result), 400
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@maintenance_bp.route('/predict-maintenance', methods=['POST'])
def predict_maintenance_endpoint():
    try:
        load_models()
        data = request.get_json()
        reactor_id = data.get('reactor_id', 'unknown')
        buffer = buffer_for(reactor_id)
        buffer.append({
            'cooling_efficiency': data.get('cooling_efficiency', 0.9),
            'pressure': data.get('pressure', 4.0),
            'reaction_rate': data.get('reaction_rate', 0.5),
            'temperature': data.get('temperature', 120)
        })
        buffer_data = list(buffer)
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


@maintenance_bp.route('/maintenance-bulk', methods=['POST'])
def maintenance_bulk():
    try:
        load_models()
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
