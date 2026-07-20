import { useEffect, useState } from 'react'
import { api, type NotificationItem } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import './AlertPopup.css'

interface AlertPopupProps {
  onNavigate?: () => void
}

export function AlertPopup({ onNavigate }: AlertPopupProps) {
  const { user, loading: authLoading } = useAuth()
  const [alerts, setAlerts] = useState<NotificationItem[]>([])
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isPaused] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setAlerts([])
      return
    }

    loadAlerts()

    // Polling fallback avoids the optional stream request that was producing the 404 noise.
    const interval = setInterval(() => {
      if (!isPaused) {
        loadAlerts()
      }
    }, 30000)

    return () => {
      clearInterval(interval)
    }

  }, [authLoading, user, isPaused])

  const loadAlerts = async () => {
    try {
      const data = await api.getNotifications({
        unreadOnly: true,
        priority: 'critical',
        limit: 10,
      })
      
      const criticalAlerts = data.notifications.filter(n => 
        !n.read && (n.priority === 'critical' || n.priority === 'high')
      )
      
      setAlerts(criticalAlerts)
      
      if (criticalAlerts.length > 0 && !isVisible && !isPaused) {
        showNextAlert()
      }
    } catch (err) {
      // Silently handle all errors - notifications are optional
      // Don't show alerts if endpoint doesn't exist or user not logged in
      console.log('Notifications not available:', err)
      setAlerts([])
    }
  }

  const showNextAlert = () => {
    if (alerts.length === 0) {
      setIsVisible(false)
      return
    }

    setIsVisible(true)
    
    // Auto-hide after 8 seconds
    setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentAlertIndex(prev => (prev + 1) % alerts.length)
        if (alerts.length > 1) {
          showNextAlert()
        }
      }, 1000)
    }, 8000)
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => {
      setCurrentAlertIndex(prev => (prev + 1) % alerts.length)
      if (alerts.length > 1) {
        showNextAlert()
      }
    }, 1000)
  }

  const handleClick = async (alert: NotificationItem) => {
    try {
      await api.markNotificationRead(alert.id)
      handleDismiss()
      onNavigate?.()
      if (alert.actionUrl) {
        window.location.href = alert.actionUrl
      }
    } catch (err) {
      console.error('Failed to mark alert as read:', err)
    }
  }

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return '🔴'
      case 'high':
        return '⚠️'
      default:
        return 'ℹ️'
    }
  }

  const getPriorityClass = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return 'alert-popup--critical'
      case 'high':
        return 'alert-popup--high'
      default:
        return 'alert-popup--medium'
    }
  }

  if (alerts.length === 0 || !isVisible) {
    return null
  }

  const currentAlert = alerts[currentAlertIndex]

  return (
    <div className={`alert-popup ${getPriorityClass(currentAlert.priority)}`}>
      <div className="alert-popup__icon">{getPriorityIcon(currentAlert.priority)}</div>
      <div className="alert-popup__content">
        <div className="alert-popup__header">
          <h4 className="alert-popup__title">{currentAlert.title}</h4>
          <span className="alert-popup__priority">{currentAlert.priority}</span>
        </div>
        {currentAlert.message && (
          <p className="alert-popup__message">{currentAlert.message}</p>
        )}
        <div className="alert-popup__footer">
          <span className="alert-popup__time">
            {new Date(currentAlert.createdAt).toLocaleTimeString()}
          </span>
          <div className="alert-popup__actions">
            <button
              className="alert-popup__button alert-popup__button--primary"
              onClick={() => handleClick(currentAlert)}
            >
              View
            </button>
            <button
              className="alert-popup__button alert-popup__button--secondary"
              onClick={handleDismiss}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
      <div className="alert-popup__progress" />
    </div>
  )
}