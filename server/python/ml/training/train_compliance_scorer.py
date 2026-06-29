"""
TaxCoreAI – Module 2: Compliance Scorer
Predicts a 0-100 compliance score AND a risk category (low/medium/high)
using Random Forest Regression + classification head.
"""

import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score, train_test_split, KFold
from sklearn.metrics import mean_absolute_error, r2_score, classification_report
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

DATA_DIR  = Path(__file__).parent.parent / "data"
MODEL_DIR = Path(__file__).parent.parent / "models"
MODEL_DIR.mkdir(exist_ok=True)

FEATURES = [
    "has_email","has_phone","has_address","has_category","has_reg_date",
    "doc_count","filing_count","days_since_last_filing","late_filings",
    "penalties_count","status_ok","is_flagged","years_registered","is_business",
]

def score_to_risk(score: float) -> str:
    if score >= 75: return "low"
    if score >= 45: return "medium"
    return "high"


def train_compliance_scorer():
    print("\n" + "="*60)
    print("MODULE 2 – COMPLIANCE SCORER")
    print("="*60)

    df = pd.read_csv(DATA_DIR / "compliance_training.csv")
    print(f"Loaded {len(df)} training samples")

    X = df[FEATURES].values
    y_score = df["compliance_score"].values
    y_risk  = np.array([score_to_risk(s) for s in y_score])

    print(f"Score range: [{y_score.min():.1f}, {y_score.max():.1f}], mean={y_score.mean():.1f}")
    print(f"Risk distribution: {pd.Series(y_risk).value_counts().to_dict()}\n")

    X_train, X_test, ys_train, ys_test, yr_train, yr_test = train_test_split(
        X, y_score, y_risk, test_size=0.2, random_state=42
    )

    # ── Model A: Regression (predicts exact score 0-100)
    print("Training compliance score regressor (RandomForest)...")
    rf_reg = RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=3,
        max_features="sqrt",
        random_state=42,
        n_jobs=-1,
    )
    cv = KFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(rf_reg, X_train, ys_train, cv=cv, scoring="r2")
    print(f"  Cross-val R²: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    rf_reg.fit(X_train, ys_train)
    preds = rf_reg.predict(X_test)
    mae = mean_absolute_error(ys_test, preds)
    r2  = r2_score(ys_test, preds)
    print(f"  Test MAE: {mae:.2f} points | R²: {r2:.4f}")

    # Feature importance
    importances = sorted(zip(FEATURES, rf_reg.feature_importances_), key=lambda x: -x[1])
    print(f"\n  Top Feature Importances:")
    for feat, imp in importances[:6]:
        bar = "█" * int(imp * 50)
        print(f"    {feat:<30} {bar} {imp:.4f}")

    joblib.dump(rf_reg, MODEL_DIR / "compliance_regressor.pkl")
    print(f"\n  ✅ Saved: compliance_regressor.pkl")

    # ── Model B: Risk classifier (low / medium / high)
    print("\nTraining risk classifier (RandomForest)...")
    rf_clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    cv_clf = cross_val_score(rf_clf, X_train, yr_train, cv=cv, scoring="f1_weighted")
    print(f"  Cross-val F1: {cv_clf.mean():.4f} ± {cv_clf.std():.4f}")

    rf_clf.fit(X_train, yr_train)
    risk_preds = rf_clf.predict(X_test)
    print(f"\n  Classification Report:\n{classification_report(yr_test, risk_preds, zero_division=0)}")

    joblib.dump(rf_clf, MODEL_DIR / "compliance_risk_classifier.pkl")
    joblib.dump(FEATURES, MODEL_DIR / "compliance_features.pkl")
    print(f"  ✅ Saved: compliance_risk_classifier.pkl")

    # Save metrics
    metrics = {
        "regressor": {"mae": round(mae,2), "r2": round(r2,4), "cv_r2": round(cv_scores.mean(),4)},
        "classifier": {"cv_f1": round(cv_clf.mean(),4)},
        "features": FEATURES,
    }
    with open(MODEL_DIR / "compliance_metrics.json","w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\n📊 Compliance Scorer Summary: MAE={mae:.2f} pts | R²={r2:.4f} | Risk F1={cv_clf.mean():.4f}")
    return metrics


def predict_compliance(taxpayer_features: dict) -> dict:
    """
    Input: dict with keys matching FEATURES list.
    Output: score (0-100), risk level, explanation.
    """
    feats = joblib.load(MODEL_DIR / "compliance_features.pkl")
    reg   = joblib.load(MODEL_DIR / "compliance_regressor.pkl")
    clf   = joblib.load(MODEL_DIR / "compliance_risk_classifier.pkl")

    X = np.array([[taxpayer_features.get(f, 0) for f in feats]])
    score     = float(np.clip(reg.predict(X)[0], 0, 100))
    risk      = clf.predict(X)[0]
    risk_prob = clf.predict_proba(X)[0]
    risk_classes = clf.classes_.tolist()

    # Human-readable explanation
    explanations = []
    if not taxpayer_features.get("has_email"):
        explanations.append("Missing email address")
    if taxpayer_features.get("is_flagged"):
        explanations.append("Account is flagged for review")
    if taxpayer_features.get("late_filings", 0) > 2:
        explanations.append(f"{taxpayer_features['late_filings']} late filings detected")
    if taxpayer_features.get("days_since_last_filing", 0) > 180:
        explanations.append("No filing activity in 6+ months")
    if taxpayer_features.get("doc_count", 0) == 0:
        explanations.append("No documents on file")
    if taxpayer_features.get("penalties_count", 0) > 0:
        explanations.append(f"{taxpayer_features['penalties_count']} penalties on record")

    return {
        "compliance_score": round(score, 1),
        "risk_level": risk,
        "risk_probabilities": dict(zip(risk_classes, [round(float(p),4) for p in risk_prob])),
        "score_grade": "A" if score>=85 else "B" if score>=70 else "C" if score>=50 else "D",
        "explanations": explanations,
        "recommendations": _get_recommendations(taxpayer_features, score),
    }


def _get_recommendations(features: dict, score: float) -> list:
    recs = []
    if not features.get("has_email"):
        recs.append("Update contact email address in taxpayer profile")
    if not features.get("has_phone"):
        recs.append("Add phone number to taxpayer profile")
    if features.get("late_filings", 0) > 0:
        recs.append("Review filing schedule and set up automated reminders")
    if features.get("doc_count", 0) < 3:
        recs.append("Request and upload required supporting documents")
    if features.get("days_since_last_filing", 0) > 90:
        recs.append("Contact taxpayer regarding overdue filings")
    if score < 50:
        recs.append("Schedule compliance review meeting with tax officer")
    return recs[:4]


if __name__ == "__main__":
    train_compliance_scorer()
