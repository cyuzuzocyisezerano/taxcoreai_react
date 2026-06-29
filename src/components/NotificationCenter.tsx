import { useEffect, useState, useCallback } from 'react'
import { api, type NotificationItem } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import './NotificationCenter.css'

interface NotificationCenterProps {
  onNavigate?: () => void
}

export function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  const loadUnreadCount = useCallback(async () => {
    try {
      const data = await api.getUnreadCount()
      setUnreadCount(data.unreadCount)
    } catch (err) {
      console.error('Failed to load unread count:', err)
    }
  }, [])

  const loadRecentNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications({ limit: 5 })
      setRecentNotifications(data.notifications)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUnreadCount()
    loadRecentNotifications()

    // SSE real-time updates
    let eventSource: EventSource | null = null
    try {
      eventSource = new EventSource('/api/notifications/stream')
      eventSource.addEventListener('notification', (ev: MessageEvent) => {
        try {
          const payload = JSON.parse(ev.data)
          // For small payloads, just refetch unread + recent (keeps UI consistent)
          // but only when unread/in-app notification arrives.
          if (payload?.type) {
            loadUnreadCount()
            loadRecentNotifications()
          }
        } catch {
          // ignore
        }
      })
    } catch {
      // ignore and fall back to polling
    }

    // Poll fallback (in case SSE fails) every 60 seconds
    const interval = setInterval(() => {
      loadUnreadCount()
      loadRecentNotifications()
    }, 60000)


    return () => {
      clearInterval(interval)
      eventSource?.close?.()
    }

  }, [loadUnreadCount, loadRecentNotifications])

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id)
      setRecentNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead()
      setRecentNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id)
    }
    if (notification.actionUrl) {
      onNavigate?.()
      window.location.href = notification.actionUrl
    }
    setIsOpen(false)
  }

  const getPriorityClass = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return 'notification-center__priority--critical'
      case 'high':
        return 'notification-center__priority--high'
      case 'medium':
        return 'notification-center__priority--medium'
      case 'low':
        return 'notification-center__priority--low'
      default:
        return ''
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

  return (
    <div className="notification-center">
      <button
        className="notification-center__trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <span className="notification-center__icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-center__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-center__dropdown">
          <div className="notification-center__header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button
                className="notification-center__mark-all"
                onClick={handleMarkAllAsRead}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-center__list">
            {loading && <p className="notification-center__loading">Loading...</p>}
            {!loading && recentNotifications.length === 0 && (
              <p className="notification-center__empty">No notifications</p>
            )}
            {!loading &&
              recentNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-center__item ${!notification.read ? 'notification-center__item--unread' : ''} ${getPriorityClass(notification.priority)}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-center__item-icon">
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="notification-center__item-content">
                    <div className="notification-center__item-header">
                      <span className="notification-center__item-title">
                        {notification.title}
                      </span>
                      {!notification.read && (
                        <span className="notification-center__unread-dot" />
                      )}
                    </div>
                    {notification.message && (
                      <p className="notification-center__item-message">
                        {notification.message}
                      </p>
                    )}
                    <div className="notification-center__item-meta">
                      <span className="notification-center__item-type">
                        {notification.type}
                      </span>
                      <span className="notification-center__item-time">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <div className="notification-center__footer">
            <button
              className="notification-center__view-all"
              onClick={() => {
                onNavigate?.()
                window.location.href = '/notifications'
                setIsOpen(false)
              }}
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )
}