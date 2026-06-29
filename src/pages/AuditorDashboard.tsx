import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AuditorSidebar } from '../components/AuditorSidebar'
import { useAuth } from '../context/AuthContext'
import { api, type DashboardStats, type Taxpayer } from '../lib/api'
import './AdminDashboard.css'

interface ActivityItem {
  type: string
  action: string
  details: string
  timestamp: string
  id: string
  user?: string
}

interface DailyMetric {
  date: string
  newTaxpayers: number
  newDocuments: number
  completedWorkflows: number
}

interface ComplianceMetrics {
  analysisRate: string
  approvalRate: string
}

interface AuditLogItem {
  id: string
  action: string
  username: string
  details: string
  createdAt: string
}

export function AuditorDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recent, setRecent] = useState<Taxpayer[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [metrics, setMetrics] = useState<{ dailyMetrics: DailyMetric[]; compliance: ComplianceMetrics } | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
  const [flaggedCount, setFlaggedCount] = useState(0)

  useEffect(() => {
    Promise.all([
      api.getDashboardStats(),
      api.getRecentTaxpayers(),
      api.getRecentActivity(10),
      api.getMetrics(),
      api.getAuditLogs(20)
    ])
      .then(([statsData, recentData, activityData, metricsData, auditData]) => {
        setStats(statsData)
        setRecent(recentData.taxpayers)
        setActivity(activityData.activity)
        setMetrics(metricsData)
        setAuditLogs(auditData.logs)
        setFlaggedCount(statsData?.flaggedRecords ?? 0)
      })
      .catch(console.error)
  }, [])

  const role = user?.role ?? 'Auditor'
  const title = user?.title ?? 'Tax Auditor'
  const greeting = user?.name ? `Good Morning, ${user.name.split(' ')[0]}!` : 'Good Morning, Auditor!'

  return (
    <div className="admin-dashboard">
      <AuditorSidebar role={role} title={title} />

      <div className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">Audit Dashboard</p>
            <h1>Welcome to TaxCoreAI - Audit Mode</h1>
          </div>
          <div className="admin-dashboard__topbar-actions">
            <div className="admin-dashboard__search">
              <input type="search" placeholder="Search taxpayer, TIN..." aria-label="Search records" />
            </div>
            <Link to="/notifications" className="btn btn-secondary notification-btn">
              Notifications
            </Link>
            <button className="btn btn-secondary">RRA</button>
          </div>
        </header>

        {flaggedCount > 0 && (
          <div className="compliance-alerts-banner">
            <h3>⚠️ Audit Alerts</h3>
            <div className="alerts-list">
              <div className="alert-item alert-item--alert">
                <span className="alert-icon">🔴</span>
                <span className="alert-message">{flaggedCount} flagged records require immediate review</span>
              </div>
            </div>
          </div>
        )}

        <section className="admin-dashboard__hero-card">
          <div>
            <p className="eyebrow">Audit Dashboard</p>
            <h2>{greeting}</h2>
            <p className="admin-dashboard__hero-text">
              View-only mode: Audit taxpayer records, documents, and workflows. All changes must be
              requested through official channels.
            </p>
            <div className="admin-dashboard__hero-actions">
              <span style={{ fontSize: '0.875rem', color: '#666' }}>
                📋 View-Only Audit Access
              </span>
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

        {metrics && (
          <section className="admin-dashboard__metrics-section">
            <div className="card-header">
              <div>
                <p className="eyebrow">Audit Metrics</p>
                <h2>7-Day Compliance Overview</h2>
              </div>
            </div>
            <div className="metrics-grid">
              {metrics.dailyMetrics.map((day) => (
                <div key={day.date} className="metric-card">
                  <p className="metric-date">{day.date}</p>
                  <div className="metric-values">
                    <div>
                      <span className="metric-number">{day.newTaxpayers}</span>
                      <span className="metric-label">New Taxpayers</span>
                    </div>
                    <div>
                      <span className="metric-number">{day.newDocuments}</span>
                      <span className="metric-label">Documents</span>
                    </div>
                    <div>
                      <span className="metric-number">{day.completedWorkflows}</span>
                      <span className="metric-label">Approved</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="compliance-banner">
              <div className="compliance-item">
                <span className="compliance-label">Document Analysis Rate</span>
                <span className="compliance-value">{metrics.compliance.analysisRate}%</span>
              </div>
              <div className="compliance-item">
                <span className="compliance-label">Workflow Approval Rate</span>
                <span className="compliance-value">{metrics.compliance.approvalRate}%</span>
              </div>
            </div>
          </section>
        )}

        <section className="admin-dashboard__grid">
          <div className="admin-dashboard__content-card admin-dashboard__content-card--wide">
            <div className="card-header">
              <div>
                <p className="eyebrow">Recent Taxpayers</p>
                <h2>Reviewed Taxpayer Records</h2>
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
                  <p className="eyebrow">Audit Logs</p>
                  <h2>Recent System Activity</h2>
                </div>
                <Link to="/audit-logs" className="view-all">View All</Link>
              </div>
              <ul className="audit-log-list">
                {auditLogs.length > 0 ? (
                  auditLogs.slice(0, 8).map((log) => (
                    <li key={log.id} className="audit-log-item">
                      <div className="audit-log-header">
                        <strong className="audit-action">{log.action}</strong>
                        <span className="audit-time">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="audit-details">{log.details}</p>
                      <p className="audit-user">By: {log.username}</p>
                    </li>
                  ))
                ) : (
                  <li className="no-audit-logs">No audit logs available</li>
                )}
              </ul>
            </div>

            <div className="admin-dashboard__content-card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Recent Activity</p>
                  <h2>System Changes</h2>
                </div>
              </div>
              <ul className="activity-feed">
                {activity.length > 0 ? (
                  activity.slice(0, 6).map((item) => (
                    <li key={item.id} className="activity-item">
                      <div className={`activity-icon activity-icon--${item.type}`}>
                        {item.type === 'taxpayer' && '👤'}
                        {item.type === 'document' && '📄'}
                        {item.type === 'workflow' && '⚡'}
                        {item.type === 'audit' && '📋'}
                      </div>
                      <div className="activity-content">
                        <p className="activity-action">{item.action}</p>
                        <p className="activity-details">{item.details}</p>
                        <p className="activity-time">{new Date(item.timestamp).toLocaleString()}</p>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="no-activity">No recent activity</li>
                )}
              </ul>
            </div>

            <div className="admin-dashboard__content-card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Quick Access</p>
                  <h2>Audit Tools</h2>
                </div>
              </div>
              <div className="quick-actions">
                <Link to="/audit-logs" className="btn btn-secondary btn-block">View Audit Logs</Link>
                <Link to="/documents" className="btn btn-secondary btn-block">Review Documents</Link>
                <Link to="/workflows" className="btn btn-secondary btn-block">View Workflows</Link>
                <Link to="/reports" className="btn btn-secondary btn-block">Compliance Reports</Link>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}
