import './Testimonials.css'

const TESTIMONIALS = [
  {
    quote:
      'TaxCore AI found deductions my old software missed. Filing took under an hour for the first time.',
    author: 'Sarah Chen',
    role: 'Freelance designer',
    avatar: 'SC',
  },
  {
    quote:
      'The audit risk alerts gave us peace of mind before we submitted our S-Corp return. Worth every penny.',
    author: 'Marcus Webb',
    role: 'COO, Brightline Studio',
    avatar: 'MW',
  },
  {
    quote:
      'Our CPA loves the collaboration mode—we review together without endless email threads.',
    author: 'Elena Ruiz',
    role: 'Small business owner',
    avatar: 'ER',
  },
]

export function Testimonials() {
  return (
    <section className="testimonials section">
      <div className="container">
        <div className="section-header section-header--center">
          <span className="section-label">Testimonials</span>
          <h2 className="section-title">Loved by taxpayers nationwide</h2>
        </div>

        <div className="testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <blockquote key={t.author} className="testimonial-card">
              <div className="testimonial-stars" aria-label="5 out of 5 stars">
                {'★★★★★'}
              </div>
              <p>&ldquo;{t.quote}&rdquo;</p>
              <footer>
                <span className="testimonial-avatar">{t.avatar}</span>
                <div>
                  <cite>{t.author}</cite>
                  <span>{t.role}</span>
                </div>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  )
}
