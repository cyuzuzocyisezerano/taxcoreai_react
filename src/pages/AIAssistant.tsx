import { useEffect, useState } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { api, type AIPrompt } from '../lib/api'
import './AdminDashboard.css'

export function AIAssistant() {
  const [prompts, setPrompts] = useState<AIPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getAIPrompts()
      .then((data) => setPrompts(data.prompts))
      .catch((err) => setError(err?.message || 'Unable to load AI prompts'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="admin-dashboard">
      <AdminSidebar role="Officer" title="Taxpayer Officer" />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">AI Assistant</p>
            <h1>AI Assistant</h1>
            <p className="admin-dashboard__hero-text">Ask questions and get instant insights from taxpayer records.</p>
          </div>
          <div className="admin-dashboard__topbar-actions">
            <button className="btn btn-primary">Start chat</button>
          </div>
        </header>

        <section className="admin-dashboard__content-card">
          {error && <div className="error">{error}</div>}
          {loading && <p>Loading AI prompts…</p>}

          {!loading && prompts.length === 0 && <p>No AI prompts configured yet.</p>}

          {!loading && prompts.length > 0 && (
            <ul className="ai-prompt-list">
              {prompts.map((prompt) => (
                <li key={prompt.id} className="ai-prompt-item">
                  <strong>{prompt.prompt}</strong>
                  <p>{prompt.description}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
