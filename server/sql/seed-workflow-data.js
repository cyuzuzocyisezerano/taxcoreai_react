import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found in .env file')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function seedData() {
  console.log('Seeding workflow data...\n')

  const client = await pool.connect()

  try {
    // Seed SLA Rules
    console.log('Creating SLA rules...')
    const slaRules = [
      {
        id: 'sla-1',
        name: 'Critical Priority - 24h SLA',
        priority: 'critical',
        stage: 'received',
        max_hours: 24,
        escalation_message: 'Critical workflow overdue! Immediate action required.',
        active: true
      },
      {
        id: 'sla-2',
        name: 'High Priority - 48h SLA',
        priority: 'high',
        stage: 'verified',
        max_hours: 48,
        escalation_message: 'High priority workflow approaching SLA limit.',
        active: true
      },
      {
        id: 'sla-3',
        name: 'Medium Priority - 72h SLA',
        priority: 'medium',
        stage: 'approved',
        max_hours: 72,
        escalation_message: 'Medium priority workflow needs attention.',
        active: true
      },
      {
        id: 'sla-4',
        name: 'Low Priority - 120h SLA',
        priority: 'low',
        stage: 'archived',
        max_hours: 120,
        escalation_message: 'Low priority workflow pending completion.',
        active: true
      }
    ]

    for (const rule of slaRules) {
      await client.query(`
        INSERT INTO workflow_sla_rules (id, name, priority, stage, max_hours, escalation_message, active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING
      `, [rule.id, rule.name, rule.priority, rule.stage, rule.max_hours, rule.escalation_message, rule.active])
    }
    console.log(`✓ Created ${slaRules.length} SLA rules`)

    // Seed Workflows
    console.log('\nCreating sample workflows...')
    const workflows = [
      {
        id: 'wf-001',
        title: 'Annual Tax Return - ABC Company Ltd',
        description: 'Review and process annual corporate tax return for ABC Company',
        document_id: 'doc-001',
        taxpayer_tin: '103456789',
        taxpayer_name: 'ABC Company Ltd',
        assigned_to: 'user-officer',
        status: 'in_progress',
        priority: 'high',
        due_date: '2025-01-15',
        current_stage: 'verified',
        stages: JSON.stringify([
          { name: 'received', status: 'completed', completedAt: '2025-01-01T10:00:00Z' },
          { name: 'verified', status: 'in_progress', completedAt: null },
          { name: 'approved', status: 'pending', completedAt: null },
          { name: 'archived', status: 'pending', completedAt: null }
        ]),
        owner: 'admin',
        created_by: 'admin'
      },
      {
        id: 'wf-002',
        title: 'VAT Registration - XYZ Enterprises',
        description: 'Process VAT registration application for XYZ Enterprises',
        document_id: 'doc-002',
        taxpayer_tin: '104567890',
        taxpayer_name: 'XYZ Enterprises',
        assigned_to: 'user-officer',
        status: 'pending',
        priority: 'medium',
        due_date: '2025-01-20',
        current_stage: 'received',
        stages: JSON.stringify([
          { name: 'received', status: 'completed', completedAt: '2025-01-05T14:00:00Z' },
          { name: 'verified', status: 'pending', completedAt: null },
          { name: 'approved', status: 'pending', completedAt: null },
          { name: 'archived', status: 'pending', completedAt: null }
        ]),
        owner: 'admin',
        created_by: 'admin'
      },
      {
        id: 'wf-003',
        title: 'Tax Audit - DEF Corporation',
        description: 'Conduct comprehensive tax audit for DEF Corporation',
        document_id: 'doc-003',
        taxpayer_tin: '105678901',
        taxpayer_name: 'DEF Corporation',
        assigned_to: 'user-supervisor',
        status: 'approved',
        priority: 'critical',
        due_date: '2025-01-10',
        current_stage: 'approved',
        stages: JSON.stringify([
          { name: 'received', status: 'completed', completedAt: '2024-12-20T09:00:00Z' },
          { name: 'verified', status: 'completed', completedAt: '2024-12-25T16:00:00Z' },
          { name: 'approved', status: 'completed', completedAt: '2025-01-08T11:00:00Z' },
          { name: 'archived', status: 'in_progress', completedAt: null }
        ]),
        owner: 'admin',
        created_by: 'admin'
      },
      {
        id: 'wf-004',
        title: 'Withholding Tax Certificate - GHI Ltd',
        description: 'Issue withholding tax certificate for GHI Ltd',
        document_id: 'doc-004',
        taxpayer_tin: '106789012',
        taxpayer_name: 'GHI Ltd',
        assigned_to: 'user-officer',
        status: 'escalated',
        priority: 'high',
        due_date: '2025-01-05',
        current_stage: 'verified',
        stages: JSON.stringify([
          { name: 'received', status: 'completed', completedAt: '2024-12-28T08:00:00Z' },
          { name: 'verified', status: 'in_progress', completedAt: null },
          { name: 'approved', status: 'pending', completedAt: null },
          { name: 'archived', status: 'pending', completedAt: null }
        ]),
        owner: 'admin',
        created_by: 'admin'
      },
      {
        id: 'wf-005',
        title: 'Monthly PAYE Return - JKL Services',
        description: 'Process monthly PAYE return for JKL Services',
        document_id: 'doc-005',
        taxpayer_tin: '107890123',
        taxpayer_name: 'JKL Services',
        assigned_to: 'user-officer',
        status: 'completed',
        priority: 'low',
        due_date: '2025-01-12',
        current_stage: 'archived',
        stages: JSON.stringify([
          { name: 'received', status: 'completed', completedAt: '2025-01-02T10:00:00Z' },
          { name: 'verified', status: 'completed', completedAt: '2025-01-03T14:00:00Z' },
          { name: 'approved', status: 'completed', completedAt: '2025-01-05T09:00:00Z' },
          { name: 'archived', status: 'completed', completedAt: '2025-01-06T11:00:00Z' }
        ]),
        owner: 'admin',
        created_by: 'admin'
      },
      {
        id: 'wf-006',
        title: 'Excise Duty Assessment - MNO Breweries',
        description: 'Assess excise duty for MNO Breweries Q4 2024',
        document_id: 'doc-006',
        taxpayer_tin: '108901234',
        taxpayer_name: 'MNO Breweries',
        assigned_to: 'user-supervisor',
        status: 'rejected',
        priority: 'medium',
        due_date: '2025-01-08',
        current_stage: 'verified',
        stages: JSON.stringify([
          { name: 'received', status: 'completed', completedAt: '2024-12-30T13:00:00Z' },
          { name: 'verified', status: 'completed', completedAt: '2025-01-02T10:00:00Z' },
          { name: 'approved', status: 'pending', completedAt: null },
          { name: 'archived', status: 'pending', completedAt: null }
        ]),
        rejection_reason: 'Incomplete documentation provided. Additional supporting documents required.',
        owner: 'admin',
        created_by: 'admin'
      }
    ]

    for (const workflow of workflows) {
      await client.query(`
        INSERT INTO workflows (
          id, title, description, document_id, taxpayer_tin, taxpayer_name, assigned_to,
          status, priority, due_date, current_stage, stages, rejection_reason, owner, created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING
      `, [
        workflow.id,
        workflow.title,
        workflow.description,
        workflow.document_id,
        workflow.taxpayer_tin,
        workflow.taxpayer_name,
        workflow.assigned_to,
        workflow.status,
        workflow.priority,
        workflow.due_date,
        workflow.current_stage,
        workflow.stages,
        workflow.rejection_reason,
        workflow.owner,
        workflow.created_by
      ])
    }
    console.log(`✓ Created ${workflows.length} sample workflows`)

    // Seed Workflow Batches
    console.log('\nCreating sample workflow batches...')
    const batches = [
      {
        id: 'batch-001',
        name: 'Q1 2025 Corporate Tax Returns',
        description: 'Batch processing for all corporate tax returns due in Q1 2025',
        status: 'completed',
        total_items: 25,
        processed_items: 25,
        failed_items: 0,
        workflow_template: JSON.stringify({ priority: 'high', dueDate: '2025-03-31' }),
        filters: JSON.stringify({ status: 'pending', type: 'corporate' }),
        created_by: 'admin',
        started_at: '2025-01-01T08:00:00Z',
        completed_at: '2025-01-15T17:00:00Z'
      },
      {
        id: 'batch-002',
        name: 'VAT Registration Applications',
        description: 'Process pending VAT registration applications',
        status: 'processing',
        total_items: 15,
        processed_items: 8,
        failed_items: 1,
        workflow_template: JSON.stringify({ priority: 'medium', currentStage: 'received' }),
        filters: JSON.stringify({ status: 'pending', category: 'registration' }),
        created_by: 'admin',
        started_at: '2025-01-10T09:00:00Z',
        completed_at: null
      },
      {
        id: 'batch-003',
        name: 'Annual Audit Reviews',
        description: 'Batch processing for annual audit reviews',
        status: 'pending',
        total_items: 10,
        processed_items: 0,
        failed_items: 0,
        workflow_template: JSON.stringify({ priority: 'critical', currentStage: 'verified' }),
        filters: JSON.stringify({ status: 'in_progress', type: 'audit' }),
        created_by: 'admin',
        started_at: null,
        completed_at: null
      }
    ]

    for (const batch of batches) {
      await client.query(`
        INSERT INTO workflow_batches (
          id, name, description, status, total_items, processed_items, failed_items,
          workflow_template, filters, created_by, started_at, completed_at, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING
      `, [
        batch.id,
        batch.name,
        batch.description,
        batch.status,
        batch.total_items,
        batch.processed_items,
        batch.failed_items,
        batch.workflow_template,
        batch.filters,
        batch.created_by,
        batch.started_at,
        batch.completed_at
      ])
    }
    console.log(`✓ Created ${batches.length} sample batches`)

    // Seed Workflow Comments
    console.log('\nCreating sample workflow comments...')
    const comments = [
      {
        id: 'comment-001',
        workflow_id: 'wf-001',
        user_id: 'user-officer',
        username: 'Jeanine Uwase',
        comment: 'Verified all supporting documents. Ready for supervisor review.'
      },
      {
        id: 'comment-002',
        workflow_id: 'wf-003',
        user_id: 'user-supervisor',
        username: 'Marie Habiyaremye',
        comment: 'Audit completed successfully. All findings documented.'
      },
      {
        id: 'comment-003',
        workflow_id: 'wf-004',
        user_id: 'user-officer',
        username: 'Jeanine Uwase',
        comment: 'Escalating due to missing tax identification documents.'
      },
      {
        id: 'comment-004',
        workflow_id: 'wf-006',
        user_id: 'user-supervisor',
        username: 'Marie Habiyaremye',
        comment: 'Rejected - Additional documentation required for excise duty calculation.'
      }
    ]

    for (const comment of comments) {
      await client.query(`
        INSERT INTO workflow_comments (id, workflow_id, user_id, username, comment, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING
      `, [comment.id, comment.workflow_id, comment.user_id, comment.username, comment.comment])
    }
    console.log(`✓ Created ${comments.length} sample comments`)

    // Seed Workflow History
    console.log('\nCreating sample workflow history...')
    const history = [
      {
        id: 'hist-001',
        workflow_id: 'wf-001',
        action: 'CREATE',
        from_status: null,
        to_status: 'pending',
        user_id: 'admin',
        username: 'System Administrator',
        comment: 'Workflow created'
      },
      {
        id: 'hist-002',
        workflow_id: 'wf-001',
        action: 'STAGE_PROGRESS',
        from_stage: 'received',
        to_stage: 'verified',
        from_status: 'pending',
        to_status: 'in_progress',
        user_id: 'user-officer',
        username: 'Jeanine Uwase',
        comment: 'Moved to verification stage'
      },
      {
        id: 'hist-003',
        workflow_id: 'wf-003',
        action: 'APPROVE',
        from_status: 'in_progress',
        to_status: 'approved',
        user_id: 'user-supervisor',
        username: 'Marie Habiyaremye',
        comment: 'Audit approved'
      },
      {
        id: 'hist-004',
        workflow_id: 'wf-004',
        action: 'ESCALATE',
        from_status: 'in_progress',
        to_status: 'escalated',
        user_id: 'user-officer',
        username: 'Jeanine Uwase',
        comment: 'Escalated due to missing documents'
      },
      {
        id: 'hist-005',
        workflow_id: 'wf-006',
        action: 'REJECT',
        from_status: 'in_progress',
        to_status: 'rejected',
        user_id: 'user-supervisor',
        username: 'Marie Habiyaremye',
        comment: 'Rejected - incomplete documentation',
        metadata: JSON.stringify({ reason: 'Incomplete documentation provided. Additional supporting documents required.' })
      }
    ]

    for (const item of history) {
      await client.query(`
        INSERT INTO workflow_history (
          id, workflow_id, action, from_stage, to_stage, from_status, to_status,
          user_id, username, comment, metadata, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING
      `, [
        item.id,
        item.workflow_id,
        item.action,
        item.from_stage,
        item.to_stage,
        item.from_status,
        item.to_status,
        item.user_id,
        item.username,
        item.comment,
        item.metadata || null
      ])
    }
    console.log(`✓ Created ${history.length} sample history records`)

    console.log('\n✅ Workflow data seeded successfully!')
    console.log('\nSummary:')
    console.log(`  - ${slaRules.length} SLA rules`)
    console.log(`  - ${workflows.length} workflows`)
    console.log(`  - ${batches.length} batches`)
    console.log(`  - ${comments.length} comments`)
    console.log(`  - ${history.length} history records`)
    console.log('\nYou can now view the workflows at /workflows')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    client.release()
  }
}

seedData()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Failed:', err)
    process.exit(1)
  })
  .finally(() => pool.end())