import { useEffect, useState } from 'react'
import { Logo } from './Logo'
import './Header.css'

const NAV = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <header className={`header ${scrolled ? 'header--scrolled' : ''}`}>
      <div className="container header-inner">
        <Logo variant={scrolled ? 'dark' : 'light'} />

        <nav className={`header-nav ${menuOpen ? 'header-nav--open' : ''}`} aria-label="Main">
          <ul>
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="header-nav-actions">
            <a href="/" className="btn btn-ghost">
              Log in
            </a>
            <a href="#cta" className="btn btn-primary" onClick={() => setMenuOpen(false)}>
              Get started
            </a>
          </div>
        </nav>

        <div className="header-actions">
          <a href="/" className="btn btn-ghost header-login">
            Log in
          </a>
          <a href="#cta" className="btn btn-primary">
            Get started
          </a>
        </div>

        <button
          type="button"
          className="header-menu-btn"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  )
}
