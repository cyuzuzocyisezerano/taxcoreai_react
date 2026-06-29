#!/usr/bin/env python3
"""
TaxCoreAI – Python Intelligent System
Handles:
  - Document text extraction & analysis
  - Taxpayer compliance scoring
  - Anomaly detection
  - AI-powered document summarization via Claude API

Usage:
  python taxcore_ai.py analyze-doc --file path/to/doc.pdf
  python taxcore_ai.py score-compliance --tin 1234567890
  python taxcore_ai.py batch-summary --taxpayer-id 42
"""

import argparse
import json
import sys
import os
import requests
import hashlib
from datetime import datetime
from pathlib import Path

# ─── Configuration ────────────────────────────────────────────────────────────
CLAUDE_API_KEY   = os.environ.get("CLAUDE_API_KEY", "YOUR_API_KEY_HERE")
CLAUDE_MODEL     = "claude-sonnet-4-20250514"
CLAUDE_API_URL   = "https://api.anthropic.com/v1/messages"

# ─── Claude API Helper ────────────────────────────────────────────────────────
def call_claude(prompt: str, system: str = "", max_tokens: int = 1024) -> str:
    """Call Claude API and return text response."""
    headers = {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
    }
    payload = {
        "model": CLAUDE_MODEL,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    if system:
        payload["system"] = system

    resp = requests.post(CLAUDE_API_URL, headers=headers, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data["content"][0]["text"]


# ─── Document Analysis ────────────────────────────────────────────────────────
def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF using PyMuPDF (fitz)."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(file_path)
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        return text.strip()
    except ImportError:
        return f"[PyMuPDF not installed – install with: pip install pymupdf]\nFile: {file_path}"
    except Exception as e:
        return f"[Error reading PDF: {e}]"


def analyze_document(file_path: str) -> dict:
    """Analyze a tax document and return structured insights."""
    ext = Path(file_path).suffix.lower()
    
    if ext == ".pdf":
        text = extract_text_from_pdf(file_path)
    elif ext in [".txt", ".md"]:
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
    else:
        return {"error": f"Unsupported file type: {ext}"}

    if not text or len(text) < 20:
        return {"error": "Could not extract meaningful text from document"}

    system = """You are a tax document analyst for Rwanda Revenue Authority (RRA).
Analyze the provided tax document and return a JSON object with these exact keys:
- summary: 2-3 sentence plain English summary
- doc_type: one of [filing, declaration, receipt, certificate, correspondence, other]
- key_fields: object with any of {taxpayer_name, tin, tax_period, amount, filing_date}
- compliance_flags: array of strings describing any issues or missing fields
- risk_level: one of [low, medium, high]
- recommended_actions: array of 1-3 action strings

Respond ONLY with valid JSON. No markdown, no explanation."""

    prompt = f"Analyze this tax document:\n\n{text[:4000]}"  # Limit tokens

    try:
        raw = call_claude(prompt, system=system, max_tokens=800)
        result = json.loads(raw)
        result["file"] = os.path.basename(file_path)
        result["analyzed_at"] = datetime.now().isoformat()
        return result
    except json.JSONDecodeError:
        return {"summary": raw, "error": "Could not parse structured response", "file": file_path}
    except Exception as e:
        return {"error": str(e), "file": file_path}


# ─── Compliance Scoring ───────────────────────────────────────────────────────
def score_compliance(taxpayer_data: dict) -> dict:
    """
    Score a taxpayer's compliance level (0–100) using rule-based heuristics
    combined with AI insight.
    """
    score = 100
    flags = []

    # Rule-based checks
    if not taxpayer_data.get("email"):
        score -= 5
        flags.append("Missing email address")

    if not taxpayer_data.get("phone"):
        score -= 5
        flags.append("Missing phone number")

    if taxpayer_data.get("status") == "flagged":
        score -= 30
        flags.append("Account is flagged for review")

    if taxpayer_data.get("status") == "suspended":
        score -= 50
        flags.append("Account is suspended")

    if not taxpayer_data.get("registration_date"):
        score -= 10
        flags.append("Missing registration date")

    if not taxpayer_data.get("tax_category"):
        score -= 10
        flags.append("Tax category not assigned")

    doc_count = taxpayer_data.get("document_count", 0)
    if doc_count == 0:
        score -= 20
        flags.append("No documents on file")
    elif doc_count < 3:
        score -= 10
        flags.append("Low document count (less than 3 files)")

    score = max(0, min(100, score))

    # Risk classification
    if score >= 80:
        risk = "low"
    elif score >= 50:
        risk = "medium"
    else:
        risk = "high"

    return {
        "tin": taxpayer_data.get("tin", "unknown"),
        "name": taxpayer_data.get("full_name", "unknown"),
        "compliance_score": score,
        "risk_level": risk,
        "flags": flags,
        "scored_at": datetime.now().isoformat(),
    }


# ─── Batch Summarization ──────────────────────────────────────────────────────
def batch_summarize(taxpayer_id: int, documents: list) -> list:
    """Generate AI summaries for multiple documents."""
    results = []
    for doc in documents:
        summary = call_claude(
            f"In 1-2 sentences, summarize this tax document for an RRA officer:\n\nTitle: {doc.get('title')}\nType: {doc.get('doc_type')}\nTags: {doc.get('tags', '')}",
            max_tokens=200
        )
        results.append({
            "document_id": doc["id"],
            "title": doc["title"],
            "summary": summary.strip(),
        })
    return results


# ─── Anomaly Detection ────────────────────────────────────────────────────────
def detect_anomalies(taxpayers: list) -> list:
    """Detect anomalous taxpayer patterns using statistical heuristics."""
    anomalies = []
    
    # Example heuristics
    for tp in taxpayers:
        issues = []
        
        # Check for duplicate-like names (simplified)
        name = tp.get("full_name", "").lower()
        if len(name) < 3:
            issues.append("Suspiciously short name")
        
        # TIN format check (Rwanda TINs are typically 9 digits)
        tin = str(tp.get("tin", ""))
        if not tin.isdigit() or len(tin) < 9:
            issues.append(f"Non-standard TIN format: {tin}")
        
        if issues:
            anomalies.append({
                "taxpayer_id": tp.get("id"),
                "tin": tp.get("tin"),
                "name": tp.get("full_name"),
                "issues": issues,
            })
    
    return anomalies


# ─── CLI Entry Point ──────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="TaxCoreAI Python Intelligent System")
    subparsers = parser.add_subparsers(dest="command")

    # analyze-doc
    p_doc = subparsers.add_parser("analyze-doc", help="Analyze a tax document")
    p_doc.add_argument("--file", required=True, help="Path to document")

    # score-compliance
    p_score = subparsers.add_parser("score-compliance", help="Score taxpayer compliance")
    p_score.add_argument("--data", required=True, help="JSON string of taxpayer data")

    # detect-anomalies
    p_anom = subparsers.add_parser("detect-anomalies", help="Detect anomalies in taxpayer list")
    p_anom.add_argument("--data", required=True, help="JSON array of taxpayer records")

    # ask (quick AI question)
    p_ask = subparsers.add_parser("ask", help="Ask the AI a tax question")
    p_ask.add_argument("--question", required=True, help="The question to ask")

    args = parser.parse_args()

    if args.command == "analyze-doc":
        result = analyze_document(args.file)
        print(json.dumps(result, indent=2, ensure_ascii=False))

    elif args.command == "score-compliance":
        taxpayer_data = json.loads(args.data)
        result = score_compliance(taxpayer_data)
        print(json.dumps(result, indent=2, ensure_ascii=False))

    elif args.command == "detect-anomalies":
        taxpayers = json.loads(args.data)
        result = detect_anomalies(taxpayers)
        print(json.dumps(result, indent=2, ensure_ascii=False))

    elif args.command == "ask":
        system = """You are TaxCoreAI, an expert in Rwanda's tax system and RRA regulations. 
Answer clearly and professionally. Reference specific RRA guidelines where applicable."""
        answer = call_claude(args.question, system=system, max_tokens=512)
        print(answer)

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
