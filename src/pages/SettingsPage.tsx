import { useEffect, useState } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { useAuth } from '../context/AuthContext'
import { api, type SettingsData } from '../lib/api'
import './SettingsPage.css'

export function SettingsPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<SettingsData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true)
        const response = await api.getSettings()
        setSettings(response.settings)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load settings')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const handleChange = (field: keyof SettingsData, value: number | boolean) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleFeatureFlagChange = (flag: keyof NonNullable<SettingsData['featureFlags']>, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      featureFlags: {
        ...(prev.featureFlags ?? {}),
        [flag]: value,
      },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await api.updateSettings(settings)
      setSettings(response.settings)
      setSuccess('Settings saved successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-dashboard settings-page">
      <AdminSidebar role={user?.role ?? 'Officer'} title={user?.title ?? 'Taxpayer Officer'} />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">Settings</p>
            <h1>Settings</h1>
            <p className="admin-dashboard__hero-text">Configure system defaults and feature flags for the application.</p>
          </div>
          <div className="admin-dashboard__topbar-actions">
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving || loading}>
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </header>

        <section className="admin-dashboard__content-card settings-card">
          {error && <div className="settings-message settings-error">{error}</div>}
          {success && <div className="settings-message settings-success">{success}</div>}
          {loading ? (
            <p>Loading settings…</p>
          ) : (
            <div className="settings-form">
              <div className="settings-row">
                <div>
                  <label className="settings-label" htmlFor="defaultTaxYear">
                    Default tax year
                  </label>
                  <p className="settings-description">The default tax year used when creating new filings or workflows.</p>
                </div>
                <input
                  id="defaultTaxYear"
                  type="number"
                  className="settings-input"
                  value={settings.defaultTaxYear ?? ''}
                  onChange={(e) => handleChange('defaultTaxYear', e.target.value ? Number(e.target.value) : 0)}
                />
              </div>

              <div className="settings-row">
                <div>
                  <label className="settings-label" htmlFor="reportingWindowDays">
                    Reporting window (days)
                  </label>
                  <p className="settings-description">The number of days used for default reporting windows.</p>
                </div>
                <input
                  id="reportingWindowDays"
                  type="number"
                  className="settings-input"
                  value={settings.reportingWindowDays ?? ''}
                  onChange={(e) => handleChange('reportingWindowDays', e.target.value ? Number(e.target.value) : 0)}
                />
              </div>

              <div className="settings-row checkbox-row">
                <div>
                  <label className="settings-label" htmlFor="allowRegistration">
                    Allow registration
                  </label>
                  <p className="settings-description">Enable new user registration on the platform.</p>
                </div>
                <input
                  id="allowRegistration"
                  type="checkbox"
                  checked={settings.featureFlags?.allowRegistration ?? false}
                  onChange={(e) => handleFeatureFlagChange('allowRegistration', e.target.checked)}
                />
              </div>

              <div className="settings-row checkbox-row">
                <div>
                  <label className="settings-label" htmlFor="enableNotifications">
                    Enable notifications
                  </label>
                  <p className="settings-description">Allow system notification alerts for workflows and updates.</p>
                </div>
                <input
                  id="enableNotifications"
                  type="checkbox"
                  checked={settings.featureFlags?.enableNotifications ?? false}
                  onChange={(e) => handleFeatureFlagChange('enableNotifications', e.target.checked)}
                />
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
