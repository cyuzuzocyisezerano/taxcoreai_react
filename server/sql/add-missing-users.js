import bcrypt from 'bcryptjs'

import dotenv from 'dotenv'
import { Pool } from 'pg'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found in .env file')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })





async function addMissingUsers() {
  console.log('Adding missing users (supervisor, auditor)...\n')

  try {
    const users = [
      {
        id: 'user-supervisor',
        username: 'supervisor',
        password: 'Supervisor@123',
        name: 'Emmanuel Ndayisaba',
        role: 'Supervisor',
        title: 'Workflow Supervisor',
      },
      {
        id: 'user-auditor',
        username: 'auditor',
        password: 'Auditor@123',
        name: 'Marie Claire Umutesi',
        role: 'Auditor',
        title: 'Senior Auditor',
      },
    ]

    for (const user of users) {
      // Check if user already exists
      const checkResult = await pool.query('SELECT id FROM users WHERE id = $1', [user.id])
      
      if (checkResult.rows.length > 0) {
        console.log(`✓ User ${user.username} already exists`)
        continue
      }

      // Hash password
      const passwordHash = await bcrypt.hash(user.password, 10)

      // Insert user
      await pool.query(
        `INSERT INTO users (id, username, password_hash, name, role, title, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [user.id, user.username, passwordHash, user.name, user.role, user.title, new Date(), new Date()]
      )

      console.log(`✓ Created user: ${user.username} (${user.role})`)
    }

    // Verify users
    const result = await pool.query('SELECT id, username, role FROM users ORDER BY created_at')
    console.log('\n✓ All users in database:')
    result.rows.forEach(u => {
      console.log(`  - ${u.username} (${u.role})`)
    })

    console.log('\n✅ Done! You can now login with:')
    console.log('   supervisor / Supervisor@123')
    console.log('   auditor / Auditor@123')
    console.log('\n   Or use existing accounts:')
    console.log('   admin / Admin@123')
    console.log('   officer / Officer@123')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

addMissingUsers()