import { useState, type FormEvent, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'
import './LoginPage.css'

const FEATURES = [
  {
    icon: 'robot',
    label: 'AI-powered Document Analysis & Search',
  },
  {
    icon: 'shield',
    label: 'Role-based Access Control & Audit Trails',
  },
  {
    icon: 'chart',
    label: 'Advanced Reporting & Analytics',
  },
  {
    icon: 'bolt',
    label: 'Real-time Workflow Management',
  },
] as const

export function LoginPage() {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { user, loading, login } = useAuth()
  const hasNavigated = useRef(false)

  // Redirect based on role - only run once when user is loaded
  useEffect(() => {
    // Only redirect if we have a user, not loading, and haven't navigated yet
    if (!loading && user && !hasNavigated.current) {
      hasNavigated.current = true
      
      const dashboardMap: Record<string, string> = {
        Admin: '/dashboard/admin',
        Officer: '/dashboard/officer',
        Auditor: '/dashboard/auditor',
        Supervisor: '/dashboard/supervisor',
      }
      const dashboard = dashboardMap[user.role] || '/dashboard/admin'
      
      // Use window.location for a full page navigation to avoid React Router loops
      window.location.href = dashboard
    }
  }, [user, loading]) // Only depend on user and loading, not location

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = new FormData(e.currentTarget)
    const username = String(form.get('username') ?? '')
    const password = String(form.get('password') ?? '')

    setSubmitting(true)
    try {
      await login(username, password, remember)
      // After login, redirect will happen automatically via the component re-render
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <aside className="login-info" aria-label="TaxCoreAI platform overview">
        <div className="login-info-decor" aria-hidden>
          <span className="login-info-circle login-info-circle--1" />
          <span className="login-info-circle login-info-circle--2" />
          <span className="login-info-circle login-info-circle--3" />
        </div>

        <div className="login-info-content">
          <div className="login-brand">
            <img
              className="login-rra-logo"
              src="/RRA%20LOGO.png"
              alt="Rwanda Revenue Authority logo"
              loading="eager"
              fetchPriority="high"
            />
            <div className="login-brand-text">
              <strong>TaxCoreAI</strong>
              <span>Rwanda Revenue Authority</span>
            </div>
          </div>

          <h1 className="login-headline">
            Intelligent Taxpayer <span className="login-headline-accent">Records Management</span>{' '}
            System
          </h1>

          <p className="login-tagline">
            Centralized, AI-powered tax administration platform for digital transformation of
            Rwanda&apos;s tax system.
          </p>

          <ul className="login-features">
            {FEATURES.map((item) => (
              <li key={item.label}>
                <span className="login-feature-icon">
                  <FeatureIcon name={item.icon} />
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <p className="login-info-footer">
          © 2026 Rwanda Revenue Authority. All rights reserved.
        </p>
      </aside>

      <section className="login-form-panel" aria-label="Sign in">
        <div className="login-card">
          <header className="login-card-header">
            <h2>Welcome Back</h2>
            <p>Sign in to your TaxCoreAI account</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <div className="login-field">
              <label htmlFor="username">Username</label>
              <div className="login-input-wrap">
                <UserIcon />
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <div className="login-input-wrap">
                <LockIcon />
                <input
                  id="password"
                  name="password"
                  type={passwordVisible ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                  onClick={() => setPasswordVisible((v) => !v)}
                >
                  <EyeIcon crossed={passwordVisible} />
                </button>
              </div>
            </div>

            <div className="login-form-row">
              <label className="login-checkbox">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>
              <a href="#" className="login-forgot">
                Forgot password?
              </a>
            </div>

            <button type="submit" className="login-submit" disabled={submitting}>
              <SignInIcon />
              {submitting ? 'Signing in...' : 'Sign In to TaxCoreAI'}
            </button>

            <div className="login-demo" role="note">
              <InfoIcon />
              <div>
                <strong>Demo Credentials</strong>
                <p>
                  Username: <span className="login-demo-value">admin</span> Password:{' '}
                  <span className="login-demo-value">Admin@123</span>
                </p>
              </div>
            </div>
          </form>
        </div>

        <p className="login-disclaimer">
          This system is for authorized RRA personnel only. Unauthorized access is strictly
          prohibited.
        </p>
      </section>
    </div>
  )
}

function FeatureIcon({ name }: { name: (typeof FEATURES)[number]['icon'] }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true as const }
  switch (name) {
    case 'robot':
      return (
        <svg {...common}>
          <rect x="5" y="8" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="9.5" cy="13" r="1" fill="currentColor" />
          <circle cx="14.5" cy="13" r="1" fill="currentColor" />
          <path d="M12 5v3M8 8l-1-2M16 8l1-2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      )
    case 'shield':
      return (
        <svg {...common}>
          <path
            d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'chart':
      return (
        <svg {...common}>
          <path d="M4 18V8m5 10V5m5 13V10m5 8V12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      )
    case 'bolt':
      return (
        <svg {...common}>
          <path
            d="M13 2L5 14h6l-1 8 8-12h-6l1-8z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      )
  }
}

function UserIcon() {
  return (
    <svg className="login-field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="login-field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6" y="10" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 10V8a4 4 0 118 0v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.75" />
      {crossed && (
        <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      )}
    </svg>
  )
}

function SignInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg className="login-demo-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 10v6M12 8h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}
