import { useEffect, useState } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { api } from '../lib/api'
import './AdminDashboard.css'

interface Integration {
  id: string
  name: string
  type: string
  config: Record<string, any>
  status: string
  createdAt: string
  updatedAt: string
}

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newIntegration, setNewIntegration] = useState({ name: '', type: 'tax_filing', config: {} })
  const [testingId, setTestingId] = useState<string | null>(null)

  useEffect(() => {
    loadIntegrations()
  }, [])

  async function loadIntegrations() {
    try {
      setLoading(true)
      const data = await api.getIntegrations()
      setIntegrations(data.integrations)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddIntegration(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.createIntegration(newIntegration)
      setShowAddModal(false)
      setNewIntegration({ name: '', type: 'tax_filing', config: {} })
      loadIntegrations()
    } catch (err) {
      alert('Failed to create integration')
    }
  }

  async function handleDeleteIntegration(id: string) {
    if (!confirm('Are you sure you want to delete this integration?')) return
    try {
      await api.deleteIntegration(id)
      loadIntegrations()
    } catch (err) {
      alert('Failed to delete integration')
    }
  }

  async function handleTestConnection(id: string) {
    setTestingId(id)
    try {
      const result = await api.testIntegrationConnection(id)
      alert(`Connection test: ${result.message}\nResponse time: ${result.responseTime}ms`)
    } catch (err) {
      alert('Connection test failed')
    } finally {
      setTestingId(null)
    }
  }

  const integrationTypes: Record<string, string> = {
    tax_filing: 'Tax Filing System',
    payment_gateway: 'Payment Gateway',
    bank_system: 'Bank System',
    government_portal: 'Government Portal',
    third_party_api: 'Third-party API',
    webhook: 'Webhook'
  }

  return (
    <div className="admin-dashboard">
      <AdminSidebar role="Admin" title="System Administrator" />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">Settings</p>
            <h1>Integration Management</h1>
            <p className="admin-dashboard__hero-text">Configure and monitor external system integrations.</p>
          </div>
          <div className="admin-dashboard__topbar-actions">
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>Add Integration</button>
          </div>
        </header>

        <section className="admin-dashboard__content-card">
          {error && <div className="error">{error}</div>}
          {loading && <p>Loading integrations…</p>}

          {!loading && (
            <div className="integrations-grid">
              {integrations.length === 0 && <p>No integrations configured yet.</p>}
              {integrations.map((integration) => (
                <div key={integration.id} className="integration-card">
                  <div className="integration-card__header">
                    <h3>{integration.name}</h3>
                    <span className={`status-badge status-badge--${integration.status === 'active' ? 'success' : 'warning'}`}>
                      {integration.status}
                    </span>
                  </div>
                  <div className="integration-card__body">
                    <p><strong>Type:</strong> {integrationTypes[integration.type] || integration.type}</p>
                    <p><strong>Created:</strong> {new Date(integration.createdAt).toLocaleDateString()}</p>
                    <p><strong>Updated:</strong> {new Date(integration.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="integration-card__actions">
                    <button 
                      className="btn btn-secondary"
                      onClick={() => handleTestConnection(integration.id)}
                      disabled={testingId === integration.id}
                    >
                      {testingId === integration.id ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDeleteIntegration(integration.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Integration</h2>
            <form onSubmit={handleAddIntegration}>
              <div className="form-group">
                <label>Integration Name</label>
                <input
                  type="text"
                  value={newIntegration.name}
                  onChange={(e) => setNewIntegration({ ...newIntegration, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Integration Type</label>
                <select
                  value={newIntegration.type}
                  onChange={(e) => setNewIntegration({ ...newIntegration, type: e.target.value })}
                >
                  <option value="tax_filing">Tax Filing System</option>
                  <option value="payment_gateway">Payment Gateway</option>
                  <option value="bank_system">Bank System</option>
                  <option value="government_portal">Government Portal</option>
                  <option value="third_party_api">Third-party API</option>
                  <option value="webhook">Webhook</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Integration</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}