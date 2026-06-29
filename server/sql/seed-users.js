import bcrypt from 'bcryptjs'
import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'taxcoreai',
  password: process.env.DB_PASSWORD || 'Password@123',
  port: parseInt(process.env.DB_PORT || '5432'),
})

const USERS = [
  {
    id: 'user-admin',
    username: 'admin',
    email: 'admin@taxcore.rw',
    fullName: 'System Administrator',
    password: 'Admin@123',
    role: 'Admin',
    title: 'System Administrator',
  },
  {
    id: 'user-supervisor',
    username: 'supervisor',
    email: 'supervisor@taxcore.rw',
    fullName: 'Marie Habiyaremye',
    password: 'Supervisor@123',
    role: 'Supervisor',
    title: 'Audit Supervisor',
  },
  {
    id: 'user-officer',
    username: 'officer',
    email: 'officer@taxcore.rw',
    fullName: 'Jeanine Uwase',
    password: 'Officer@123',
    role: 'Officer',
    title: 'Taxpayer Officer',
  },
  {
    id: 'user-auditor',
    username: 'auditor',
    email: 'auditor@taxcore.rw',
    fullName: 'Pierre Mukandayire',
    password: 'Auditor@123',
    role: 'Auditor',
    title: 'Tax Auditor',
  },
]

async function seedUsers() {
  console.log('Seeding users...\n')

  try {
    for (const user of USERS) {
      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE username = $1 OR id = $2',
        [user.username, user.id]
      )

      // Hash the password
      const passwordHash = await bcrypt.hash(user.password, 10)

      if (existingUser.rows.length > 0) {
        // Update existing user with new password hash and ensure all fields are correct
        await pool.query(
          `UPDATE users 
           SET email = $1, full_name = $2, password_hash = $3, role = $4, title = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
           WHERE username = $7 OR id = $8`,
          [
            user.email,
            user.fullName,
            passwordHash,
            user.role,
            user.title,
            true,
            user.username,
            user.id,
          ]
        )
        console.log(`✓ Updated user: ${user.username} (${user.role})`)
      } else {
        // Insert new user
        await pool.query(
          `INSERT INTO users (id, username, email, full_name, password_hash, role, title, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            user.id,
            user.username,
            user.email,
            user.fullName,
            passwordHash,
            user.role,
            user.title,
            true,
          ]
        )
        console.log(`✓ Created user: ${user.username} (${user.role})`)
      }
    }

    console.log('\n✅ User seeding completed successfully!')
    console.log('\nYou can now login with:')
    console.log('  Admin:       admin / Admin@123')
    console.log('  Supervisor:  supervisor / Supervisor@123')
    console.log('  Officer:     officer / Officer@123')
    console.log('  Auditor:     auditor / Auditor@123')
  } catch (error) {
    console.error('\n❌ Error seeding users:', error.message)
    console.error('\nMake sure:')
    console.error('1. PostgreSQL is running')
    console.error('2. DATABASE_URL is correct in .env')
    console.error('3. Database "taxcoreai" exists')
    console.error('4. Users table exists (run schema.sql first)')
    process.exit(1)
  } finally {
    await pool.end()
  }
}

seedUsers()