import { useEffect, useState } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { api, type NotificationItem } from '../lib/api'
import './AdminDashboard.css'

export function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getNotifications()
      .then((data) => setNotifications(data.notifications))
      .catch((err) => setError(err?.message || 'Unable to load notifications'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="admin-dashboard">
      <AdminSidebar role="Officer" title="Taxpayer Officer" />

      <main className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">Notifications</p>
            <h1>Notifications</h1>
            <p className="admin-dashboard__hero-text">View your latest alerts, reminders, and compliance messages.</p>
          </div>
          <div className="admin-dashboard__topbar-actions">
            <button className="btn btn-primary">Mark all read</button>
          </div>
        </header>

        <section className="admin-dashboard__content-card">
          {error && <div className="error">{error}</div>}
          {loading && <p>Loading notifications…</p>}
          {!loading && notifications.length === 0 && <p>No notifications at this time.</p>}

          {!loading && notifications.length > 0 && (
            <ul className="notification-list">
              {notifications.map((item) => (
                <li key={item.id} className="notification-item">
                  <div className="notification-item__header">
                    <strong>{item.title}</strong>
                    <span>{item.status}</span>
                  </div>
                  <p className="muted">{item.type}</p>
                  <p className="muted">{new Date(item.createdAt).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
