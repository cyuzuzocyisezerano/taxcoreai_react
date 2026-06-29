import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found in .env file')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function addColumns() {
  console.log('Adding missing columns to documents table...\n')

  const client = await pool.connect()

  try {
    const columns = [
      { name: 'description', type: 'TEXT' },
      { name: 'category', type: 'VARCHAR(100)' },
      { name: 'file_path', type: 'TEXT' },
      { name: 'file_size', type: 'BIGINT' },
      { name: 'mime_type', type: 'VARCHAR(100)' },
      { name: 'expiry_date', type: 'DATE' },
      { name: 'tags', type: 'JSONB' },
      { name: 'metadata', type: 'JSONB' },
      { name: 'access_count', type: 'INTEGER DEFAULT 0' },
      { name: 'last_accessed_at', type: 'TIMESTAMP' },
      { name: 'retention_policy', type: 'VARCHAR(100)' },
      { name: 'retention_expiry', type: 'DATE' }
    ]

    for (const col of columns) {
      try {
        await client.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`)
        console.log(`✓ Added column: ${col.name}`)
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⚠ Column ${col.name} already exists`)
        } else {
          console.error(`✗ Error adding ${col.name}:`, err.message)
        }
      }
    }

    console.log('\n✅ Column update completed!')
    console.log('\nYou can now restart the server.')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    client.release()
  }
}

addColumns()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Failed:', err)
    process.exit(1)
  })
  .finally(() => pool.end())