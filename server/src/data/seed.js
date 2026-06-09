import bcrypt from 'bcryptjs'

const TAXPAYERS = [
  {
    name: 'Kigali Trading Company Ltd',
    tin: '100000001',
    type: 'Business',
    district: 'Nyarugenge',
    status: 'Active',
    registered: 'May 08, 2026',
    alias: 'KTC Group',
  },
  {
    name: 'Rwanda Fresh Produce Ltd',
    tin: '100000002',
    type: 'Business',
    district: 'Gasabo',
    status: 'Active',
    registered: 'May 08, 2026',
    alias: 'RwandaFresh',
  },
  {
    name: 'Inyange Industries Ltd',
    tin: '100000003',
    type: 'Business',
    district: 'Kicukiro',
    status: 'Active',
    registered: 'May 08, 2026',
    alias: 'Inyange',
  },
  {
    name: 'Amahoro Construction Ltd',
    tin: '100000004',
    type: 'Business',
    district: 'Gasabo',
    status: 'Active',
    registered: 'May 08, 2026',
    alias: 'Amahoro Build',
  },
  {
    name: 'Inzora Technology Solutions',
    tin: '100000005',
    type: 'Business',
    district: 'Gasabo',
    status: 'Active',
    registered: 'May 08, 2026',
    alias: 'InzoraTech',
  },
  {
    name: 'Ubumwe Investments Ltd',
    tin: '100000006',
    type: 'Business',
    district: 'Gasabo',
    status: 'Active',
    registered: 'May 08, 2026',
    alias: 'Ubumwe',
  },
  {
    name: 'Gahanga Agro Processing',
    tin: '100000007',
    type: 'Business',
    district: 'Kicukiro',
    status: 'Active',
    registered: 'May 08, 2026',
    alias: 'GahangaAgro',
  },
  {
    name: 'Kimironko Supermarket Ltd',
    tin: '100000008',
    type: 'Business',
    district: 'Gasabo',
    status: 'Active',
    registered: 'May 08, 2026',
    alias: 'KimiShop',
  },
  {
    name: 'Sunrise Import Export Ltd',
    tin: '100000009',
    type: 'Business',
    district: 'Nyarugenge',
    status: 'Pending',
    registered: 'May 07, 2026',
    alias: 'SunriseIE',
  },
  {
    name: 'Volcano Mining Contractors',
    tin: '100000010',
    type: 'Business',
    district: 'Musanze',
    status: 'Flagged',
    registered: 'May 06, 2026',
    alias: 'VolcanoMC',
  },
  {
    name: 'Michel Ndayishimiye',
    tin: '200000011',
    type: 'Individual',
    district: 'Gasabo',
    status: 'Active',
    registered: 'May 05, 2026',
    alias: 'M. Ndayishimiye',
  },
  {
    name: 'Alice Mukamana',
    tin: '200000012',
    type: 'Individual',
    district: 'Kicukiro',
    status: 'Active',
    registered: 'May 04, 2026',
    alias: 'A. Mukamana',
  },
]

const DOCUMENTS = [
  {
    id: 'doc-001',
    taxpayerTin: '100000001',
    title: 'Annual Return FY2025',
    type: 'Tax Return',
    status: 'Verified',
    uploadedAt: '2026-05-08T10:00:00.000Z',
  },
  {
    id: 'doc-002',
    taxpayerTin: '100000002',
    title: 'VAT Declaration Q1',
    type: 'VAT',
    status: 'Pending Review',
    uploadedAt: '2026-05-07T14:30:00.000Z',
  },
  {
    id: 'doc-003',
    taxpayerTin: '100000010',
    title: 'Audit Notice Response',
    type: 'Compliance',
    status: 'Flagged',
    uploadedAt: '2026-05-06T09:15:00.000Z',
  },
]

const PENDING_TASKS = [
  { id: 'task-1', label: 'Sunrise Import Export Ltd', priority: 'Review' },
  { id: 'task-2', label: 'Volcano Mining Contractors', priority: 'Urgent' },
  { id: 'task-3', label: 'Umucyo Pharmacy Chain Ltd', priority: 'Approval' },
  { id: 'task-4', label: 'Michel Ndayishimiye', priority: 'Verification' },
  { id: 'task-5', label: 'Alice Mukamana', priority: 'Approval' },
]

export async function createSeedData() {
  const passwordHash = await bcrypt.hash('Admin@123', 10)

  return {
    users: [
      {
        id: 'user-admin',
        username: 'admin',
        passwordHash,
        name: 'System Administrator',
        role: 'Admin',
        title: 'System Administrator',
      },
      {
        id: 'user-officer',
        username: 'officer',
        passwordHash: await bcrypt.hash('Officer@123', 10),
        name: 'Jeanine Uwase',
        role: 'Officer',
        title: 'Taxpayer Officer',
      },
    ],
    taxpayers: TAXPAYERS.map((t, i) => ({ id: `tp-${i + 1}`, ...t })),
    documents: DOCUMENTS,
    pendingTasks: PENDING_TASKS,
    notifications: [
      {
        id: 'note-1',
        title: 'New document uploaded for Inyange Industries Ltd',
        type: 'Document',
        status: 'Unread',
        createdAt: '2026-05-08T11:00:00.000Z',
      },
      {
        id: 'note-2',
        title: 'Workflow review needed for Volcano Mining Contractors',
        type: 'Workflow',
        status: 'Unread',
        createdAt: '2026-05-07T09:00:00.000Z',
      },
      {
        id: 'note-3',
        title: 'Flagged record requires verification',
        type: 'Alert',
        status: 'Read',
        createdAt: '2026-05-06T10:00:00.000Z',
      },
    ],
    workflows: [
      {
        id: 'wf-1',
        title: 'Review VAT Declaration Q1',
        stage: 'In review',
        owner: 'Jeanine Uwase',
        dueDate: '2026-05-12',
      },
      {
        id: 'wf-2',
        title: 'Approve Annual Return FY2025',
        stage: 'Pending approval',
        owner: 'Jeanine Uwase',
        dueDate: '2026-05-14',
      },
    ],
    reports: [
      {
        id: 'rep-1',
        name: 'Monthly Compliance Summary',
        type: 'Compliance',
        generatedAt: '2026-05-01T08:00:00.000Z',
        status: 'Completed',
      },
      {
        id: 'rep-2',
        name: 'High-Risk Taxpayers',
        type: 'Risk',
        generatedAt: '2026-05-03T13:30:00.000Z',
        status: 'Completed',
      },
    ],
    settings: {
      featureFlags: {
        allowRegistration: true,
        enableNotifications: true,
      },
      defaultTaxYear: 2026,
      reportingWindowDays: 30,
    },
    aiPrompts: [
      {
        id: 'prompt-1',
        prompt: 'Summarize the compliance status of Inyange Industries Ltd',
        description: 'Quick compliance summary for a taxpayer',
      },
      {
        id: 'prompt-2',
        prompt: 'List documents flagged for review',
        description: 'Retrieve flagged documents across the system',
      },
    ],
    auditLogs: [
      {
        id: 'log-1',
        action: 'LOGIN',
        userId: 'user-admin',
        username: 'admin',
        details: 'Successful login',
        createdAt: new Date().toISOString(),
      },
    ],
  }
}
