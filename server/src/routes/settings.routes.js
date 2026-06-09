import { Router } from 'express'
import { loadDb } from '../data/store.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const db = await loadDb()
    res.json({ settings: db.settings ?? {} })
  } catch (err) {
    next(err)
  }
})

export default router
