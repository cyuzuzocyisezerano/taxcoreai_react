import { readFileSync } from 'fs'
import { Pool } from 'pg'
import dotenv from 'dotenv'

// Load .env file
dotenv.config({ path: new URL('../.env', import.meta.url) })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set')
  console.error('Please set it in your .env file or environment')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function migrate() {
  console.log('Starting migration from db.json to PostgreSQL...\n')

  try {
    // Read db.json
    const dbPath = new URL('../src/data/db.json', import.meta.url)
    const dbContent = readFileSync(dbPath, 'utf-8')
    const db = JSON.parse(dbContent)

    console.log('Database loaded successfully')
    console.log(`- ${db.taxpayers?.length || 0} taxpayers`)
    console.log(`- ${db.documents?.length || 0} documents`)
    console.log(`- ${db.users?.length || 0} users`)
    console.log(`- ${db.auditLogs?.length || 0} audit logs`)
    console.log(`- ${db.workflows?.length || 0} workflows`)
    console.log(`- ${db.notifications?.length || 0} notifications`)
    console.log(`- ${db.reports?.length || 0} reports`)
    console.log(`- ${db.pendingTasks?.length || 0} pending tasks`)
    console.log(`- ${db.aiPrompts?.length || 0} AI prompts\n`)

    const client = await pool.connect()

    try {
      // Migrate Users
      console.log('Migrating users...')
      if (db.users && db.users.length > 0) {
        for (const user of db.users) {
          await client.query(
            `INSERT INTO users (id, username, password_hash, name, role, title, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET
               username = EXCLUDED.username,
               password_hash = EXCLUDED.password_hash,
               name = EXCLUDED.name,
               role = EXCLUDED.role,
               title = EXCLUDED.title,
               updated_at = EXCLUDED.updated_at`,
            [
              user.id,
              user.username,
              user.passwordHash,
              user.name,
              user.role,
              user.title || null,
              new Date(),
              new Date()
            ]
          )
        }
        console.log(`✓ Migrated ${db.users.length} users`)
      }

      // Migrate Taxpayers
      console.log('Migrating taxpayers...')
      if (db.taxpayers && db.taxpayers.length > 0) {
        for (const taxpayer of db.taxpayers) {
          await client.query(
            `INSERT INTO taxpayers (
              id, name, tin, type, district, status, registered, alias,
              business_name, address, contact, email, phone, tax_regime,
              business_activity, bank_name, bank_account,
              authorized_representative, representative_id, representative_contact,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              tin = EXCLUDED.tin,
              type = EXCLUDED.type,
              district = EXCLUDED.district,
              status = EXCLUDED.status,
              alias = EXCLUDED.alias,
              business_name = EXCLUDED.business_name,
              address = EXCLUDED.address,
              contact = EXCLUDED.contact,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone,
              tax_regime = EXCLUDED.tax_regime,
              business_activity = EXCLUDED.business_activity,
              bank_name = EXCLUDED.bank_name,
              bank_account = EXCLUDED.bank_account,
              authorized_representative = EXCLUDED.authorized_representative,
              representative_id = EXCLUDED.representative_id,
              representative_contact = EXCLUDED.representative_contact,
              updated_at = EXCLUDED.updated_at`,
            [
              taxpayer.id,
              taxpayer.name,
              taxpayer.tin,
              taxpayer.type,
              taxpayer.district,
              taxpayer.status,
              new Date(taxpayer.registered),
              taxpayer.alias || null,
              taxpayer.businessName || null,
              taxpayer.address || null,
              taxpayer.contact || null,
              taxpayer.email || null,
              taxpayer.phone || null,
              taxpayer.taxRegime || null,
              taxpayer.businessActivity || null,
              taxpayer.bankName || null,
              taxpayer.bankAccount || null,
              taxpayer.authorizedRepresentative || null,
              taxpayer.representativeId || null,
              taxpayer.representativeContact || null,
              new Date(),
              new Date()
            ]
          )
        }
        console.log(`✓ Migrated ${db.taxpayers.length} taxpayers`)
      }

      // Migrate Documents
      console.log('Migrating documents...')
      if (db.documents && db.documents.length > 0) {
        for (const doc of db.documents) {
          await client.query(
            `INSERT INTO documents (
              id, title, description, type, category, status, taxpayer_tin, taxpayer_name, taxpayer_id,
              file_name, file_path, file_size, mime_type, file_hash, version,
              uploaded_by, uploaded_at, analysis_status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              type = EXCLUDED.type,
              category = EXCLUDED.category,
              status = EXCLUDED.status,
              taxpayer_tin = EXCLUDED.taxpayer_tin,
              taxpayer_name = EXCLUDED.taxpayer_name,
              taxpayer_id = EXCLUDED.taxpayer_id,
              file_name = EXCLUDED.file_name,
              file_path = EXCLUDED.file_path,
              file_size = EXCLUDED.file_size,
              mime_type = EXCLUDED.mime_type,
              file_hash = EXCLUDED.file_hash,
              version = EXCLUDED.version,
              uploaded_by = EXCLUDED.uploaded_by,
              uploaded_at = EXCLUDED.uploaded_at,
              analysis_status = EXCLUDED.analysis_status,
              updated_at = EXCLUDED.updated_at`,
            [
              doc.id,
              doc.title,
              null,
              doc.type || 'Other',
              'Other',
              doc.status || 'Active',
              doc.taxpayerTin || null,
              doc.taxpayerName || null,
              null,
              doc.fileName || null,
              null,
              null,
              null,
              null,
              1,
              null,
              new Date(doc.uploadedAt),
              'pending',
              new Date(),
              new Date()
            ]
          )
        }
        console.log(`✓ Migrated ${db.documents.length} documents`)
      }

      // Migrate Audit Logs
      console.log('Migrating audit logs...')
      if (db.auditLogs && db.auditLogs.length > 0) {
        for (const log of db.auditLogs) {
          await client.query(
            `INSERT INTO audit_logs (id, action, user_id, username, details, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO NOTHING`,
            [
              log.id,
              log.action,
              log.userId || null,
              log.username || null,
              log.details,
              new Date(log.createdAt)
            ]
          )
        }
        console.log(`✓ Migrated ${db.auditLogs.length} audit logs`)
      }

      // Migrate Workflows
      console.log('Migrating workflows...')
      if (db.workflows && db.workflows.length > 0) {
        for (const workflow of db.workflows) {
          const stages = workflow.stages || [
            { name: 'received', status: 'completed', completedAt: null },
            { name: 'verified', status: 'pending', completedAt: null },
            { name: 'approved', status: 'pending', completedAt: null },
            { name: 'archived', status: 'pending', completedAt: null }
          ]
          await client.query(
            `INSERT INTO workflows (
              id, title, description, document_id, taxpayer_tin, taxpayer_name, assigned_to,
              status, priority, due_date, current_stage, stages, owner, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              document_id = EXCLUDED.document_id,
              taxpayer_tin = EXCLUDED.taxpayer_tin,
              taxpayer_name = EXCLUDED.taxpayer_name,
              assigned_to = EXCLUDED.assigned_to,
              status = EXCLUDED.status,
              priority = EXCLUDED.priority,
              due_date = EXCLUDED.due_date,
              current_stage = EXCLUDED.current_stage,
              stages = EXCLUDED.stages,
              owner = EXCLUDED.owner,
              created_by = EXCLUDED.created_by,
              updated_at = EXCLUDED.updated_at`,
            [
              workflow.id,
              workflow.title,
              workflow.description || null,
              workflow.documentId || null,
              workflow.taxpayerTin || null,
              workflow.taxpayerName || null,
              workflow.assignedTo || null,
              workflow.status || 'pending',
              workflow.priority || 'medium',
              workflow.dueDate ? new Date(workflow.dueDate) : null,
              workflow.currentStage || 'received',
              JSON.stringify(stages),
              workflow.owner,
              workflow.createdBy || null,
              new Date(workflow.createdAt),
              new Date(workflow.updatedAt)
            ]
          )
        }
        console.log(`✓ Migrated ${db.workflows.length} workflows`)
      }

      // Migrate Notifications
      console.log('Migrating notifications...')
      if (db.notifications && db.notifications.length > 0) {
        for (const notification of db.notifications) {
          await client.query(
            `INSERT INTO notifications (id, title, type, status, created_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET
               title = EXCLUDED.title,
               type = EXCLUDED.type,
               status = EXCLUDED.status`,
            [
              notification.id,
              notification.title,
              notification.type,
              notification.status,
              new Date(notification.createdAt)
            ]
          )
        }
        console.log(`✓ Migrated ${db.notifications.length} notifications`)
      }

      // Migrate Reports
      console.log('Migrating reports...')
      if (db.reports && db.reports.length > 0) {
        for (const report of db.reports) {
          await client.query(
            `INSERT INTO reports (id, name, type, generated_at, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               type = EXCLUDED.type,
               generated_at = EXCLUDED.generated_at,
               status = EXCLUDED.status`,
            [
              report.id,
              report.name,
              report.type,
              new Date(report.generatedAt),
              report.status,
              new Date()
            ]
          )
        }
        console.log(`✓ Migrated ${db.reports.length} reports`)
      }

      // Migrate Pending Tasks
      console.log('Migrating pending tasks...')
      if (db.pendingTasks && db.pendingTasks.length > 0) {
        for (const task of db.pendingTasks) {
          await client.query(
            `INSERT INTO pending_tasks (id, label, priority, status, created_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET
               label = EXCLUDED.label,
               priority = EXCLUDED.priority,
               status = EXCLUDED.status`,
            [
              task.id,
              task.label,
              task.priority,
              'pending',
              new Date()
            ]
          )
        }
        console.log(`✓ Migrated ${db.pendingTasks.length} pending tasks`)
      }

      // Migrate AI Prompts
      console.log('Migrating AI prompts...')
      if (db.aiPrompts && db.aiPrompts.length > 0) {
        for (const prompt of db.aiPrompts) {
          await client.query(
            `INSERT INTO ai_prompts (id, prompt, description, created_at)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE SET
               prompt = EXCLUDED.prompt,
               description = EXCLUDED.description`,
            [
              prompt.id,
              prompt.prompt,
              prompt.description || null,
              new Date()
            ]
          )
        }
        console.log(`✓ Migrated ${db.aiPrompts.length} AI prompts`)
      }

      // Migrate Settings
      console.log('Migrating settings...')
      if (db.settings) {
        for (const [key, value] of Object.entries(db.settings)) {
          await client.query(
            `INSERT INTO settings (key, value, updated_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (key) DO UPDATE SET
               value = EXCLUDED.value,
               updated_at = EXCLUDED.updated_at`,
            [key, JSON.stringify(value), new Date()]
          )
        }
        console.log('✓ Migrated settings')
      }

      console.log('\n✅ Migration completed successfully!')
      console.log('\nNext steps:')
      console.log('1. Update your .env file with PostgreSQL connection:')
      console.log('   DATABASE_URL=postgres://user:Password%40123@localhost:5432/taxcoreai')
      console.log('2. Restart the server')
      console.log('3. The app will now use PostgreSQL instead of db.json')

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrate()