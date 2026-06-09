import { useEffect, useState } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import './AdminDashboard.css'

interface AuditEntry {
  id: string
  action: string
  username: string
  details: string
  createdAt: string
}

export function AuditLogs() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<AuditEntry[]>([])

  useEffect(() => {
    api.getAuditLogs().then((data) => setLogs(data.logs)).catch(console.error)
  }, [])

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
          <div className="admin-dashboard__table-wrap">
            <table className="admin-dashboard__table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.username}</td>
                    <td>{log.action}</td>
                    <td>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
