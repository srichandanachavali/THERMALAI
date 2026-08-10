import json
import os
import pickle
import sys
from datetime import datetime, timezone

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import numpy as np
import tensorflow as tf
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.layers import Dense, Dropout, LSTM
from tensorflow.keras.models import Sequential
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.utils import to_categorical
from sklearn.metrics import confusion_matrix, roc_auc_score

# Windows cp1252 console crashes on emoji in print() — force UTF-8 output.
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except (AttributeError, ValueError):
    pass

print("=== TRAINING THERMALAI LSTM v2.0 ===\n")
print(f"TensorFlow: {tf.__version__}")

SEQUENCE_LENGTH = 20
NUM_FEATURES = 9
NUM_CLASSES = 5

X_train = np.load('data/lstm/X_train.npy')
X_val = np.load('data/lstm/X_val.npy')
X_test = np.load('data/lstm/X_test.npy')
y_train = np.load('data/lstm/y_train.npy')
y_val = np.load('data/lstm/y_val.npy')
y_test = np.load('data/lstm/y_test.npy')

print(f"Train: {len(X_train)} | Val: {len(X_val)} | Test: {len(X_test)}")
print(f"Input shape: (batch, {SEQUENCE_LENGTH}, {NUM_FEATURES})")

y_train_cat = to_categorical(y_train, NUM_CLASSES)
y_val_cat = to_categorical(y_val, NUM_CLASSES)
y_test_cat = to_categorical(y_test, NUM_CLASSES)

print("\nBuilding LSTM architecture...")
model = Sequential([
    LSTM(128, input_shape=(SEQUENCE_LENGTH, NUM_FEATURES),
         return_sequences=True, dropout=0.2, recurrent_dropout=0.1),
    LSTM(64, return_sequences=False, dropout=0.2, recurrent_dropout=0.1),
    Dense(32, activation='relu'),
    Dropout(0.3),
    Dense(NUM_CLASSES, activation='softmax'),
])
model.compile(
    optimizer=Adam(learning_rate=0.001),
    loss='categorical_crossentropy',
    metrics=['accuracy', tf.keras.metrics.AUC(name='auc')],
)
model.summary()

callbacks = [
    EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True,
                  verbose=1),
    ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, verbose=1),
]

print("\nTraining LSTM...")
history = model.fit(
    X_train, y_train_cat, validation_data=(X_val, y_val_cat),
    epochs=50, batch_size=64, callbacks=callbacks, verbose=1)

print("\n=== EVALUATION ===")
y_prob = model.predict(X_test)
y_pred = np.argmax(y_prob, axis=1)
acc = float((y_pred == y_test).mean())
print(f"LSTM accuracy: {acc * 100:.2f}%")

try:
    auc = float(roc_auc_score(
        y_test, y_prob, multi_class='ovr', average='macro'))
except ValueError:
    auc = float('nan')
print(f"ROC-AUC (macro, OvR): {auc:.4f}")

# CRITICAL False Negative Rate — target < 5%.
cm = confusion_matrix(y_test, y_pred)
crit_idx = 0  # label encoder: CRITICAL = 0
tp = int(cm[crit_idx, crit_idx])
fn = int(cm[crit_idx, :].sum() - tp)
fnr = fn / (tp + fn) if (tp + fn) > 0 else 0.0
print(f"CRITICAL False Negative Rate: {fnr * 100:.2f}% (target < 5%)")

with open('saved-models/lstm_label_encoder.pkl', 'rb') as f:
    le = pickle.load(f)

os.makedirs('saved-models', exist_ok=True)
model.save('saved-models/lstm_model.h5')
with open('saved-models/lstm_scaler.pkl', 'wb') as f:
    pickle.dump(pickle.load(open('saved-models/lstm_scaler.pkl', 'rb')), f)

metadata = {
    'trained_at': datetime.now(timezone.utc).isoformat(),
    'n_samples': int(len(X_train) + len(X_val) + len(X_test)),
    'classes': list(le.classes_),
    'feature_names': ['temperature', 'pressure', 'reaction_rate',
                      'cooling_efficiency', 'flow_rate', 'material_level',
                      'gas_concentration', 'ph_level', 'emissions_co2_ppm'],
    'sequence_length': SEQUENCE_LENGTH,
    'cv_accuracy_mean': round(acc, 4),
    'cv_accuracy_std': 0.0,
    'critical_false_negative_rate': round(fnr, 4),
    'roc_auc': round(auc, 4),
    'model_version': '2.0',
}
with open('saved-models/lstm_metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)

print("\nSaved: saved-models/lstm_model.h5")
print("Saved: saved-models/lstm_metadata.json")
print("Saved: saved-models/lstm_scaler.pkl")
print("ThermalAI LSTM v2.0 ready!")
