import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// Simple SSE stream for in-app notifications.
// This implementation uses an in-memory event bus (see server/src/services/notificationBus.js).

router.get('/stream', authenticate, (req, res) => {
  const { eventBus } = req.app.locals
  if (!eventBus) {
    return res.status(500).json({ error: 'Notification stream unavailable' })
  }

  const userId = req.user?.id || null

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  })

  // Initial ping
  res.write(`event: ping\ndata: {"ok":true}\n\n`)

  const onEvent = (payload) => {
    // Deliver if addressed to this user, or broadcast (userId === null)
    if (payload.userId === null || payload.userId === userId) {
      res.write(`event: notification\ndata: ${JSON.stringify(payload)}\n\n`)
    }
  }

  eventBus.on('notification', onEvent)

  const keepAlive = setInterval(() => {
    try {
      res.write(`event: ping\ndata: {}\n\n`)
    } catch {
      // ignore
    }
  }, 25000)

  req.on('close', () => {
    clearInterval(keepAlive)
    eventBus.off('notification', onEvent)
  })
})

export default router

