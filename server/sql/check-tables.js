import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function checkTables() {
  const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
  console.log('Tables:', result.rows.map(x => x.table_name).join(', '))
  await pool.end()
}

checkTables()