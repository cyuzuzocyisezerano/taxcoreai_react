const { Pool } = require('pg')
require('dotenv').config({ path: '../.env' })

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'taxcoreai',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
})

async function createIntegrationsTable() {
  try {
    console.log('Creating integrations table...')
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS integrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'testing')),
        config JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    console.log('✓ Integrations table created successfully')
    
    // Seed integrations data
    console.log('Seeding integrations data...')
    
    const integrations = [
      {
        id: 'int-1',
        name: 'RRA Tax Filing System',
        type: 'tax_filing',
        status: 'active',
        config: {
          apiEndpoint: 'https://api.rra.gov.rw/v1',
          apiKey: 'encrypted_key_here',
          timeout: 30000,
        },
        createdAt: '2026-01-15T10:00:00.000Z',
        updatedAt: '2026-05-01T14:30:00.000Z',
      },
      {
        id: 'int-2',
        name: 'Bank of Kigali Payment Gateway',
        type: 'payment_gateway',
        status: 'active',
        config: {
          merchantId: 'BK-2026-001',
          apiKey: 'encrypted_key_here',
          callbackUrl: 'https://taxcore.rw/payment/callback',
        },
        createdAt: '2026-02-01T08:00:00.000Z',
        updatedAt: '2026-04-15T09:20:00.000Z',
      },
      {
        id: 'int-3',
        name: 'Rwanda Government Portal',
        type: 'government_portal',
        status: 'active',
        config: {
          portalUrl: 'https://portal.gov.rw',
          integrationMode: 'sync',
          syncInterval: 3600,
        },
        createdAt: '2026-01-20T11:00:00.000Z',
        updatedAt: '2026-03-10T16:45:00.000Z',
      },
      {
        id: 'int-4',
        name: 'SMS Notification Service',
        type: 'third_party_api',
        status: 'active',
        config: {
          provider: 'Twilio',
          accountSid: 'encrypted_sid',
          authToken: 'encrypted_token',
          senderId: 'TaxCoreAI',
        },
        createdAt: '2026-02-15T13:00:00.000Z',
        updatedAt: '2026-05-05T10:10:00.000Z',
      },
      {
        id: 'int-5',
        name: 'Email Service Provider',
        type: 'third_party_api',
        status: 'active',
        config: {
          provider: 'SendGrid',
          apiKey: 'encrypted_key',
          fromEmail: 'noreply@taxcore.rw',
          fromName: 'TaxCoreAI',
        },
        createdAt: '2026-02-15T13:30:00.000Z',
        updatedAt: '2026-05-05T10:15:00.000Z',
      },
    ]

    for (const integration of integrations) {
      await pool.query(`
        INSERT INTO integrations (id, name, type, status, config, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [
        integration.id,
        integration.name,
        integration.type,
        integration.status,
        JSON.stringify(integration.config),
        integration.createdAt,
        integration.updatedAt
      ])
    }
    
    console.log('✓ Integrations data seeded successfully')
    console.log('\n✅ Database migration completed!')
    
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

createIntegrationsTable()