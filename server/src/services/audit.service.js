import { loadDb, saveDb } from '../data/store.js'
import { pool } from '../db.js'

const usePg = Boolean(process.env.DATABASE_URL)

export async function logAudit({ action, userId, username, details, ipAddress, userAgent }) {
  const entry = {
    id: `log-${Date.now()}`,
    action,
    userId,
    username,
    details,
    ipAddress,
    userAgent,
    createdAt: new Date().toISOString(),
  }

  if (usePg) {
    try {
      await pool.query(
        `INSERT INTO audit_logs (id, action, user_id, username, details, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [entry.id, entry.action, entry.userId, entry.username, entry.details, entry.ipAddress, entry.userAgent, entry.createdAt]
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
