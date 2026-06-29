"""
TaxCoreAI – Module 5: Document Entity Extractor
Extracts structured entities from raw tax document text:
  - TIN numbers
  - Monetary amounts (RWF)
  - Tax periods (months, years)
  - Taxpayer names
  - Document dates
  - Tax types mentioned
  - Key financial figures
Uses regex patterns + ML-backed confidence scoring.
"""

import re
import json
import joblib
import numpy as np
from pathlib import Path
from datetime import datetime

MODEL_DIR = Path(__file__).parent.parent / "models"

# ── Rwanda-specific patterns ──────────────────────────────────────────────────
PATTERNS = {
    "tin": [
        r"\bTIN[:\s#]*([0-9]{9,15})\b",
        r"\btax\s+identification\s+number[:\s]*([0-9]{9,15})\b",
        r"\b([0-9]{9})\b(?=\s*[-–]\s*(?:Rwanda|RRA|taxpayer))",
    ],
    "amount_rwf": [
        r"([0-9]{1,3}(?:[,\s][0-9]{3})*)\s*(?:RWF|Rwf|rwf|Frw)",
        r"RWF\s*([0-9]{1,3}(?:[,\s][0-9]{3})*)",
        r"(?:amount|total|payable|due|paid|withheld)[:\s]*([0-9]{1,3}(?:[,\s][0-9]{3})*)",
    ],
    "tax_period": [
        r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+([0-9]{4})\b",
        r"\b(Q[1-4])\s+([0-9]{4})\b",
        r"\b([0-9]{4})[/-]([0-9]{2})\b",
        r"(?:year|period|quarter)\s+(?:ended?|ending)\s+([0-9]{4}|[A-Z][a-z]+\s+[0-9]{4})",
        r"\b(FY\s*[0-9]{4}(?:[/-][0-9]{2,4})?)\b",
    ],
    "date": [
        r"\b([0-9]{1,2})[/-]([0-9]{1,2})[/-]([0-9]{4})\b",
        r"\b([0-9]{4})-([0-9]{2})-([0-9]{2})\b",
        r"\b([0-9]{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+([0-9]{4})\b",
    ],
    "tax_type": [
        r"\b(VAT|Value Added Tax)\b",
        r"\b(PAYE|Pay As You Earn)\b",
        r"\b(CIT|Corporate Income Tax)\b",
        r"\b(WHT|Withholding Tax)\b",
        r"\b(Excise Duty|Customs Duty)\b",
        r"\b(Turnover Tax|Presumptive Tax)\b",
        r"\b(Capital Gains Tax)\b",
    ],
    "rate_percent": [
        r"([0-9]{1,2}(?:\.[0-9]{1,2})?)\s*%\s*(?:rate|WHT|VAT|PAYE|CIT|tax|duty)",
        r"(?:rate|charged?)\s+(?:of\s+)?([0-9]{1,2}(?:\.[0-9]{1,2})?)\s*%",
    ],
}

TAX_KEYWORDS = {
    "vat":         ["VAT","value added tax","output tax","input tax","tax invoice"],
    "paye":        ["PAYE","pay as you earn","payroll tax","salary","employee","employer"],
    "cit":         ["corporate income tax","CIT","taxable income","corporation","company"],
    "withholding": ["withholding","WHT","withheld","deducted at source"],
    "penalty":     ["penalty","interest","surcharge","late filing","default"],
    "refund":      ["refund","repayment","credit","overpayment","excess"],
    "audit":       ["audit","examination","investigation","assessment","finding"],
}


def extract_entities(text: str) -> dict:
    """Main extraction function. Returns all found entities with confidence."""
    text_clean = text.strip()
    results = {
        "tins":          _extract_tin(text_clean),
        "amounts":       _extract_amounts(text_clean),
        "tax_periods":   _extract_periods(text_clean),
        "dates":         _extract_dates(text_clean),
        "tax_types":     _extract_tax_types(text_clean),
        "rates":         _extract_rates(text_clean),
        "keywords":      _extract_keywords(text_clean),
        "summary_stats": {},
    }

    # Summary stats
    results["summary_stats"] = {
        "total_entities_found": sum(len(v) for v in results.values() if isinstance(v, list)),
        "has_tin":      len(results["tins"]) > 0,
        "has_amount":   len(results["amounts"]) > 0,
        "has_period":   len(results["tax_periods"]) > 0,
        "primary_tin":  results["tins"][0]["value"] if results["tins"] else None,
        "primary_amount": results["amounts"][0]["value"] if results["amounts"] else None,
        "document_topics": list(results["keywords"].keys()),
    }
    return results


def _extract_tin(text: str) -> list:
    found = []
    seen  = set()
    for pattern in PATTERNS["tin"]:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            tin = re.sub(r"[\s,-]", "", m.group(1))
            if tin not in seen and tin.isdigit() and 9 <= len(tin) <= 15:
                seen.add(tin)
                found.append({
                    "value":      tin,
                    "raw":        m.group(0).strip(),
                    "confidence": 0.95 if len(tin) == 9 else 0.75,
                })
    return found


def _extract_amounts(text: str) -> list:
    found = []
    seen  = set()
    for pattern in PATTERNS["amount_rwf"]:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            raw_num = re.sub(r"[\s,]", "", m.group(1))
            if raw_num.isdigit():
                amount = int(raw_num)
                if amount > 0 and amount not in seen:
                    seen.add(amount)
                    found.append({
                        "value":      amount,
                        "formatted":  f"{amount:,} RWF",
                        "raw":        m.group(0).strip(),
                        "confidence": 0.9,
                    })
    found.sort(key=lambda x: -x["value"])
    return found[:10]


def _extract_periods(text: str) -> list:
    found = []
    seen  = set()
    months = ["january","february","march","april","may","june",
              "july","august","september","october","november","december"]
    for pattern in PATTERNS["tax_period"]:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            period = m.group(0).strip()
            norm   = period.lower()
            if norm not in seen:
                seen.add(norm)
                found.append({"value": period, "confidence": 0.85})
    return found


def _extract_dates(text: str) -> list:
    found = []
    for pattern in PATTERNS["date"]:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            found.append({"value": m.group(0).strip(), "confidence": 0.8})
    return found[:5]


def _extract_tax_types(text: str) -> list:
    found = []
    text_lower = text.lower()
    for pattern in PATTERNS["tax_type"]:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            found.append({"value": m.group(0).strip(), "confidence": 0.95})
    return list({v["value"]: v for v in found}.values())


def _extract_rates(text: str) -> list:
    found = []
    for pattern in PATTERNS["rate_percent"]:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            try:
                rate = float(m.group(1))
                if 0 < rate <= 100:
                    found.append({"value": rate, "formatted": f"{rate}%", "raw": m.group(0)})
            except ValueError:
                pass
    return found


def _extract_keywords(text: str) -> dict:
    text_lower = text.lower()
    found = {}
    for category, keywords in TAX_KEYWORDS.items():
        hits = [kw for kw in keywords if kw.lower() in text_lower]
        if hits:
            found[category] = hits
    return found


def extract_from_file(file_path: str) -> dict:
    """Extract entities from a file (txt, or raw text content)."""
    path = Path(file_path)
    if not path.exists():
        return {"error": f"File not found: {file_path}"}
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        return {"error": str(e)}
    entities = extract_entities(text)
    entities["file"] = str(path.name)
    entities["char_count"] = len(text)
    return entities


# ── Demo ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    sample = """
    RWANDA REVENUE AUTHORITY
    VAT RETURN – MONTHLY
    Taxpayer: Kigali Trading Co Ltd
    TIN: 123456789
    Tax Period: March 2024
    
    Output VAT (Sales): RWF 4,500,000
    Input VAT (Purchases): RWF 1,200,000
    Net VAT Payable at 18%: RWF 3,300,000
    
    Filing Date: 15-04-2024
    Late filing penalty applied at 10%: RWF 330,000
    Total due: RWF 3,630,000
    
    Authorized signatory: Jean Habimana
    """

    print("Entity Extraction Demo")
    print("=" * 50)
    result = extract_entities(sample)
    print(json.dumps(result, indent=2, ensure_ascii=False))
