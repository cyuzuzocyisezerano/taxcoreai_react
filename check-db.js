import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: './server/.env' })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function check() {
  try {
    const result1 = await pool.query('SELECT COUNT(*) FROM taxpayers')
    const result2 = await pool.query('SELECT COUNT(*) FROM documents')
    const result3 = await pool.query('SELECT COUNT(*) FROM users')
    
    console.log('Taxpayers:', result1.rows[0].count)
    console.log('Documents:', result2.rows[0].count)
    console.log('Users:', result3.rows[0].count)
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await pool.end()
  }
}

check()