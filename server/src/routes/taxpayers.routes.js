import { Router } from 'express'
import { loadDb, saveDb } from '../data/store.js'
import { authenticate } from '../middleware/auth.js'
import { logAudit } from '../services/audit.service.js'

const router = Router()

// Allow public GET access for listing and viewing taxpayers (useful for development).
// Require authentication only for create/update operations.

const usePg = Boolean(process.env.DATABASE_URL)
let pgPool = null

if (usePg) {
  const { Pool } = await import('pg')
  pgPool = new Pool({ connectionString: process.env.DATABASE_URL })
}

async function queryPg(sql, params = []) {
  const res = await pgPool.query(sql, params)
  return res.rows
}

router.get('/', async (req, res, next) => {
  try {
    const { q, status, type } = req.query

    if (usePg) {
      const where = []
      const params = []

      if (q) {
        params.push(`%${String(q).toLowerCase()}%`)
        params.push(`%${String(q).toLowerCase()}%`)
        where.push(`(LOWER(name) LIKE $${params.length - 1} OR LOWER(alias) LIKE $${params.length} OR tin::text LIKE $${params.length})`)
      }

      if (status && status !== 'all') {
        params.push(String(status).toLowerCase())
        where.push(`LOWER(status) = $${params.length}`)
      }

      if (type && type !== 'all') {
        params.push(String(type).toLowerCase())
        where.push(`LOWER(type) = $${params.length}`)
      }

      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
      const sql = `SELECT id, name, tin, type, district, status, registered, alias FROM taxpayers ${whereClause} ORDER BY registered DESC LIMIT 100` 
      const rows = await queryPg(sql, params)
      return res.json({ taxpayers: rows, total: rows.length })
    }

    const db = await loadDb()
    let results = [...db.taxpayers]

    if (q) {
      const term = String(q).toLowerCase()
      results = results.filter(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          t.tin.includes(term) ||
          t.alias?.toLowerCase().includes(term) ||
          t.district.toLowerCase().includes(term),
      )
    }

    if (status && status !== 'all') {
      results = results.filter((t) => t.status.toLowerCase() === String(status).toLowerCase())
    }

    if (type && type !== 'all') {
      results = results.filter((t) => t.type.toLowerCase() === String(type).toLowerCase())
    }

    res.json({ taxpayers: results, total: results.length })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    if (usePg) {
      const id = req.params.id
      const rows = await queryPg('SELECT id, name, tin, type, district, status, registered, alias FROM taxpayers WHERE id = $1 OR tin = $1 LIMIT 1', [id])
      if (!rows.length) return res.status(404).json({ error: 'Taxpayer not found' })
      return res.json({ taxpayer: rows[0] })
    }

    const db = await loadDb()
    const taxpayer = db.taxpayers.find((t) => t.id === req.params.id || t.tin === req.params.id)

    if (!taxpayer) {
      return res.status(404).json({ error: 'Taxpayer not found' })
    }

    res.json({ taxpayer })
  } catch (err) {
    next(err)
  }
})

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, tin, type, district, status, alias } = req.body

    if (!name?.trim() || !tin?.trim() || !type) {
      return res.status(400).json({ error: 'Name, TIN, and type are required' })
    }

    if (usePg) {
      // check existing
      const existing = await queryPg('SELECT id FROM taxpayers WHERE tin = $1 LIMIT 1', [tin.trim()])
      if (existing.length) return res.status(409).json({ error: 'A taxpayer with this TIN already exists' })

      const id = `tp-${Date.now()}`
      const registered = new Date()
      const aliasFinal = alias?.trim() || name.trim().split(' ')[0]

      await queryPg(
        'INSERT INTO taxpayers(id, name, tin, type, district, status, registered, alias) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [id, name.trim(), tin.trim(), type, district?.trim() || 'Gasabo', status || 'Pending', registered, aliasFinal],
      )

      await logAudit({
        action: 'TAXPAYER_CREATE',
        userId: req.user.sub,
        username: req.user.username,
        details: `Registered taxpayer ${name.trim()} (${tin.trim()})`,
      })

      const rows = await queryPg('SELECT id, name, tin, type, district, status, registered, alias FROM taxpayers WHERE id = $1 LIMIT 1', [id])
      return res.status(201).json({ taxpayer: rows[0] })
    }

    const db = await loadDb()

    if (db.taxpayers.some((t) => t.tin === tin.trim())) {
      return res.status(409).json({ error: 'A taxpayer with this TIN already exists' })
    }

    const taxpayer = {
      id: `tp-${Date.now()}`,
      name: name.trim(),
      tin: tin.trim(),
      type,
      district: district?.trim() || 'Gasabo',
      status: status || 'Pending',
      registered: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }),
      alias: alias?.trim() || name.trim().split(' ')[0],
    }

    db.taxpayers.unshift(taxpayer)
    await saveDb(db)

    await logAudit({
      action: 'TAXPAYER_CREATE',
      userId: req.user.sub,
      username: req.user.username,
      details: `Registered taxpayer ${taxpayer.name} (${taxpayer.tin})`,
    })

    res.status(201).json({ taxpayer })
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    if (usePg) {
      const id = req.params.id
      const allowed = ['name', 'type', 'district', 'status', 'alias']
      const updates = []
      const params = []

      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          params.push(req.body[key])
          updates.push(`${key} = $${params.length}`)
        }
      }

      if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' })

      params.push(id)
      const sql = `UPDATE taxpayers SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING id, name, tin, type, district, status, registered, alias`
      const rows = await queryPg(sql, params)

      await logAudit({
        action: 'TAXPAYER_UPDATE',
        userId: req.user.sub,
        username: req.user.username,
        details: `Updated taxpayer ${id}`,
      })

      return res.json({ taxpayer: rows[0] })
    }

    const db = await loadDb()
    const index = db.taxpayers.findIndex((t) => t.id === req.params.id)

    if (index === -1) {
      return res.status(404).json({ error: 'Taxpayer not found' })
    }

    const allowed = ['name', 'type', 'district', 'status', 'alias']
    const updates = {}

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }

    db.taxpayers[index] = { ...db.taxpayers[index], ...updates }
    await saveDb(db)

    await logAudit({
      action: 'TAXPAYER_UPDATE',
      userId: req.user.sub,
      username: req.user.username,
      details: `Updated taxpayer ${db.taxpayers[index].tin}`,
    })

    res.json({ taxpayer: db.taxpayers[index] })
  } catch (err) {
    next(err)
  }
})

export default router
