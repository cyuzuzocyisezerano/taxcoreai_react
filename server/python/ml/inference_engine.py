"""
TaxCoreAI – Unified Inference Engine
Single entry point for all ML module predictions.
Called by PHP via shell_exec or as HTTP microservice.

Usage:
  python inference_engine.py --action classify_doc --text "VAT return for March..."
  python inference_engine.py --action score_compliance --data '{"has_email":1,...}'
  python inference_engine.py --action detect_anomaly --data '{"filing_amount":5000000,...}'
  python inference_engine.py --action search --query "VAT registration requirements"
  python inference_engine.py --action extract_entities --text "TIN: 123456789..."
  python inference_engine.py --action predict_risk --data '{"has_email":1,...}'
  python inference_engine.py --action full_analysis --data '{...}'
  python inference_engine.py --action model_status
"""

import sys
import json
import argparse
import traceback
from pathlib import Path

# Make modules importable
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

MODEL_DIR = ROOT / "models"


def action_classify_doc(args_ns):
    from training.train_document_classifier import predict_document_type
    text = args_ns.text or ""
    if not text:
        return {"error": "No text provided"}
    return predict_document_type(text)


def action_score_compliance(args_ns):
    from training.train_compliance_scorer import predict_compliance
    data = json.loads(args_ns.data or "{}")
    return predict_compliance(data)


def action_detect_anomaly(args_ns):
    from training.train_anomaly_detector import detect_anomaly
    data = json.loads(args_ns.data or "{}")
    return detect_anomaly(data)


def action_batch_anomaly(args_ns):
    from training.train_anomaly_detector import batch_detect
    records = json.loads(args_ns.data or "[]")
    return batch_detect(records)


def action_search(args_ns):
    from training.train_search_engine import search
    query    = args_ns.query or ""
    top_k    = int(args_ns.top_k or 5)
    category = args_ns.category or None
    if not query:
        return {"error": "No query provided"}
    return search(query, top_k=top_k, category=category)


def action_extract_entities(args_ns):
    from training.train_entity_extractor import extract_entities
    text = args_ns.text or ""
    if not text:
        return {"error": "No text provided"}
    return extract_entities(text)


def action_predict_risk(args_ns):
    from training.train_risk_engine import predict_risk
    data = json.loads(args_ns.data or "{}")
    return predict_risk(data)


def action_full_analysis(args_ns):
    """
    Runs compliance score + risk prediction + anomaly detection together.
    Input: taxpayer feature dict.
    """
    from training.train_compliance_scorer import predict_compliance
    from training.train_risk_engine import predict_risk
    from training.train_anomaly_detector import detect_anomaly

    data = json.loads(args_ns.data or "{}")

    compliance = predict_compliance(data)
    risk       = predict_risk(data)
    anomaly    = detect_anomaly(data)

    # Consolidated alerts
    all_alerts = []
    for e in compliance.get("explanations", []):
        all_alerts.append({"source": "compliance", "message": e, "level": "warning"})
    for a in risk.get("alerts", []):
        all_alerts.append({"source": "risk", **a})
    if anomaly.get("is_anomaly"):
        all_alerts.append({
            "source": "anomaly",
            "message": f"Anomaly detected: {anomaly['fraud_type']} (score={anomaly['anomaly_score']:.2f})",
            "level": "HIGH",
        })

    # Overall health score (0-100)
    health = (
        0.5 * compliance["compliance_score"]
        + 0.3 * (100 - risk["overall_risk_score"])
        + 0.2 * (100 if not anomaly["is_anomaly"] else 0)
    )

    return {
        "taxpayer_health_score": round(health, 1),
        "health_grade":   "A" if health>=85 else "B" if health>=70 else "C" if health>=50 else "D",
        "compliance":     compliance,
        "risk":           risk,
        "anomaly":        anomaly,
        "alerts":         all_alerts,
        "alert_count":    len(all_alerts),
        "priority_action": _determine_priority_action(compliance, risk, anomaly),
    }


def _determine_priority_action(compliance, risk, anomaly):
    if anomaly.get("is_anomaly") and anomaly.get("anomaly_score", 0) > 0.7:
        return "URGENT: Fraud risk detected – immediate investigation required"
    if risk.get("audit_risk_score", 0) > 75:
        return "Schedule tax audit within 30 days"
    if compliance.get("compliance_score", 100) < 40:
        return "Compliance review needed – contact taxpayer"
    if risk.get("filing_risk_score", 0) > 60:
        return "Send filing reminder – high late-filing probability"
    return "Routine monitoring – no immediate action required"


def action_model_status(args_ns):
    """Check which models are trained and ready."""
    model_files = {
        "document_classifier_coarse": "doc_classifier_coarse.pkl",
        "document_classifier_fine":   "doc_classifier_fine.pkl",
        "compliance_regressor":        "compliance_regressor.pkl",
        "compliance_risk_classifier":  "compliance_risk_classifier.pkl",
        "anomaly_isolation_forest":    "anomaly_isolation_forest.pkl",
        "anomaly_supervised_gbm":      "anomaly_supervised_gbm.pkl",
        "anomaly_type_classifier":     "anomaly_type_classifier.pkl",
        "search_vectorizer":           "search_vectorizer.pkl",
        "search_faiss":                "search_faiss.index",
        "risk_audit_regressor":        "risk_audit_regressor.pkl",
        "risk_filing_classifier":      "risk_filing_classifier.pkl",
    }
    status = {}
    for name, fname in model_files.items():
        path = MODEL_DIR / fname
        status[name] = {
            "ready":    path.exists(),
            "file":     fname,
            "size_kb":  round(path.stat().st_size / 1024, 1) if path.exists() else 0,
        }

    report_path = MODEL_DIR / "training_report.json"
    training_report = {}
    if report_path.exists():
        with open(report_path) as f:
            training_report = json.load(f)

    total_size = sum(v["size_kb"] for v in status.values())
    ready_count = sum(1 for v in status.values() if v["ready"])

    return {
        "models":           status,
        "ready_count":      ready_count,
        "total_models":     len(model_files),
        "all_ready":        ready_count == len(model_files),
        "total_size_kb":    round(total_size, 1),
        "training_report":  training_report,
    }


ACTIONS = {
    "classify_doc":     action_classify_doc,
    "score_compliance": action_score_compliance,
    "detect_anomaly":   action_detect_anomaly,
    "batch_anomaly":    action_batch_anomaly,
    "search":           action_search,
    "extract_entities": action_extract_entities,
    "predict_risk":     action_predict_risk,
    "full_analysis":    action_full_analysis,
    "model_status":     action_model_status,
}


def main():
    parser = argparse.ArgumentParser(description="TaxCoreAI Inference Engine")
    parser.add_argument("--action",   required=True, choices=ACTIONS.keys(), help="Action to perform")
    parser.add_argument("--text",     default="",  help="Raw text input")
    parser.add_argument("--data",     default="{}", help="JSON data string")
    parser.add_argument("--query",    default="",  help="Search query")
    parser.add_argument("--top_k",    default="5", help="Number of search results")
    parser.add_argument("--category", default="",  help="Filter search by category")

    args = parser.parse_args()

    try:
        handler = ACTIONS[args.action]
        result  = handler(args)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        error_result = {
            "error":     str(e),
            "action":    args.action,
            "traceback": traceback.format_exc(),
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
