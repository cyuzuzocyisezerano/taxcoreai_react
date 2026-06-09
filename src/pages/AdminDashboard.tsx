import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminSidebar } from '../components/AdminSidebar'
import { useAuth } from '../context/AuthContext'
import { api, type DashboardStats, type Taxpayer } from '../lib/api'
import './AdminDashboard.css'

export function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recent, setRecent] = useState<Taxpayer[]>([])
  const [tasks, setTasks] = useState<{ id: string; label: string; priority: string }[]>([])

  useEffect(() => {
    Promise.all([api.getDashboardStats(), api.getRecentTaxpayers(), api.getPendingTasks()])
      .then(([statsData, recentData, tasksData]) => {
        setStats(statsData)
        setRecent(recentData.taxpayers)
        setTasks(tasksData.tasks)
      })
      .catch(console.error)
  }, [])

  const role = user?.role ?? 'Officer'
  const title = user?.title ?? 'Taxpayer Officer'
  const greeting = user?.name ? `Good Morning, ${user.name.split(' ')[0]}!` : 'Good Morning, Officer!'

  return (
    <div className="admin-dashboard">
      <AdminSidebar role={role} title={title} />

      <div className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">Dashboard</p>
            <h1>Welcome to TaxCoreAI</h1>
          </div>
          <div className="admin-dashboard__topbar-actions">
            <div className="admin-dashboard__search">
              <input type="search" placeholder="Search taxpayer, TIN..." aria-label="Search records" />
            </div>
            <button className="btn btn-secondary">Notifications</button>
            <button className="btn btn-secondary">RRA</button>
          </div>
        </header>

        <section className="admin-dashboard__hero-card">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h2>{greeting}</h2>
            <p className="admin-dashboard__hero-text">
              Overview of active taxpayers, documents, workflows, and flagged records.
            </p>
            <div className="admin-dashboard__hero-actions">
              <button className="btn btn-primary">Register Taxpayer</button>
              <button className="btn btn-secondary">AI Assistant</button>
            </div>
          </div>
          <div className="admin-dashboard__hero-summary">
            <div className="summary-card summary-card--primary">
              <p>Total Taxpayers</p>
              <strong>{stats?.totalTaxpayers ?? '—'}</strong>
            </div>
            <div className="summary-card summary-card--success">
              <p>Active Taxpayers</p>
              <strong>{stats?.activeTaxpayers ?? '—'}</strong>
            </div>
            <div className="summary-card summary-card--accent">
              <p>Total Documents</p>
              <strong>{stats?.totalDocuments ?? '—'}</strong>
            </div>
            <div className="summary-card summary-card--warning">
              <p>Pending Workflows</p>
              <strong>{stats?.pendingWorkflows ?? '—'}</strong>
            </div>
            <div className="summary-card summary-card--danger">
              <p>Flagged Records</p>
              <strong>{stats?.flaggedRecords ?? '—'}</strong>
            </div>
          </div>
        </section>

        <section className="admin-dashboard__grid">
          <div className="admin-dashboard__content-card admin-dashboard__content-card--wide">
            <div className="card-header">
              <div>
                <p className="eyebrow">Recent Taxpayers</p>
                <h2>Recent Taxpayers</h2>
              </div>
              <Link to="/taxpayers" className="view-all">
                View All
              </Link>
            </div>
            <div className="admin-dashboard__table-wrap">
              <table className="admin-dashboard__table">
                <thead>
                  <tr>
                    <th>Name / TIN</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {row.name}
                        <span>{row.tin}</span>
                      </td>
                      <td>{row.type}</td>
                      <td className={`status status--${row.status.toLowerCase()}`}>{row.status}</td>
                      <td>{row.registered}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="admin-dashboard__sidebar-right">
            <div className="admin-dashboard__content-card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">AI Assistant</p>
                  <h2>Ask questions about taxpayer records</h2>
                </div>
              </div>
              <p className="assistant-text">
                Get summaries, compliance insights, and document retrieval guidance across the tax
                system.
              </p>
              <button className="btn btn-primary btn-full">Open AI Assistant</button>
            </div>

            <div className="admin-dashboard__content-card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Pending Tasks</p>
                  <h2>Action items</h2>
                </div>
              </div>
              <ul className="task-list">
                {tasks.map((task) => (
                  <li key={task.id}>
                    <span>{task.label}</span>
                    <strong>{task.priority}</strong>
                  </li>
                ))}
              </ul>
            </div>

            <div className="admin-dashboard__content-card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Quick Actions</p>
                  <h2>Shortcuts</h2>
                </div>
              </div>
              <div className="quick-actions">
                <button className="btn btn-secondary btn-block">Register Taxpayer</button>
                <button className="btn btn-secondary btn-block">Upload Document</button>
                <button className="btn btn-secondary btn-block">Search Records</button>
                <button className="btn btn-secondary btn-block">Generate Report</button>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}
