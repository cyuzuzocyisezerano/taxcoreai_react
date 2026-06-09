import './HowItWorks.css'

const STEPS = [
  {
    step: '01',
    title: 'Connect & upload',
    description: 'Link accounts or drag in tax documents. We organize everything in minutes.',
  },
  {
    step: '02',
    title: 'AI review',
    description: 'Our engine finds deductions, checks for errors, and explains each recommendation.',
  },
  {
    step: '03',
    title: 'Approve & file',
    description: 'Review your return, sign electronically, and e-file with IRS and state agencies.',
  },
]

export function HowItWorks() {
  return (
    <section className="how-it-works section" id="how-it-works">
      <div className="container how-layout">
        <div className="how-copy">
          <span className="section-label">How it works</span>
          <h2 className="section-title">Three steps to a finished return</h2>
          <p className="section-subtitle">
            No tax jargon required. TaxCore AI walks you through each stage with plain-language
            guidance.
          </p>
          <ol className="how-steps">
            {STEPS.map((item) => (
              <li key={item.step}>
                <span className="how-step-num">{item.step}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="how-visual">
          <div className="how-phone">
            <div className="how-phone-screen">
              <div className="how-progress">
                <span>Return progress</span>
                <strong>87%</strong>
              </div>
              <div className="how-checklist">
                {[
                  { label: 'Identity verified', done: true },
                  { label: 'Income imported', done: true },
                  { label: 'Deductions optimized', done: true },
                  { label: 'Final review', done: false },
                ].map((item) => (
                  <div key={item.label} className={`how-check-item ${item.done ? 'done' : ''}`}>
                    <span className="how-check-icon">{item.done ? '✓' : '○'}</span>
                    {item.label}
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-primary how-file-btn">
                Continue to review
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
