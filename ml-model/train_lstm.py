import numpy as np
import pickle
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from tensorflow.keras.utils import to_categorical
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

print("=== TRAINING THERMALAI LSTM MODEL ===\n")
print(f"TensorFlow version: {tf.__version__}")

# Load prepared data
X_train = np.load('data/lstm/X_train.npy')
X_val = np.load('data/lstm/X_val.npy')
X_test = np.load('data/lstm/X_test.npy')
y_train = np.load('data/lstm/y_train.npy')
y_val = np.load('data/lstm/y_val.npy')
y_test = np.load('data/lstm/y_test.npy')

print(f"Training samples: {len(X_train)}")
print(f"Validation samples: {len(X_val)}")
print(f"Test samples: {len(X_test)}")
print(f"Input shape: {X_train.shape[1:]}")

NUM_CLASSES = 3
SEQUENCE_LENGTH = X_train.shape[1]
NUM_FEATURES = X_train.shape[2]

# Convert labels to one-hot
y_train_cat = to_categorical(y_train, NUM_CLASSES)
y_val_cat = to_categorical(y_val, NUM_CLASSES)
y_test_cat = to_categorical(y_test, NUM_CLASSES)

# Build LSTM model
print("\nBuilding LSTM architecture...")

model = Sequential([
    # First LSTM layer
    LSTM(64, input_shape=(SEQUENCE_LENGTH, NUM_FEATURES),
         return_sequences=True, name='lstm_1'),
    BatchNormalization(),
    Dropout(0.2),

    # Second LSTM layer
    LSTM(32, return_sequences=False, name='lstm_2'),
    BatchNormalization(),
    Dropout(0.2),

    # Dense layers
    Dense(32, activation='relu', name='dense_1'),
    Dropout(0.1),
    Dense(16, activation='relu', name='dense_2'),

    # Output layer
    Dense(NUM_CLASSES, activation='softmax', name='output')
])

model.compile(
    optimizer='adam',
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

model.summary()

# Callbacks
callbacks = [
    EarlyStopping(
        monitor='val_accuracy',
        patience=10,
        restore_best_weights=True,
        verbose=1
    ),
    ModelCheckpoint(
        'saved-models/lstm_best.h5',
        monitor='val_accuracy',
        save_best_only=True,
        verbose=1
    )
]

print("\n🚀 Training LSTM model...")
history = model.fit(
    X_train, y_train_cat,
    validation_data=(X_val, y_val_cat),
    epochs=50,
    batch_size=32,
    callbacks=callbacks,
    verbose=1
)

# Evaluate
print("\n=== EVALUATION ===")
y_pred_prob = model.predict(X_test)
y_pred = np.argmax(y_pred_prob, axis=1)
accuracy = accuracy_score(y_test, y_pred)

print(f"\n✅ LSTM Accuracy: {accuracy * 100:.2f}%")

# Load label encoder
with open('saved-models/lstm_label_encoder.pkl', 'rb') as f:
    le = pickle.load(f)

print("\n=== CLASSIFICATION REPORT ===")
print(classification_report(y_test, y_pred, target_names=le.classes_))

print("=== CONFUSION MATRIX ===")
print(confusion_matrix(y_test, y_pred))

# Save final model
model.save('saved-models/lstm_model.h5')
print("\n✅ LSTM model saved to saved-models/lstm_model.h5")

# Compare with Random Forest
print("\n=== MODEL COMPARISON ===")
print(f"Random Forest: 100.00%")
print(f"LSTM:          {accuracy * 100:.2f}%")
print("\n🔥 ThermalAI LSTM brain is ready!")