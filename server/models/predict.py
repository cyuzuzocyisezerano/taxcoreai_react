#!/usr/bin/env python3
"""
TaxCoreAI – Model Wrapper
Wrapper around the trained ML models for document classification.
Reads JSON {"text": "..."} from stdin and writes JSON classification to stdout.
Uses the trained models from server/python/ml/ if available, falls back to heuristics.
"""
import sys
import json
import os
from pathlib import Path

# Add the ML module to path
ROOT = Path(__file__).resolve().parent.parent / "python"
sys.path.insert(0, str(ROOT))

def classify_with_models(text: str):
    """Try to use trained models for classification."""
    try:
        from ml.inference_engine import action_classify_doc
        
        # Create a mock args namespace
        class Args:
            def __init__(self, text_value: str):
                self.text = text_value
        
        result = action_classify_doc(Args(text))
        if result and not result.get("error"):
            return result
    except Exception as e:
        print(f"Model classification failed: {e}", file=sys.stderr)
    
    return None

def heuristic_classify(text: str):
    """Fallback heuristic classification."""
    t = (text or "").lower()
    if 'vat' in t or 'value added' in t:
        return {'type': 'VAT Return', 'confidence': 0.92}
    if 'income tax' in t or 'payroll' in t:
        return {'type': 'Income Tax', 'confidence': 0.85}
    if 'invoice' in t:
        return {'type': 'Invoice', 'confidence': 0.88}
    return {'type': 'Other', 'confidence': 0.5}

def main():
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw or '{}')
        text = payload.get('text', '')
        
        # Try trained models first, fall back to heuristics
        result = classify_with_models(text)
        used_model = result is not None

        if not result:
            result = heuristic_classify(text)

        result.update({
            "entities": [],
            "model": "trained-ml" if used_model else "heuristic",
            "analyzedAt": None
        })
        
        sys.stdout.write(json.dumps(result))
    except Exception as e:
        sys.stderr.write('predict error: ' + str(e))
        sys.exit(1)

if __name__ == '__main__':
    main()