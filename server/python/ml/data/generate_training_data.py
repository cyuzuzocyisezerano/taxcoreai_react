"""
TaxCoreAI – Training Data Generator
Generates realistic synthetic RRA/Rwanda tax data for training all ML models.
In production, replace or augment with real anonymized RRA records.
"""

import json
import random
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta

random.seed(42)
np.random.seed(42)

OUT = Path(__file__).parent

# ── Rwanda-specific constants ─────────────────────────────────────────────────
DISTRICTS = [
    "Gasabo","Kicukiro","Nyarugenge","Bugesera","Gatsibo","Kayonza","Kirehe",
    "Ngoma","Nyagatare","Rwamagana","Burera","Gakenke","Gicumbi","Musanze",
    "Rulindo","Gisagara","Huye","Kamonyi","Muhanga","Nyamagabe","Nyanza",
    "Nyaruguru","Ruhango","Karongi","Ngororero","Nyabihu","Nyamasheke",
    "Rubavu","Rusizi","Rutsiro",
]
TAX_CATEGORIES = [
    "Large Taxpayer","Medium Taxpayer","Small Taxpayer",
    "Micro Taxpayer","Non-profit Organization","Government Entity",
]
DOC_TYPES = [
    "vat_return","paye_declaration","cit_filing","withholding_tax",
    "tax_clearance","audit_report","financial_statement","correspondence",
    "penalty_notice","refund_request",
]
DOC_TYPE_LABELS = {  # Mapped to model classes
    "vat_return": "filing",
    "paye_declaration": "declaration",
    "cit_filing": "filing",
    "withholding_tax": "declaration",
    "tax_clearance": "certificate",
    "audit_report": "filing",
    "financial_statement": "filing",
    "correspondence": "correspondence",
    "penalty_notice": "correspondence",
    "refund_request": "declaration",
}
BUSINESS_NAMES = [
    "Kigali Trading Co","Rwanda Fresh Ltd","Inzora Tech","Ubumwe Investments",
    "Amahoro Construction","Inyange Industries","Isange Distributors",
    "Umucyo Pharmacy","Rebero Holdings","Gahanga Agro","Bugesera Dairy",
    "Kimironko Supermarket","Remera Electronics","Nyabugogo Transport",
    "Kanombe Logistics","Masaka Textiles","Ruliba Ceramics",
]
FIRST_NAMES = ["Jean","Marie","Pierre","Claudine","Patrick","Alice","Emmanuel",
               "Yvonne","Innocent","Diane","Eric","Solange","Michel","Chantal"]
LAST_NAMES  = ["Habimana","Nkurunziza","Uwimana","Kamanzi","Bizimana",
               "Mukamana","Ndayishimiye","Umubyeyi","Hakizimana","Niyomugabo"]

# ─────────────────────────────────────────────────────────────────────────────
# 1. DOCUMENT CLASSIFIER TRAINING DATA
# ─────────────────────────────────────────────────────────────────────────────
def make_doc_text(doc_type: str, tp_name: str, tin: str, period: str, amount: float) -> str:
    templates = {
        "vat_return": (
            f"VALUE ADDED TAX RETURN\nRwanda Revenue Authority\nTaxpayer: {tp_name}\n"
            f"TIN: {tin}\nTax Period: {period}\nOutput VAT: {amount*1.18:.0f} RWF\n"
            f"Input VAT: {amount*0.3:.0f} RWF\nNet VAT Payable: {amount*0.88:.0f} RWF\n"
            f"Filing Date: {datetime.now().strftime('%Y-%m-%d')}\nSignature of authorized person"
        ),
        "paye_declaration": (
            f"PAY AS YOU EARN DECLARATION\nRwanda Revenue Authority\nEmployer: {tp_name}\n"
            f"TIN: {tin}\nMonth: {period}\nTotal Employees: {random.randint(5,200)}\n"
            f"Gross Salaries: {amount:.0f} RWF\nPAYE Withheld: {amount*0.3:.0f} RWF\n"
            f"Declaration filed in compliance with Income Tax Law"
        ),
        "cit_filing": (
            f"CORPORATE INCOME TAX RETURN\nRwanda Revenue Authority\n"
            f"Company: {tp_name}\nTIN: {tin}\nFinancial Year: {period}\n"
            f"Taxable Income: {amount:.0f} RWF\nCIT at 30%: {amount*0.3:.0f} RWF\n"
            f"Advance Tax Paid: {amount*0.1:.0f} RWF\nBalance Due: {amount*0.2:.0f} RWF"
        ),
        "withholding_tax": (
            f"WITHHOLDING TAX DECLARATION\nRwanda Revenue Authority\n"
            f"Withholder: {tp_name}\nTIN: {tin}\nPeriod: {period}\n"
            f"Nature of Payment: Services\nGross Amount: {amount:.0f} RWF\n"
            f"WHT Rate: 15%\nTax Withheld: {amount*0.15:.0f} RWF"
        ),
        "tax_clearance": (
            f"TAX CLEARANCE CERTIFICATE\nRwanda Revenue Authority\n"
            f"This is to certify that {tp_name} (TIN: {tin}) has no outstanding tax obligations "
            f"as of {period}. All taxes including VAT, PAYE, and CIT have been paid in full. "
            f"Certificate valid for 3 months from date of issue."
        ),
        "audit_report": (
            f"TAX AUDIT REPORT\nRwanda Revenue Authority – Audit Division\n"
            f"Taxpayer: {tp_name}\nTIN: {tin}\nAudit Period: {period}\n"
            f"Scope: VAT, PAYE, CIT\nFindings: {random.choice(['No irregularities found','Minor discrepancies noted','Significant underpayment identified'])}\n"
            f"Recommended Action: {random.choice(['None','Issue penalty notice','Refer for further investigation'])}"
        ),
        "financial_statement": (
            f"FINANCIAL STATEMENTS\n{tp_name}\nTIN: {tin}\nYear Ended: {period}\n"
            f"Total Revenue: {amount:.0f} RWF\nTotal Expenses: {amount*0.7:.0f} RWF\n"
            f"Net Profit Before Tax: {amount*0.3:.0f} RWF\n"
            f"Prepared in accordance with IFRS as adopted in Rwanda"
        ),
        "correspondence": (
            f"Rwanda Revenue Authority\nP.O. Box 3987, Kigali\n\nDear {tp_name},\n"
            f"RE: Your TIN {tin} – {random.choice(['Request for information','Notice of assessment','Objection response','Meeting invitation'])}\n"
            f"We write with reference to your account for the period {period}. "
            f"Please respond within 15 working days.\nYours faithfully,\nCommissioner General, RRA"
        ),
        "penalty_notice": (
            f"NOTICE OF PENALTY\nRwanda Revenue Authority\nTo: {tp_name}\nTIN: {tin}\n"
            f"Period: {period}\nThis notice informs you of a penalty of {amount*0.1:.0f} RWF "
            f"for late filing of tax returns. Payment must be made within 30 days to avoid "
            f"further interest charges under the Tax Procedures Law."
        ),
        "refund_request": (
            f"APPLICATION FOR TAX REFUND\nRwanda Revenue Authority\n"
            f"Taxpayer: {tp_name}\nTIN: {tin}\nPeriod: {period}\n"
            f"Overpaid Amount: {amount:.0f} RWF\nReason: Excess VAT input credits\n"
            f"Bank Account: {random.randint(100000,999999)}\nBank: Bank of Kigali"
        ),
    }
    return templates.get(doc_type, f"Tax document for {tp_name}, TIN {tin}, period {period}")

def generate_document_data(n=1000):
    records = []
    for _ in range(n):
        doc_type = random.choice(DOC_TYPES)
        tp_name  = random.choice(BUSINESS_NAMES) if random.random() > 0.4 else f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        tin      = str(random.randint(100000000, 999999999))
        year     = random.randint(2020, 2024)
        month    = random.randint(1, 12)
        period   = f"{year}-{month:02d}" if random.random() > 0.3 else str(year)
        amount   = round(random.expovariate(1/5_000_000) + 50_000, 0)
        text     = make_doc_text(doc_type, tp_name, tin, period, amount)
        label    = DOC_TYPE_LABELS[doc_type]
        records.append({"text": text, "doc_type": doc_type, "label": label, "amount": amount})
    df = pd.DataFrame(records)
    df.to_csv(OUT / "document_training.csv", index=False)
    print(f"✅ Document classifier data: {len(df)} samples → {df['label'].value_counts().to_dict()}")
    return df

# ─────────────────────────────────────────────────────────────────────────────
# 2. COMPLIANCE SCORER TRAINING DATA
# ─────────────────────────────────────────────────────────────────────────────
def generate_compliance_data(n=2000):
    records = []
    for _ in range(n):
        has_email       = random.random() > 0.2
        has_phone       = random.random() > 0.15
        has_address     = random.random() > 0.1
        has_category    = random.random() > 0.25
        has_reg_date    = random.random() > 0.05
        doc_count       = int(random.expovariate(1/8))
        filing_count    = int(random.expovariate(1/6))
        days_since_last = int(random.expovariate(1/120))
        late_filings    = max(0, int(np.random.poisson(1.5)))
        penalties       = max(0, int(np.random.poisson(0.8)))
        status_ok       = random.choices([1,0], weights=[0.75,0.25])[0]
        is_flagged      = random.choices([0,1], weights=[0.9,0.1])[0]
        years_reg       = random.randint(0, 20)
        type_business   = random.random() > 0.45

        # Compute rule-based score
        score = 100
        if not has_email:       score -= 5
        if not has_phone:       score -= 5
        if not has_address:     score -= 8
        if not has_category:    score -= 10
        if not has_reg_date:    score -= 10
        if doc_count == 0:      score -= 25
        elif doc_count < 3:     score -= 12
        if filing_count == 0:   score -= 20
        elif filing_count < 3:  score -= 8
        if days_since_last > 365: score -= 15
        elif days_since_last > 180: score -= 8
        score -= min(30, late_filings * 6)
        score -= min(25, penalties * 8)
        if not status_ok:       score -= 20
        if is_flagged:          score -= 30

        # Add noise (real-world uncertainty)
        score += np.random.normal(0, 3)
        score = float(np.clip(score, 0, 100))

        records.append({
            "has_email": int(has_email),
            "has_phone": int(has_phone),
            "has_address": int(has_address),
            "has_category": int(has_category),
            "has_reg_date": int(has_reg_date),
            "doc_count": doc_count,
            "filing_count": filing_count,
            "days_since_last_filing": days_since_last,
            "late_filings": late_filings,
            "penalties_count": penalties,
            "status_ok": status_ok,
            "is_flagged": is_flagged,
            "years_registered": years_reg,
            "is_business": int(type_business),
            "compliance_score": round(score, 2),
        })
    df = pd.DataFrame(records)
    df.to_csv(OUT / "compliance_training.csv", index=False)
    print(f"✅ Compliance scorer data: {len(df)} samples | score range [{df['compliance_score'].min():.1f}, {df['compliance_score'].max():.1f}]")
    return df

# ─────────────────────────────────────────────────────────────────────────────
# 3. ANOMALY DETECTION TRAINING DATA
# ─────────────────────────────────────────────────────────────────────────────
def generate_anomaly_data(n=3000):
    records = []
    for _ in range(n):
        is_anomaly = random.random() < 0.12  # ~12% anomaly rate

        if is_anomaly:
            anomaly_type = random.choice([
                "tin_reuse","amount_spike","ghost_employee",
                "duplicate_filing","round_number_fraud","sudden_zero_filing",
            ])
            filing_amount     = random.choice([0, round(random.uniform(1e8,1e9),-3), round(random.uniform(100,999)*1000)])
            employee_count    = random.choice([0, random.randint(500,5000)])
            filing_frequency  = random.choice([0, random.randint(24,48)])
            amount_change_pct = random.choice([random.uniform(500,2000), -99, random.uniform(-80,-50)])
            days_between      = random.choice([0, random.randint(400,1000)])
            same_tin_filings  = random.randint(2, 8)
            round_amount      = int(filing_amount % 1000 == 0 and filing_amount > 0)
        else:
            anomaly_type      = "normal"
            filing_amount     = round(random.expovariate(1/2_000_000) + 10_000, 0)
            employee_count    = random.randint(1, 100)
            filing_frequency  = random.randint(10, 15)
            amount_change_pct = random.uniform(-30, 50)
            days_between      = random.randint(25, 35)
            same_tin_filings  = 1
            round_amount      = int(filing_amount % 1000 == 0)

        records.append({
            "filing_amount": filing_amount,
            "employee_count": employee_count,
            "filing_frequency_per_year": filing_frequency,
            "amount_change_pct": amount_change_pct,
            "days_between_filings": days_between,
            "same_tin_filing_count": same_tin_filings,
            "is_round_amount": round_amount,
            "is_anomaly": int(is_anomaly),
            "anomaly_type": anomaly_type,
        })
    df = pd.DataFrame(records)
    df.to_csv(OUT / "anomaly_training.csv", index=False)
    print(f"✅ Anomaly detection data: {len(df)} samples | {df['is_anomaly'].sum()} anomalies ({df['is_anomaly'].mean()*100:.1f}%)")
    return df

# ─────────────────────────────────────────────────────────────────────────────
# 4. SEMANTIC SEARCH CORPUS
# ─────────────────────────────────────────────────────────────────────────────
def generate_search_corpus():
    corpus = [
        {"id":"rra_001","title":"VAT Registration Requirements","text":"Businesses with annual turnover exceeding 20 million RWF must register for VAT. Registration requires TIN, business registration certificate, and bank account details. VAT returns are filed monthly.","category":"vat"},
        {"id":"rra_002","title":"PAYE Filing Deadlines","text":"Employers must file PAYE declarations and remit taxes by the 15th of the following month. Late filing attracts a penalty of 10% of tax due plus interest of 1.5% per month.","category":"paye"},
        {"id":"rra_003","title":"Corporate Income Tax Rate","text":"The standard CIT rate in Rwanda is 30% of taxable income. SMEs with turnover below 50 million RWF may qualify for preferential rates. CIT returns are filed annually within 3 months after year-end.","category":"cit"},
        {"id":"rra_004","title":"TIN Registration Process","text":"All taxpayers must obtain a Tax Identification Number (TIN) from RRA. Required documents include national ID or passport, proof of address, and business registration for companies. Registration is free and done online via the iTax portal.","category":"registration"},
        {"id":"rra_005","title":"Withholding Tax Obligations","text":"WHT applies to payments for services at 15% for residents and non-residents. Rent payments attract 15% WHT. Dividends paid to non-residents attract 15% WHT. Withholders must file monthly declarations.","category":"withholding"},
        {"id":"rra_006","title":"Tax Clearance Certificate","text":"Tax clearance certificates are issued to taxpayers with no outstanding obligations. Required for government contracts, business renewals, and visa applications. Valid for 3 months from date of issue.","category":"clearance"},
        {"id":"rra_007","title":"Penalty and Interest Regime","text":"Late payment attracts 10% penalty on outstanding tax plus 1.5% monthly interest. Failure to file returns carries a penalty of 100,000 RWF per month. Voluntary disclosure reduces penalties by 50%.","category":"penalties"},
        {"id":"rra_008","title":"Objection and Appeal Process","text":"Taxpayers may object to assessments within 30 days of receipt. Objections must be filed in writing with supporting evidence. The Commissioner General has 90 days to respond. Appeals go to the Tax Appeals Commission.","category":"appeals"},
        {"id":"rra_009","title":"VAT Input Credits","text":"VAT-registered businesses may claim input tax credits on purchases used for taxable supplies. Input credits cannot exceed output tax. Excess credits may be carried forward or refunded after 3 months.","category":"vat"},
        {"id":"rra_010","title":"Transfer Pricing Rules","text":"Rwanda follows OECD transfer pricing guidelines. Related-party transactions must be at arm's length. Documentation requirements apply for transactions exceeding 200 million RWF. Annual country-by-country reporting required for multinationals.","category":"transfer_pricing"},
        {"id":"rra_011","title":"Small Business Presumptive Tax","text":"Businesses with turnover below 20 million RWF pay presumptive tax. Rates range from 0% to 3% of turnover depending on sector. Returns filed quarterly. No accounting records required.","category":"sme"},
        {"id":"rra_012","title":"Personal Income Tax Rates","text":"Individual income tax in Rwanda is progressive: 0% up to 360,000 RWF, 20% from 360,001 to 1,200,000 RWF, and 30% above 1,200,000 RWF annually. Employment income is taxed through PAYE.","category":"personal_tax"},
        {"id":"rra_013","title":"Customs and Excise Duties","text":"Import duties apply to goods entering Rwanda based on the EAC Common External Tariff. Excise duties apply to alcoholic beverages, tobacco, fuel, and vehicles. Customs declarations must be filed through ASYCUDA system.","category":"customs"},
        {"id":"rra_014","title":"Electronic Filing Requirements","text":"All taxpayers with annual turnover above 20 million RWF must file returns electronically via the iTax portal. Electronic filing is mandatory for VAT, PAYE, CIT, and WHT. Paper filing allowed only for micro taxpayers.","category":"efiling"},
        {"id":"rra_015","title":"Audit Selection Criteria","text":"RRA uses risk-based audit selection. High-risk indicators include large VAT refund claims, significant income fluctuations, related-party transactions, and cash-intensive businesses. Audit periods are typically 3-5 years.","category":"audit"},
    ]
    with open(OUT / "search_corpus.json", "w") as f:
        json.dump(corpus, f, indent=2, ensure_ascii=False)
    print(f"✅ Search corpus: {len(corpus)} RRA knowledge articles")
    return corpus

# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("TaxCoreAI – Generating Training Data")
    print("=" * 60)
    generate_document_data(1200)
    generate_compliance_data(2500)
    generate_anomaly_data(3000)
    generate_search_corpus()
    print("=" * 60)
    print("All training data generated successfully!")
