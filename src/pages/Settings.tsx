import { useEffect, useState } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { api, type SettingsData } from '../lib/api'
import './AdminDashboard.css'

export function Settings() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getSettings()
      .then((data) => setSettings(data.settings))
      .catch((err) => setError(err?.message || 'Unable to load settings'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="admin-dashboard">
      <AdminSidebar role="Officer" title="Taxpayer Officer" />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">Settings</p>
            <h1>Settings</h1>
            <p className="admin-dashboard__hero-text">Configure system preferences and application settings.</p>
          </div>
          <div className="admin-dashboard__topbar-actions">
            <button className="btn btn-primary">Save Settings</button>
          </div>
        </header>

        <section className="admin-dashboard__content-card">
          {error && <div className="error">{error}</div>}
          {loading && <p>Loading settings…</p>}

          {!loading && settings && (
            <div className="settings-grid">
              <div>
                <h3>Default tax year</h3>
                <p>{settings.defaultTaxYear ?? 'Not configured'}</p>
              </div>
              <div>
                <h3>Reporting window</h3>
                <p>{settings.reportingWindowDays ?? 'Not configured'} days</p>
              </div>
              <div>
                <h3>Notifications</h3>
                <p>{settings.featureFlags?.enableNotifications ? 'Enabled' : 'Disabled'}</p>
              </div>
              <div>
                <h3>Registration</h3>
                <p>{settings.featureFlags?.allowRegistration ? 'Allowed' : 'Disabled'}</p>
              </div>
            </div>
          )}

          {!loading && !settings && <p>No settings configured yet.</p>}
        </section>
      </main>
    </div>
  )
}
