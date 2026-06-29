import { useEffect, useState, useCallback } from 'react'
import { AdminSidebar } from '../components/AdminSidebar'
import { BroadcastComposer } from '../components/BroadcastComposer'
import { api, type NotificationItem, type NotificationHistoryItem, type IntegrationStatus } from '../lib/api'
import './NotificationsPage.css'

type Tab = 'notifications' | 'history' | 'preferences' | 'integration'

export function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('notifications')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [history, setHistory] = useState<NotificationHistoryItem[]>([])
  const [preferences, setPreferences] = useState<{
    email: boolean
    sms: boolean
    inApp: boolean
    categories: {
      document: boolean
      task: boolean
      compliance: boolean
      deadline: boolean
      approval: boolean
      escalation: boolean
      announcement: boolean
    }
    quietHours: { enabled: boolean; start: string; end: string }
  } | null>({
    email: true,
    sms: false,
    inApp: true,
    categories: {
      document: true,
      task: true,
      compliance: true,
      deadline: true,
      approval: true,
      escalation: true,
      announcement: true,
    },
    quietHours: { enabled: false, start: '22:00', end: '07:00' },
  })
  const [integration, setIntegration] = useState<IntegrationStatus | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalNotifications, setTotalNotifications] = useState(0)
  const [hasMoreNotifications, setHasMoreNotifications] = useState(false)
  const [hasMoreHistory, setHasMoreHistory] = useState(false)

  // Filters
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false)
  const [historyFilter, setHistoryFilter] = useState({ notificationId: 'all', action: 'all', channel: 'all' })

  const [offsetNotifications, setOffsetNotifications] = useState(0)
  const [offsetHistory, setOffsetHistory] = useState(0)
  const limit = 20

  const loadNotifications = useCallback(async (reset = false) => {
    try {
      const data = await api.getNotifications({
        unreadOnly: filterUnreadOnly,
        type: filterType,
        category: filterCategory,
        priority: filterPriority,
        limit,
        offset: reset ? 0 : offsetNotifications,
      })
      if (reset) {
        setNotifications(data.notifications)
        setOffsetNotifications(limit)
      } else {
        setNotifications(prev => [...prev, ...data.notifications])
        setOffsetNotifications(prev => prev + limit)
      }
      setTotalNotifications(data.total)
      setUnreadCount(data.unreadCount)
      setHasMoreNotifications(data.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [filterUnreadOnly, filterType, filterCategory, filterPriority, offsetNotifications, limit])

  const loadHistory = useCallback(async (reset = false) => {
    try {
      const data = await api.getNotificationHistory({
        notificationId: historyFilter.notificationId,
        action: historyFilter.action,
        channel: historyFilter.channel,
        limit,
        offset: reset ? 0 : offsetHistory,
      })
      if (reset) {
        setHistory(data.history)
        setOffsetHistory(limit)
      } else {
        setHistory(prev => [...prev, ...data.history])
        setOffsetHistory(prev => prev + limit)
      }
      setHasMoreHistory(data.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    }
  }, [historyFilter, offsetHistory, limit])

  const loadPreferences = useCallback(async () => {
    try {
      const data = await api.getNotificationPreferences()
      setPreferences(data.preferences)
    } catch (err) {
      console.error('Failed to load preferences:', err)
    }
  }, [])

  const loadIntegration = useCallback(async () => {
    try {
      const data = await api.getNotificationIntegrationStatus()
      setIntegration(data.integration)
    } catch (err) {
      console.error('Failed to load integration status:', err)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'notifications') {
      setLoading(true)
      setOffsetNotifications(0)
      loadNotifications(true)
    } else if (activeTab === 'history') {
      setLoading(true)
      setOffsetHistory(0)
      loadHistory(true)
    } else if (activeTab === 'preferences') {
      loadPreferences()
    } else if (activeTab === 'integration') {
      loadIntegration()
    }
  }, [activeTab, filterUnreadOnly, filterType, filterCategory, filterPriority])

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id)
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return
    try {
      await api.deleteNotification(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      setTotalNotifications(prev => prev - 1)
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  const handleSavePreferences = async () => {
    if (!preferences) return
    try {
      const data = await api.updateNotificationPreferences(preferences)
      setPreferences(data.preferences)
      alert('Preferences saved successfully')
    } catch (err) {
      alert('Failed to save preferences')
    }
  }

  const handleTestIntegration = async (channel: 'email' | 'sms') => {
    try {
      await api.testNotificationIntegration(channel)
      alert(`${channel.toUpperCase()} integration test successful`)
      loadIntegration()
    } catch (err) {
      alert(`Failed to test ${channel} integration`)
    }
  }

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return <span className="badge badge-danger">Critical</span>
      case 'high':
        return <span className="badge badge-warning">High</span>
      case 'medium':
        return <span className="badge badge-info">Medium</span>
      case 'low':
        return <span className="badge badge-success">Low</span>
      default:
        return null
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
        return '📄'
      case 'workflow':
        return '⚡'
      case 'compliance':
        return '⚠️'
      case 'deadline':
        return '⏰'
      case 'approval':
        return '✅'
      case 'escalation':
        return '🔴'
      case 'broadcast':
        return '📢'
      default:
        return '🔔'
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'sent':
        return 'Sent'
      case 'read':
        return 'Read'
      case 'read_all':
        return 'Marked all read'
      case 'broadcast_sent':
        return 'Broadcast sent'
      default:
        return action
    }
  }

  return (
    <div className="notifications-page">
      <AdminSidebar role="Officer" title="Taxpayer Officer" />

      <main className="notifications-page__main">
        <header className="notifications-page__header">
          <div>
            <h1>Notifications & Alerts</h1>
            <p className="notifications-page__subtitle">
              Manage notifications, preferences, and alert settings
            </p>
          </div>
          <div className="notifications-page__header-actions">
            <BroadcastComposer onBroadcastSent={loadNotifications} />
            {unreadCount > 0 && (
              <button className="btn btn-secondary" onClick={handleMarkAllAsRead}>
                Mark all read ({unreadCount})
              </button>
            )}
          </div>
        </header>

        <div className="notifications-page__tabs">
          <button
            className={`notifications-page__tab ${activeTab === 'notifications' ? 'notifications-page__tab--active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications
            {unreadCount > 0 && <span className="notifications-page__tab-badge">{unreadCount}</span>}
          </button>
          <button
            className={`notifications-page__tab ${activeTab === 'history' ? 'notifications-page__tab--active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Alert History
          </button>
          <button
            className={`notifications-page__tab ${activeTab === 'preferences' ? 'notifications-page__tab--active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            Preferences
          </button>
          <button
            className={`notifications-page__tab ${activeTab === 'integration' ? 'notifications-page__tab--active' : ''}`}
            onClick={() => setActiveTab('integration')}
          >
            Integration
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {activeTab === 'notifications' && (
          <div className="notifications-page__content">
            <div className="notifications-page__filters">
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filterUnreadOnly}
                  onChange={e => setFilterUnreadOnly(e.target.checked)}
                />
                <span>Unread only</span>
              </label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="all">All Types</option>
                <option value="document">Document</option>
                <option value="workflow">Workflow</option>
                <option value="compliance">Compliance</option>
                <option value="deadline">Deadline</option>
                <option value="approval">Approval</option>
                <option value="escalation">Escalation</option>
                <option value="broadcast">Broadcast</option>
              </select>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="all">All Categories</option>
                <option value="document">Document</option>
                <option value="task">Task</option>
                <option value="compliance">Compliance</option>
                <option value="deadline">Deadline</option>
                <option value="approval">Approval</option>
                <option value="escalation">Escalation</option>
                <option value="announcement">Announcement</option>
              </select>
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="notifications-page__stats">
              <span>Total: {totalNotifications}</span>
              <span>Unread: {unreadCount}</span>
            </div>

            {loading && <p className="loading">Loading notifications...</p>}
            {!loading && notifications.length === 0 && (
              <div className="empty-state">
                <span className="empty-state__icon">🔔</span>
                <p>No notifications found</p>
              </div>
            )}

            <div className="notifications-list">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-card ${!notification.read ? 'notification-card--unread' : ''}`}
                >
                  <div className="notification-card__icon">{getTypeIcon(notification.type)}</div>
                  <div className="notification-card__content">
                    <div className="notification-card__header">
                      <h3 className="notification-card__title">{notification.title}</h3>
                      {getPriorityBadge(notification.priority)}
                    </div>
                    {notification.message && (
                      <p className="notification-card__message">{notification.message}</p>
                    )}
                    <div className="notification-card__meta">
                      <span className="notification-card__type">{notification.type}</span>
                      <span className="notification-card__time">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {notification.channels && notification.channels.length > 0 && (
                      <div className="notification-card__channels">
                        {notification.channels.map(channel => (
                          <span key={channel} className="channel-badge">
                            {channel}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="notification-card__actions">
                    {!notification.read && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(notification.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {hasMoreNotifications && (
              <button
                className="btn btn-secondary notifications-page__load-more"
                onClick={() => loadNotifications(false)}
              >
                Load more
              </button>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="notifications-page__content">
            <div className="notifications-page__filters">
              <select
                value={historyFilter.notificationId}
                onChange={e => setHistoryFilter(prev => ({ ...prev, notificationId: e.target.value }))}
              >
                <option value="all">All Notifications</option>
              </select>
              <select
                value={historyFilter.action}
                onChange={e => setHistoryFilter(prev => ({ ...prev, action: e.target.value }))}
              >
                <option value="all">All Actions</option>
                <option value="sent">Sent</option>
                <option value="read">Read</option>
                <option value="read_all">Marked all read</option>
                <option value="broadcast_sent">Broadcast sent</option>
              </select>
              <select
                value={historyFilter.channel}
                onChange={e => setHistoryFilter(prev => ({ ...prev, channel: e.target.value }))}
              >
                <option value="all">All Channels</option>
                <option value="in-app">In-App</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>

            {loading && <p className="loading">Loading history...</p>}
            {!loading && history.length === 0 && (
              <div className="empty-state">
                <span className="empty-state__icon">📋</span>
                <p>No history records found</p>
              </div>
            )}

            <div className="history-list">
              {history.map(entry => (
                <div key={entry.id} className="history-card">
                  <div className="history-card__header">
                    <span className="history-card__action">{getActionLabel(entry.action)}</span>
                    <span className="history-card__channel">{entry.channel}</span>
                  </div>
                  <div className="history-card__body">
                    <p>Notification ID: {entry.notificationId}</p>
                    <p className="history-card__time">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {hasMoreHistory && (
              <button
                className="btn btn-secondary notifications-page__load-more"
                onClick={() => loadHistory(false)}
              >
                Load more
              </button>
            )}
          </div>
        )}

        {activeTab === 'preferences' && preferences && (
          <div className="notifications-page__content">
            <div className="preferences-card">
              <h2>Notification Channels</h2>
              <div className="preferences-section">
                <label className="preference-item">
                  <input
                    type="checkbox"
                    checked={preferences.email}
                    onChange={e => setPreferences(prev => prev ? { ...prev, email: e.target.checked } : null)}
                  />
                  <div className="preference-item__content">
                    <strong>Email Notifications</strong>
                    <p>Receive notifications via email</p>
                  </div>
                </label>
                <label className="preference-item">
                  <input
                    type="checkbox"
                    checked={preferences.sms}
                    onChange={e => setPreferences(prev => prev ? { ...prev, sms: e.target.checked } : null)}
                  />
                  <div className="preference-item__content">
                    <strong>SMS Notifications</strong>
                    <p>Receive notifications via SMS</p>
                  </div>
                </label>
                <label className="preference-item">
                  <input
                    type="checkbox"
                    checked={preferences.inApp}
                    onChange={e => setPreferences(prev => prev ? { ...prev, inApp: e.target.checked } : null)}
                  />
                  <div className="preference-item__content">
                    <strong>In-App Notifications</strong>
                    <p>Show notifications in the application</p>
                  </div>
                </label>
              </div>

              <h2>Notification Categories</h2>
              <div className="preferences-section">
                {Object.entries(preferences.categories).map(([category, enabled]) => (
                  <label key={category} className="preference-item">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={e =>
                        setPreferences(prev =>
                          prev
                            ? {
                                ...prev,
                                categories: { ...prev.categories, [category]: e.target.checked },
                              }
                            : null
                        )
                      }
                    />
                    <div className="preference-item__content">
                      <strong style={{ textTransform: 'capitalize' }}>{category}</strong>
                      <p>Receive notifications for {category} events</p>
                    </div>
                  </label>
                ))}
              </div>

              <h2>Quiet Hours</h2>
              <div className="preferences-section">
                <label className="preference-item">
                  <input
                    type="checkbox"
                    checked={preferences.quietHours.enabled}
                    onChange={e =>
                      setPreferences(prev =>
                        prev
                          ? {
                              ...prev,
                              quietHours: { ...prev.quietHours, enabled: e.target.checked },
                            }
                          : null
                      )
                    }
                  />
                  <div className="preference-item__content">
                    <strong>Enable Quiet Hours</strong>
                    <p>Mute notifications during specified hours</p>
                  </div>
                </label>
                {preferences.quietHours.enabled && (
                  <div className="quiet-hours-config">
                    <div className="form-group">
                      <label>Start Time</label>
                      <input
                        type="time"
                        value={preferences.quietHours.start}
                        onChange={e =>
                          setPreferences(prev =>
                            prev
                              ? {
                                  ...prev,
                                  quietHours: { ...prev.quietHours, start: e.target.value },
                                }
                              : null
                          )
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>End Time</label>
                      <input
                        type="time"
                        value={preferences.quietHours.end}
                        onChange={e =>
                          setPreferences(prev =>
                            prev
                              ? {
                                  ...prev,
                                  quietHours: { ...prev.quietHours, end: e.target.value },
                                }
                              : null
                          )
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="preferences-actions">
                <button className="btn btn-primary" onClick={handleSavePreferences}>
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'integration' && integration && (
          <div className="notifications-page__content">
            <div className="integration-grid">
              <div className="integration-card">
                <div className="integration-card__header">
                  <span className="integration-card__icon">📧</span>
                  <h3>Email Integration</h3>
                </div>
                <div className="integration-card__body">
                  <div className="integration-status">
                    <span className={`status-indicator ${integration.email.status === 'connected' ? 'status-indicator--success' : 'status-indicator--error'}`}>
                      {integration.email.status}
                    </span>
                    <span>Provider: {integration.email.provider}</span>
                  </div>
                  <p className="integration-card__last-tested">
                    Last tested: {new Date(integration.email.lastTested).toLocaleString()}
                  </p>
                </div>
                <div className="integration-card__actions">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleTestIntegration('email')}
                  >
                    Test Connection
                  </button>
                </div>
              </div>

              <div className="integration-card">
                <div className="integration-card__header">
                  <span className="integration-card__icon">📱</span>
                  <h3>SMS Integration</h3>
                </div>
                <div className="integration-card__body">
                  <div className="integration-status">
                    <span className={`status-indicator ${integration.sms.status === 'connected' ? 'status-indicator--success' : 'status-indicator--error'}`}>
                      {integration.sms.status}
                    </span>
                    <span>Provider: {integration.sms.provider}</span>
                  </div>
                  <p className="integration-card__last-tested">
                    Last tested: {new Date(integration.sms.lastTested).toLocaleString()}
                  </p>
                </div>
                <div className="integration-card__actions">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleTestIntegration('sms')}
                  >
                    Test Connection
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}