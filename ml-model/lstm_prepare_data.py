import os
import pickle
import sys

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, MinMaxScaler

# Windows cp1252 console crashes on emoji in print() — force UTF-8 output.
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except (AttributeError, ValueError):
    pass

print("=== LSTM DATA PREPARATION v2.0 ===\n")

# Raw 5-class physics data (9 sensors per reading).
df = pd.read_csv('data/reactor_data.csv')
df = df.sort_values(['reactor_id', 'timestamp']).reset_index(drop=True)

print(f"Total records: {len(df)}")
print(f"Labels: {df['label'].value_counts().to_dict()}")

# LSTM input = last 20 readings x 9 raw sensor values.
SEQUENCE_LENGTH = 20
SENSORS = [
    'temperature', 'pressure', 'reaction_rate', 'cooling_efficiency',
    'flow_rate', 'material_level', 'gas_concentration', 'ph_level',
    'emissions_co2_ppm',
]

print("\nNormalizing 9 sensor channels...")
scaler = MinMaxScaler()
df[SENSORS] = scaler.fit_transform(df[SENSORS])

le = LabelEncoder()
df['label_encoded'] = le.fit_transform(df['label'])
print(f"Label encoding: {dict(zip(le.classes_, le.transform(le.classes_)))}")

print("\nBuilding sequences...")
X_sequences, y_labels = [], []
for reactor_id in df['reactor_id'].unique():
    rdf = df[df['reactor_id'] == reactor_id].reset_index(drop=True)
    for i in range(SEQUENCE_LENGTH, len(rdf)):
        seq = rdf[SENSORS].iloc[i - SEQUENCE_LENGTH:i].values
        X_sequences.append(seq)
        y_labels.append(rdf['label_encoded'].iloc[i])

X = np.array(X_sequences)
y = np.array(y_labels)
print(f"Sequences: {len(X)} | Shape: {X.shape}")
print(f"Label distribution: {np.bincount(y, minlength=len(le.classes_)).tolist()}")

# Train / val / test split (stratified).
X_temp, X_test, y_temp, y_test = train_test_split(
    X, y, test_size=0.15, random_state=42, stratify=y)
X_train, X_val, y_train, y_val = train_test_split(
    X_temp, y_temp, test_size=0.176, random_state=42, stratify=y_temp)
print(f"\nTrain: {len(X_train)} | Val: {len(X_val)} | Test: {len(X_test)}")

os.makedirs('data/lstm', exist_ok=True)
for name, arr in [('X_train', X_train), ('X_val', X_val), ('X_test', X_test),
                  ('y_train', y_train), ('y_val', y_val), ('y_test', y_test)]:
    np.save(f'data/lstm/{name}.npy', arr)

os.makedirs('saved-models', exist_ok=True)
with open('saved-models/lstm_scaler.pkl', 'wb') as f:
    pickle.dump(scaler, f)
with open('saved-models/lstm_label_encoder.pkl', 'wb') as f:
    pickle.dump(le, f)

print("\nSaved to data/lstm/*.npy")
print("Saved scaler + label encoder to saved-models/")
print(f"Sequence shape: {X.shape} — ready for LSTM training.")
