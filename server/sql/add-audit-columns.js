import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found in .env file')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function addAuditColumns() {
  console.log('Adding missing columns to audit_logs table...\n')

  const client = await pool.connect()

  try {
    const columns = [
      { name: 'ip_address', type: 'VARCHAR(50)' },
      { name: 'user_agent', type: 'TEXT' }
    ]

    for (const col of columns) {
      try {
        await client.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`)
        console.log(`✓ Added column: ${col.name}`)
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⚠ Column ${col.name} already exists`)
        } else {
          console.error(`✗ Error adding ${col.name}:`, err.message)
        }
      }
    }

    console.log('\n✅ Audit logs column update completed!')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    client.release()
  }
}

addAuditColumns()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Failed:', err)
    process.exit(1)
  })
  .finally(() => pool.end())