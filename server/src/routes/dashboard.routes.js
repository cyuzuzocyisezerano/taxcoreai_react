import { Router } from 'express'
import { loadDb } from '../data/store.js'
import { pool } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { logAudit } from '../services/audit.service.js'

const router = Router()

const usePg = Boolean(process.env.DATABASE_URL)

router.use(authenticate)

router.get('/stats', async (_req, res, next) => {
  try {
    if (usePg) {
      const [taxpayersResult, documentsResult, workflowsResult] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM taxpayers'),
        pool.query('SELECT COUNT(*) as count FROM documents'),
        pool.query("SELECT COUNT(*) as count FROM workflows WHERE status NOT IN ('completed', 'approved', 'rejected')")
      ])

      return res.json({
        totalTaxpayers: parseInt(taxpayersResult.rows[0].count),
        activeTaxpayers: parseInt(taxpayersResult.rows[0].count),
        totalDocuments: parseInt(documentsResult.rows[0].count),
        pendingWorkflows: parseInt(workflowsResult.rows[0].count),
        flaggedRecords: 0
      })
    }

    const db = await loadDb()
    const taxpayers = db.taxpayers

    const stats = {
      totalTaxpayers: taxpayers.length,
      activeTaxpayers: taxpayers.filter((t) => t.status === 'Active').length,
      totalDocuments: db.documents.length,
      pendingWorkflows: db.pendingTasks.length,
      flaggedRecords: taxpayers.filter((t) => t.status === 'Flagged').length,
    }

    res.json(stats)
  } catch (err) {
    next(err)
  }
})

router.get('/recent-taxpayers', async (_req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query('SELECT * FROM taxpayers ORDER BY registered DESC LIMIT 5')
      return res.json({ taxpayers: result.rows })
    }
    const db = await loadDb()
    const recent = [...(db.taxpayers || [])].slice(0, 5)
    res.json({ taxpayers: recent })
  } catch (err) {
    console.error('Error in /recent-taxpayers:', err)
    res.status(500).json({ error: 'Failed to load recent taxpayers' })
  }
})

router.get('/pending-tasks', async (_req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query(`
        SELECT * FROM workflows 
        WHERE status NOT IN ('completed', 'approved', 'rejected')
        ORDER BY created_at DESC LIMIT 10
      `)
      return res.json({ tasks: result.rows })
    }
    const db = await loadDb()
    const tasks = (db.pendingTasks || []).slice(0, 10)
    res.json({ tasks })
  } catch (err) {
    console.error('Error in /pending-tasks:', err)
    res.status(500).json({ error: 'Failed to load pending tasks' })
  }
})

// District counts (top N)
router.get('/districts', async (_req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query(`
        SELECT district, COUNT(*) as count 
        FROM taxpayers 
        GROUP BY district 
        ORDER BY count DESC 
        LIMIT 10
      `)
      return res.json({ districts: result.rows })
    }

    const db = await loadDb()
    const counts = db.taxpayers.reduce((acc, t) => {
      const d = t.district || 'Unknown'
      acc[d] = (acc[d] || 0) + 1
      return acc
    }, {})

    const rows = Object.keys(counts).map((k) => ({ district: k, count: counts[k] }))
    rows.sort((a, b) => b.count - a.count)
    res.json({ districts: rows.slice(0, 10) })
  } catch (err) {
    next(err)
  }
})

// Document type distribution
router.get('/document-distribution', async (_req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query(`
        SELECT type, COUNT(*) as count 
        FROM documents 
        GROUP BY type 
        ORDER BY count DESC
      `)
      return res.json({ distribution: result.rows })
    }

    const db = await loadDb()
    const counts = db.documents.reduce((acc, d) => {
      const t = d.type || 'Unknown'
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {})
    const rows = Object.keys(counts).map((k) => ({ type: k, count: counts[k] }))
    rows.sort((a, b) => b.count - a.count)
    res.json({ distribution: rows })
  } catch (err) {
    next(err)
  }
})

// Registration trend (last 12 months) - counts per month
router.get('/registration-trend', async (_req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query(`
        SELECT 
          TO_CHAR(registered, 'Mon YYYY') as label,
          COUNT(*) as count
        FROM taxpayers
        WHERE registered IS NOT NULL
          AND registered >= (CURRENT_DATE - INTERVAL '12 months')
        GROUP BY label, TO_CHAR(registered, 'YYYY-MM')
        ORDER BY TO_CHAR(registered, 'YYYY-MM')
      `)
      
      // If no data, return empty trend
      if (result.rows.length === 0) {
        const now = new Date()
        const months = []
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          months.push({ 
            key: `${d.getFullYear()}-${d.getMonth() + 1}`, 
            label: d.toLocaleString('default', { month: 'short', year: 'numeric' }), 
            count: 0 
          })
        }
        return res.json({ trend: months })
      }
      
      return res.json({ trend: result.rows })
    }

    const db = await loadDb()
    const now = new Date()
    const months = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ key: `${d.getFullYear()}-${d.getMonth() + 1}`, label: d.toLocaleString('default', { month: 'short', year: 'numeric' }), count: 0 })
    }

    db.taxpayers.forEach((t) => {
      if (!t.registered) return
      const parsed = new Date(t.registered)
      if (isNaN(parsed.getTime())) return
      const key = `${parsed.getFullYear()}-${parsed.getMonth() + 1}`
      const m = months.find((x) => x.key === key)
      if (m) m.count++
    })

    res.json({ trend: months })
  } catch (err) {
    next(err)
  }
})

// CSV exports
router.get('/districts.csv', async (_req, res, next) => {
  try {
    const db = await loadDb()
    const counts = db.taxpayers.reduce((acc, t) => {
      const d = t.district || 'Unknown'
      acc[d] = (acc[d] || 0) + 1
      return acc
    }, {})
    const rows = Object.keys(counts).map((k) => `${JSON.stringify(k)},${counts[k]}`)
    const csv = ['district,count', ...rows].join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="districts.csv"')
    res.send(csv)
  } catch (err) {
    next(err)
  }
})

router.get('/document-distribution.csv', async (_req, res, next) => {
  try {
    const db = await loadDb()
    const counts = db.documents.reduce((acc, d) => {
      const t = d.type || 'Unknown'
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {})
    const rows = Object.keys(counts).map((k) => `${JSON.stringify(k)},${counts[k]}`)
    const csv = ['type,count', ...rows].join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="document-distribution.csv"')
    res.send(csv)
  } catch (err) {
    next(err)
  }
})

router.get('/registration-trend.csv', async (_req, res, next) => {
  try {
    const db = await loadDb()
    const now = new Date()
    const months = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ key: `${d.getFullYear()}-${d.getMonth() + 1}`, label: d.toLocaleString('default', { month: 'short', year: 'numeric' }), count: 0 })
    }

    db.taxpayers.forEach((t) => {
      if (!t.registered) return
      const parsed = new Date(t.registered)
      if (isNaN(parsed.getTime())) return
      const key = `${parsed.getFullYear()}-${parsed.getMonth() + 1}`
      const m = months.find((x) => x.key === key)
      if (m) m.count++
    })

    const rows = months.map((m) => `${JSON.stringify(m.label)},${m.count}`)
    const csv = ['month,count', ...rows].join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="registration-trend.csv"')
    res.send(csv)
  } catch (err) {
    next(err)
  }
})

// Get recent activity feed
router.get('/recent-activity', async (_req, res, next) => {
  try {
    if (usePg) {
      const limit = Math.min(Number(_req.query.limit) || 10, 50)
      
      const [taxpayersResult, documentsResult, workflowsResult, auditResult] = await Promise.all([
        pool.query('SELECT id, name, tin, registered FROM taxpayers ORDER BY registered DESC LIMIT 5'),
        pool.query('SELECT id, title, uploaded_at FROM documents ORDER BY uploaded_at DESC LIMIT 5'),
        pool.query('SELECT id, title, status, updated_at FROM workflows ORDER BY updated_at DESC LIMIT 5'),
        pool.query('SELECT id, action, details, username, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10')
      ])

      const recentTaxpayers = taxpayersResult.rows.map(t => ({
        type: 'taxpayer',
        action: 'New registration',
        details: `${t.name} (${t.tin})`,
        timestamp: t.registered,
        id: t.id
      }))

      const recentDocuments = documentsResult.rows.map(d => ({
        type: 'document',
        action: 'Document uploaded',
        details: d.title,
        timestamp: d.uploaded_at,
        id: d.id
      }))

      const recentWorkflows = workflowsResult.rows.map(w => ({
        type: 'workflow',
        action: `Workflow ${w.status}`,
        details: w.title,
        timestamp: w.updated_at,
        id: w.id
      }))

      const recentAudit = auditResult.rows.map(log => ({
        type: 'audit',
        action: log.action,
        details: log.details,
        timestamp: log.created_at,
        user: log.username
      }))

      const allActivity = [...recentTaxpayers, ...recentDocuments, ...recentWorkflows, ...recentAudit]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit)

      return res.json({ activity: allActivity })
    }

    const db = await loadDb()
    const limit = Math.min(Number(_req.query.limit) || 10, 50)
    
    const recentTaxpayers = (db.taxpayers ?? [])
      .slice(0, 5)
      .map(t => ({
        type: 'taxpayer',
        action: 'New registration',
        details: `${t.name} (${t.tin})`,
        timestamp: t.registered,
        id: t.id
      }))

    const recentDocuments = (db.documents ?? [])
      .slice(0, 5)
      .map(d => ({
        type: 'document',
        action: 'Document uploaded',
        details: d.title,
        timestamp: d.uploadedAt,
        id: d.id
      }))

    const recentWorkflows = (db.workflows ?? [])
      .slice(0, 5)
      .map(w => ({
        type: 'workflow',
        action: `Workflow ${w.status}`,
        details: w.title,
        timestamp: w.updatedAt,
        id: w.id
      }))

    const recentAudit = (db.auditLogs ?? [])
      .slice(0, 10)
      .map(log => ({
        type: 'audit',
        action: log.action,
        details: log.details,
        timestamp: log.createdAt,
        user: log.username
      }))

    const allActivity = [
      ...recentTaxpayers,
      ...recentDocuments,
      ...recentWorkflows,
      ...recentAudit
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    res.json({ activity: allActivity })
  } catch (err) {
    console.error('Error in /recent-activity:', err)
    res.status(500).json({ error: 'Failed to load recent activity' })
  }
})

// Get processing metrics
router.get('/metrics', async (_req, res, next) => {
  try {
    if (usePg) {
      const [taxCount, docCount, wfCount] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM taxpayers'),
        pool.query('SELECT COUNT(*) as count FROM documents'),
        pool.query("SELECT COUNT(*) as count FROM workflows WHERE status = 'approved'")
      ])

      const totalTaxpayers = parseInt(taxCount.rows[0].count)
      const totalDocuments = parseInt(docCount.rows[0].count)
      const approvedWorkflows = parseInt(wfCount.rows[0].count)

      // Generate last 7 days
      const dailyMetrics = []
      const now = new Date()
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
        dailyMetrics.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          newTaxpayers: 0,
          newDocuments: 0,
          completedWorkflows: 0
        })
      }

      return res.json({
        dailyMetrics,
        compliance: {
          analysisRate: totalDocuments > 0 ? '100.00' : '0.00',
          approvalRate: totalTaxpayers > 0 ? ((approvedWorkflows / Math.max(totalTaxpayers, 1)) * 100).toFixed(2) : '0.00'
        }
      })
    }

    const db = await loadDb()
    const taxpayers = db.taxpayers ?? []
    const documents = db.documents ?? []
    const workflows = db.workflows ?? []

    // Daily processing for last 7 days
    const dailyMetrics = []
    const now = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const newTaxpayers = taxpayers.filter(t => 
        t.registered && t.registered.startsWith(dateStr)
      ).length

      const newDocuments = documents.filter(d =>
        d.uploadedAt && d.uploadedAt.startsWith(dateStr)
      ).length

      const completedWorkflows = workflows.filter(w =>
        w.updatedAt && w.updatedAt.startsWith(dateStr) && w.status === 'approved'
      ).length

      dailyMetrics.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        newTaxpayers,
        newDocuments,
        completedWorkflows
      })
    }

    // Compliance rate
    const totalDocuments = documents.length
    const analyzedDocs = documents.filter(d => d.analysis).length
    const analysisRate = totalDocuments > 0 ? (analyzedDocs / totalDocuments * 100) : 0

    const totalWorkflows = workflows.length
    const approvedWorkflows = workflows.filter(w => w.status === 'approved').length
    const approvalRate = totalWorkflows > 0 ? (approvedWorkflows / totalWorkflows * 100) : 0

    res.json({
      dailyMetrics,
      compliance: {
        analysisRate: analysisRate.toFixed(2),
        approvalRate: approvalRate.toFixed(2)
      }
    })
  } catch (err) {
    console.error('Error in /metrics:', err)
    res.status(500).json({ error: 'Failed to load metrics' })
  }
})

// System health metrics
router.get('/system-health', async (_req, res, next) => {
  try {
    const db = await loadDb()
    const now = new Date()
    
    // Calculate system metrics
    const totalRecords = (db.taxpayers?.length || 0) + (db.documents?.length || 0) + (db.workflows?.length || 0)
    const errorRate = db.auditLogs?.filter(log => log.action?.includes('ERROR') || log.action?.includes('FAILED')).length || 0
    const totalOperations = db.auditLogs?.length || 0
    
    const systemHealth = {
      status: errorRate < 5 ? 'healthy' : errorRate < 10 ? 'warning' : 'critical',
      uptime: process.uptime(),
      totalRecords,
      errorRate: totalOperations > 0 ? ((errorRate / totalOperations) * 100).toFixed(2) : 0,
      totalOperations,
      lastUpdated: now.toISOString()
    }

    res.json({ health: systemHealth })
  } catch (err) {
    next(err)
  }
})

// Storage utilization
router.get('/storage', async (_req, res, next) => {
  try {
    const db = await loadDb()
    
    const storageMetrics = {
      documents: {
        count: db.documents?.length || 0,
        totalSize: db.documents?.reduce((sum, d) => sum + (d.fileSize || 0), 0) || 0,
        unit: 'bytes'
      },
      database: {
        notifications: db.notifications?.length || 0,
        workflows: db.workflows?.length || 0,
        auditLogs: db.auditLogs?.length || 0,
        users: db.users?.length || 0
      },
      totalSize: 0 // Would calculate actual DB size in production
    }

    storageMetrics.totalSize = storageMetrics.documents.totalSize

    res.json({ storage: storageMetrics })
  } catch (err) {
    next(err)
  }
})

// User activity and online status
router.get('/user-activity', async (_req, res, next) => {
  try {
    const db = await loadDb()
    const currentUserId = _req.user?.id
    
    // Get recent user activity from audit logs
    const recentActivity = (db.auditLogs ?? [])
      .slice(0, 20)
      .map(log => ({
        userId: log.userId,
        username: log.username,
        action: log.action,
        details: log.details,
        timestamp: log.createdAt,
        ipAddress: log.ip_address
      }))

    // Get active users (users with recent activity in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const activeUserIds = new Set(
      (db.auditLogs ?? [])
        .filter(log => log.createdAt >= oneHourAgo)
        .map(log => log.userId)
    )

    const activeUsers = (db.users ?? [])
      .filter(user => activeUserIds.has(user.id))
      .map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        lastActive: oneHourAgo // Would track actual last active time in production
      }))

    res.json({
      activity: recentActivity,
      activeUsers,
      totalUsers: db.users?.length || 0,
      onlineCount: activeUsers.length
    })
  } catch (err) {
    next(err)
  }
})

// Processing volume metrics (daily, weekly, monthly)
router.get('/processing-volume', async (_req, res, next) => {
  try {
    const db = await loadDb()
    const now = new Date()
    
    // Daily metrics (last 24 hours)
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const dailyMetrics = {
      newTaxpayers: (db.taxpayers ?? []).filter(t => t.registered && t.registered >= dayAgo).length,
      newDocuments: (db.documents ?? []).filter(d => d.uploadedAt && d.uploadedAt >= dayAgo).length,
      completedWorkflows: (db.workflows ?? []).filter(w => w.updatedAt && w.updatedAt >= dayAgo && w.status === 'approved').length
    }

    // Weekly metrics (last 7 days)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const weeklyMetrics = {
      newTaxpayers: (db.taxpayers ?? []).filter(t => t.registered && t.registered >= weekAgo).length,
      newDocuments: (db.documents ?? []).filter(d => d.uploadedAt && d.uploadedAt >= weekAgo).length,
      completedWorkflows: (db.workflows ?? []).filter(w => w.updatedAt && w.updatedAt >= weekAgo && w.status === 'approved').length
    }

    // Monthly metrics (last 30 days)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const monthlyMetrics = {
      newTaxpayers: (db.taxpayers ?? []).filter(t => t.registered && t.registered >= monthAgo).length,
      newDocuments: (db.documents ?? []).filter(d => d.uploadedAt && d.uploadedAt >= monthAgo).length,
      completedWorkflows: (db.workflows ?? []).filter(w => w.updatedAt && w.updatedAt >= monthAgo && w.status === 'approved').length
    }

    res.json({
      daily: dailyMetrics,
      weekly: weeklyMetrics,
      monthly: monthlyMetrics,
      generatedAt: now.toISOString()
    })
  } catch (err) {
    next(err)
  }
})

// Compliance rate monitoring
router.get('/compliance', async (_req, res, next) => {
  try {
    const db = await loadDb()
    const documents = db.documents ?? []
    const workflows = db.workflows ?? []
    const taxpayers = db.taxpayers ?? []

    // Document compliance
    const totalDocuments = documents.length
    const analyzedDocuments = documents.filter(d => d.analysisStatus === 'completed').length
    const documentComplianceRate = totalDocuments > 0 ? (analyzedDocuments / totalDocuments * 100) : 0

    // Workflow compliance
    const totalWorkflows = workflows.length
    const completedWorkflows = workflows.filter(w => w.status === 'approved' || w.status === 'completed').length
    const workflowComplianceRate = totalWorkflows > 0 ? (completedWorkflows / totalWorkflows * 100) : 0

    // Taxpayer compliance
    const totalTaxpayers = taxpayers.length
    const compliantTaxpayers = taxpayers.filter(t => t.status === 'Active').length
    const taxpayerComplianceRate = totalTaxpayers > 0 ? (compliantTaxpayers / totalTaxpayers * 100) : 0

    // Overall compliance score
    const overallCompliance = (documentComplianceRate + workflowComplianceRate + taxpayerComplianceRate) / 3

    res.json({
      documentCompliance: documentComplianceRate.toFixed(2),
      workflowCompliance: workflowComplianceRate.toFixed(2),
      taxpayerCompliance: taxpayerComplianceRate.toFixed(2),
      overallCompliance: overallCompliance.toFixed(2),
      metrics: {
        totalDocuments,
        analyzedDocuments,
        totalWorkflows,
        completedWorkflows,
        totalTaxpayers,
        compliantTaxpayers
      }
    })
  } catch (err) {
    next(err)
  }
})

// Real-time dashboard data
router.get('/realtime', async (_req, res, next) => {
  try {
    const db = await loadDb()
    const now = new Date()
    
    // Get data from last 5 minutes for real-time view
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
    
    const recentActivity = (db.auditLogs ?? [])
      .filter(log => log.createdAt >= fiveMinutesAgo)
      .slice(0, 10)
      .map(log => ({
        action: log.action,
        details: log.details,
        user: log.username,
        timestamp: log.createdAt
      }))

    const recentNotifications = (db.notifications ?? [])
      .filter(n => n.createdAt >= fiveMinutesAgo)
      .slice(0, 5)
      .map(n => ({
        id: n.id,
        title: n.title,
        type: n.type,
        priority: n.priority,
        timestamp: n.createdAt
      }))

    res.json({
      timestamp: now.toISOString(),
      recentActivity,
      recentNotifications,
      systemStatus: 'operational'
    })
  } catch (err) {
    next(err)
  }
})

// Export monitoring data
router.get('/export', async (_req, res, next) => {
  try {
    const db = await loadDb()
    const format = _req.query.format || 'json'
    
    const monitoringData = {
      exportedAt: new Date().toISOString(),
      stats: {
        totalTaxpayers: db.taxpayers?.length || 0,
        totalDocuments: db.documents?.length || 0,
        totalWorkflows: db.workflows?.length || 0,
        totalNotifications: db.notifications?.length || 0,
        totalUsers: db.users?.length || 0
      },
      compliance: {
        documentAnalysis: db.documents?.filter(d => d.analysisStatus === 'completed').length || 0,
        approvedWorkflows: db.workflows?.filter(w => w.status === 'approved').length || 0,
        activeTaxpayers: db.taxpayers?.filter(t => t.status === 'Active').length || 0
      },
      activity: {
        totalAuditLogs: db.auditLogs?.length || 0,
        recentNotifications: db.notifications?.slice(0, 10) || []
      }
    }

    if (format === 'csv') {
      const csv = `Metric,Value\nTotal Taxpayers,${monitoringData.stats.totalTaxpayers}\nTotal Documents,${monitoringData.stats.totalDocuments}\nTotal Workflows,${monitoringData.stats.totalWorkflows}\nTotal Users,${monitoringData.stats.totalUsers}\n`
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="monitoring-data.csv"')
      res.send(csv)
    } else {
      res.json(monitoringData)
    }
  } catch (err) {
    next(err)
  }
})

export default router
