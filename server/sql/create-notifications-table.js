import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function createTable() {
  console.log('Creating notifications table...\n')

  const client = await pool.connect()

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        title VARCHAR(500) NOT NULL,
        message TEXT,
        type VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'Unread',
        read BOOLEAN DEFAULT false,
        channels VARCHAR(255),
        metadata JSONB,
        action_url TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log('✓ Created notifications table')
    console.log('\n✅ Table creation completed!')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    client.release()
  }
}

createTable()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Failed:', err)
    process.exit(1)
  })
  .finally(() => pool.end())