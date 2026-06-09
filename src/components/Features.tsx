import type { ReactNode } from 'react'
import './Features.css'

const FEATURES = [
  {
    icon: 'scan',
    title: 'Smart document scan',
    description:
      'Upload W-2s, 1099s, and receipts—our AI extracts fields and categorizes expenses automatically.',
  },
  {
    icon: 'shield',
    title: 'Audit risk detection',
    description:
      'Real-time flags for inconsistencies and missing documentation before you file.',
  },
  {
    icon: 'spark',
    title: 'Deduction optimizer',
    description:
      'Surface credits and write-offs you might miss, tailored to your income profile and state.',
  },
  {
    icon: 'sync',
    title: 'Bank & payroll sync',
    description:
      'Connect accounts securely to reconcile income and expenses without manual entry.',
  },
  {
    icon: 'team',
    title: 'CPA collaboration',
    description:
      'Invite your accountant with role-based access—review, comment, and e-file together.',
  },
  {
    icon: 'chart',
    title: 'Year-round insights',
    description:
      'Quarterly tax estimates and cash-flow projections so there are no April surprises.',
  },
]

export function Features() {
  return (
    <section className="features section" id="features">
      <div className="container">
        <div className="section-header">
          <span className="section-label">Features</span>
          <h2 className="section-title">Everything you need to file with confidence</h2>
          <p className="section-subtitle">
            From first upload to final e-file, TaxCore AI guides you with intelligent
            automation built for modern taxpayers.
          </p>
        </div>

        <div className="features-grid">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="feature-card">
              <div className="feature-icon">
                <FeatureIcon name={feature.icon} />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    scan: (
      <path
        d="M4 7V5a1 1 0 011-1h2M4 13v2a1 1 0 001 1h2m8-12h2a1 1 0 011 1v2m-4 8h2a1 1 0 001-1v-2M7 10h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    ),
    shield: (
      <path
        d="M10 3l6 3v5c0 3.5-2.5 6-6 8-3.5-2-6-4.5-6-8V6l6-3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    ),
    spark: (
      <path
        d="M10 2v4m0 8v4M2 10h4m8 0h4m-2.9-5.1l-2.8 2.8m-5.6 5.6l-2.8 2.8m0-11.2l2.8 2.8m5.6 5.6l2.8 2.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    ),
    sync: (
      <path
        d="M14 6a4 4 0 00-6.5 3M6 14a4 4 0 006.5-3M6 6v2H4M14 14v-2h2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    team: (
      <>
        <circle cx="7" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="13" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M4 16c0-2 1.5-3 3-3s3 1 3 3M10 16c0-2 1.5-3 3-3s3 1 3 3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </>
    ),
    chart: (
      <path
        d="M4 14V8m4 6V5m4 9V10m4 4V6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    ),
  }

  return (
    <svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden>
      {paths[name]}
    </svg>
  )
}
