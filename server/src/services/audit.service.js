import { loadDb, saveDb } from '../data/store.js'

export async function logAudit({ action, userId, username, details }) {
  const db = await loadDb()

  const entry = {
    id: `log-${Date.now()}`,
    action,
    userId,
    username,
    details,
    createdAt: new Date().toISOString(),
  }

  db.auditLogs.unshift(entry)
  if (db.auditLogs.length > 200) {
    db.auditLogs = db.auditLogs.slice(0, 200)
  }

  await saveDb(db)
  return entry
}
