import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
from sklearn.model_selection import train_test_split
import pickle
import os

print("=== LSTM DATA PREPARATION ===\n")

# Load enriched data
df = pd.read_csv('data/reactor_data_enriched.csv')
df = df.sort_values(['reactor_id', 'timestamp']).reset_index(drop=True)

print(f"Total records: {len(df)}")
print(f"Reactors: {df['reactor_id'].unique()}")
print(f"Labels: {df['label'].value_counts().to_dict()}")

# Features for LSTM
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

SEQUENCE_LENGTH = 10  # Look at last 10 readings to predict next state

# Step 1 — Normalize features
print("\nNormalizing features...")
scaler = MinMaxScaler()
df[FEATURES] = scaler.fit_transform(df[FEATURES])

# Step 2 — Encode labels
le = LabelEncoder()
df['label_encoded'] = le.fit_transform(df['label'])
print(f"Label encoding: {dict(zip(le.classes_, le.transform(le.classes_)))}")

# Step 3 — Build sequences per reactor
print("\nBuilding sequences...")
X_sequences = []
y_labels = []

for reactor_id in df['reactor_id'].unique():
    reactor_df = df[df['reactor_id'] == reactor_id].reset_index(drop=True)
    
    for i in range(SEQUENCE_LENGTH, len(reactor_df)):
        # Last 10 readings as input
        sequence = reactor_df[FEATURES].iloc[i-SEQUENCE_LENGTH:i].values
        # Next reading's label as output
        label = reactor_df['label_encoded'].iloc[i]
        
        X_sequences.append(sequence)
        y_labels.append(label)

X = np.array(X_sequences)
y = np.array(y_labels)

print(f"Total sequences: {len(X)}")
print(f"Sequence shape: {X.shape}")  # (samples, 10, 10)
print(f"Label distribution: {np.bincount(y)}")

# Step 4 — Train/val/test split
X_temp, X_test, y_temp, y_test = train_test_split(
    X, y, test_size=0.15, random_state=42, stratify=y
)
X_train, X_val, y_train, y_val = train_test_split(
    X_temp, y_temp, test_size=0.176, random_state=42, stratify=y_temp
)

print(f"\nTrain: {len(X_train)} | Val: {len(X_val)} | Test: {len(X_test)}")

# Step 5 — Save everything
os.makedirs('data/lstm', exist_ok=True)
np.save('data/lstm/X_train.npy', X_train)
np.save('data/lstm/X_val.npy', X_val)
np.save('data/lstm/X_test.npy', X_test)
np.save('data/lstm/y_train.npy', y_train)
np.save('data/lstm/y_val.npy', y_val)
np.save('data/lstm/y_test.npy', y_test)

# Save scaler and label encoder
with open('saved-models/lstm_scaler.pkl', 'wb') as f:
    pickle.dump(scaler, f)

with open('saved-models/lstm_label_encoder.pkl', 'wb') as f:
    pickle.dump(le, f)

print("\n✅ Data preparation complete!")
print(f"Saved to data/lstm/")
print(f"Scaler saved to saved-models/lstm_scaler.pkl")
print(f"Label encoder saved to saved-models/lstm_label_encoder.pkl")
print(f"\nSequence shape: {X.shape} — ready for LSTM training!")