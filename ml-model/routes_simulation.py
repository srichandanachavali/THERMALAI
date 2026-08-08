from flask import Blueprint, jsonify, request

from simulation.reactor_simulator import ReactorSimulator

simulation_bp = Blueprint('simulation', __name__)


@simulation_bp.route('/simulate', methods=['POST'])
def simulate():
    data = request.get_json()
    if not data or not isinstance(data.get('current_state'), dict):
        return jsonify({'error': 'current_state object is required'}), 400

    reactor_type = data.get('reactor_type', 'nitration')
    try:
        simulator = ReactorSimulator(reactor_type)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

    current_state = data['current_state']
    simulated = simulator.simulate_step(current_state)
    validation = simulator.validate_against_live(simulated, current_state)

    return jsonify({
        'success': True,
        'reactor_id': data.get('reactor_id', 'unknown'),
        'reactor_type': reactor_type,
        **simulated,
        **validation,
    })
