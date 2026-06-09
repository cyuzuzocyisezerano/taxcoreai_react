import { Router } from 'express'
import { loadDb } from '../data/store.js'

const router = Router()

router.get('/prompts', async (_req, res, next) => {
  try {
    const db = await loadDb()
    res.json({ prompts: db.aiPrompts ?? [] })
  } catch (err) {
    next(err)
  }
})

export default router
