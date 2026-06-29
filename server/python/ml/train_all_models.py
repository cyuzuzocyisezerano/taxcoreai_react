"""
TaxCoreAI – Master Training Pipeline
Trains ALL 6 ML modules in sequence and produces a full report.
Run: python train_all_models.py
"""

import sys
import json
import time
from pathlib import Path
from datetime import datetime

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent))

def separator(title):
    print(f"\n{'█'*60}")
    print(f"  {title}")
    print(f"{'█'*60}")

def main():
    print("""
╔══════════════════════════════════════════════════════════════╗
║          TaxCoreAI – Intelligent System Training             ║
║          Rwanda Revenue Authority (RRA)                      ║
║          All ML Modules                                      ║
╚══════════════════════════════════════════════════════════════╝
    """)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    all_metrics = {}
    start_total = time.time()

    # ── Step 0: Generate training data
    separator("STEP 0 – Generating Training Data")
    t = time.time()
    from data.generate_training_data import (
        generate_document_data, generate_compliance_data,
        generate_anomaly_data, generate_search_corpus,
    )
    generate_document_data(1200)
    generate_compliance_data(2500)
    generate_anomaly_data(3000)
    generate_search_corpus()
    all_metrics["data_generation"] = {"duration_s": round(time.time()-t, 2)}
    print(f"\n✅ Data generation: {time.time()-t:.1f}s")

    # ── Step 1: Document Classifier
    separator("STEP 1 – Document Classifier")
    t = time.time()
    from training.train_document_classifier import train_document_classifier
    m1 = train_document_classifier()
    all_metrics["document_classifier"] = {**m1, "duration_s": round(time.time()-t, 2)}
    print(f"\n✅ Document Classifier done: {time.time()-t:.1f}s")

    # ── Step 2: Compliance Scorer
    separator("STEP 2 – Compliance Scorer")
    t = time.time()
    from training.train_compliance_scorer import train_compliance_scorer
    m2 = train_compliance_scorer()
    all_metrics["compliance_scorer"] = {**m2, "duration_s": round(time.time()-t, 2)}
    print(f"\n✅ Compliance Scorer done: {time.time()-t:.1f}s")

    # ── Step 3: Anomaly Detector
    separator("STEP 3 – Anomaly & Fraud Detector")
    t = time.time()
    from training.train_anomaly_detector import train_anomaly_detector
    m3 = train_anomaly_detector()
    all_metrics["anomaly_detector"] = {**m3, "duration_s": round(time.time()-t, 2)}
    print(f"\n✅ Anomaly Detector done: {time.time()-t:.1f}s")

    # ── Step 4: Search Engine
    separator("STEP 4 – Semantic Search Engine")
    t = time.time()
    from training.train_search_engine import build_search_index
    m4 = build_search_index()
    all_metrics["search_engine"] = {**m4, "duration_s": round(time.time()-t, 2)}
    print(f"\n✅ Search Engine done: {time.time()-t:.1f}s")

    # ── Step 5: Risk Engine
    separator("STEP 5 – Risk Scoring Engine")
    t = time.time()
    from training.train_risk_engine import train_risk_engine
    m5 = train_risk_engine()
    all_metrics["risk_engine"] = {**m5, "duration_s": round(time.time()-t, 2)}
    print(f"\n✅ Risk Engine done: {time.time()-t:.1f}s")

    # ── Step 6: Entity Extractor (no training needed, rule-based)
    separator("STEP 6 – Entity Extractor (Rule-based NER)")
    t = time.time()
    from training.train_entity_extractor import extract_entities
    test = extract_entities("Taxpayer: Kigali Co Ltd, TIN: 123456789, VAT payable RWF 2,500,000 for March 2024")
    print(f"  Test extraction: TINs={test['tins']}, Amounts={test['amounts'][:1]}")
    all_metrics["entity_extractor"] = {"status": "ready", "type": "rule_based", "duration_s": round(time.time()-t, 2)}
    print(f"\n✅ Entity Extractor ready: {time.time()-t:.1f}s")

    # ── Final Report
    total_time = time.time() - start_total
    all_metrics["total_training_time_s"] = round(total_time, 2)
    all_metrics["trained_at"] = datetime.now().isoformat()

    model_dir = Path(__file__).parent / "models"
    models_saved = list(model_dir.glob("*.pkl")) + list(model_dir.glob("*.npy")) + list(model_dir.glob("*.index"))
    all_metrics["models_saved"] = len(models_saved)

    report_path = model_dir / "training_report.json"
    with open(report_path, "w") as f:
        json.dump(all_metrics, f, indent=2)

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║              TRAINING COMPLETE – SUMMARY                     ║
╠══════════════════════════════════════════════════════════════╣
║  📄 Document Classifier                                      ║
║     Coarse F1:  {all_metrics['document_classifier']['coarse']['cv_f1']:.4f}                                     ║
║     Fine F1:    {all_metrics['document_classifier']['fine']['cv_f1']:.4f}                                     ║
║                                                              ║
║  📊 Compliance Scorer                                        ║
║     MAE:        {all_metrics['compliance_scorer']['regressor']['mae']:.2f} pts                                   ║
║     R²:         {all_metrics['compliance_scorer']['regressor']['r2']:.4f}                                     ║
║                                                              ║
║  🔍 Anomaly Detector                                         ║
║     ISO AUC:    {all_metrics['anomaly_detector']['isolation_forest_auc']:.4f}                                     ║
║     GBM AUC:    {all_metrics['anomaly_detector']['supervised_gbm_auc']:.4f}                                     ║
║                                                              ║
║  🔎 Search Engine                                            ║
║     Articles:   {all_metrics['search_engine']['articles']}                                          ║
║                                                              ║
║  ⚠️  Risk Engine                                             ║
║     Audit MAE:  {all_metrics['risk_engine']['audit_risk_mae']:.2f} pts                                   ║
║     Filing AUC: {all_metrics['risk_engine']['filing_risk_auc']:.4f}                                     ║
║                                                              ║
║  💾 Models Saved: {len(models_saved)} files                                    ║
║  ⏱️  Total Time:  {total_time:.1f}s                                       ║
╚══════════════════════════════════════════════════════════════╝

Report saved: {report_path}
All models ready for inference in: {model_dir}
    """)


if __name__ == "__main__":
    main()
