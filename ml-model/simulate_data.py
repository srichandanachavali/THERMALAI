import os
import random
import sys

import numpy as np
import pandas as pd

from kinetics import REACTOR_CONFIG, init_reactor, step

# Windows cp1252 console crashes on emoji in print() — force UTF-8 output.
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except (AttributeError, ValueError):
    pass

np.random.seed(42)
random.seed(42)

# 5-class training dataset (TRL-5): NOMINAL over-represented (normal ops),
# CRITICAL under-represented but most important — RF uses class_weight='balanced'.
TARGETS = [
    ('NOMINAL', 10000),
    ('DEGRADING', 5000),
    ('WARNING', 4000),
    ('CRITICAL', 3000),
    ('RECOVERY', 2000),
]
N_REACTORS = len(REACTOR_CONFIG)  # 5

COLS = [
    'reactor_id', 'reactor_tag', 'timestamp', 'temperature', 'pressure',
    'reaction_rate', 'cooling_efficiency', 'temp_rate_of_change', 'flow_rate',
    'material_level', 'gas_concentration', 'ph_level', 'emissions_co2_ppm',
    'concentration', 'label',
]

data = []


def _seed(rid, state, temp, cooling, **extra):
    """Reactor forced into a target state; faults disabled so the trajectory
    stays within the intended severity band."""
    c = REACTOR_CONFIG[rid]
    s = init_reactor(rid)
    s['temp'] = temp
    s['cooling_eff'] = cooling
    s['state'] = state
    s['fault_timer'] = 10 ** 9
    for k, v in extra.items():
        s[k] = v
    return c, s


def _row(rid, c, ts, reading, label):
    return {
        'reactor_id': rid, 'reactor_tag': c['tag'], 'timestamp': ts,
        'temperature': reading['temperature'], 'pressure': reading['pressure'],
        'reaction_rate': reading['reaction_rate'],
        'cooling_efficiency': reading['cooling_efficiency'],
        'temp_rate_of_change': reading['temp_rate_of_change'],
        'flow_rate': reading['flow_rate'],
        'material_level': reading['material_level'],
        'gas_concentration': reading['gas_concentration'],
        'ph_level': reading['ph_level'],
        'emissions_co2_ppm': reading['emissions_co2_ppm'],
        'concentration': reading['concentration'], 'label': label,
    }


def _generate(rid, n, state, temp, cooling, label, **extra):
    c, s = _seed(rid, state, temp, cooling, **extra)
    return [_row(rid, c, i, step(rid, s), label) for i in range(n)]


for rid in REACTOR_CONFIG:
    c = REACTOR_CONFIG[rid]
    # NOMINAL — healthy baseline at design operating temp.
    data.extend(_generate(rid, TARGETS[0][1] // N_REACTORS, 'NOMINAL',
                          c['tmin'] + 0.4 * (c['tmax'] - c['tmin']), 0.92, 'NOMINAL'))
    # DEGRADING — early warning: cooling slipping, temp climbing past tmax.
    data.extend(_generate(rid, TARGETS[1][1] // N_REACTORS, 'DEGRADING',
                          c['tmax'] + 5, 0.72, 'DEGRADING'))
    # WARNING — temp well above tmax, cooling compromised.
    data.extend(_generate(rid, TARGETS[2][1] // N_REACTORS, 'WARNING',
                          c['tmax'] + 15, 0.60, 'WARNING'))
    # CRITICAL — approaching runaway: temp at 95% of Trun, cooling nearly gone.
    data.extend(_generate(rid, TARGETS[3][1] // N_REACTORS, 'CRITICAL',
                          c['Trun'] * 0.95, 0.30, 'CRITICAL'))
    # RECOVERY — fuel depleted (<0.1), cooling being restored.
    data.extend(_generate(rid, TARGETS[4][1] // N_REACTORS, 'RECOVERY',
                          c['tmax'], 0.85, 'RECOVERY', concentration=0.05))

df = pd.DataFrame(data, columns=COLS)

os.makedirs('data', exist_ok=True)
df.to_csv('data/reactor_data.csv', index=False)

print("Arrhenius physics-driven 5-class data generated successfully (v2.0).")
print(f"Total records: {len(df)}")
print(f"\nLabel distribution:")
print(df['label'].value_counts())
print(f"\nTemperature ranges per label:")
print(df.groupby('label')['temperature'].agg(['min', 'max', 'mean']).round(2))
print(f"\nCooling efficiency ranges per label:")
print(df.groupby('label')['cooling_efficiency'].agg(['min', 'max', 'mean']).round(2))
print(f"\nPer-reactor tags:")
print(df.groupby('reactor_id')['reactor_tag'].first().to_dict())
