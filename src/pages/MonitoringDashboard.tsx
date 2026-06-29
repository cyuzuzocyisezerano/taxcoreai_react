import { useEffect, useState, useCallback } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { api } from '../lib/api'
import './MonitoringDashboard.css'

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  uptime: number
  totalRecords: number
  errorRate: string
  totalOperations: number
  lastUpdated: string
}

interface StorageMetrics {
  documents: { count: number; totalSize: number; unit: string }
  database: { notifications: number; workflows: number; auditLogs: number; users: number }
  totalSize: number
}

interface UserActivity {
  activity: Array<{
    userId: string
    username: string
    action: string
    details: string
    timestamp: string
    ipAddress?: string
  }>
  activeUsers: Array<{ id: string; username: string; name: string; role: string; lastActive: string }>
  totalUsers: number
  onlineCount: number
}

interface ProcessingVolume {
  daily: { newTaxpayers: number; newDocuments: number; completedWorkflows: number }
  weekly: { newTaxpayers: number; newDocuments: number; completedWorkflows: number }
  monthly: { newTaxpayers: number; newDocuments: number; completedWorkflows: number }
  generatedAt: string
}

interface ComplianceMetrics {
  documentCompliance: string
  workflowCompliance: string
  taxpayerCompliance: string
  overallCompliance: string
  metrics: {
    totalDocuments: number
    analyzedDocuments: number
    totalWorkflows: number
    completedWorkflows: number
    totalTaxpayers: number
    compliantTaxpayers: number
  }
}

type Tab = 'overview' | 'system-health' | 'activity' | 'compliance' | 'storage'

export function MonitoringDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [storage, setStorage] = useState<StorageMetrics | null>(null)
  const [userActivity, setUserActivity] = useState<UserActivity | null>(null)
  const [processingVolume, setProcessingVolume] = useState<ProcessingVolume | null>(null)
  const [compliance, setCompliance] = useState<ComplianceMetrics | null>(null)
  const [realtimeData, setRealtimeData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const loadAllData = useCallback(async () => {
    try {
      const [health, storageData, activity, volume, complianceData, realtime] = await Promise.all([
        api.getSystemHealth(),
        api.getStorageMetrics(),
        api.getUserActivity(),
        api.getProcessingVolume(),
        api.getComplianceMetrics(),
        api.getRealtimeData(),
      ])

      setSystemHealth(health.health)
      setStorage(storageData.storage)
      setUserActivity(activity)
      setProcessingVolume(volume)
      setCompliance(complianceData)
      setRealtimeData(realtime)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load monitoring data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAllData()

    if (autoRefresh) {
      const interval = setInterval(loadAllData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [loadAllData, autoRefresh])

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const data = await api.exportMonitoringData(format)
      if (format === 'csv') {
        const blob = new Blob([data], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `monitoring-data-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `monitoring-data-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      alert('Failed to export data')
    }
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'status-healthy'
      case 'warning':
        return 'status-warning'
      case 'critical':
        return 'status-critical'
      default:
        return 'status-unknown'
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="monitoring-dashboard">
      <AdminSidebar role="Admin" title="System Administrator" />

      <main className="monitoring-dashboard__main">
        <header className="monitoring-dashboard__header">
          <div>
            <h1>Monitoring & Control Dashboard</h1>
            <p className="monitoring-dashboard__subtitle">
              Real-time system monitoring and performance metrics
            </p>
          </div>
          <div className="monitoring-dashboard__header-actions">
            <label className="auto-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
              />
              <span>Auto-refresh (30s)</span>
            </label>
            <button className="btn btn-secondary" onClick={loadAllData} disabled={loading}>
              Refresh Now
            </button>
            <div className="export-buttons">
              <button className="btn btn-secondary" onClick={() => handleExport('json')}>
                Export JSON
              </button>
              <button className="btn btn-secondary" onClick={() => handleExport('csv')}>
                Export CSV
              </button>
            </div>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}

        {realtimeData && (
          <div className="realtime-indicator">
            <span className={`realtime-dot ${realtimeData.systemStatus === 'operational' ? 'realtime-dot--active' : ''}`} />
            <span>System Status: {realtimeData.systemStatus}</span>
            <span className="realtime-time">Last updated: {new Date(realtimeData.timestamp).toLocaleTimeString()}</span>
          </div>
        )}

        <div className="monitoring-dashboard__tabs">
          <button
            className={`monitoring-dashboard__tab ${activeTab === 'overview' ? 'monitoring-dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`monitoring-dashboard__tab ${activeTab === 'system-health' ? 'monitoring-dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('system-health')}
          >
            System Health
          </button>
          <button
            className={`monitoring-dashboard__tab ${activeTab === 'activity' ? 'monitoring-dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            User Activity
          </button>
          <button
            className={`monitoring-dashboard__tab ${activeTab === 'compliance' ? 'monitoring-dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('compliance')}
          >
            Compliance
          </button>
          <button
            className={`monitoring-dashboard__tab ${activeTab === 'storage' ? 'monitoring-dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('storage')}
          >
            Storage
          </button>
        </div>

        {loading && <p className="loading">Loading monitoring data...</p>}

        {!loading && (
          <>
            {activeTab === 'overview' && (
              <div className="monitoring-dashboard__content">
                <div className="kpi-grid">
                  <div className="kpi-card">
                    <div className="kpi-card__icon">💻</div>
                    <div className="kpi-card__content">
                      <p className="kpi-card__label">System Status</p>
                      <p className={`kpi-card__value ${getHealthStatusColor(systemHealth?.status || 'unknown')}`}>
                        {systemHealth?.status?.toUpperCase() || 'UNKNOWN'}
                      </p>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card__icon">⏱️</div>
                    <div className="kpi-card__content">
                      <p className="kpi-card__label">Uptime</p>
                      <p className="kpi-card__value">{formatUptime(systemHealth?.uptime || 0)}</p>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card__icon">👥</div>
                    <div className="kpi-card__content">
                      <p className="kpi-card__label">Online Users</p>
                      <p className="kpi-card__value">{userActivity?.onlineCount || 0} / {userActivity?.totalUsers || 0}</p>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card__icon">📊</div>
                    <div className="kpi-card__content">
                      <p className="kpi-card__label">Total Records</p>
                      <p className="kpi-card__value">{systemHealth?.totalRecords || 0}</p>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card__icon">⚠️</div>
                    <div className="kpi-card__content">
                      <p className="kpi-card__label">Error Rate</p>
                      <p className={`kpi-card__value ${parseFloat(systemHealth?.errorRate || '0') > 5 ? 'kpi-card__value--warning' : ''}`}>
                        {systemHealth?.errorRate || '0'}%
                      </p>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card__icon">✅</div>
                    <div className="kpi-card__content">
                      <p className="kpi-card__label">Overall Compliance</p>
                      <p className="kpi-card__value">{compliance?.overallCompliance || '0'}%</p>
                    </div>
                  </div>
                </div>

                <div className="overview-grid">
                  <div className="overview-card">
                    <h3>Processing Volume (Today)</h3>
                    <div className="overview-metrics">
                      <div className="overview-metric">
                        <span className="overview-metric__value">{processingVolume?.daily.newTaxpayers || 0}</span>
                        <span className="overview-metric__label">New Taxpayers</span>
                      </div>
                      <div className="overview-metric">
                        <span className="overview-metric__value">{processingVolume?.daily.newDocuments || 0}</span>
                        <span className="overview-metric__label">Documents</span>
                      </div>
                      <div className="overview-metric">
                        <span className="overview-metric__value">{processingVolume?.daily.completedWorkflows || 0}</span>
                        <span className="overview-metric__label">Approved</span>
                      </div>
                    </div>
                  </div>

                  <div className="overview-card">
                    <h3>Storage Overview</h3>
                    <div className="overview-metrics">
                      <div className="overview-metric">
                        <span className="overview-metric__value">{storage?.documents.count || 0}</span>
                        <span className="overview-metric__label">Documents</span>
                      </div>
                      <div className="overview-metric">
                        <span className="overview-metric__value">{formatBytes(storage?.totalSize || 0)}</span>
                        <span className="overview-metric__label">Total Size</span>
                      </div>
                      <div className="overview-metric">
                        <span className="overview-metric__value">{storage?.database.auditLogs || 0}</span>
                        <span className="overview-metric__label">Audit Logs</span>
                      </div>
                    </div>
                  </div>

                  <div className="overview-card">
                    <h3>Recent Activity</h3>
                    <div className="recent-activity-list">
                      {realtimeData?.recentActivity?.slice(0, 5).map((activity: any, idx: number) => (
                        <div key={idx} className="recent-activity-item">
                          <span className="recent-activity__action">{activity.action}</span>
                          <span className="recent-activity__user">{activity.user}</span>
                          <span className="recent-activity__time">{new Date(activity.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'system-health' && systemHealth && (
              <div className="monitoring-dashboard__content">
                <div className="health-details">
                  <div className="health-card">
                    <h3>System Status</h3>
                    <div className={`health-status ${getHealthStatusColor(systemHealth.status)}`}>
                      {systemHealth.status.toUpperCase()}
                    </div>
                  </div>

                  <div className="health-card">
                    <h3>Uptime</h3>
                    <p className="health-value">{formatUptime(systemHealth.uptime)}</p>
                    <p className="health-detail">Since last restart</p>
                  </div>

                  <div className="health-card">
                    <h3>Total Records</h3>
                    <p className="health-value">{systemHealth.totalRecords.toLocaleString()}</p>
                    <p className="health-detail">Across all collections</p>
                  </div>

                  <div className="health-card">
                    <h3>Error Rate</h3>
                    <p className={`health-value ${parseFloat(systemHealth.errorRate) > 5 ? 'health-value--warning' : ''}`}>
                      {systemHealth.errorRate}%
                    </p>
                    <p className="health-detail">{systemHealth.totalOperations.toLocaleString()} total operations</p>
                  </div>

                  <div className="health-card">
                    <h3>Last Updated</h3>
                    <p className="health-value">{new Date(systemHealth.lastUpdated).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity' && userActivity && (
              <div className="monitoring-dashboard__content">
                <div className="activity-summary">
                  <div className="activity-stat">
                    <h4>Total Users</h4>
                    <p className="activity-stat__value">{userActivity.totalUsers}</p>
                  </div>
                  <div className="activity-stat">
                    <h4>Online Now</h4>
                    <p className="activity-stat__value activity-stat__value--online">{userActivity.onlineCount}</p>
                  </div>
                </div>

                <div className="activity-section">
                  <h3>Active Users</h3>
                  <div className="active-users-grid">
                    {userActivity.activeUsers.map(user => (
                      <div key={user.id} className="active-user-card">
                        <div className="active-user-card__avatar">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="active-user-card__info">
                          <p className="active-user-card__name">{user.name}</p>
                          <p className="active-user-card__role">{user.role}</p>
                          <p className="active-user-card__username">@{user.username}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="activity-section">
                  <h3>Recent Activity Feed</h3>
                  <div className="activity-feed-detailed">
                    {userActivity.activity.map((item, idx) => (
                      <div key={idx} className="activity-feed-item">
                        <div className="activity-feed-item__header">
                          <span className="activity-feed-item__user">{item.username}</span>
                          <span className="activity-feed-item__time">{new Date(item.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="activity-feed-item__action">{item.action}</p>
                        <p className="activity-feed-item__details">{item.details}</p>
                        {item.ipAddress && (
                          <p className="activity-feed-item__ip">IP: {item.ipAddress}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'compliance' && compliance && (
              <div className="monitoring-dashboard__content">
                <div className="compliance-overview">
                  <div className="compliance-card">
                    <h3>Overall Compliance Score</h3>
                    <div className="compliance-score">
                      <span className={`compliance-score__value ${parseFloat(compliance.overallCompliance) >= 80 ? 'compliance-score--good' : parseFloat(compliance.overallCompliance) >= 60 ? 'compliance-score--warning' : 'compliance-score--poor'}`}>
                        {compliance.overallCompliance}%
                      </span>
                    </div>
                  </div>

                  <div className="compliance-card">
                    <h3>Document Compliance</h3>
                    <p className="compliance-rate">{compliance.documentCompliance}%</p>
                    <p className="compliance-detail">{compliance.metrics.analyzedDocuments} / {compliance.metrics.totalDocuments} analyzed</p>
                  </div>

                  <div className="compliance-card">
                    <h3>Workflow Compliance</h3>
                    <p className="compliance-rate">{compliance.workflowCompliance}%</p>
                    <p className="compliance-detail">{compliance.metrics.completedWorkflows} / {compliance.metrics.totalWorkflows} completed</p>
                  </div>

                  <div className="compliance-card">
                    <h3>Taxpayer Compliance</h3>
                    <p className="compliance-rate">{compliance.taxpayerCompliance}%</p>
                    <p className="compliance-detail">{compliance.metrics.compliantTaxpayers} / {compliance.metrics.totalTaxpayers} active</p>
                  </div>
                </div>

                <div className="processing-volume-section">
                  <h3>Processing Volume</h3>
                  <div className="volume-tabs">
                    <div className="volume-tab">
                      <h4>Daily (Last 24h)</h4>
                      <div className="volume-metrics">
                        <div>
                          <span className="volume-metric__value">{processingVolume?.daily.newTaxpayers || 0}</span>
                          <span className="volume-metric__label">New Taxpayers</span>
                        </div>
                        <div>
                          <span className="volume-metric__value">{processingVolume?.daily.newDocuments || 0}</span>
                          <span className="volume-metric__label">Documents</span>
                        </div>
                        <div>
                          <span className="volume-metric__value">{processingVolume?.daily.completedWorkflows || 0}</span>
                          <span className="volume-metric__label">Approved</span>
                        </div>
                      </div>
                    </div>

                    <div className="volume-tab">
                      <h4>Weekly (Last 7 Days)</h4>
                      <div className="volume-metrics">
                        <div>
                          <span className="volume-metric__value">{processingVolume?.weekly.newTaxpayers || 0}</span>
                          <span className="volume-metric__label">New Taxpayers</span>
                        </div>
                        <div>
                          <span className="volume-metric__value">{processingVolume?.weekly.newDocuments || 0}</span>
                          <span className="volume-metric__label">Documents</span>
                        </div>
                        <div>
                          <span className="volume-metric__value">{processingVolume?.weekly.completedWorkflows || 0}</span>
                          <span className="volume-metric__label">Approved</span>
                        </div>
                      </div>
                    </div>

                    <div className="volume-tab">
                      <h4>Monthly (Last 30 Days)</h4>
                      <div className="volume-metrics">
                        <div>
                          <span className="volume-metric__value">{processingVolume?.monthly.newTaxpayers || 0}</span>
                          <span className="volume-metric__label">New Taxpayers</span>
                        </div>
                        <div>
                          <span className="volume-metric__value">{processingVolume?.monthly.newDocuments || 0}</span>
                          <span className="volume-metric__label">Documents</span>
                        </div>
                        <div>
                          <span className="volume-metric__value">{processingVolume?.monthly.completedWorkflows || 0}</span>
                          <span className="volume-metric__label">Approved</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'storage' && storage && (
              <div className="monitoring-dashboard__content">
                <div className="storage-overview">
                  <div className="storage-card">
                    <h3>Documents Storage</h3>
                    <div className="storage-metric">
                      <span className="storage-metric__value">{storage.documents.count}</span>
                      <span className="storage-metric__label">Total Documents</span>
                    </div>
                    <div className="storage-metric">
                      <span className="storage-metric__value">{formatBytes(storage.documents.totalSize)}</span>
                      <span className="storage-metric__label">Total Size</span>
                    </div>
                  </div>

                  <div className="storage-card">
                    <h3>Database Records</h3>
                    <div className="storage-breakdown">
                      <div className="storage-breakdown-item">
                        <span>Notifications</span>
                        <span>{storage.database.notifications}</span>
                      </div>
                      <div className="storage-breakdown-item">
                        <span>Workflows</span>
                        <span>{storage.database.workflows}</span>
                      </div>
                      <div className="storage-breakdown-item">
                        <span>Audit Logs</span>
                        <span>{storage.database.auditLogs}</span>
                      </div>
                      <div className="storage-breakdown-item">
                        <span>Users</span>
                        <span>{storage.database.users}</span>
                      </div>
                    </div>
                  </div>

                  <div className="storage-card">
                    <h3>Total Storage</h3>
                    <p className="storage-total">{formatBytes(storage.totalSize)}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}