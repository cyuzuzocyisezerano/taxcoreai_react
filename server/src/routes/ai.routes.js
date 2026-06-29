import { Router } from 'express'
import { loadDb } from '../data/store.js'
import { ruleBasedAI } from '../services/ruleBasedAI.js'

const router = Router()

router.get('/prompts', async (_req, res, next) => {
  try {
    const db = await loadDb()
    res.json({ prompts: db.aiPrompts ?? [] })
  } catch (err) {
    next(err)
  }
})

router.post('/chat', async (req, res, next) => {
  try {
    const { query, context } = req.body

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' })
    }

    // Process the query using the rule-based AI
    const response = await ruleBasedAI.processQuery(query, context || {})

    res.json({
      message: response.message,
      quickActions: response.quickActions || [],
      data: response.data || null,
      intent: response.intent || null
    })
  } catch (err) {
    next(err)
  }
})

router.get('/quick-actions', async (_req, res, next) => {
  try {
    const quickActions = ruleBasedAI.getQuickActions()
    res.json({ quickActions })
  } catch (err) {
    next(err)
  }
})

router.get('/suggestions', async (req, res, next) => {
  try {
    const context = {
      role: req.query.role || 'user'
    }
    const suggestions = ruleBasedAI.getSuggestedQueries(context)
    res.json({ suggestions })
  } catch (err) {
    next(err)
  }
})

export default router
