import { loadDb, saveDb } from '../data/store.js'
import { pool } from '../db.js'

const usePg = Boolean(process.env.DATABASE_URL)

export async function logAudit({ action, userId, username, userFullName, approvalStatus, details, ipAddress, userAgent }) {
  // try to populate missing userFullName from users table / file DB
  if (!userFullName && userId) {
    try {
      if (usePg) {
        const r = await pool.query('SELECT full_name FROM users WHERE id = $1 LIMIT 1', [userId])
        if (r.rows && r.rows[0] && r.rows[0].full_name) userFullName = r.rows[0].full_name
      } else {
        const db = await loadDb()
        const u = (db.users || []).find(x => x.id === userId || x.username === username)
        if (u) userFullName = u.name || u.full_name || userFullName
      }
    } catch (err) {
      // ignore lookup errors
    }
  }

  const entry = {
    id: `log-${Date.now()}`,
    action,
    userId,
    username,
    userFullName,
    approvalStatus,
    details,
    ipAddress,
    userAgent,
    createdAt: new Date().toISOString(),
  }

  if (usePg) {
    try {
      await pool.query(
        `INSERT INTO audit_logs (id, action, user_id, username, user_full_name, approval_status, details, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [entry.id, entry.action, entry.userId, entry.username, entry.userFullName, entry.approvalStatus, entry.details, entry.ipAddress, entry.userAgent, entry.createdAt]
      )
    } catch (err) {
      console.error('Failed to write audit log to PostgreSQL:', err)
    }
  }

  const db = await loadDb()
  db.auditLogs.unshift(entry)
  if (db.auditLogs.length > 200) {
    db.auditLogs = db.auditLogs.slice(0, 200)
  }

  await saveDb(db)
  return entry
}
