import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found in .env file')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function ensureReportsTable() {
  console.log('Ensuring reports table exists...\n')

  try {
    // Check if reports table exists
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reports'
      )
    `)

    if (checkResult.rows[0].exists) {
      console.log('✓ Reports table already exists')
    } else {
      console.log('Creating reports table...')
      await pool.query(`
        CREATE TABLE reports (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(500) NOT NULL,
          type VARCHAR(100) NOT NULL,
          generated_at TIMESTAMP NOT NULL,
          status VARCHAR(50) NOT NULL,
          file_path TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log('✓ Reports table created')
    }

    // Verify by querying
    const result = await pool.query('SELECT COUNT(*) as count FROM reports')
    console.log(`✓ Reports table verified (${result.rows[0].count} records)`)

    console.log('\n✅ Done! Restart the server.')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

ensureReportsTable()