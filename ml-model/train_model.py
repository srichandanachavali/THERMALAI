import json
import os
import pickle
import sys
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (classification_report, confusion_matrix,
                             roc_auc_score)
from sklearn.model_selection import StratifiedKFold, train_test_split

# Windows cp1252 console crashes on emoji in print() — force UTF-8 output.
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except (AttributeError, ValueError):
    pass

from config import FEATURES, CLASSES

df = pd.read_csv('data/reactor_data_enriched.csv')

print("=== TRAINING THERMALAI RF v2.0 (5-class, 22 features) ===\n")

TARGET = 'label'
X = df[FEATURES]
y = df[TARGET]

# Hold out 20% for final evaluation (report / confusion / ROC / CRITICAL FNR).
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y
)
print(f"Train: {len(X_train)} | Test: {len(X_test)} | Features: {len(FEATURES)}")
print(f"Classes: {list(y.unique())}")

# ---- Cross-validation (preserve class balance per fold) ----
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
fold_acc = []
for fold, (tr_idx, va_idx) in enumerate(cv.split(X_train, y_train), start=1):
    clf = RandomForestClassifier(
        n_estimators=200, max_depth=12, min_samples_leaf=5,
        max_features='sqrt', class_weight='balanced',
        random_state=42, n_jobs=-1)
    clf.fit(X_train.iloc[tr_idx], y_train.iloc[tr_idx])
    acc = clf.score(X_train.iloc[va_idx], y_train.iloc[va_idx])
    fold_acc.append(acc)
    print(f"  Fold {fold}: accuracy = {acc * 100:.2f}%")

cv_mean = float(np.mean(fold_acc))
cv_std = float(np.std(fold_acc))
print(f"  CV accuracy: {cv_mean * 100:.2f}% ± {cv_std * 100:.2f}%\n")

# ---- Final model on full training set ----
print("Training final Random Forest...")
model = RandomForestClassifier(
    n_estimators=200, max_depth=12, min_samples_leaf=5,
    max_features='sqrt', class_weight='balanced',
    random_state=42, n_jobs=-1)
model.fit(X_train, y_train)

# ---- Evaluation on holdout ----
y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)

print("\n=== CLASSIFICATION REPORT ===")
print(classification_report(y_test, y_pred, labels=list(model.classes_)))

print("=== CONFUSION MATRIX ===")
print(confusion_matrix(y_test, y_pred, labels=list(model.classes_)))

# ROC-AUC (macro, one-vs-rest)
try:
    roc_auc = float(roc_auc_score(
        y_test, y_prob, multi_class='ovr', average='macro',
        labels=list(model.classes_)))
except ValueError:
    roc_auc = float('nan')
print(f"\nROC-AUC (macro, OvR): {roc_auc:.4f}")

# CRITICAL False Negative Rate — missing a CRITICAL is far worse than a false
# alarm. Target < 5%.
crit_idx = list(model.classes_).index('CRITICAL')
cm = confusion_matrix(y_test, y_pred, labels=list(model.classes_))
tp = int(cm[crit_idx, crit_idx])
fn = int(cm[crit_idx, :].sum() - tp)
fnr = fn / (tp + fn) if (tp + fn) > 0 else 0.0
print(f"CRITICAL False Negative Rate: {fnr * 100:.2f}% (target < 5%)")

# ---- Feature importance ----
importance = pd.DataFrame({
    'feature': FEATURES,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False).reset_index(drop=True)
importance['rank'] = importance.index + 1
print("\n=== TOP 10 FEATURE IMPORTANCE ===")
print(importance.head(10).to_string(index=False))

# ---- Persist model + metadata ----
os.makedirs('saved-models', exist_ok=True)
with open('saved-models/rf_model.pkl', 'wb') as f:
    pickle.dump(model, f)

importance[['feature', 'importance', 'rank']].to_json(
    'saved-models/feature_importance.json', orient='records', indent=2)

metadata = {
    'trained_at': datetime.now(timezone.utc).isoformat(),
    'n_samples': int(len(X)),
    'classes': CLASSES,
    'feature_names': FEATURES,
    'cv_accuracy_mean': round(cv_mean, 4),
    'cv_accuracy_std': round(cv_std, 4),
    'critical_false_negative_rate': round(fnr, 4),
    'roc_auc': round(roc_auc, 4),
    'model_version': '2.0',
}
with open('saved-models/rf_metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)

print("\nSaved: saved-models/rf_model.pkl")
print("Saved: saved-models/feature_importance.json")
print("Saved: saved-models/rf_metadata.json")
print("ThermalAI RF v2.0 ready!")
