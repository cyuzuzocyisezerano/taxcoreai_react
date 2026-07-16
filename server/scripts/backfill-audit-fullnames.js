import { loadDb, saveDb } from '../src/data/store.js'

async function run() {
  const db = await loadDb()
  const users = db.users ?? []
  let updated = 0

  for (const log of db.auditLogs) {
    if (!log.userFullName && log.userId) {
      const user = users.find(u => u.id === log.userId || u.username === log.username)
      if (user) {
        log.userFullName = user.name || user.full_name || null
        updated += 1
      }
    }
  }

  if (updated > 0) {
    await saveDb(db)
    console.log(`Backfilled ${updated} audit log(s) with userFullName.`)
  } else {
    console.log('No audit logs needed backfill.')
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
