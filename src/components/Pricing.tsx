import './Pricing.css'

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'For simple W-2 returns and first-time filers.',
    features: ['Federal e-file', 'Basic deduction scan', 'Email support', '1 state included'],
    cta: 'Get started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/year',
    description: 'Best for freelancers, investors, and side income.',
    features: [
      'Everything in Starter',
      'Unlimited document AI scan',
      'Schedule C & investments',
      'Audit defense guarantee',
      'Priority chat support',
    ],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Business',
    price: '$149',
    period: '/year',
    description: 'LLCs, S-Corps, and teams with a dedicated CPA lane.',
    features: [
      'Everything in Pro',
      'Multi-entity support',
      'Payroll & 1099 sync',
      'CPA review included',
      'Custom integrations',
    ],
    cta: 'Contact sales',
    highlighted: false,
  },
]

export function Pricing() {
  return (
    <section className="pricing section" id="pricing">
      <div className="container">
        <div className="section-header section-header--center">
          <span className="section-label">Pricing</span>
          <h2 className="section-title">Plans that grow with you</h2>
          <p className="section-subtitle section-subtitle--center">
            Start free, upgrade when your tax situation gets more complex. No hidden fees at
            checkout.
          </p>
        </div>

        <div className="pricing-grid">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={`pricing-card ${plan.highlighted ? 'pricing-card--highlighted' : ''}`}
            >
              {plan.highlighted && <span className="pricing-badge">Most popular</span>}
              <h3>{plan.name}</h3>
              <p className="pricing-desc">{plan.description}</p>
              <div className="pricing-amount">
                <span className="pricing-price">{plan.price}</span>
                {plan.period && <span className="pricing-period">{plan.period}</span>}
              </div>
              <ul className="pricing-features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#cta"
                className={`btn ${plan.highlighted ? 'btn-primary' : 'btn-secondary'} pricing-cta`}
              >
                {plan.cta}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M4 9l3.5 3.5L14 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
