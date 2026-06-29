import { readFileSync } from 'fs'
import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found in .env file')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function runSetup() {
  console.log('Running database setup...\n')

  try {
    // Read the setup SQL file
    const sqlPath = new URL('./setup.sql', import.meta.url)
    const sqlContent = readFileSync(sqlPath, 'utf-8')

    console.log('Executing SQL script...\n')

    const client = await pool.connect()

    try {
      // Split by semicolons and execute each statement
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await client.query(statement)
            console.log('✓ Executed statement')
          } catch (err) {
            // Ignore "already exists" errors
            if (err.message.includes('already exists')) {
              console.log('⚠ Table already exists, skipping')
            } else {
              console.error('Error executing statement:', err.message)
              console.error('Statement:', statement.substring(0, 100) + '...')
            }
          }
        }
      }

      console.log('\n✅ Database setup completed!')
      console.log('\nYou can now restart the server and access /workflows')

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runSetup()