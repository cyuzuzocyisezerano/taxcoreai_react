import { Router } from 'express'
import { loadDb, saveDb } from '../data/store.js'
import { pool } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/authorize.js'

const router = Router()

const usePg = Boolean(process.env.DATABASE_URL)

router.use(authenticate)

// Get all audit logs
router.get('/', authorize({ permission: 'canViewAuditLogs' }), async (req, res, next) => {
  try {
    const { action, userId, startDate, endDate, limit } = req.query

    if (usePg) {
      const where = []
      const params = []

      if (action) {
        params.push(`%${action}%`)
        where.push(`action ILIKE $${params.length}`)
      }
      if (userId) {
        params.push(String(userId))
        where.push(`user_id = $${params.length}`)
      }
      if (startDate) {
        params.push(String(startDate))
        where.push(`created_at >= $${params.length}`)
      }
      if (endDate) {
        params.push(String(endDate))
        where.push(`created_at <= $${params.length}`)
      }

      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
      const limitVal = Math.min(Number(limit) || 50, 100)
      
      const result = await pool.query(
        `SELECT al.*, COALESCE(al.user_full_name, u.full_name) AS user_full_name FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1}`,
        [...params, limitVal]
      )

      const logs = result.rows.map(row => ({
        id: row.id,
        action: row.action,
        userId: row.user_id,
        username: row.username,
        userFullName: row.user_full_name,
        details: row.details,
        approvalStatus: row.approval_status,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
      }))

      return res.json({ logs, total: logs.length })
    }

    const db = await loadDb()
    let logs = db.auditLogs ?? []
    const limitVal = Math.min(Number(limit) || 50, 100)

    if (action) {
      const search = String(action).toLowerCase()
      logs = logs.filter(l => l.action?.toLowerCase().includes(search))
    }
    if (userId) {
      logs = logs.filter(l => l.userId === String(userId))
    }
    if (startDate) {
      logs = logs.filter(l => l.createdAt >= String(startDate))
    }
    if (endDate) {
      logs = logs.filter(l => l.createdAt <= String(endDate))
    }

    // enrich file DB logs with user full name when possible and persist backfill
    const dbUsers = db.users ?? []
    const enriched = logs.slice(0, limitVal).map(l => {
      if (l.userFullName) return l
      const u = dbUsers.find(x => x.id === l.userId || x.username === l.username)
      return { ...l, userFullName: u ? (u.name || u.full_name) : undefined }
    })

    // backfill persistent DB entries for any logs that gained a full name
    let didBackfill = false
    for (const e of enriched) {
      const orig = db.auditLogs.find(a => a.id === e.id)
      if (orig && !orig.userFullName && e.userFullName) {
        orig.userFullName = e.userFullName
        didBackfill = true
      }
    }
    if (didBackfill) {
      try {
        await saveDb(db)
      } catch (err) {
        console.warn('Failed to persist audit log backfill:', err)
      }
    }

    res.json({ logs: enriched, total: logs.length })
  } catch (err) {
    next(err)
  }
})

// Get audit log by ID
router.get('/:id', authorize({ permission: 'canViewAuditLogs' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query('SELECT al.*, COALESCE(al.user_full_name, u.full_name) AS user_full_name FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id WHERE al.id = $1 LIMIT 1', [req.params.id])
      if (!result.rows.length) return res.status(404).json({ error: 'Audit log not found' })
      
      const row = result.rows[0]
      const log = {
        id: row.id,
        action: row.action,
        userId: row.user_id,
        username: row.username,
        userFullName: row.user_full_name,
        details: row.details,
        approvalStatus: row.approval_status,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
      }
      
      return res.json({ log })
    }

    const db = await loadDb()
    const log = db.auditLogs.find(l => l.id === req.params.id)
    if (!log) return res.status(404).json({ error: 'Audit log not found' })
    if (!log.userFullName) {
      const u = (db.users || []).find(x => x.id === log.userId || x.username === log.username)
      if (u) log.userFullName = u.name || u.full_name
    }
    res.json({ log })
  } catch (err) {
    next(err)
  }
})

// Export audit logs as CSV
router.get('/export/csv', authorize({ permission: 'canViewAuditLogs' }), async (req, res, next) => {
  try {
    const { action, userId, startDate, endDate } = req.query

    if (usePg) {
      const where = []
      const params = []

      if (action) {
        params.push(`%${action}%`)
        where.push(`action ILIKE $${params.length}`)
      }
      if (userId) {
        params.push(String(userId))
        where.push(`user_id = $${params.length}`)
      }
      if (startDate) {
        params.push(String(startDate))
        where.push(`created_at >= $${params.length}`)
      }
      if (endDate) {
        params.push(String(endDate))
        where.push(`created_at <= $${params.length}`)
      }

      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
      const result = await pool.query(`SELECT al.*, COALESCE(al.user_full_name, u.full_name) AS user_full_name FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ${whereClause} ORDER BY created_at DESC LIMIT 1000`, params)

      const csv = [
        'ID,Action,User ID,Username,User Full Name,Details,IP Address,Timestamp',
        ...result.rows.map(l => 
          `${l.id},"${l.action}","${l.user_id || ''}","${l.username || ''}","${l.user_full_name || ''}","${(l.details || '').replace(/"/g, '""')}","${l.ip_address || ''}","${l.created_at}"`
        )
      ].join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`)
      return res.send(csv)
    }

    const db = await loadDb()
    let logs = db.auditLogs ?? []

    if (action) {
      const search = String(action).toLowerCase()
      logs = logs.filter(l => l.action?.toLowerCase().includes(search))
    }
    if (userId) {
      logs = logs.filter(l => l.userId === String(userId))
    }
    if (startDate) {
      logs = logs.filter(l => l.createdAt >= String(startDate))
    }
    if (endDate) {
      logs = logs.filter(l => l.createdAt <= String(endDate))
    }

    // enrich logs with user full name
    const dbUsers = db.users ?? []
    const enrichedLogs = logs.slice(0, 1000).map(l => {
      if (l.userFullName) return l
      const u = dbUsers.find(x => x.id === l.userId || x.username === l.username)
      return { ...l, userFullName: u ? (u.name || u.full_name) : '' }
    })

    const csv = [
      'ID,Action,User ID,Username,User Full Name,Details,IP Address,Timestamp',
      ...enrichedLogs.map(l => 
        `${l.id},"${l.action}","${l.userId || ''}","${l.username || ''}","${(l.userFullName || '').replace(/"/g, '""')}","${(l.details || '').replace(/"/g, '""')}","${l.ip_address || ''}","${l.createdAt}"`
      )
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`)
    res.send(csv)
  } catch (err) {
    next(err)
  }
})

export default router
