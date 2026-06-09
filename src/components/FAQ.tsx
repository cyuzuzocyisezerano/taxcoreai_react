import { useState } from 'react'
import './FAQ.css'

const FAQS = [
  {
    q: 'Is my financial data secure?',
    a: 'Yes. We use bank-level AES-256 encryption, SOC 2 Type II controls, and never sell your data. You can delete your account and exports at any time.',
  },
  {
    q: 'Can I switch from another tax software?',
    a: 'Import prior-year PDFs or connect your existing provider—we map your history so you do not start from scratch.',
  },
  {
    q: 'Does TaxCore AI support state returns?',
    a: 'All paid plans include one state return. Additional states can be added at checkout for a flat fee per return.',
  },
  {
    q: 'What if I get audited?',
    a: 'Pro and Business plans include audit defense support: guidance, document prep, and representation coordination with our partner CPAs.',
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="faq section" id="faq">
      <div className="container faq-layout">
        <div>
          <span className="section-label">FAQ</span>
          <h2 className="section-title">Common questions</h2>
          <p className="section-subtitle">
            Still unsure? Our support team typically replies within 2 hours on business days.
          </p>
        </div>

        <div className="faq-list">
          {FAQS.map((item, i) => (
            <div key={item.q} className={`faq-item ${openIndex === i ? 'faq-item--open' : ''}`}>
              <button
                type="button"
                className="faq-question"
                aria-expanded={openIndex === i}
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                {item.q}
                <span className="faq-chevron" aria-hidden />
              </button>
              <div className="faq-answer">
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
