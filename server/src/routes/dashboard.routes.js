import { Router } from 'express'
import { loadDb } from '../data/store.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/stats', async (_req, res, next) => {
  try {
    const db = await loadDb()
    const taxpayers = db.taxpayers

    const stats = {
      totalTaxpayers: taxpayers.length,
      activeTaxpayers: taxpayers.filter((t) => t.status === 'Active').length,
      totalDocuments: db.documents.length,
      pendingWorkflows: db.pendingTasks.length,
      flaggedRecords: taxpayers.filter((t) => t.status === 'Flagged').length,
    }

    res.json(stats)
  } catch (err) {
    next(err)
  }
})

router.get('/recent-taxpayers', async (_req, res, next) => {
  try {
    const db = await loadDb()
    const recent = [...db.taxpayers].slice(0, 5)
    res.json({ taxpayers: recent })
  } catch (err) {
    next(err)
  }
})

router.get('/pending-tasks', async (_req, res, next) => {
  try {
    const db = await loadDb()
    res.json({ tasks: db.pendingTasks })
  } catch (err) {
    next(err)
  }
})

export default router
