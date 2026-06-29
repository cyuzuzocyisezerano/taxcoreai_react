import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found in .env file')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function fixOwners() {
  console.log('Fixing workflow owners and assigned_to fields...\n')

  const client = await pool.connect()

  try {
    // Update workflows to use correct user IDs
    console.log('Updating workflow owners...')
    await client.query(`
      UPDATE workflows 
      SET owner = 'user-admin', created_by = 'user-admin', assigned_to = 'user-officer'
      WHERE owner = 'admin' OR created_by = 'admin'
    `)
    console.log('✓ Updated admin-owned workflows')

    await client.query(`
      UPDATE workflows 
      SET assigned_to = 'user-supervisor'
      WHERE id IN ('wf-003', 'wf-006')
    `)
    console.log('✓ Updated supervisor-assigned workflows')

    // Verify the updates
    const result = await client.query('SELECT id, title, owner, assigned_to, status FROM workflows')
    console.log('\nCurrent workflows:')
    result.rows.forEach(wf => {
      console.log(`  - ${wf.id}: ${wf.title}`)
      console.log(`    Owner: ${wf.owner}, Assigned: ${wf.assigned_to}, Status: ${wf.status}`)
    })

    console.log('\n✅ Workflow owners fixed!')
    console.log('\nYou can now restart the server and workflows will be visible.')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    client.release()
  }
}

fixOwners()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Failed:', err)
    process.exit(1)
  })
  .finally(() => pool.end())