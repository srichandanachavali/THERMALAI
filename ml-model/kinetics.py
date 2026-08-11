# kinetics.py — Shared Arrhenius physics engine for ThermalAI simulators.
# Used by stream_data.py (live feed) and simulate_data.py (training data) so the
# ML model trains on the same physics that drives the live stream. Constants are
# embedded per ISA S5.1 tag (no external config). Heat generation is anchored to
# each reactor's design operating temp; Arrhenius makes Q_gen outgrow cooling as
# temperature rises, which is what drives thermal runaway.
import math
import random

R_GAS = 8.314          # J/mol/K
DT = 2.0               # seconds per physics step
COOLING_AREA = 4.5     # m2, shared by all reactors

# ISA S5.1 process tags + embedded Arrhenius kinetics.
REACTOR_CONFIG = {
    'R-101': {'tag': 'R-101', 'name': 'Nitration Train 1', 'short': 'Nitration-1', 'process_type': 'aromatic_nitration',
          'Ea': 85000, 'A': 2e8, 'dH': -165000, 'U': 450, 'Cp': 1850, 'mass': 800,
          'Tc': 15, 'Trun': 150, 'tmin': 110, 'tmax': 140, 'pmin': 3.5, 'pmax': 6.0, 'ph0': 7.0, 'phase': 200},
    'R-102': {'tag': 'R-102', 'name': 'Nitration Train 2', 'short': 'Nitration-2', 'process_type': 'aromatic_nitration',
          'Ea': 85000, 'A': 2e8, 'dH': -165000, 'U': 450, 'Cp': 1850, 'mass': 800,
          'Tc': 15, 'Trun': 150, 'tmin': 110, 'tmax': 140, 'pmin': 3.5, 'pmax': 6.0, 'ph0': 7.0, 'phase': 50},
    'R-201': {'tag': 'R-201', 'name': 'Hydrogenation Train 1', 'short': 'Hydrogenation-1', 'process_type': 'catalytic_hydrogenation',
          'Ea': 62000, 'A': 5e6, 'dH': -92000, 'U': 380, 'Cp': 2100, 'mass': 600,
          'Tc': 10, 'Trun': 120, 'tmin': 80, 'tmax': 110, 'pmin': 5.0, 'pmax': 9.0, 'ph0': 6.5, 'phase': 100},
    'R-202': {'tag': 'R-202', 'name': 'Hydrogenation Train 2', 'short': 'Hydrogenation-2', 'process_type': 'catalytic_hydrogenation',
          'Ea': 62000, 'A': 5e6, 'dH': -92000, 'U': 380, 'Cp': 2100, 'mass': 600,
          'Tc': 10, 'Trun': 120, 'tmin': 80, 'tmax': 110, 'pmin': 5.0, 'pmax': 9.0, 'ph0': 6.5, 'phase': 250},
    'R-301': {'tag': 'R-301', 'name': 'Polymerization Reactor', 'short': 'Polymerize', 'process_type': 'polymerization',
          'Ea': 75000, 'A': 1e6, 'dH': -138000, 'U': 320, 'Cp': 2400, 'mass': 1200,
          'Tc': 20, 'Trun': 180, 'tmin': 120, 'tmax': 160, 'pmin': 2.0, 'pmax': 5.0, 'ph0': 7.0, 'phase': 150},
}

FAULTS = ['cooling_pump_failure', 'feed_valve_stuck_open', 'coolant_contamination', 'vent_blockage']


def init_reactor(rid):
    c = REACTOR_CONFIG[rid]
    return {
        'temp': c['tmin'] + 0.4 * (c['tmax'] - c['tmin']),
        'pressure': c['pmin'] + 0.4 * (c['pmax'] - c['pmin']),
        'reaction_rate': 0.0, 'cooling_eff': 0.92, 'flow_rate': 150.0,
        'material_level': 80.0, 'gas': 0.0, 'ph': c['ph0'], 'co2': 400.0,
        'concentration': 1.0, 'temp_roc': 0.0, 'state': 'NOMINAL',
        'fault': None, 'fault_ramp': 0, 'fault_timer': c['phase'],
    }


def _physics(c, s):
    T = s['temp']
    k = c['A'] * math.exp(-c['Ea'] / (R_GAS * (T + 273.15)))
    if s['fault'] == 'feed_valve_stuck_open':
        k *= 2.0
    T_design = 0.5 * (c['tmin'] + c['tmax']) + 273.15
    k_design = c['A'] * math.exp(-c['Ea'] / (R_GAS * T_design))
    # rate anchored so design-point sits at 0.5 (pH stable), runaway -> 1.0.
    s['reaction_rate'] = min(1.0, 0.5 * k / k_design)
    Q_rem_design = c['U'] * COOLING_AREA * (T_design - 273.15 - c['Tc']) * 0.92
    Q_gen = (k / k_design) * Q_rem_design * s['concentration']
    Q_rem = c['U'] * COOLING_AREA * (T - c['Tc']) * s['cooling_eff']
    dT = (Q_gen - Q_rem) / (c['mass'] * c['Cp']) * DT
    s['temp'] = max(-20.0, min(450.0, T + dT + random.gauss(0, 0.15)))
    s['pressure'] = max(0.0, min(50.0, s['pressure'] + dT * 0.065 + random.gauss(0, 0.02)))
    s['temp_roc'] = dT
    # Fuel consumed through runaway until cooled; normal states top it back up.
    if s['state'] in ('CRITICAL', 'RECOVERY'):
        s['concentration'] = max(0.0, s['concentration'] - 0.02)
    else:
        s['concentration'] = min(1.0, s['concentration'] + 0.001)


def _sensors(c, s):
    st = s['state']
    if st in ('DEGRADING',):
        s['cooling_eff'] -= 0.002
    elif st == 'WARNING':
        s['cooling_eff'] -= 0.004
    elif st == 'CRITICAL':
        s['cooling_eff'] -= 0.008
    else:
        s['cooling_eff'] += (0.92 - s['cooling_eff']) * 0.05
    s['cooling_eff'] = max(0.10, min(0.97, s['cooling_eff']))

    if s['fault'] == 'cooling_pump_failure':
        s['cooling_eff'] = max(0.15, s['cooling_eff'])
        s['flow_rate'] = 5.0
    else:
        s['flow_rate'] = max(0.0, 150.0 * s['cooling_eff'] / 0.92 + random.gauss(0, 5.0))

    if s['fault'] == 'feed_valve_stuck_open':
        s['material_level'] = 97.0
    else:
        s['material_level'] = max(5.0, min(100.0, 80.0 - (1.0 - s['concentration']) * 60.0))

    if st == 'CRITICAL':
        s['gas'] = max(0.0, (s['temp'] - c['Trun'] + 20.0) * 2.5)
    else:
        s['gas'] = max(0.0, s['gas'] + random.gauss(0, 0.4))

    s['co2'] = 400.0 + s['reaction_rate'] * 200.0
    if st in ('WARNING', 'CRITICAL'):
        s['co2'] += (s['temp'] / c['Trun']) * 300.0
    if s['fault'] == 'vent_blockage':
        s['co2'] = 4500.0
        s['pressure'] = min(50.0, s['pressure'] + 0.3)

    if s['fault'] == 'coolant_contamination':
        s['ph'] += (3.5 - s['ph']) / max(1.0, 20.0 - s['fault_ramp'])
    else:
        s['ph'] += (s['reaction_rate'] - 0.5) * 0.02
    s['ph'] = max(2.0, min(12.0, s['ph']))


def _state_machine(c, s):
    T, P = s['temp'], s['pressure']
    tmax, pmax, Trun = c['tmax'], c['pmax'], c['Trun']
    crit = (T > Trun * 0.95) or (s['gas'] > 25) or (s['ph'] < 3 or s['ph'] > 11)
    warn = (T > tmax) or (P > pmax * 0.85)
    deg = (s['cooling_eff'] < 0.75) or (s['flow_rate'] < 50)
    st = s['state']
    if st == 'RECOVERY':
        if T <= tmax:
            s['state'] = 'NOMINAL'
            s['concentration'] = 1.0; s['material_level'] = 80.0
            s['cooling_eff'] = 0.92; s['flow_rate'] = 150.0; s['ph'] = c['ph0']
    elif st == 'CRITICAL':
        if s['concentration'] < 0.1:
            s['state'] = 'RECOVERY'
    elif st == 'WARNING':
        if crit: s['state'] = 'CRITICAL'
        elif not warn: s['state'] = 'DEGRADING' if deg else 'NOMINAL'
    elif st == 'DEGRADING':
        if crit: s['state'] = 'CRITICAL'
        elif T > tmax + 15: s['state'] = 'WARNING'
        elif not deg: s['state'] = 'NOMINAL'
    else:  # NOMINAL
        if crit: s['state'] = 'CRITICAL'
        elif warn: s['state'] = 'WARNING'
        elif deg: s['state'] = 'DEGRADING'
        elif random.random() < 0.002: s['state'] = 'DEGRADING'


def _faults(c, s):
    if s['fault'] is not None:
        s['fault_ramp'] += 1
        if s['fault_ramp'] >= 60:
            s['fault'] = None; s['fault_ramp'] = 0
            s['cooling_eff'] = 0.92; s['flow_rate'] = 150.0
            s['fault_timer'] = 300 + int(random.gauss(0, 40))
        return
    s['fault_timer'] -= 1
    if s['fault_timer'] <= 0:
        s['fault'] = random.choice(FAULTS)
        s['fault_ramp'] = 0


def step(rid, s):
    c = REACTOR_CONFIG[rid]
    _faults(c, s)
    _physics(c, s)
    _sensors(c, s)
    _state_machine(c, s)
    return {
        'reactor_id': rid, 'reactor_tag': c['tag'], 'reactor_name': c['name'],
        'process_type': c['process_type'], 'temperature': round(s['temp'], 2),
        'pressure': round(s['pressure'], 2), 'reaction_rate': round(s['reaction_rate'], 4),
        'cooling_efficiency': round(s['cooling_eff'], 3), 'flow_rate': round(s['flow_rate'], 1),
        'material_level': round(s['material_level'], 1), 'gas_concentration': round(s['gas'], 1),
        'ph_level': round(s['ph'], 2), 'emissions_co2_ppm': round(s['co2'], 0),
        'temp_rate_of_change': round(s['temp_roc'], 3), 'concentration': round(s['concentration'], 4),
        'fault_active': s['fault'], 'state': s['state'],
    }
