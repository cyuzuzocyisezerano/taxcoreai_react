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

async function migrateUsersTable() {
  console.log('Migrating users table...\n')

  try {
    // Check if columns exist
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('email', 'full_name', 'is_active')
    `)

    const existingColumns = columnCheck.rows.map(row => row.column_name)
    console.log('Existing columns:', existingColumns)

    // Add email column if missing
    if (!existingColumns.includes('email')) {
      console.log('Adding email column...')
      await pool.query('ALTER TABLE users ADD COLUMN email VARCHAR(255)')
      console.log('✓ Added email column')
    } else {
      console.log('✓ email column already exists')
    }

    // Add full_name column if missing
    if (!existingColumns.includes('full_name')) {
      console.log('Adding full_name column...')
      await pool.query('ALTER TABLE users ADD COLUMN full_name VARCHAR(255) NOT NULL DEFAULT \'Unknown\'')
      console.log('✓ Added full_name column')
    } else {
      console.log('✓ full_name column already exists')
    }

    // Add is_active column if missing
    if (!existingColumns.includes('is_active')) {
      console.log('Adding is_active column...')
      await pool.query('ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true')
      console.log('✓ Added is_active column')
    } else {
      console.log('✓ is_active column already exists')
    }

    // Migrate data from 'name' to 'full_name' if name column exists
    const nameColumnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'name'
    `)

    if (nameColumnCheck.rows.length > 0) {
      console.log('Migrating data from name to full_name...')
      await pool.query(`
        UPDATE users 
        SET full_name = COALESCE(full_name, name)
        WHERE full_name IS NULL OR full_name = 'Unknown'
      `)
      console.log('✓ Migrated name data to full_name')
    }

    console.log('\n✅ Users table migration completed!')
    console.log('\nNow run: npm run seed:users')
  } catch (error) {
    console.error('\n❌ Migration error:', error.message)
    console.error('\nMake sure:')
    console.error('1. PostgreSQL is running')
    console.error('2. DATABASE_URL is correct in .env')
    console.error('3. Database "taxcoreai" exists')
    console.error('4. Users table exists')
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrateUsersTable()