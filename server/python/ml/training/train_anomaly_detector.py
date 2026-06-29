"""
TaxCoreAI – Module 3: Anomaly & Fraud Detection
Two-layer detection:
  Layer 1 – Unsupervised: Isolation Forest (detects unknown patterns)
  Layer 2 – Supervised:   Gradient Boosting (detects known fraud patterns)
Combined ensemble gives final anomaly score + fraud type prediction.
"""

import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import IsolationForest, GradientBoostingClassifier, RandomForestClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.pipeline import Pipeline

DATA_DIR  = Path(__file__).parent.parent / "data"
MODEL_DIR = Path(__file__).parent.parent / "models"
MODEL_DIR.mkdir(exist_ok=True)

FEATURES = [
    "filing_amount","employee_count","filing_frequency_per_year",
    "amount_change_pct","days_between_filings","same_tin_filing_count","is_round_amount",
]

ANOMALY_TYPES = [
    "normal","tin_reuse","amount_spike","ghost_employee",
    "duplicate_filing","round_number_fraud","sudden_zero_filing",
]


def train_anomaly_detector():
    print("\n" + "="*60)
    print("MODULE 3 – ANOMALY & FRAUD DETECTOR")
    print("="*60)

    df = pd.read_csv(DATA_DIR / "anomaly_training.csv")
    print(f"Loaded {len(df)} samples | Anomalies: {df['is_anomaly'].sum()} ({df['is_anomaly'].mean()*100:.1f}%)")

    X = df[FEATURES].values
    y_binary = df["is_anomaly"].values
    y_type   = df["anomaly_type"].values

    # ── Layer 1: Isolation Forest (unsupervised)
    print("\nTraining Isolation Forest (unsupervised layer)...")
    X_normal = X[y_binary == 0]

    iso_pipe = Pipeline([
        ("scaler", RobustScaler()),
        ("iso", IsolationForest(
            n_estimators=200,
            contamination=0.12,
            max_samples="auto",
            random_state=42,
            n_jobs=-1,
        )),
    ])
    iso_pipe.fit(X_normal)  # train only on normal samples

    # Evaluate on full set
    iso_preds = iso_pipe.predict(X)
    iso_labels = (iso_preds == -1).astype(int)  # -1 = anomaly in IF
    iso_auc = roc_auc_score(y_binary, iso_labels)
    print(f"  Isolation Forest AUC: {iso_auc:.4f}")

    joblib.dump(iso_pipe, MODEL_DIR / "anomaly_isolation_forest.pkl")
    print(f"  ✅ Saved: anomaly_isolation_forest.pkl")

    # ── Layer 2: Supervised Gradient Boosting (known fraud patterns)
    print("\nTraining supervised fraud detector (GBM)...")
    X_train, X_test, y_train, y_test, yt_train, yt_test = train_test_split(
        X, y_binary, y_type, test_size=0.2, random_state=42, stratify=y_binary
    )

    gbm_pipe = Pipeline([
        ("scaler", RobustScaler()),
        ("clf", GradientBoostingClassifier(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.1,
            subsample=0.85,
            min_samples_leaf=5,
            random_state=42,
        )),
    ])

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_auc = cross_val_score(gbm_pipe, X_train, y_train, cv=cv, scoring="roc_auc")
    print(f"  Cross-val AUC: {cv_auc.mean():.4f} ± {cv_auc.std():.4f}")

    gbm_pipe.fit(X_train, y_train)
    test_preds  = gbm_pipe.predict(X_test)
    test_proba  = gbm_pipe.predict_proba(X_test)[:, 1]
    test_auc    = roc_auc_score(y_test, test_proba)

    print(f"  Test AUC: {test_auc:.4f}")
    print(f"\n  Classification Report:\n{classification_report(y_test, test_preds, zero_division=0)}")

    cm = confusion_matrix(y_test, test_preds)
    tn, fp, fn, tp = cm.ravel()
    print(f"  Confusion Matrix: TP={tp}, FP={fp}, TN={tn}, FN={fn}")

    joblib.dump(gbm_pipe, MODEL_DIR / "anomaly_supervised_gbm.pkl")
    print(f"  ✅ Saved: anomaly_supervised_gbm.pkl")

    # ── Layer 3: Fraud Type Classifier (what kind of fraud?)
    print("\nTraining fraud-type classifier (multi-class)...")
    X_anom = X[y_binary == 1]
    y_anom = y_type[y_binary == 1]

    type_pipe = Pipeline([
        ("scaler", RobustScaler()),
        ("clf", RandomForestClassifier(
            n_estimators=150,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )),
    ])
    if len(X_anom) > 20:
        Xa_train, Xa_test, ya_train, ya_test = train_test_split(
            X_anom, y_anom, test_size=0.2, random_state=42, stratify=y_anom
        )
        type_pipe.fit(Xa_train, ya_train)
        ya_pred = type_pipe.predict(Xa_test)
        print(f"\n  Fraud Type Report:\n{classification_report(ya_test, ya_pred, zero_division=0)}")
    else:
        type_pipe.fit(X_anom, y_anom)

    joblib.dump(type_pipe, MODEL_DIR / "anomaly_type_classifier.pkl")
    joblib.dump(FEATURES, MODEL_DIR / "anomaly_features.pkl")
    print(f"  ✅ Saved: anomaly_type_classifier.pkl")

    metrics = {
        "isolation_forest_auc": round(float(iso_auc), 4),
        "supervised_gbm_auc":   round(float(test_auc), 4),
        "supervised_gbm_cv_auc": round(float(cv_auc.mean()), 4),
        "features": FEATURES,
    }
    with open(MODEL_DIR / "anomaly_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\n📊 Anomaly Detector Summary:")
    print(f"   Isolation Forest AUC:  {iso_auc:.4f}")
    print(f"   Supervised GBM AUC:    {test_auc:.4f}")
    return metrics


def detect_anomaly(record: dict) -> dict:
    """
    Score a single filing/taxpayer record for anomalies.
    Returns: anomaly_score, is_anomaly, fraud_type, explanation
    """
    feats      = joblib.load(MODEL_DIR / "anomaly_features.pkl")
    iso_pipe   = joblib.load(MODEL_DIR / "anomaly_isolation_forest.pkl")
    gbm_pipe   = joblib.load(MODEL_DIR / "anomaly_supervised_gbm.pkl")
    type_pipe  = joblib.load(MODEL_DIR / "anomaly_type_classifier.pkl")

    X = np.array([[record.get(f, 0) for f in feats]])

    # Layer 1: Isolation Forest score (-1 to 1, lower = more anomalous)
    iso_score    = float(iso_pipe.named_steps["iso"].score_samples(
        iso_pipe.named_steps["scaler"].transform(X)
    )[0])
    iso_flag     = iso_pipe.predict(X)[0] == -1

    # Layer 2: Supervised probability
    gbm_prob     = float(gbm_pipe.predict_proba(X)[0][1])
    gbm_flag     = gbm_prob >= 0.5

    # Ensemble: weighted combination
    # Normalize iso_score to 0-1 (more anomalous = higher)
    iso_norm     = float(np.clip((-iso_score + 0.5) / 1.0, 0, 1))
    ensemble     = 0.4 * iso_norm + 0.6 * gbm_prob
    is_anomaly   = ensemble >= 0.45

    # Fraud type (only if anomalous)
    fraud_type   = "none"
    fraud_conf   = 0.0
    if is_anomaly:
        fraud_type  = type_pipe.predict(X)[0]
        fraud_conf  = float(max(type_pipe.predict_proba(X)[0]))

    # Human-readable flags
    flags = []
    amount = record.get("filing_amount", 0)
    if amount == 0:
        flags.append("Zero filing amount detected")
    if amount > 500_000_000:
        flags.append(f"Unusually large filing amount: {amount:,.0f} RWF")
    if record.get("same_tin_filing_count", 1) > 2:
        flags.append(f"TIN used in {record['same_tin_filing_count']} simultaneous filings")
    if record.get("employee_count", 0) > 1000:
        flags.append(f"Unusually high employee count: {record['employee_count']}")
    if record.get("days_between_filings", 30) == 0:
        flags.append("Duplicate filing detected (0 days between filings)")
    if record.get("amount_change_pct", 0) > 400:
        flags.append(f"Extreme amount increase: +{record['amount_change_pct']:.0f}%")
    if record.get("amount_change_pct", 0) < -90:
        flags.append(f"Sudden drop in filing amount: {record['amount_change_pct']:.0f}%")

    return {
        "is_anomaly":        bool(is_anomaly),
        "anomaly_score":     round(float(ensemble), 4),
        "isolation_score":   round(iso_norm, 4),
        "supervised_prob":   round(gbm_prob, 4),
        "fraud_type":        fraud_type,
        "fraud_confidence":  round(fraud_conf, 4),
        "risk_level":        "high" if ensemble > 0.7 else "medium" if ensemble > 0.45 else "low",
        "flags":             flags,
        "recommended_action": _recommend_action(is_anomaly, fraud_type, ensemble),
    }


def _recommend_action(is_anomaly: bool, fraud_type: str, score: float) -> str:
    if not is_anomaly:
        return "No action required"
    actions = {
        "tin_reuse":            "Immediately freeze TIN and investigate duplicate registrations",
        "amount_spike":         "Request supporting documentation for large filing amount",
        "ghost_employee":       "Conduct payroll audit and verify employee records",
        "duplicate_filing":     "Block duplicate filing and contact taxpayer for clarification",
        "round_number_fraud":   "Flag for detailed audit - suspicious round-number pattern",
        "sudden_zero_filing":   "Contact taxpayer - business may have ceased operations",
    }
    default = "Flag for manual review by senior tax officer"
    action = actions.get(fraud_type, default)
    if score > 0.8:
        action = "URGENT: " + action
    return action


def batch_detect(records: list) -> list:
    """Run anomaly detection on a batch of records."""
    return [detect_anomaly(r) for r in records]


if __name__ == "__main__":
    train_anomaly_detector()
