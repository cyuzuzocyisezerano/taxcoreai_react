import './Hero.css'

export function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-bg" aria-hidden>
        <div className="hero-gradient" />
        <div className="hero-grid" />
        <div className="hero-orb hero-orb--1" />
        <div className="hero-orb hero-orb--2" />
      </div>

      <div className="container hero-content">
        <div className="hero-copy">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            AI-powered tax platform · 2026 ready
          </div>

          <h1 className="hero-title">
            File smarter taxes with{' '}
            <span className="hero-title-accent">confidence</span>
          </h1>

          <p className="hero-description">
            TaxCore AI automates deductions, flags audit risks, and keeps you compliant—so
            you spend less time on forms and more on what matters.
          </p>

          <div className="hero-cta">
            <a href="#cta" className="btn btn-primary btn-lg">
              Start free trial
              <ArrowIcon />
            </a>
            <a href="#how-it-works" className="btn btn-secondary btn-lg hero-cta-secondary">
              <PlayIcon />
              See how it works
            </a>
          </div>

          <div className="hero-stats">
            <div>
              <strong>98%</strong>
              <span>accuracy on reviewed returns</span>
            </div>
            <div>
              <strong>4.9</strong>
              <span>avg. rating from 12k+ users</span>
            </div>
            <div>
              <strong>2hrs</strong>
              <span>saved per return on average</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <DashboardPreview />
        </div>
      </div>

      <div className="container hero-trust">
        <p>Trusted by founders, freelancers, and finance teams at</p>
        <div className="hero-logos" aria-hidden>
          {['Northwind', 'Brightline', 'Meridian', 'Atlas Co', 'Summit'].map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

function DashboardPreview() {
  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <div className="dashboard-dots">
          <span />
          <span />
          <span />
        </div>
        <span className="dashboard-title">Tax overview · FY 2025</span>
      </div>
      <div className="dashboard-body">
        <div className="dashboard-sidebar">
          {['Overview', 'Income', 'Deductions', 'Documents', 'Review'].map((item, i) => (
            <div key={item} className={`dashboard-nav-item ${i === 0 ? 'active' : ''}`}>
              {item}
            </div>
          ))}
        </div>
        <div className="dashboard-main">
          <div className="dashboard-metrics">
            <div className="metric-card">
              <span className="metric-label">Estimated refund</span>
              <span className="metric-value metric-value--positive">$4,280</span>
              <span className="metric-trend">↑ 12% vs last year</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Deductions found</span>
              <span className="metric-value">$18,420</span>
              <span className="metric-trend metric-trend--ai">AI suggested 6 new</span>
            </div>
          </div>
          <div className="dashboard-chart">
            <div className="chart-bars">
              {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                <div key={i} className="chart-bar" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="dashboard-ai-insight">
              <span className="ai-icon">✦</span>
              <p>
                <strong>AI insight:</strong> Home office deduction may apply—upload utility
                bills to maximize savings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg className="btn-icon" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M4 10h12m0 0l-4-4m4 4l-4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg className="btn-icon" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 7.5v5l4-2.5-4-2.5z" fill="currentColor" />
    </svg>
  )
}
