import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import LabelEncoder
import pickle
import os

df = pd.read_csv('data/reactor_data_enriched.csv')

print("=== TRAINING XGBOOST MODEL ===\n")

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

X = df[FEATURES]
y = df['label']

# XGBoost needs numbers not strings
le = LabelEncoder()
y_encoded = le.fit_transform(y)

X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
)

print(f"Training samples: {len(X_train)}")
print(f"Testing samples: {len(X_test)}")
print("\nTraining XGBoost... ⚡")

xgb_model = XGBClassifier(
    n_estimators=100,
    max_depth=6,
    learning_rate=0.1,
    random_state=42,
    eval_metric='mlogloss'
)
xgb_model.fit(X_train, y_train)

y_pred = xgb_model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"\n✅ XGBoost Training complete!")
print(f"XGBoost Accuracy: {accuracy * 100:.2f}%")
print(f"\n=== CLASSIFICATION REPORT ===")
print(classification_report(y_test, y_pred, target_names=le.classes_))

# Save XGBoost model and label encoder
os.makedirs('saved-models', exist_ok=True)
with open('saved-models/xgb_model.pkl', 'wb') as f:
    pickle.dump(xgb_model, f)

with open('saved-models/label_encoder.pkl', 'wb') as f:
    pickle.dump(le, f)

print("\n✅ XGBoost model saved!")
print("🔥 Comparing models:")
print(f"   Random Forest: 100.00%")
print(f"   XGBoost:       {accuracy * 100:.2f}%")