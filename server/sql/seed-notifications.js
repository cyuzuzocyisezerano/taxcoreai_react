import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function seedNotifications() {
  console.log('Seeding notifications...\n')

  const client = await pool.connect()

  try {
    const notifications = [
      {
        id: 'note-1',
        user_id: 'user-officer',
        title: 'New document uploaded for Inyange Industries Ltd',
        message: 'A new tax return document has been uploaded and requires your review.',
        type: 'document',
        status: 'Unread',
        read: false,
        channels: 'in-app,email',
        metadata: JSON.stringify({ documentId: 'doc-001', taxpayerTin: '100000003' }),
        action_url: '/documents/doc-001',
        created_at: '2026-05-08T11:00:00.000Z'
      },
      {
        id: 'note-2',
        user_id: 'user-officer',
        title: 'Workflow review needed for Volcano Mining Contractors',
        message: 'Workflow WF-102 requires your approval. Due date: 2026-05-10.',
        type: 'workflow',
        status: 'Unread',
        read: false,
        channels: 'in-app,email,sms',
        metadata: JSON.stringify({ workflowId: 'wf-102', dueDate: '2026-05-10' }),
        action_url: '/workflows',
        created_at: '2026-05-07T09:00:00.000Z'
      },
      {
        id: 'note-3',
        user_id: 'user-officer',
        title: 'Flagged record requires verification',
        message: 'Taxpayer record for Sunrise Import Export Ltd has been flagged for compliance review.',
        type: 'compliance',
        status: 'Read',
        read: true,
        channels: 'in-app,email,sms',
        metadata: JSON.stringify({ taxpayerId: 'tp-9', taxpayerTin: '100000009' }),
        action_url: '/taxpayers/tp-9',
        created_at: '2026-05-06T10:00:00.000Z'
      },
      {
        id: 'note-4',
        user_id: 'user-officer',
        title: 'Filing deadline reminder',
        message: 'VAT Declaration Q2 for Rwanda Fresh Produce Ltd is due in 3 days.',
        type: 'deadline',
        status: 'Unread',
        read: false,
        channels: 'in-app,email',
        metadata: JSON.stringify({ taxpayerId: 'tp-2', taxpayerTin: '100000002', documentType: 'VAT Declaration' }),
        action_url: '/documents',
        created_at: '2026-05-08T08:00:00.000Z'
      },
      {
        id: 'note-5',
        user_id: 'user-admin',
        title: 'System broadcast: Maintenance scheduled',
        message: 'System maintenance is scheduled for May 10, 2026 from 2:00 AM to 4:00 AM UTC.',
        type: 'broadcast',
        status: 'Unread',
        read: false,
        channels: 'in-app',
        metadata: JSON.stringify({ broadcastId: 'broadcast-001', scheduledBy: 'user-admin' }),
        action_url: null,
        created_at: '2026-05-08T06:00:00.000Z'
      }
    ]

    for (const note of notifications) {
      await client.query(`
        INSERT INTO notifications (id, user_id, title, message, type, status, read, channels, metadata, action_url, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [note.id, note.user_id, note.title, note.message, note.type, note.status, note.read, note.channels, note.metadata, note.action_url, note.created_at])
    }

    console.log(`✓ Created ${notifications.length} notifications`)
    console.log('\n✅ Notifications seeded successfully!')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  } finally {
    client.release()
  }
}

seedNotifications()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Failed:', err)
    process.exit(1)
  })
  .finally(() => pool.end())