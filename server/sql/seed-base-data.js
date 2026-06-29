import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found in .env file')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function seedBaseData() {
  console.log('Seeding base data (taxpayers, documents, users)...\n')

  const client = await pool.connect()

  try {
    // Check if users exist
    const userCount = await client.query('SELECT COUNT(*) FROM users')
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log('Creating users...')
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
    } else {
      console.log(`✓ Users already exist (${userCount.rows[0].count} users)`)
    }

    // Check if taxpayers exist
    const taxpayerCount = await client.query('SELECT COUNT(*) FROM taxpayers')
    if (parseInt(taxpayerCount.rows[0].count) === 0) {
      console.log('\nCreating sample taxpayers...')
      const taxpayers = [
        { id: 'tp-001', name: 'ABC Company Ltd', tin: '103456789', type: 'Business', district: 'Kigali', status: 'Active', alias: 'ABC Ltd', businessName: 'ABC Company Ltd', address: 'KG 123 St, Kigali', contact: 'info@abc.com', email: 'info@abc.com', phone: '+250 788 123 456', taxRegime: 'Corporate Tax', businessActivity: 'Trading and Services', bankName: 'Bank of Kigali', bankAccount: '1234567890', authorizedRepresentative: 'John Doe', representativeId: '1199012345678901', representativeContact: '+250 788 123 457' },
        { id: 'tp-002', name: 'XYZ Enterprises', tin: '104567890', type: 'Business', district: 'Musanze', status: 'Active', businessName: 'XYZ Enterprises', address: 'Musanze Town', contact: 'contact@xyz.rw', email: 'contact@xyz.rw', phone: '+250 788 234 567', taxRegime: 'VAT', businessActivity: 'Manufacturing', bankName: 'Equity Bank', bankAccount: '2345678901' },
        { id: 'tp-003', name: 'DEF Corporation', tin: '105678901', type: 'Business', district: 'Rubavu', status: 'Active', businessName: 'DEF Corporation', address: 'Rubavu District', contact: 'info@def.rw', email: 'info@def.rw', phone: '+250 788 345 678', taxRegime: 'Corporate Tax', businessActivity: 'Import/Export', bankName: 'I&M Bank', bankAccount: '3456789012' },
        { id: 'tp-004', name: 'GHI Ltd', tin: '106789012', type: 'Business', district: 'Huye', status: 'Active', businessName: 'GHI Limited', address: 'Huye Town', contact: 'info@ghi.rw', email: 'info@ghi.rw', phone: '+250 788 456 789', taxRegime: 'Withholding Tax', businessActivity: 'Consulting', bankName: 'KCB Bank', bankAccount: '4567890123' },
        { id: 'tp-005', name: 'JKL Services', tin: '107890123', type: 'Business', district: 'Kigali', status: 'Active', businessName: 'JKL Services Ltd', address: 'Kigali City', contact: 'info@jkl.rw', email: 'info@jkl.rw', phone: '+250 788 567 890', taxRegime: 'PAYE', businessActivity: 'Professional Services', bankName: 'Bank of Kigali', bankAccount: '5678901234' },
        { id: 'tp-006', name: 'MNO Breweries', tin: '108901234', type: 'Business', district: 'Kicukiro', status: 'Active', businessName: 'MNO Breweries Ltd', address: 'Kicukiro Industrial Park', contact: 'info@mno.rw', email: 'info@mno.rw', phone: '+250 788 678 901', taxRegime: 'Excise Duty', businessActivity: 'Beverage Manufacturing', bankName: 'Cogebanque', bankAccount: '6789012345' }
      ]

      for (const tp of taxpayers) {
        await client.query(`
          INSERT INTO taxpayers (id, name, tin, type, district, status, registered, alias, business_name, address, contact, email, phone, tax_regime, business_activity, bank_name, bank_account, authorized_representative, representative_id, representative_contact, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO NOTHING
        `, [tp.id, tp.name, tp.tin, tp.type, tp.district, tp.status, tp.alias, tp.businessName, tp.address, tp.contact, tp.email, tp.phone, tp.taxRegime, tp.businessActivity, tp.bankName, tp.bankAccount, tp.authorizedRepresentative, tp.representativeId, tp.representativeContact])
      }
      console.log(`✓ Created ${taxpayers.length} taxpayers`)
    } else {
      console.log(`✓ Taxpayers already exist (${taxpayerCount.rows[0].count} taxpayers)`)
    }

    // Check if documents exist
    const docCount = await client.query('SELECT COUNT(*) FROM documents')
    if (parseInt(docCount.rows[0].count) === 0) {
      console.log('\nCreating sample documents...')
      const documents = [
        { id: 'doc-001', title: 'Annual Tax Return 2024 - ABC Company', type: 'Return', status: 'Active', taxpayerTin: '103456789', taxpayerName: 'ABC Company Ltd', fileName: 'abc_tax_return_2024.pdf', uploadedBy: 'user-officer' },
        { id: 'doc-002', title: 'VAT Registration Application - XYZ Enterprises', type: 'Application', status: 'Active', taxpayerTin: '104567890', taxpayerName: 'XYZ Enterprises', fileName: 'xyz_vat_reg.pdf', uploadedBy: 'user-officer' },
        { id: 'doc-003', title: 'Tax Audit Report - DEF Corporation', type: 'Report', status: 'Active', taxpayerTin: '105678901', taxpayerName: 'DEF Corporation', fileName: 'def_audit_report.pdf', uploadedBy: 'user-supervisor' },
        { id: 'doc-004', title: 'Withholding Tax Certificate - GHI Ltd', type: 'Certificate', status: 'Active', taxpayerTin: '106789012', taxpayerName: 'GHI Ltd', fileName: 'ghi_wht_cert.pdf', uploadedBy: 'user-officer' },
        { id: 'doc-005', title: 'Monthly PAYE Return - JKL Services', type: 'Return', status: 'Active', taxpayerTin: '107890123', taxpayerName: 'JKL Services', fileName: 'jkl_paye_jan.pdf', uploadedBy: 'user-officer' },
        { id: 'doc-006', title: 'Excise Duty Assessment - MNO Breweries', type: 'Assessment', status: 'Active', taxpayerTin: '108901234', taxpayerName: 'MNO Breweries', fileName: 'mno_excise_q4.pdf', uploadedBy: 'user-supervisor' }
      ]

      for (const doc of documents) {
        await client.query(`
          INSERT INTO documents (id, title, type, status, taxpayer_tin, taxpayer_name, file_name, uploaded_by, uploaded_at, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO NOTHING
        `, [doc.id, doc.title, doc.type, doc.status, doc.taxpayerTin, doc.taxpayerName, doc.fileName, doc.uploadedBy])
      }
      console.log(`✓ Created ${documents.length} documents`)
    } else {
      console.log(`✓ Documents already exist (${docCount.rows[0].count} documents)`)
    }

    console.log('\n✅ Base data seeded successfully!')
    console.log('\nYou can now access all pages:')
    console.log('  - /taxpayers')
    console.log('  - /documents')
    console.log('  - /workflows')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    client.release()
  }
}

seedBaseData()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Failed:', err)
    process.exit(1)
  })
  .finally(() => pool.end())