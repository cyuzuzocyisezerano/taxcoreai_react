import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found in .env file')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function seedAuditLogs() {
  console.log('Seeding audit logs into PostgreSQL...\n')

  const client = await pool.connect()

  try {
    // Check if audit logs exist
    const logCount = await client.query('SELECT COUNT(*) FROM audit_logs')
    if (parseInt(logCount.rows[0].count) === 0) {
      console.log('Creating sample audit logs...')
      
      const auditLogs = [
        {
          id: 'log-1',
          action: 'LOGIN',
          user_id: 'user-admin',
          username: 'admin',
          details: 'Successful login',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 'log-2',
          action: 'DOCUMENT_ANALYZE',
          user_id: 'user-officer',
          username: 'Jeanine Uwase',
          details: 'Analyzed VAT Declaration for Kigali Trading Company Ltd (TIN: 100000001)',
          ip_address: '192.168.1.101',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          created_at: new Date(Date.now() - 72000000).toISOString()
        },
        {
          id: 'log-3',
          action: 'WORKFLOW_CREATE',
          user_id: 'user-officer',
          username: 'Jeanine Uwase',
          details: 'Created workflow: Review VAT Declaration Q1',
          ip_address: '192.168.1.101',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          created_at: new Date(Date.now() - 64800000).toISOString()
        },
        {
          id: 'log-4',
          action: 'WORKFLOW_APPROVE',
          user_id: 'user-supervisor',
          username: 'Marie Habiyaremye',
          details: 'Approved workflow: Review VAT Declaration Q1',
          ip_address: '192.168.1.102',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          created_at: new Date(Date.now() - 57600000).toISOString()
        },
        {
          id: 'log-5',
          action: 'DOCUMENT_UPLOAD',
          user_id: 'user-officer',
          username: 'Jeanine Uwase',
          details: 'Uploaded annual tax return for Rwanda Fresh Produce Ltd (TIN: 100000002)',
          ip_address: '192.168.1.101',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          created_at: new Date(Date.now() - 43200000).toISOString()
        },
        {
          id: 'log-6',
          action: 'LOGIN',
          user_id: 'user-supervisor',
          username: 'Marie Habiyaremye',
          details: 'Successful login',
          ip_address: '192.168.1.102',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          created_at: new Date(Date.now() - 28800000).toISOString()
        },
        {
          id: 'log-7',
          action: 'WORKFLOW_BATCH_CREATE',
          user_id: 'user-admin',
          username: 'admin',
          details: 'Created workflow batch: Q1 2025 Corporate Tax Returns',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          created_at: new Date(Date.now() - 14400000).toISOString()
        },
        {
          id: 'log-8',
          action: 'DOCUMENT_ANALYZE',
          user_id: 'user-officer',
          username: 'Jeanine Uwase',
          details: 'Analyzed Income Tax Return for Inyange Industries Ltd (TIN: 100000003)',
          ip_address: '192.168.1.101',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'log-9',
          action: 'SETTINGS_UPDATE',
          user_id: 'user-admin',
          username: 'admin',
          details: 'Updated notification preferences',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          created_at: new Date(Date.now() - 1800000).toISOString()
        },
        {
          id: 'log-10',
          action: 'AUDIT_LOGS_EXPORT',
          user_id: 'user-auditor',
          username: 'Pierre Mukandayire',
          details: 'Exported audit logs as CSV',
          ip_address: '192.168.1.103',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          created_at: new Date().toISOString()
        }
      ]

      for (const log of auditLogs) {
        await client.query(`
          INSERT INTO audit_logs (id, action, user_id, username, details, ip_address, user_agent, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING
        `, [log.id, log.action, log.user_id, log.username, log.details, log.ip_address, log.user_agent, log.created_at])
      }
      
      console.log(`✓ Created ${auditLogs.length} audit logs`)
    } else {
      console.log(`✓ Audit logs already exist (${logCount.rows[0].count} logs)`)
    }

    console.log('\n✅ Audit logs seeded successfully!')
    console.log('\nYou can now view audit logs at:')
    console.log('  - /audit-logs')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    client.release()
  }
}

seedAuditLogs()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Failed:', err)
    process.exit(1)
  })
  .finally(() => pool.end())