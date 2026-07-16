import { pool } from '../db.js'

console.log('Adding new columns to audit_logs table...')

const migrations = [
  `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_full_name VARCHAR(255)`,
  `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50)`
]

;(async () => {
  try {
    for (const sql of migrations) {
      console.log(`Executing: ${sql}`)
      await pool.query(sql)
    }
    console.log('Migration completed successfully!')
  } catch (err) {
    console.error('Migration failed:', err)
  } finally {
    process.exit(0)
  }
})()
