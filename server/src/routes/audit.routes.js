import { Router } from 'express'
import { loadDb } from '../data/store.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', async (req, res, next) => {
  try {
    const db = await loadDb()
    const limit = Math.min(Number(req.query.limit) || 50, 100)
    const logs = db.auditLogs.slice(0, limit)
    res.json({ logs, total: db.auditLogs.length })
  } catch (err) {
    next(err)
  }
})

export default router
