import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SupervisorSidebar } from '../components/SupervisorSidebar'
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

export function SupervisorDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recent, setRecent] = useState<Taxpayer[]>([])
  const [tasks, setTasks] = useState<{ id: string; label: string; priority: string }[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [metrics, setMetrics] = useState<{ dailyMetrics: DailyMetric[]; compliance: ComplianceMetrics } | null>(null)
  const [workflows, setWorkflows] = useState<{ id: string; title: string; stage: string; owner: string; dueDate: string }[]>([])
  const [complianceAlerts, setComplianceAlerts] = useState<{ id: string; message: string; severity: string }[]>([])

  useEffect(() => {
    Promise.all([
      api.getDashboardStats(),
      api.getRecentTaxpayers(),
      api.getPendingTasks(),
      api.getRecentActivity(10),
      api.getMetrics(),
      api.getWorkflows(),
      api.getNotifications()
    ])
      .then(([statsData, recentData, tasksData, activityData, metricsData, workflowsData, notificationsData]) => {
        setStats(statsData)
        setRecent(recentData.taxpayers)
        setTasks(tasksData.tasks)
        setActivity(activityData.activity)
        setMetrics(metricsData)
        setWorkflows(workflowsData.workflows)
        
        // Generate compliance alerts based on metrics
        const alerts: { id: string; message: string; severity: string }[] = []
        if (metricsData.compliance.analysisRate && parseFloat(metricsData.compliance.analysisRate) < 80) {
          alerts.push({
            id: '1',
            message: `Document analysis rate is low: ${metricsData.compliance.analysisRate}%`,
            severity: 'warning'
          })
        }
        if (metricsData.compliance.approvalRate && parseFloat(metricsData.compliance.approvalRate) < 70) {
          alerts.push({
            id: '2',
            message: `Workflow approval rate needs attention: ${metricsData.compliance.approvalRate}%`,
            severity: 'alert'
          })
        }
        if (statsData?.flaggedRecords && statsData.flaggedRecords > 0) {
          alerts.push({
            id: '3',
            message: `${statsData.flaggedRecords} flagged records require review`,
            severity: 'alert'
          })
        }
        setComplianceAlerts(alerts)
      })
      .catch(console.error)
  }, [])

  const role = user?.role ?? 'Supervisor'
  const title = user?.title ?? 'Audit Supervisor'
  const greeting = user?.name ? `Good Morning, ${user.name.split(' ')[0]}!` : 'Good Morning, Supervisor!'

  return (
    <div className="admin-dashboard">
      <SupervisorSidebar role={role} title={title} />

      <div className="admin-dashboard__main">
        <header className="admin-dashboard__topbar">
          <div>
            <p className="admin-dashboard__breadcrumb">Supervisor Dashboard</p>
            <h1>Welcome to TaxCoreAI - Supervisor Mode</h1>
          </div>
          <div className="admin-dashboard__topbar-actions">
            <div className="admin-dashboard__search">
              <input type="search" placeholder="Search taxpayer, TIN..." aria-label="Search records" />
            </div>
            <Link to="/notifications" className="btn btn-secondary notification-btn">
              Notifications {complianceAlerts.length > 0 && <span className="badge badge--alert">{complianceAlerts.length}</span>}
            </Link>
            <button className="btn btn-secondary">RRA</button>
          </div>
        </header>

        {complianceAlerts.length > 0 && (
          <div className="compliance-alerts-banner">
            <h3>⚠️ Compliance Alerts</h3>
            <div className="alerts-list">
              {complianceAlerts.map((alert) => (
                <div key={alert.id} className={`alert-item alert-item--${alert.severity}`}>
                  <span className="alert-icon">{alert.severity === 'alert' ? '🔴' : '🟡'}</span>
                  <span className="alert-message">{alert.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <section className="admin-dashboard__hero-card">
          <div>
            <p className="eyebrow">Supervisor Dashboard</p>
            <h2>{greeting}</h2>
            <p className="admin-dashboard__hero-text">
              Supervise audit workflows, review and approve documents, and manage team workload.
            </p>
            <div className="admin-dashboard__hero-actions">
              <span style={{ fontSize: '0.875rem', color: '#666' }}>
                ✓ Approval & Supervision Access
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
                <p className="eyebrow">Team Workload & Processing</p>
                <h2>7-Day Team Performance</h2>
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
                <h2>Under Supervision</h2>
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
                  <p className="eyebrow">Pending Approvals</p>
                  <h2>Workflows & Documents</h2>
                </div>
                <Link to="/workflows" className="view-all">View All</Link>
              </div>
              <ul className="task-list">
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <li key={task.id}>
                      <span>{task.label}</span>
                      <strong className={`priority-${task.priority.toLowerCase()}`}>{task.priority}</strong>
                    </li>
                  ))
                ) : (
                  <li className="no-tasks">No pending approvals</li>
                )}
              </ul>
            </div>

            <div className="admin-dashboard__content-card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Active Workflows</p>
                  <h2>Team Workload</h2>
                </div>
              </div>
              <ul className="workflow-list">
                {workflows.length > 0 ? (
                  workflows.slice(0, 5).map((w) => (
                    <li key={w.id} className="workflow-item">
                      <div className="workflow-info">
                        <p className="workflow-title">{w.title}</p>
                        <p className="workflow-meta">Owner: {w.owner} | Due: {new Date(w.dueDate).toLocaleDateString()}</p>
                      </div>
                      <span className={`status status--${(w.stage ?? "unknown").toLowerCase()}`}>
                        {w.stage ?? "Unknown"}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="no-workflows">No active workflows</li>
                )}
              </ul>
            </div>

            <div className="admin-dashboard__content-card">
              <div className="card-header">
                <div>
                  <p className="eyebrow">Recent Activity</p>
                  <h2>System Activity</h2>
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
                  <p className="eyebrow">Quick Navigation</p>
                  <h2>Supervisor Actions</h2>
                </div>
              </div>
              <div className="quick-actions">
                <Link to="/workflows" className="btn btn-secondary btn-block">Approve Workflows</Link>
                <Link to="/documents" className="btn btn-secondary btn-block">Review Documents</Link>
                <Link to="/audit-logs" className="btn btn-secondary btn-block">Audit Logs</Link>
                <Link to="/reports" className="btn btn-secondary btn-block">View Reports</Link>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}
