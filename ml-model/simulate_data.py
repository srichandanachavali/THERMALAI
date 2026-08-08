import sys

import pandas as pd
import numpy as np
import random
import os

# Windows cp1252 console crashes on emoji in print() — force UTF-8 output.
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except (AttributeError, ValueError):
    pass

np.random.seed(42)
random.seed(42)

reactors = ['A', 'B', 'C', 'D', 'E']
data = []

def generate_safe(reactor_id, n=80):
    records = []
    temp = random.uniform(110, 125)
    pressure = random.uniform(3.5, 4.2)
    for i in range(n):
        # Small natural fluctuations — like a healthy reactor breathes
        temp += random.uniform(-0.5, 0.5)
        temp = max(105, min(temp, 135))
        pressure += random.uniform(-0.05, 0.05)
        pressure = max(3.2, min(pressure, 4.5))
        records.append({
            'reactor_id': reactor_id,
            'timestamp': i,
            'temperature': round(temp, 2),
            'pressure': round(pressure, 2),
            'reaction_rate': round(random.uniform(0.38, 0.62), 2),
            'cooling_efficiency': round(random.uniform(0.82, 0.97), 2),
            'temp_rate_of_change': round(random.uniform(-0.3, 0.3), 3),
            'label': 'SAFE'
        })
    return records

def generate_warning(reactor_id, n=60):
    records = []
    temp = 136
    pressure = 4.6
    cooling = 0.78
    for i in range(n):
        # Gradual escalation — cooling drops first then temp rises
        cooling -= random.uniform(0.003, 0.008)
        cooling = max(0.50, cooling)
        temp += random.uniform(0.3, 1.8)
        pressure += random.uniform(0.05, 0.15)
        temp_roc = random.uniform(0.3, 1.8)
        records.append({
            'reactor_id': reactor_id,
            'timestamp': 80 + i,
            'temperature': round(temp, 2),
            'pressure': round(pressure, 2),
            'reaction_rate': round(random.uniform(0.58, 0.82), 2),
            'cooling_efficiency': round(cooling, 2),
            'temp_rate_of_change': round(temp_roc, 3),
            'label': 'WARNING'
        })
    return records

def generate_critical(reactor_id, n=60):
    records = []
    temp = 162
    pressure = 7.2
    cooling = 0.45
    for i in range(n):
        # Exponential explosion — this is thermal runaway
        temp += random.uniform(2.5, 6.5)
        pressure += random.uniform(0.2, 0.6)
        cooling -= random.uniform(0.005, 0.015)
        cooling = max(0.10, cooling)
        temp_roc = random.uniform(2.5, 6.5)
        records.append({
            'reactor_id': reactor_id,
            'timestamp': 140 + i,
            'temperature': round(temp, 2),
            'pressure': round(pressure, 2),
            'reaction_rate': round(random.uniform(0.80, 1.00), 2),
            'cooling_efficiency': round(cooling, 2),
            'temp_rate_of_change': round(temp_roc, 3),
            'label': 'CRITICAL'
        })
    return records

# Generate for all reactors
for reactor in reactors:
    safe = generate_safe(reactor, 80)
    warning = generate_warning(reactor, 60)
    critical = generate_critical(reactor, 60)
    data.extend(safe + warning + critical)

# Create DataFrame
df = pd.DataFrame(data)

# Save full dataset
os.makedirs('data', exist_ok=True)
df.to_csv('data/reactor_data.csv', index=False)

print("✅ Upgraded data generated successfully!")
print(f"Total records: {len(df)}")
print(f"\nLabel distribution:")
print(df['label'].value_counts())
print(f"\nTemperature ranges per label:")
print(df.groupby('label')['temperature'].agg(['min', 'max', 'mean']).round(2))
print(f"\nCooling efficiency ranges per label:")
print(df.groupby('label')['cooling_efficiency'].agg(['min', 'max', 'mean']).round(2))