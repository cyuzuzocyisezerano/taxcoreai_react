import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { readFileSync } from 'fs'

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: `${__dirname}/../.env` })

// Create a direct database connection
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

console.log('Adding title column to users table (if needed)...')

const migrations = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(255)`
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
    await pool.end()
    process.exit(0)
  }
})()
