import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found in .env file')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function createTables() {
  console.log('Creating workflow tables...\n')

  const client = await pool.connect()

  try {
    // Create workflows table
    console.log('Creating workflows table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflows (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        document_id VARCHAR(255),
        taxpayer_tin VARCHAR(50),
        taxpayer_name VARCHAR(255),
        assigned_to VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'approved', 'rejected', 'escalated')),
        priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        due_date DATE,
        current_stage VARCHAR(100) DEFAULT 'received' CHECK (current_stage IN ('received', 'verified', 'approved', 'archived')),
        stages JSONB DEFAULT '[{"name":"received","status":"completed","completedAt":null},{"name":"verified","status":"pending","completedAt":null},{"name":"approved","status":"pending","completedAt":null},{"name":"archived","status":"pending","completedAt":null}]'::jsonb,
        rejection_reason TEXT,
        owner VARCHAR(255) NOT NULL,
        created_by VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ workflows table created')

    // Create workflow_comments table
    console.log('Creating workflow_comments table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_comments (
        id VARCHAR(255) PRIMARY KEY,
        workflow_id VARCHAR(255) NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        user_id VARCHAR(255),
        username VARCHAR(100),
        comment TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ workflow_comments table created')

    // Create workflow_history table
    console.log('Creating workflow_history table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_history (
        id VARCHAR(255) PRIMARY KEY,
        workflow_id VARCHAR(255) NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        from_stage VARCHAR(100),
        to_stage VARCHAR(100),
        from_status VARCHAR(50),
        to_status VARCHAR(50),
        user_id VARCHAR(255),
        username VARCHAR(100),
        comment TEXT,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ workflow_history table created')

    // Create workflow_batches table
    console.log('Creating workflow_batches table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_batches (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(500) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
        total_items INTEGER DEFAULT 0,
        processed_items INTEGER DEFAULT 0,
        failed_items INTEGER DEFAULT 0,
        workflow_template JSONB,
        filters JSONB,
        created_by VARCHAR(255),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ workflow_batches table created')

    // Create workflow_sla_rules table
    console.log('Creating workflow_sla_rules table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_sla_rules (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        priority VARCHAR(50) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        stage VARCHAR(100) NOT NULL,
        max_hours INTEGER NOT NULL,
        escalation_user_id VARCHAR(255),
        escalation_message TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ workflow_sla_rules table created')

    // Create indexes
    console.log('\nCreating indexes...')
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflows_assigned_to ON workflows(assigned_to)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflows_priority ON workflows(priority)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflows_due_date ON workflows(due_date)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflows_current_stage ON workflows(current_stage)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflow_comments_workflow_id ON workflow_comments(workflow_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflow_history_workflow_id ON workflow_history(workflow_id)')
    console.log('✓ Indexes created')

    console.log('\n✅ All workflow tables created successfully!')
    console.log('\nYou can now restart the server and access /workflows')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    client.release()
  }
}

createTables()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Failed:', err)
    process.exit(1)
  })
  .finally(() => pool.end())