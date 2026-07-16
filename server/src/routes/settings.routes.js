import { Router } from 'express'
import { loadDb, saveDb } from '../data/store.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/authorize.js'
import { logAudit } from '../services/audit.service.js'

const router = Router()

router.get('/', authenticate, authorize({ permission: 'canViewSettings' }), async (_req, res, next) => {
  try {
    const db = await loadDb()
    res.json({ settings: db.settings ?? {} })
  } catch (err) {
    next(err)
  }
})

router.patch('/', authenticate, authorize({ permission: 'canEditSettings', actionType: 'SETTINGS_UPDATE' }), async (req, res, next) => {
  try {
    const { featureFlags, defaultTaxYear, reportingWindowDays } = req.body

    const db = await loadDb()
    if (!db.settings) db.settings = {}

    if (featureFlags) {
      db.settings.featureFlags = {
        ...db.settings.featureFlags,
        allowRegistration: Boolean(featureFlags.allowRegistration),
        enableNotifications: Boolean(featureFlags.enableNotifications),
      }
    }

    if (defaultTaxYear !== undefined) {
      db.settings.defaultTaxYear = Number(defaultTaxYear)
    }
    if (reportingWindowDays !== undefined) {
      db.settings.reportingWindowDays = Number(reportingWindowDays)
    }

    await saveDb(db)

    try {
      await logAudit({
        action: 'SETTINGS_UPDATE',
        userId: req.user?.sub,
        username: req.user?.username,
        details: 'Updated application settings',
      })
    } catch {
      // ignore audit failures
    }

    res.json({ settings: db.settings })
  } catch (err) {
    next(err)
  }
})

export default router
