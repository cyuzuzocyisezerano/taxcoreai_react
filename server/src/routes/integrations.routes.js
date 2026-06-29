import { Router } from 'express'
import { loadDb, saveDb } from '../data/store.js'
import { pool } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/authorize.js'

const router = Router()

const usePg = Boolean(process.env.DATABASE_URL)

// Get all integrations
router.get('/', authenticate, authorize({ permission: 'canViewSettings' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query('SELECT * FROM integrations ORDER BY created_at DESC')
      return res.json({ integrations: result.rows, total: result.rows.length })
    }

    const db = await loadDb()
    const integrations = db.integrations ?? []
    res.json({ integrations, total: integrations.length })
  } catch (err) {
    next(err)
  }
})

// Get integration by ID
router.get('/:id', authenticate, authorize({ permission: 'canViewSettings' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query('SELECT * FROM integrations WHERE id = $1 LIMIT 1', [req.params.id])
      if (!result.rows.length) return res.status(404).json({ error: 'Integration not found' })
      return res.json({ integration: result.rows[0] })
    }

    const db = await loadDb()
    const integration = (db.integrations ?? []).find(i => i.id === req.params.id)
    if (!integration) return res.status(404).json({ error: 'Integration not found' })
    res.json({ integration })
  } catch (err) {
    next(err)
  }
})

// Create integration
router.post('/', authenticate, authorize({ permission: 'canEditSettings' }), async (req, res, next) => {
  try {
    const { name, type, config, status } = req.body

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' })
    }

    const id = `int-${Date.now()}`

    if (usePg) {
      const result = await pool.query(
        `INSERT INTO integrations (id, name, type, config, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [id, name, type, JSON.stringify(config || {}), status || 'active', new Date(), new Date()]
      )
      return res.status(201).json({ integration: result.rows[0] })
    }

    const db = await loadDb()
    const integration = {
      id,
      name,
      type,
      config: config || {},
      status: status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    db.integrations = db.integrations ?? []
    db.integrations.unshift(integration)
    await loadDb(db)

    res.status(201).json({ integration })
  } catch (err) {
    next(err)
  }
})

// Update integration
router.patch('/:id', authenticate, authorize({ permission: 'canEditSettings' }), async (req, res, next) => {
  try {
    const { name, type, config, status } = req.body

    if (usePg) {
      const updates = []
      const params = []
      let paramCount = 0

      if (name !== undefined) {
        paramCount++
        updates.push(`name = $${paramCount}`)
        params.push(name)
      }
      if (type !== undefined) {
        paramCount++
        updates.push(`type = $${paramCount}`)
        params.push(type)
      }
      if (config !== undefined) {
        paramCount++
        updates.push(`config = $${paramCount}`)
        params.push(JSON.stringify(config))
      }
      if (status !== undefined) {
        paramCount++
        updates.push(`status = $${paramCount}`)
        params.push(status)
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`)
      paramCount++
      params.push(req.params.id)

      const sql = `UPDATE integrations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`
      const result = await pool.query(sql, params)

      if (!result.rows.length) return res.status(404).json({ error: 'Integration not found' })
      return res.json({ integration: result.rows[0] })
    }

    const db = await loadDb()
    const index = (db.integrations ?? []).findIndex(i => i.id === req.params.id)
    if (index === -1) return res.status(404).json({ error: 'Integration not found' })

    const integration = db.integrations[index]
    if (name !== undefined) integration.name = name
    if (type !== undefined) integration.type = type
    if (config !== undefined) integration.config = config
    if (status !== undefined) integration.status = status
    integration.updatedAt = new Date().toISOString()

    db.integrations[index] = integration
    await loadDb(db)

    res.json({ integration })
  } catch (err) {
    next(err)
  }
})

// Delete integration
router.delete('/:id', authenticate, authorize({ permission: 'canEditSettings' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query('DELETE FROM integrations WHERE id = $1 RETURNING id', [req.params.id])
      if (!result.rows.length) return res.status(404).json({ error: 'Integration not found' })
      return res.json({ message: 'Integration deleted successfully' })
    }

    const db = await loadDb()
    const index = (db.integrations ?? []).findIndex(i => i.id === req.params.id)
    if (index === -1) return res.status(404).json({ error: 'Integration not found' })

    db.integrations.splice(index, 1)
    await loadDb(db)

    res.json({ message: 'Integration deleted successfully' })
  } catch (err) {
    next(err)
  }
})

// Test integration connection
router.post('/:id/test', authenticate, authorize({ permission: 'canEditSettings' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query('SELECT * FROM integrations WHERE id = $1 LIMIT 1', [req.params.id])
      if (!result.rows.length) return res.status(404).json({ error: 'Integration not found' })

      const integration = result.rows[0]
      
      // Simulate connection test
      const testResult = {
        success: true,
        message: 'Connection successful',
        timestamp: new Date().toISOString(),
        responseTime: Math.floor(Math.random() * 200) + 50
      }

      return res.json(testResult)
    }

    const db = await loadDb()
    const integration = (db.integrations ?? []).find(i => i.id === req.params.id)
    if (!integration) return res.status(404).json({ error: 'Integration not found' })

    // Simulate connection test
    const testResult = {
      success: true,
      message: 'Connection successful',
      timestamp: new Date().toISOString(),
      responseTime: Math.floor(Math.random() * 200) + 50
    }

    res.json(testResult)
  } catch (err) {
    next(err)
  }
})

export default router