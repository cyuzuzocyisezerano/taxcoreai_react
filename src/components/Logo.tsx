import './Logo.css'

export function Logo({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  return (
    <a href="#" className={`logo logo--${variant}`} aria-label="TaxCore AI home">
      <span className="logo-mark" aria-hidden>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="10" fill="url(#logoGrad)" />
          <path
            d="M9 12h14v2.2H15.4v9.6H12.6v-9.6H9V12zm4.8 11.8h2.8v2.4h-2.8v-2.4z"
            fill="white"
          />
          <path
            d="M19.5 20.2l3.2-8.2h2.9l-5.1 11.8h-2.6l-5.1-11.8h2.9l3.2 8.2z"
            fill="white"
            opacity="0.9"
          />
          <defs>
            <linearGradient id="logoGrad" x1="4" y1="4" x2="28" y2="28">
              <stop stopColor="#14b8a6" />
              <stop offset="1" stopColor="#0d9488" />
            </linearGradient>
          </defs>
        </svg>
      </span>
      <span className="logo-text">
        TaxCore<span className="logo-ai">AI</span>
      </span>
    </a>
  )
}
