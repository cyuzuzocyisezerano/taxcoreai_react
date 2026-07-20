import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hasPermission } from '../lib/permissions'
import { AdminSidebar } from '../components/AdminSidebar'
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

interface TaskItem {
  id: string
  title: string
  priority: string
}

interface NotificationItem {
  id: string
  title: string
  type: string
  status?: string
  createdAt: string
}

export function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recent, setRecent] = useState<Taxpayer[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [metrics, setMetrics] = useState<{ dailyMetrics: DailyMetric[]; compliance: ComplianceMetrics } | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ taxpayers: Taxpayer[]; documents: any[] } | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    console.log('Loading dashboard data...')
    Promise.all([
      api.getDashboardStats(),
      api.getRecentTaxpayers(),
      api.getPendingTasks(),
      api.getRecentActivity(10),
      api.getMetrics(),
      api.getNotifications()
    ])
      .then(([statsData, recentData, tasksData, activityData, metricsData, notificationsData]) => {
        console.log('Dashboard data loaded:', { statsData, recentData, tasksData, activityData, metricsData, notificationsData })
        setStats(statsData)
        setRecent(recentData.taxpayers)
        setTasks(tasksData.tasks)
        setActivity(activityData.activity)
        setMetrics(metricsData)
        setNotifications(notificationsData.notifications)
      })
      .catch((err) => {
        console.error('Failed to load dashboard data:', err)
      })
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const results = await api.searchRecords({ q: searchQuery })
      setSearchResults(results)
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const unreadNotifications = notifications.filter(n => n.status === 'unread').length

  const role = user?.role ?? 'Officer'
  const title = user?.title ?? 'Taxpayer Officer'
  const greeting = user?.fullName ? `Good Morning, ${user.fullName.split(' ')[0]}!` : 'Good Morning, Officer!'

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
            <form className="admin-dashboard__search" onSubmit={handleSearch}>
              <input
                type="search"
                placeholder="Search taxpayer, TIN, document..."
                aria-label="Search records"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="search-btn" disabled={isSearching}>
                {isSearching ? '...' : 'Search'}
              </button>
            </form>
            <Link to="/notifications" className="btn btn-secondary notification-btn">
              Notifications {unreadNotifications > 0 && <span className="badge">{unreadNotifications}</span>}
            </Link>
            <button className="btn btn-secondary">RRA</button>
          </div>
        </header>

        {searchResults && (
          <div className="search-results-panel">
            <div className="card-header">
              <h3>Search Results for "{searchQuery}"</h3>
              <button onClick={() => { setSearchResults(null); setSearchQuery('') }} className="btn btn-small">Clear</button>
            </div>
            {searchResults.taxpayers.length > 0 && (
              <div className="search-section">
                <h4>Taxpayers ({searchResults.taxpayers.length})</h4>
                <div className="search-results-grid">
                  {searchResults.taxpayers.slice(0, 5).map(t => (
                    <Link key={t.id} to={`/taxpayers/${t.id}`} className="search-result-item">
                      <strong>{t.name}</strong>
                      <span>{t.tin}</span>
                      <span className={`status status--${t.status.toLowerCase()}`}>{t.status}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {searchResults.documents.length > 0 && (
              <div className="search-section">
                <h4>Documents ({searchResults.documents.length})</h4>
                <div className="search-results-grid">
                  {searchResults.documents.slice(0, 5).map(d => (
                    <Link key={d.id} to={`/documents/${d.id}`} className="search-result-item">
                      <strong>{d.title}</strong>
                      <span>{d.type}</span>
                      <span className={`status status--${(d.status || 'pending').toLowerCase()}`}>{d.status || 'Pending'}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {searchResults.taxpayers.length === 0 && searchResults.documents.length === 0 && (
              <p className="no-results">No results found</p>
            )}
          </div>
        )}

        <section className="admin-dashboard__hero-card">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h2>{greeting}</h2>
            <p className="admin-dashboard__hero-text">
              Overview of active taxpayers, documents, workflows, and flagged records.
            </p>
            <div className="admin-dashboard__hero-actions">
              <Link to="/taxpayers" className="btn btn-primary">Register Taxpayer</Link>
              <Link to="/ai-assistant" className="btn btn-secondary">AI Assistant</Link>
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
                <p className="eyebrow">Processing Metrics</p>
                <h2>7-Day Processing Overview</h2>
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
                  <p className="eyebrow">Notifications</p>
                  <h2>System Updates</h2>
                </div>
                <Link to="/notifications" className="view-all">View All</Link>
              </div>
              <ul className="notification-list">
                {notifications.length > 0 ? (
                  notifications.slice(0, 5).map((n) => (
                    <li key={n.id} className={`notification-item ${n.status === 'unread' ? 'notification-item--unread' : ''}`}>
                      <div className="notification-icon">{n.type === 'alert' ? '⚠️' : n.type === 'info' ? 'ℹ️' : '📢'}</div>
                      <div className="notification-content">
                        <p className="notification-title">{n.title}</p>
                        <p className="notification-time">{new Date(n.createdAt).toLocaleDateString()}</p>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="no-notifications">No notifications</li>
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
                  activity.slice(0, 8).map((item) => (
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
                  <p className="eyebrow">Pending Tasks</p>
                  <h2>Action Items</h2>
                </div>
              </div>
              <ul className="task-list">
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <li key={task.id}>
                      <span>{task.title}</span>
                      <strong className={`priority-${task.priority.toLowerCase()}`}>{task.priority}</strong>
                    </li>
                  ))
                ) : (
                  <li className="no-tasks">No pending tasks</li>
                )}
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
                <Link to="/taxpayers" className="btn btn-secondary btn-block">Register Taxpayer</Link>
                {hasPermission((user?.role as any) ?? 'Admin', 'canAddDocuments') && (
                  <Link to="/upload-document" className="btn btn-secondary btn-block">Upload Document</Link>
                )}
                <Link to="/search-retrieval" className="btn btn-secondary btn-block">Search Records</Link>
                <Link to="/reports" className="btn btn-secondary btn-block">Generate Report</Link>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}