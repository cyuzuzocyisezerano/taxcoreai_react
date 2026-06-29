import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found in .env file')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function fixPasswords() {
  console.log('Updating user passwords in PostgreSQL...\n')

  const client = await pool.connect()

  try {
    const users = [
      { id: 'user-admin', username: 'admin', password: 'Admin@123' },
      { id: 'user-officer', username: 'officer', password: 'Officer@123' },
      { id: 'user-auditor', username: 'auditor', password: 'Auditor@123' },
      { id: 'user-supervisor', username: 'supervisor', password: 'Supervisor@123' },
    ]

    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10)
      await client.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [passwordHash, user.id]
      )
      console.log(`✓ Updated password for ${user.username} (${user.password})`)
    }

    console.log('\n✅ Passwords updated successfully!')
    console.log('\nYou can now login with:')
    console.log('  - admin / Admin@123')
    console.log('  - officer / Officer@123')
    console.log('  - auditor / Auditor@123')
    console.log('  - supervisor / Supervisor@123')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    client.release()
  }
}

fixPasswords()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Failed:', err)
    process.exit(1)
  })
  .finally(() => pool.end())