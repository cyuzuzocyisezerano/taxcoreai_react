import { useEffect, useState } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import './AdminDashboard.css'

interface AuditEntry {
  id: string
  action: string
  username: string
  userFullName: string
  details: string
  createdAt: string
}

export function AuditLogs() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState('')
  const [userIdFilter, setUserIdFilter] = useState('')

  useEffect(() => {
    loadLogs()
  }, [])

  async function loadLogs() {
    try {
      setLoading(true)
      setError(null)
      const params: any = { limit: 100 }
      if (actionFilter) params.action = actionFilter
      if (userIdFilter) params.userId = userIdFilter
      const data = await api.getAuditLogs(100)
      setLogs(data.logs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  function handleExport() {
    window.open('/api/audit-logs/export/csv', '_blank')
  }

  return (
    <div className="admin-dashboard">
      <AdminSidebar role={user?.role ?? 'Officer'} title={user?.title ?? 'Taxpayer Officer'} />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">Audit Logs</p>
            <h1>Audit Logs</h1>
            <p className="admin-dashboard__hero-text">
              Review system changes, user activity, and audit history.
            </p>
          </div>
          <div className="admin-dashboard__topbar-actions">
            <button className="btn btn-primary">Export Logs</button>
          </div>
        </header>

        <section className="admin-dashboard__content-card">
          <div className="admin-dashboard__filters">
            <input
              type="text"
              placeholder="Filter by action..."
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="admin-dashboard__filter-input"
            />
            <input
              type="text"
              placeholder="Filter by user ID..."
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              className="admin-dashboard__filter-input"
            />
            <button className="btn btn-primary" onClick={loadLogs}>Apply Filters</button>
            <button className="btn btn-secondary" onClick={handleExport}>Export CSV</button>
          </div>

          {error && <div className="error">{error}</div>}
          {loading && <p>Loading audit logs…</p>}

          {!loading && (
            <div className="admin-dashboard__table-wrap">
              <table className="admin-dashboard__table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Full Name</th>
                    <th>Action</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                        No audit logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td>{new Date(log.createdAt).toLocaleString()}</td>
                        <td>{log.username}</td>
                        <td>{log.userFullName || '—'}</td>
                        <td>{log.action}</td>
                        <td>{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
