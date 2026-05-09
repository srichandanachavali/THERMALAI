import pandas as pd
import numpy as np
import random
import os

# So we get same results every time
np.random.seed(42)
random.seed(42)

reactors = ['A', 'B', 'C', 'D', 'E']
data = []

def generate_safe(n=60):
    records = []
    for _ in range(n):
        records.append({
            'temperature': round(random.uniform(110, 135), 2),
            'pressure': round(random.uniform(3.5, 4.5), 2),
            'reaction_rate': round(random.uniform(0.4, 0.6), 2),
            'cooling_efficiency': round(random.uniform(0.80, 0.95), 2),
            'label': 'SAFE'
        })
    return records

def generate_warning(n=40):
    records = []
    temp = 135
    for _ in range(n):
        temp += random.uniform(0.5, 1.5)
        records.append({
            'temperature': round(temp, 2),
            'pressure': round(random.uniform(4.5, 6.5), 2),
            'reaction_rate': round(random.uniform(0.6, 0.8), 2),
            'cooling_efficiency': round(random.uniform(0.55, 0.75), 2),
            'label': 'WARNING'
        })
    return records

def generate_critical(n=40):
    records = []
    temp = 155
    for _ in range(n):
        temp += random.uniform(2.0, 5.0)
        records.append({
            'temperature': round(temp, 2),
            'pressure': round(random.uniform(6.5, 10.0), 2),
            'reaction_rate': round(random.uniform(0.8, 1.0), 2),
            'cooling_efficiency': round(random.uniform(0.20, 0.50), 2),
            'label': 'CRITICAL'
        })
    return records

# Generate data for all 5 reactors
for reactor in reactors:
    safe = generate_safe(60)
    warning = generate_warning(40)
    critical = generate_critical(40)
    
    all_records = safe + warning + critical
    
    for i, record in enumerate(all_records):
        record['reactor_id'] = reactor
        record['timestamp'] = i
    
    data.extend(all_records)

# Create DataFrame
df = pd.DataFrame(data)

# Shuffle the data
df = df.sample(frac=1).reset_index(drop=True)

# Save to CSV
os.makedirs('data', exist_ok=True)
df.to_csv('data/reactor_data.csv', index=False)

print("✅ Data generated successfully!")
print(f"Total records: {len(df)}")
print(f"\nLabel distribution:")
print(df['label'].value_counts())
print(f"\nSample data:")
print(df.head(10))