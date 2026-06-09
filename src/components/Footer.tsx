import { Logo } from './Logo'
import './Footer.css'

const LINKS = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Integrations', href: '#' },
    { label: 'Security', href: '#' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Press', href: '#' },
  ],
  Support: [
    { label: 'Help center', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'CPA partners', href: '#' },
    { label: 'Status', href: '#' },
  ],
  Legal: [
    { label: 'Privacy', href: '#' },
    { label: 'Terms', href: '#' },
    { label: 'Cookie policy', href: '#' },
  ],
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Logo variant="dark" />
          <p>AI-powered tax preparation for individuals and growing businesses.</p>
          <div className="footer-social">
            <a href="#" aria-label="Twitter">
              𝕏
            </a>
            <a href="#" aria-label="LinkedIn">
              in
            </a>
          </div>
        </div>

        <div className="footer-links">
          {Object.entries(LINKS).map(([title, items]) => (
            <div key={title}>
              <h4>{title}</h4>
              <ul>
                {items.map((item) => (
                  <li key={item.label}>
                    <a href={item.href}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} TaxCore AI. All rights reserved.</p>
        <p className="footer-disclaimer">
          TaxCore AI is not affiliated with the IRS. This is a demo marketing site—consult a
          licensed tax professional for advice.
        </p>
      </div>
    </footer>
  )
}
