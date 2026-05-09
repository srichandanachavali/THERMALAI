import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import pickle
import os

# Load enriched data
df = pd.read_csv('data/reactor_data_enriched.csv')

print("=== TRAINING THERMALAI AI MODEL ===\n")

# Features we train on
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

# Target — what we predict
TARGET = 'label'

X = df[FEATURES]
y = df[TARGET]

# Split — 80% training, 20% testing
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"Training samples: {len(X_train)}")
print(f"Testing samples: {len(X_test)}")
print(f"Features used: {len(FEATURES)}")
print("\nTraining Random Forest... 🌲")

# Train the model
rf_model = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    random_state=42,
    class_weight='balanced'
)
rf_model.fit(X_train, y_train)

# Evaluate
y_pred = rf_model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"\n✅ Training complete!")
print(f"Accuracy: {accuracy * 100:.2f}%")
print(f"\n=== CLASSIFICATION REPORT ===")
print(classification_report(y_test, y_pred))

print("=== CONFUSION MATRIX ===")
print(confusion_matrix(y_test, y_pred))

# Feature importance
print("\n=== FEATURE IMPORTANCE (what the AI looks at most) ===")
importance = pd.DataFrame({
    'feature': FEATURES,
    'importance': rf_model.feature_importances_
}).sort_values('importance', ascending=False)
print(importance.to_string(index=False))

# Save the model
os.makedirs('saved-models', exist_ok=True)
with open('saved-models/rf_model.pkl', 'wb') as f:
    pickle.dump(rf_model, f)

print("\n✅ Model saved to saved-models/rf_model.pkl")
print("🔥 ThermalAI brain is ready!")