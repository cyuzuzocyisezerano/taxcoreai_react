"""
TaxCoreAI – Module 1: Document Classifier
Classifies tax documents into: filing, declaration, certificate, correspondence
Uses TF-IDF + Gradient Boosting with cross-validation.
"""

import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score, train_test_split, StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.preprocessing import LabelEncoder

DATA_DIR  = Path(__file__).parent.parent / "data"
MODEL_DIR = Path(__file__).parent.parent / "models"
MODEL_DIR.mkdir(exist_ok=True)

# Fine-grained doc_type classifier (10 classes)
FINE_LABELS = [
    "vat_return","paye_declaration","cit_filing","withholding_tax",
    "tax_clearance","audit_report","financial_statement","correspondence",
    "penalty_notice","refund_request",
]
# Coarse label classifier (4 classes)
COARSE_LABELS = ["filing","declaration","certificate","correspondence"]


def train_document_classifier():
    print("\n" + "="*60)
    print("MODULE 1 – DOCUMENT CLASSIFIER")
    print("="*60)

    df = pd.read_csv(DATA_DIR / "document_training.csv")
    print(f"Loaded {len(df)} training samples")
    print(f"Class distribution:\n{df['label'].value_counts().to_string()}\n")

    X = df["text"].values
    y_coarse = df["label"].values
    y_fine   = df["doc_type"].values

    results = {}

    # ── Model A: Coarse classifier (filing/declaration/certificate/correspondence)
    print("Training coarse classifier (4 classes)...")
    coarse_pipe = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 3),
            max_features=8000,
            sublinear_tf=True,
            min_df=2,
            strip_accents="unicode",
        )),
        ("clf", LogisticRegression(
            C=5.0,
            max_iter=1000,
            class_weight="balanced",
            solver="lbfgs",
        )),
    ])

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = cross_val_score(coarse_pipe, X, y_coarse, cv=cv, scoring="f1_weighted")
    print(f"  Cross-val F1 (weighted): {scores.mean():.4f} ± {scores.std():.4f}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_coarse, test_size=0.2, random_state=42, stratify=y_coarse
    )
    coarse_pipe.fit(X_train, y_train)
    y_pred = coarse_pipe.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"  Test Accuracy: {acc:.4f}")
    print(f"\n  Classification Report:\n{classification_report(y_test, y_pred, zero_division=0)}")

    joblib.dump(coarse_pipe, MODEL_DIR / "doc_classifier_coarse.pkl")
    results["coarse"] = {"accuracy": round(acc, 4), "cv_f1": round(scores.mean(), 4)}
    print(f"  ✅ Saved: doc_classifier_coarse.pkl")

    # ── Model B: Fine-grained classifier (10 document types)
    print("\nTraining fine-grained classifier (10 doc types)...")
    fine_pipe = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=12000,
            sublinear_tf=True,
            min_df=2,
        )),
        ("clf", GradientBoostingClassifier(
            n_estimators=150,
            max_depth=5,
            learning_rate=0.15,
            subsample=0.8,
            random_state=42,
        )),
    ])

    scores_fine = cross_val_score(fine_pipe, X, y_fine, cv=cv, scoring="f1_weighted")
    print(f"  Cross-val F1 (weighted): {scores_fine.mean():.4f} ± {scores_fine.std():.4f}")

    X_train2, X_test2, yf_train, yf_test = train_test_split(
        X, y_fine, test_size=0.2, random_state=42, stratify=y_fine
    )
    fine_pipe.fit(X_train2, yf_train)
    yf_pred = fine_pipe.predict(X_test2)
    acc_fine = accuracy_score(yf_test, yf_pred)
    print(f"  Test Accuracy: {acc_fine:.4f}")
    print(f"\n  Classification Report:\n{classification_report(yf_test, yf_pred, zero_division=0)}")

    joblib.dump(fine_pipe, MODEL_DIR / "doc_classifier_fine.pkl")
    results["fine"] = {"accuracy": round(acc_fine, 4), "cv_f1": round(scores_fine.mean(), 4)}
    print(f"  ✅ Saved: doc_classifier_fine.pkl")

    # Save metrics
    with open(MODEL_DIR / "doc_classifier_metrics.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n📊 Document Classifier Summary:")
    print(f"   Coarse (4 classes): Accuracy={results['coarse']['accuracy']}, F1={results['coarse']['cv_f1']}")
    print(f"   Fine (10 classes):  Accuracy={results['fine']['accuracy']}, F1={results['fine']['cv_f1']}")
    return results


def predict_document_type(text: str) -> dict:
    """Predict document type from text. Returns coarse + fine prediction with confidence."""
    coarse_pipe = joblib.load(MODEL_DIR / "doc_classifier_coarse.pkl")
    fine_pipe   = joblib.load(MODEL_DIR / "doc_classifier_fine.pkl")

    coarse_label  = coarse_pipe.predict([text])[0]
    coarse_proba  = coarse_pipe.predict_proba([text])[0]
    coarse_conf   = float(max(coarse_proba))
    coarse_classes= coarse_pipe.classes_.tolist()

    fine_label    = fine_pipe.predict([text])[0]
    fine_proba    = fine_pipe.predict_proba([text])[0]
    fine_conf     = float(max(fine_proba))
    fine_classes  = fine_pipe.classes_.tolist()

    return {
        "coarse_label":       coarse_label,
        "coarse_confidence":  round(coarse_conf, 4),
        "coarse_probabilities": dict(zip(coarse_classes, [round(float(p),4) for p in coarse_proba])),
        "fine_label":         fine_label,
        "fine_confidence":    round(fine_conf, 4),
        "fine_probabilities": dict(zip(fine_classes, [round(float(p),4) for p in fine_proba])),
    }


if __name__ == "__main__":
    train_document_classifier()
