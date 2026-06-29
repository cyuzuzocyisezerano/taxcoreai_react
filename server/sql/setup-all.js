import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found in .env file')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function setupAll() {
  console.log('Setting up complete database...\n')

  const client = await pool.connect()

  try {
    // Create base tables
    console.log('Creating base tables...')
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Officer', 'Auditor', 'Supervisor')),
        title VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ users table')

    await client.query(`
      CREATE TABLE IF NOT EXISTS taxpayers (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        tin VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('Business', 'Individual', 'Organization')),
        district VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN ('Active', 'Inactive', 'Suspended', 'Pending', 'Flagged')),
        registered TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        alias VARCHAR(255),
        business_name VARCHAR(255),
        address TEXT,
        contact VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        tax_regime VARCHAR(100),
        business_activity TEXT,
        bank_name VARCHAR(255),
        bank_account VARCHAR(100),
        authorized_representative VARCHAR(255),
        representative_id VARCHAR(100),
        representative_contact VARCHAR(100),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ taxpayers table')

    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        type VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Active',
        taxpayer_tin VARCHAR(50),
        taxpayer_name VARCHAR(255),
        file_name VARCHAR(500),
        uploaded_by VARCHAR(255),
        uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ documents table')

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(255) PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        user_id VARCHAR(255),
        username VARCHAR(100),
        details TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ audit_logs table')

    // Create workflow tables
    console.log('\nCreating workflow tables...')
    
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
    console.log('✓ workflows table')

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
    console.log('✓ workflow_comments table')

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
    console.log('✓ workflow_history table')

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
    console.log('✓ workflow_batches table')

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
    console.log('✓ workflow_sla_rules table')

    // Create indexes
    console.log('\nCreating indexes...')
    await client.query('CREATE INDEX IF NOT EXISTS idx_taxpayers_tin ON taxpayers(tin)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_taxpayers_status ON taxpayers(status)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_documents_taxpayer_tin ON documents(taxpayer_tin)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflows_assigned_to ON workflows(assigned_to)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflows_priority ON workflows(priority)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflows_due_date ON workflows(due_date)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflow_comments_workflow_id ON workflow_comments(workflow_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflow_history_workflow_id ON workflow_history(workflow_id)')
    console.log('✓ Indexes created')

    // Seed users
    console.log('\nSeeding users...')
    await client.query(`
      INSERT INTO users (id, username, password_hash, name, role, title, created_at, updated_at)
      VALUES
        ('user-admin', 'admin', '$2b$10$UtvWGSvbhcGjT/Xj/3Mw.ua.JbDkvHFY0F6uLnf4xr3d1KDE6Ftp.', 'System Administrator', 'Admin', 'System Administrator', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('user-officer', 'officer', '$2b$10$J0TYJfGA22/9GsbtuFXd..oJM3dmsiwlTd5SlxtYV.aUQsLJQhhKC', 'Jeanine Uwase', 'Officer', 'Taxpayer Officer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('user-auditor', 'auditor', '$2b$10$J0TYJfGA22/9GsbtuFXd..oJM3dmsiwlTd5SlxtYV.aUQsLJQhhKC', 'Pierre Mukandayire', 'Auditor', 'Tax Auditor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('user-supervisor', 'supervisor', '$2b$10$J0TYJfGA22/9GsbtuFXd..oJM3dmsiwlTd5SlxtYV.aUQsLJQhhKC', 'Marie Habiyaremye', 'Supervisor', 'Audit Supervisor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING
    `)
    console.log('✓ Created 4 users')

    // Seed taxpayers
    console.log('\nSeeding taxpayers...')
    const taxpayers = [
      ['tp-001', 'ABC Company Ltd', '103456789', 'Business', 'Kigali', 'Active', 'ABC Ltd', 'ABC Company Ltd', 'KG 123 St, Kigali', 'info@abc.com', 'info@abc.com', '+250 788 123 456', 'Corporate Tax', 'Trading and Services', 'Bank of Kigali', '1234567890', 'John Doe', '1199012345678901', '+250 788 123 457'],
      ['tp-002', 'XYZ Enterprises', '104567890', 'Business', 'Musanze', 'Active', null, 'XYZ Enterprises', 'Musanze Town', 'contact@xyz.rw', 'contact@xyz.rw', '+250 788 234 567', 'VAT', 'Manufacturing', 'Equity Bank', '2345678901', null, null, null],
      ['tp-003', 'DEF Corporation', '105678901', 'Business', 'Rubavu', 'Active', null, 'DEF Corporation', 'Rubavu District', 'info@def.rw', 'info@def.rw', '+250 788 345 678', 'Corporate Tax', 'Import/Export', 'I&M Bank', '3456789012', null, null, null],
      ['tp-004', 'GHI Ltd', '106789012', 'Business', 'Huye', 'Active', null, 'GHI Limited', 'Huye Town', 'info@ghi.rw', 'info@ghi.rw', '+250 788 456 789', 'Withholding Tax', 'Consulting', 'KCB Bank', '4567890123', null, null, null],
      ['tp-005', 'JKL Services', '107890123', 'Business', 'Kigali', 'Active', null, 'JKL Services Ltd', 'Kigali City', 'info@jkl.rw', 'info@jkl.rw', '+250 788 567 890', 'PAYE', 'Professional Services', 'Bank of Kigali', '5678901234', null, null, null],
      ['tp-006', 'MNO Breweries', '108901234', 'Business', 'Kicukiro', 'Active', null, 'MNO Breweries Ltd', 'Kicukiro Industrial Park', 'info@mno.rw', 'info@mno.rw', '+250 788 678 901', 'Excise Duty', 'Beverage Manufacturing', 'Cogebanque', '6789012345', null, null, null]
    ]

    for (const tp of taxpayers) {
      await client.query(`
        INSERT INTO taxpayers (id, name, tin, type, district, status, alias, business_name, address, contact, email, phone, tax_regime, business_activity, bank_name, bank_account, authorized_representative, representative_id, representative_contact, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING
      `, tp)
    }
    console.log(`✓ Created ${taxpayers.length} taxpayers`)

    // Seed documents
    console.log('\nSeeding documents...')
    const documents = [
      ['doc-001', 'Annual Tax Return 2024 - ABC Company', 'Return', 'Active', '103456789', 'ABC Company Ltd', 'abc_tax_return_2024.pdf', 'user-officer'],
      ['doc-002', 'VAT Registration Application - XYZ Enterprises', 'Application', 'Active', '104567890', 'XYZ Enterprises', 'xyz_vat_reg.pdf', 'user-officer'],
      ['doc-003', 'Tax Audit Report - DEF Corporation', 'Report', 'Active', '105678901', 'DEF Corporation', 'def_audit_report.pdf', 'user-supervisor'],
      ['doc-004', 'Withholding Tax Certificate - GHI Ltd', 'Certificate', 'Active', '106789012', 'GHI Ltd', 'ghi_wht_cert.pdf', 'user-officer'],
      ['doc-005', 'Monthly PAYE Return - JKL Services', 'Return', 'Active', '107890123', 'JKL Services', 'jkl_paye_jan.pdf', 'user-officer'],
      ['doc-006', 'Excise Duty Assessment - MNO Breweries', 'Assessment', 'Active', '108901234', 'MNO Breweries', 'mno_excise_q4.pdf', 'user-supervisor']
    ]

    for (const doc of documents) {
      await client.query(`
        INSERT INTO documents (id, title, type, status, taxpayer_tin, taxpayer_name, file_name, uploaded_by, uploaded_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING
      `, doc)
    }
    console.log(`✓ Created ${documents.length} documents`)

    // Seed SLA rules
    console.log('\nSeeding SLA rules...')
    const slaRules = [
      ['sla-1', 'Critical Priority - 24h SLA', 'critical', 'received', 24, 'Critical workflow overdue! Immediate action required.'],
      ['sla-2', 'High Priority - 48h SLA', 'high', 'verified', 48, 'High priority workflow approaching SLA limit.'],
      ['sla-3', 'Medium Priority - 72h SLA', 'medium', 'approved', 72, 'Medium priority workflow needs attention.'],
      ['sla-4', 'Low Priority - 120h SLA', 'low', 'archived', 120, 'Low priority workflow pending completion.']
    ]

    for (const rule of slaRules) {
      await client.query(`
        INSERT INTO workflow_sla_rules (id, name, priority, stage, max_hours, escalation_message, active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING
      `, rule)
    }
    console.log(`✓ Created ${slaRules.length} SLA rules`)

    // Seed workflows
    console.log('\nSeeding workflows...')
    const workflows = [
      ['wf-001', 'Annual Tax Return - ABC Company Ltd', 'Review and process annual corporate tax return for ABC Company', 'doc-001', '103456789', 'ABC Company Ltd', 'user-officer', 'in_progress', 'high', '2025-01-15', 'verified', '[{"name":"received","status":"completed","completedAt":"2025-01-01T10:00:00Z"},{"name":"verified","status":"in_progress","completedAt":null},{"name":"approved","status":"pending","completedAt":null},{"name":"archived","status":"pending","completedAt":null}]', null, 'admin', 'admin'],
      ['wf-002', 'VAT Registration - XYZ Enterprises', 'Process VAT registration application for XYZ Enterprises', 'doc-002', '104567890', 'XYZ Enterprises', 'user-officer', 'pending', 'medium', '2025-01-20', 'received', '[{"name":"received","status":"completed","completedAt":"2025-01-05T14:00:00Z"},{"name":"verified","status":"pending","completedAt":null},{"name":"approved","status":"pending","completedAt":null},{"name":"archived","status":"pending","completedAt":null}]', null, 'admin', 'admin'],
      ['wf-003', 'Tax Audit - DEF Corporation', 'Conduct comprehensive tax audit for DEF Corporation', 'doc-003', '105678901', 'DEF Corporation', 'user-supervisor', 'approved', 'critical', '2025-01-10', 'approved', '[{"name":"received","status":"completed","completedAt":"2024-12-20T09:00:00Z"},{"name":"verified","status":"completed","completedAt":"2024-12-25T16:00:00Z"},{"name":"approved","status":"completed","completedAt":"2025-01-08T11:00:00Z"},{"name":"archived","status":"in_progress","completedAt":null}]', null, 'admin', 'admin'],
      ['wf-004', 'Withholding Tax Certificate - GHI Ltd', 'Issue withholding tax certificate for GHI Ltd', 'doc-004', '106789012', 'GHI Ltd', 'user-officer', 'escalated', 'high', '2025-01-05', 'verified', '[{"name":"received","status":"completed","completedAt":"2024-12-28T08:00:00Z"},{"name":"verified","status":"in_progress","completedAt":null},{"name":"approved","status":"pending","completedAt":null},{"name":"archived","status":"pending","completedAt":null}]', null, 'admin', 'admin'],
      ['wf-005', 'Monthly PAYE Return - JKL Services', 'Process monthly PAYE return for JKL Services', 'doc-005', '107890123', 'JKL Services', 'user-officer', 'completed', 'low', '2025-01-12', 'archived', '[{"name":"received","status":"completed","completedAt":"2025-01-02T10:00:00Z"},{"name":"verified","status":"completed","completedAt":"2025-01-03T14:00:00Z"},{"name":"approved","status":"completed","completedAt":"2025-01-05T09:00:00Z"},{"name":"archived","status":"completed","completedAt":"2025-01-06T11:00:00Z"}]', null, 'admin', 'admin'],
      ['wf-006', 'Excise Duty Assessment - MNO Breweries', 'Assess excise duty for MNO Breweries Q4 2024', 'doc-006', '108901234', 'MNO Breweries', 'user-supervisor', 'rejected', 'medium', '2025-01-08', 'verified', '[{"name":"received","status":"completed","completedAt":"2024-12-30T13:00:00Z"},{"name":"verified","status":"completed","completedAt":"2025-01-02T10:00:00Z"},{"name":"approved","status":"pending","completedAt":null},{"name":"archived","status":"pending","completedAt":null}]', 'Incomplete documentation provided. Additional supporting documents required.', 'admin', 'admin']
    ]

    for (const wf of workflows) {
      await client.query(`
        INSERT INTO workflows (id, title, description, document_id, taxpayer_tin, taxpayer_name, assigned_to, status, priority, due_date, current_stage, stages, rejection_reason, owner, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING
      `, wf)
    }
    console.log(`✓ Created ${workflows.length} workflows`)

    // Seed batches
    console.log('\nSeeding workflow batches...')
    const batches = [
      ['batch-001', 'Q1 2025 Corporate Tax Returns', 'Batch processing for all corporate tax returns due in Q1 2025', 'completed', 25, 25, 0, '{"priority":"high","dueDate":"2025-03-31"}', '{"status":"pending","type":"corporate"}', 'admin', '2025-01-01T08:00:00Z', '2025-01-15T17:00:00Z'],
      ['batch-002', 'VAT Registration Applications', 'Process pending VAT registration applications', 'processing', 15, 8, 1, '{"priority":"medium","currentStage":"received"}', '{"status":"pending","category":"registration"}', 'admin', '2025-01-10T09:00:00Z', null],
      ['batch-003', 'Annual Audit Reviews', 'Batch processing for annual audit reviews', 'pending', 10, 0, 0, '{"priority":"critical","currentStage":"verified"}', '{"status":"in_progress","type":"audit"}', 'admin', null, null]
    ]

    for (const batch of batches) {
      await client.query(`
        INSERT INTO workflow_batches (id, name, description, status, total_items, processed_items, failed_items, workflow_template, filters, created_by, started_at, completed_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING
      `, batch)
    }
    console.log(`✓ Created ${batches.length} batches`)

    console.log('\n✅ Database setup completed successfully!')
    console.log('\nSummary:')
    console.log('  - 4 users')
    console.log('  - 6 taxpayers')
    console.log('  - 6 documents')
    console.log('  - 4 SLA rules')
    console.log('  - 6 workflows')
    console.log('  - 3 batches')
    console.log('\nYou can now access:')
    console.log('  - http://localhost:5173/taxpayers')
    console.log('  - http://localhost:5173/documents')
    console.log('  - http://localhost:5173/workflows')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    client.release()
  }
}

setupAll()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Failed:', err)
    process.exit(1)
  })
  .finally(() => pool.end())