import './CTA.css'

export function CTA() {
  return (
    <section className="cta-section" id="cta">
      <div className="container cta-inner">
        <div className="cta-content">
          <h2>Ready to file smarter this season?</h2>
          <p>
            Join thousands who trust TaxCore AI for accurate, stress-free tax preparation.
            Start your free trial—no credit card required.
          </p>
          <form
            className="cta-form"
            onSubmit={(e) => {
              e.preventDefault()
            }}
          >
            <label htmlFor="cta-email" className="visually-hidden">
              Email address
            </label>
            <input
              id="cta-email"
              type="email"
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
            <button type="submit" className="btn btn-primary btn-lg">
              Get started free
            </button>
          </form>
          <span className="cta-note">14-day Pro trial · Cancel anytime</span>
        </div>
      </div>
    </section>
  )
}
