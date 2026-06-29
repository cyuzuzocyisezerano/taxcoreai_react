import { Router } from 'express'
import { loadDb, saveDb } from '../data/store.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/authorize.js'
import { logAudit } from '../services/audit.service.js'

const router = Router()

// Helper to get current user ID from request
function getCurrentUserId(req) {
  return req.user?.id || null
}

// ==================== NOTIFICATIONS ====================

// Get all notifications for current user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const db = await loadDb()
    const userId = getCurrentUserId(req)
    const { unreadOnly, type, category, priority, limit = 50, offset = 0 } = req.query

    let notifications = db.notifications ?? []

    // Filter by user
    if (userId) {
      notifications = notifications.filter(n => !n.userId || n.userId === userId || n.type === 'broadcast')
    }

    // Apply filters
    if (unreadOnly === 'true') {
      notifications = notifications.filter(n => !n.read)
    }
    if (type && type !== 'all') {
      notifications = notifications.filter(n => n.type === type)
    }
    if (category && category !== 'all') {
      notifications = notifications.filter(n => n.category === category)
    }
    if (priority && priority !== 'all') {
      notifications = notifications.filter(n => n.priority === priority)
    }

    // Sort by creation date (newest first)
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Pagination
    const total = notifications.length
    const paginatedNotifications = notifications.slice(Number(offset), Number(offset) + Number(limit))
    const unreadCount = notifications.filter(n => !n.read).length

    res.json({
      notifications: paginatedNotifications,
      total,
      unreadCount,
      hasMore: Number(offset) + Number(limit) < total,
    })
  } catch (err) {
    next(err)
  }
})

// Get unread count
router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const db = await loadDb()
    const userId = getCurrentUserId(req)
    let notifications = db.notifications ?? []

    if (userId) {
      notifications = notifications.filter(n => !n.userId || n.userId === userId || n.type === 'broadcast')
    }

    const unreadCount = notifications.filter(n => !n.read).length
    res.json({ unreadCount })
  } catch (err) {
    next(err)
  }
})

// Get single notification
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const db = await loadDb()
    const notification = db.notifications.find(n => n.id === req.params.id)
    if (!notification) return res.status(404).json({ error: 'Notification not found' })

    res.json({ notification })
  } catch (err) {
    next(err)
  }
})

// Mark notification as read
router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    const db = await loadDb()
    const userId = getCurrentUserId(req)
    const notification = db.notifications.find(n => n.id === req.params.id)
    if (!notification) return res.status(404).json({ error: 'Notification not found' })

    notification.read = true
    notification.readAt = new Date().toISOString()
    await saveDb(db)

    // Log to history
    await addNotificationHistory(db, notification.id, userId, 'read', 'in-app')

    await logAudit({
      userId,
      action: 'NOTIFICATION_READ',
      details: `Notification ${notification.id} marked as read`,
      metadata: { notificationId: notification.id },
    })

    res.json({ notification })
  } catch (err) {
    next(err)
  }
})

// Mark all as read
router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    const db = await loadDb()
    const userId = getCurrentUserId(req)
    const notifications = db.notifications ?? []
    const now = new Date().toISOString()

    let markedCount = 0
    notifications.forEach(n => {
      if (!n.read) {
        n.read = true
        n.readAt = now
        markedCount++
      }
    })

    await saveDb(db)

    // Log to history
    if (markedCount > 0) {
      await addNotificationHistory(db, 'bulk', userId, 'read_all', 'in-app')
      await logAudit({
        userId,
        action: 'NOTIFICATIONS_READ_ALL',
        details: `${markedCount} notifications marked as read`,
      })
    }

    res.json({ message: `${markedCount} notifications marked as read`, count: markedCount })
  } catch (err) {
    next(err)
  }
})

// Delete notification
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const db = await loadDb()
    const userId = getCurrentUserId(req)
    const index = db.notifications.findIndex(n => n.id === req.params.id)
    if (index === -1) return res.status(404).json({ error: 'Notification not found' })

    const deleted = db.notifications.splice(index, 1)[0]
    await saveDb(db)

    await logAudit({
      userId,
      action: 'NOTIFICATION_DELETED',
      details: `Notification ${deleted.id} deleted`,
      metadata: { notificationId: deleted.id, title: deleted.title },
    })

    res.json({ message: 'Notification deleted' })
  } catch (err) {
    next(err)
  }
})

// Create notification (internal use)
export async function createNotification({
  type,
  title,
  message,
  userId = null,
  category = 'general',
  priority = 'medium',
  channels = ['in-app'],
  metadata = {},
  actionUrl = null,
  expiresAt = null,
}) {
  const db = await loadDb()
  const notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    type,
    title,
    message,
    category,
    priority,
    status: 'Unread',
    read: false,
    channels,
    metadata,
    actionUrl,
    expiresAt,
    createdAt: new Date().toISOString(),
  }

  db.notifications.unshift(notification)

  // Keep only last 500 notifications
  if (db.notifications.length > 500) {
    db.notifications = db.notifications.slice(0, 500)
  }

  await saveDb(db)

  // Log to history for each channel
  for (const channel of channels) {
    await addNotificationHistory(db, notification.id, userId, 'sent', channel)
  }

  // Push to SSE clients
  if (req.app?.locals?.eventBus) {
    req.app.locals.eventBus.emit('notification', notification)
  }

  return notification
}

// Broadcast notification to all users
router.post('/broadcast', authenticate, authorize('canManageNotifications'), async (req, res, next) => {

  try {
    const db = await loadDb()
    const senderId = getCurrentUserId(req)
    const { title, message, priority = 'medium', channels = ['in-app'], expiresAt } = req.body

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' })
    }

    const broadcast = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: null, // Broadcast to all
      type: 'broadcast',
      title,
      message,
      category: 'announcement',
      priority,
      status: 'Unread',
      read: false,
      channels,
      metadata: { broadcastId: `broadcast-${Date.now()}`, sentBy: senderId },
      actionUrl: null,
      expiresAt,
      createdAt: new Date().toISOString(),
    }

    db.notifications.unshift(broadcast)

    // Keep only last 500 notifications
    if (db.notifications.length > 500) {
      db.notifications = db.notifications.slice(0, 500)
    }

    await saveDb(db)

    // Log to history
    for (const channel of channels) {
      await addNotificationHistory(db, broadcast.id, null, 'broadcast_sent', channel)
    }

    await logAudit({
      userId: senderId,
      action: 'NOTIFICATION_BROADCAST',
      details: `Broadcast sent: ${title}`,
      metadata: { notificationId: broadcast.id, channels, recipientCount: 'all' },
    })

    // Push to SSE clients
    if (req.app?.locals?.eventBus) {
      req.app.locals.eventBus.emit('notification', broadcast)
    }

    res.status(201).json({ notification: broadcast })

  } catch (err) {
    next(err)
  }
})

// ==================== NOTIFICATION PREFERENCES ====================

// Get user notification preferences
router.get('/preferences', authenticate, async (req, res, next) => {
  try {
    const db = await loadDb()
    const userId = getCurrentUserId(req)
    const preferences = db.notificationPreferences?.[userId] || getDefaultPreferences()

    res.json({ preferences })
  } catch (err) {
    next(err)
  }
})

// Update user notification preferences
router.patch('/preferences', authenticate, async (req, res, next) => {
  try {
    const db = await loadDb()
    const userId = getCurrentUserId(req)
    const { email, sms, inApp, categories, quietHours } = req.body

    if (!db.notificationPreferences) {
      db.notificationPreferences = {}
    }

    db.notificationPreferences[userId] = {
      ...getDefaultPreferences(),
      ...(email !== undefined && { email }),
      ...(sms !== undefined && { sms }),
      ...(inApp !== undefined && { inApp }),
      ...(categories && { categories: { ...getDefaultPreferences().categories, ...categories } }),
      ...(quietHours && { quietHours }),
    }

    await saveDb(db)

    await logAudit({
      userId,
      action: 'NOTIFICATION_PREFERENCES_UPDATED',
      details: 'Notification preferences updated',
      metadata: { preferences: db.notificationPreferences[userId] },
    })

    res.json({ preferences: db.notificationPreferences[userId] })
  } catch (err) {
    next(err)
  }
})

// ==================== NOTIFICATION HISTORY ====================

// Get notification history
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const db = await loadDb()
    const userId = getCurrentUserId(req)
    const { notificationId, action, channel, limit = 100, offset = 0 } = req.query

    let history = db.notificationHistory ?? []

    // Filter by user (or show all for broadcasts)
    if (userId) {
      history = history.filter(h => h.userId === userId || h.userId === null)
    }

    if (notificationId && notificationId !== 'all') {
      history = history.filter(h => h.notificationId === notificationId)
    }
    if (action && action !== 'all') {
      history = history.filter(h => h.action === action)
    }
    if (channel && channel !== 'all') {
      history = history.filter(h => h.channel === channel)
    }

    // Sort by timestamp (newest first)
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Pagination
    const total = history.length
    const paginatedHistory = history.slice(Number(offset), Number(offset) + Number(limit))

    res.json({
      history: paginatedHistory,
      total,
      hasMore: Number(offset) + Number(limit) < total,
    })
  } catch (err) {
    next(err)
  }
})

// ==================== EMAIL/SMS INTEGRATION ====================

// Get email/SMS integration status
router.get('/integration-status', authenticate, async (req, res, next) => {
  try {
    const db = await loadDb()
    const integrationSettings = db.settings?.notificationIntegration || {
      email: {
        enabled: true,
        provider: 'smtp',
        status: 'connected',
        lastTested: new Date().toISOString(),
      },
      sms: {
        enabled: true,
        provider: 'twilio',
        status: 'connected',
        lastTested: new Date().toISOString(),
      },
    }

    res.json({ integration: integrationSettings })
  } catch (err) {
    next(err)
  }
})

// Test email/SMS integration
router.post('/integration-test', authenticate, authorize('canManageNotifications'), async (req, res, next) => {
  try {
    const { channel } = req.body
    const db = await loadDb()
    const userId = getCurrentUserId(req)

    // Simulate integration test
    const testResult = {
      channel,
      status: 'success',
      message: `${channel.toUpperCase()} integration test successful`,
      testedAt: new Date().toISOString(),
      testedBy: userId,
    }

    // Update settings
    if (!db.settings) db.settings = {}
    if (!db.settings.notificationIntegration) {
      db.settings.notificationIntegration = {
        email: { enabled: true, provider: 'smtp', status: 'connected' },
        sms: { enabled: true, provider: 'twilio', status: 'connected' },
      }
    }

    if (db.settings.notificationIntegration[channel]) {
      db.settings.notificationIntegration[channel].lastTested = testResult.testedAt
      db.settings.notificationIntegration[channel].status = 'connected'
    }

    await saveDb(db)

    await logAudit({
      userId,
      action: 'NOTIFICATION_INTEGRATION_TEST',
      details: `${channel.toUpperCase()} integration test`,
      metadata: { channel, result: testResult },
    })

    res.json({ test: testResult })
  } catch (err) {
    next(err)
  }
})

// ==================== HELPER FUNCTIONS ====================

async function addNotificationHistory(db, notificationId, userId, action, channel) {
  if (!db.notificationHistory) {
    db.notificationHistory = []
  }

  const historyEntry = {
    id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    notificationId,
    userId,
    action,
    channel,
    timestamp: new Date().toISOString(),
  }

  db.notificationHistory.unshift(historyEntry)

  // Keep only last 1000 history entries
  if (db.notificationHistory.length > 1000) {
    db.notificationHistory = db.notificationHistory.slice(0, 1000)
  }
}

function getDefaultPreferences() {
  return {
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
  }
}

export default router
