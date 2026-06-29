"""
TaxCoreAI – Module 6: Risk Scoring Engine
Predicts:
  1. Audit Risk Score (0-100) – likelihood of being selected for audit
  2. Filing Risk Score – likelihood of late/missing filing
  3. Underpayment Risk – probability of tax underpayment
Combines ML predictions with Rwanda tax law thresholds.
"""

import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, roc_auc_score
from sklearn.preprocessing import RobustScaler
from sklearn.pipeline import Pipeline

DATA_DIR  = Path(__file__).parent.parent / "data"
MODEL_DIR = Path(__file__).parent.parent / "models"
MODEL_DIR.mkdir(exist_ok=True)

RISK_FEATURES = [
    "has_email","has_phone","has_address","has_category","has_reg_date",
    "doc_count","filing_count","days_since_last_filing","late_filings",
    "penalties_count","status_ok","is_flagged","years_registered","is_business",
]

AUDIT_RISK_THRESHOLDS = {
    "vat_refund_large":     50_000_000,   # RWF – triggers audit review
    "income_drop_pct":      40,           # % drop triggers investigation
    "employee_ratio_max":   0.4,          # PAYE/Revenue ratio max normal
    "cash_business_flag":   True,
}

FILING_RISK_WEIGHTS = {
    "late_filings":              0.35,
    "days_since_last_filing":    0.25,
    "penalties_count":           0.20,
    "is_flagged":                0.15,
    "status_ok":                -0.10,
}


def generate_risk_training_data(n=2000):
    """Generate risk-specific training data from compliance data."""
    df = pd.read_csv(DATA_DIR / "compliance_training.csv")

    # Compute audit risk score (rule-based ground truth for training)
    def audit_risk(row):
        score = 0
        if row["late_filings"] > 3:       score += 35
        elif row["late_filings"] > 1:     score += 15
        if row["penalties_count"] > 2:    score += 25
        if row["is_flagged"]:             score += 30
        if not row["status_ok"]:          score += 20
        if row["days_since_last_filing"] > 365: score += 20
        if row["doc_count"] < 2:          score += 10
        if not row["has_category"]:       score += 5
        score += np.random.normal(0, 5)
        return float(np.clip(score, 0, 100))

    # Filing risk (binary: will they file late next period?)
    def filing_risk(row):
        p = 0
        if row["late_filings"] > 0:   p += 0.4
        if row["late_filings"] > 3:   p += 0.2
        if row["days_since_last_filing"] > 90:  p += 0.2
        if not row["has_email"]:      p += 0.1
        if row["is_flagged"]:         p += 0.15
        p = float(np.clip(p + np.random.normal(0, 0.05), 0, 1))
        return int(p > 0.5)

    df["audit_risk_score"] = df.apply(audit_risk, axis=1)
    df["filing_risk_flag"]  = df.apply(filing_risk, axis=1)
    return df


def train_risk_engine():
    print("\n" + "="*60)
    print("MODULE 6 – RISK SCORING ENGINE")
    print("="*60)

    df = generate_risk_training_data()
    X  = df[RISK_FEATURES].values
    y_audit   = df["audit_risk_score"].values
    y_filing  = df["filing_risk_flag"].values

    print(f"Training on {len(df)} samples")
    print(f"Audit risk range: [{y_audit.min():.1f}, {y_audit.max():.1f}], mean={y_audit.mean():.1f}")
    print(f"Filing risk (late): {y_filing.sum()} / {len(y_filing)} ({y_filing.mean()*100:.1f}%)\n")

    # ── Audit Risk Regressor
    print("Training Audit Risk Regressor...")
    X_tr, X_te, ya_tr, ya_te = train_test_split(X, y_audit, test_size=0.2, random_state=42)

    audit_pipe = Pipeline([
        ("scaler", RobustScaler()),
        ("reg", GradientBoostingRegressor(
            n_estimators=200, max_depth=4, learning_rate=0.1,
            subsample=0.8, random_state=42,
        )),
    ])
    audit_pipe.fit(X_tr, ya_tr)
    preds   = audit_pipe.predict(X_te)
    mae     = mean_absolute_error(ya_te, preds)
    print(f"  Audit Risk MAE: {mae:.2f} pts")

    joblib.dump(audit_pipe, MODEL_DIR / "risk_audit_regressor.pkl")
    print(f"  ✅ Saved: risk_audit_regressor.pkl")

    # ── Filing Risk Classifier
    print("\nTraining Filing Risk Classifier...")
    X_tr2, X_te2, yf_tr, yf_te = train_test_split(X, y_filing, test_size=0.2, random_state=42, stratify=y_filing)

    filing_pipe = Pipeline([
        ("scaler", RobustScaler()),
        ("clf", GradientBoostingClassifier(
            n_estimators=150, max_depth=4, learning_rate=0.1,
            subsample=0.8, random_state=42,
        )),
    ])
    filing_pipe.fit(X_tr2, yf_tr)
    proba = filing_pipe.predict_proba(X_te2)[:, 1]
    auc   = roc_auc_score(yf_te, proba)
    print(f"  Filing Risk AUC: {auc:.4f}")

    joblib.dump(filing_pipe,   MODEL_DIR / "risk_filing_classifier.pkl")
    joblib.dump(RISK_FEATURES, MODEL_DIR / "risk_features.pkl")
    print(f"  ✅ Saved: risk_filing_classifier.pkl")

    metrics = {
        "audit_risk_mae":    round(float(mae), 2),
        "filing_risk_auc":   round(float(auc), 4),
        "features":          RISK_FEATURES,
    }
    with open(MODEL_DIR / "risk_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\n📊 Risk Engine: Audit MAE={mae:.2f} | Filing AUC={auc:.4f}")
    return metrics


def predict_risk(taxpayer_features: dict) -> dict:
    """
    Predict all risk scores for a taxpayer.
    Returns audit_risk, filing_risk, overall_risk, alerts.
    """
    feats        = joblib.load(MODEL_DIR / "risk_features.pkl")
    audit_pipe   = joblib.load(MODEL_DIR / "risk_audit_regressor.pkl")
    filing_pipe  = joblib.load(MODEL_DIR / "risk_filing_classifier.pkl")

    X = np.array([[taxpayer_features.get(f, 0) for f in feats]])

    audit_score    = float(np.clip(audit_pipe.predict(X)[0], 0, 100))
    filing_prob    = float(filing_pipe.predict_proba(X)[0][1])

    # Overall risk = weighted average
    overall = 0.6 * audit_score + 0.4 * (filing_prob * 100)

    # Rule-based alerts
    alerts = []
    if audit_score > 70:
        alerts.append({"level":"HIGH","message":"High audit risk – recommend scheduling audit"})
    if filing_prob > 0.7:
        alerts.append({"level":"MEDIUM","message":"High probability of late filing next period – send reminder"})
    if taxpayer_features.get("is_flagged"):
        alerts.append({"level":"HIGH","message":"Taxpayer is flagged – requires officer review"})
    if taxpayer_features.get("penalties_count", 0) >= 3:
        alerts.append({"level":"MEDIUM","message":"Multiple penalties on record – compliance review needed"})
    if taxpayer_features.get("days_since_last_filing", 0) > 180:
        alerts.append({"level":"HIGH","message":"No filing in 6+ months – possible non-compliance"})

    return {
        "audit_risk_score":    round(audit_score, 1),
        "audit_risk_level":    "high" if audit_score > 65 else "medium" if audit_score > 35 else "low",
        "filing_risk_score":   round(filing_prob * 100, 1),
        "filing_risk_level":   "high" if filing_prob > 0.6 else "medium" if filing_prob > 0.3 else "low",
        "overall_risk_score":  round(overall, 1),
        "overall_risk_level":  "high" if overall > 65 else "medium" if overall > 35 else "low",
        "alerts":              alerts,
        "audit_priority":      "immediate" if audit_score > 80 else "scheduled" if audit_score > 50 else "routine",
    }


if __name__ == "__main__":
    train_risk_engine()
