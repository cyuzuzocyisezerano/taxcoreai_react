import { Router } from 'express'
import { loadDb } from '../data/store.js'
import { pool } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/authorize.js'

const router = Router()

const usePg = Boolean(process.env.DATABASE_URL)

// Get all reports
router.get('/', authenticate, authorize({ permission: 'canViewReports' }), async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.query

    if (usePg) {
      let where = []
      let params = []

      if (type && type !== 'all') {
        params.push(String(type))
        where.push(`type = $${params.length}`)
      }

      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
      const result = await pool.query(`SELECT * FROM reports ${whereClause} ORDER BY created_at DESC LIMIT 100`)
      return res.json({ reports: result.rows, total: result.rows.length })
    }

    const db = await loadDb()
    let reports = db.reports ?? []

    if (type && type !== 'all') {
      reports = reports.filter(r => r.type === type)
    }

    res.json({ reports, total: reports.length })
  } catch (err) {
    next(err)
  }
})

// Generate analytics report
router.get('/analytics', authenticate, authorize({ permission: 'canGenerateReports' }), async (req, res, next) => {
  try {
    if (usePg) {
      const taxpayersResult = await pool.query('SELECT COUNT(*) as count FROM taxpayers')
      const documentsResult = await pool.query('SELECT COUNT(*) as count FROM documents')
      const workflowsResult = await pool.query('SELECT COUNT(*) as count FROM workflows')
      
      const totalTaxpayers = parseInt(taxpayersResult.rows[0].count)
      const totalDocuments = parseInt(documentsResult.rows[0].count)
      const totalWorkflows = parseInt(workflowsResult.rows[0].count)

      const districtResult = await pool.query(`
        SELECT district, COUNT(*) as count 
        FROM taxpayers 
        GROUP BY district 
        ORDER BY count DESC
      `)

      const typeResult = await pool.query(`
        SELECT type, COUNT(*) as count 
        FROM taxpayers 
        GROUP BY type
      `)

      const docTypeResult = await pool.query(`
        SELECT type, COUNT(*) as count 
        FROM documents 
        GROUP BY type
      `)

      const workflowStatusResult = await pool.query(`
        SELECT status, COUNT(*) as count 
        FROM workflows 
        GROUP BY status
      `)

      return res.json({
        summary: {
          totalTaxpayers,
          totalDocuments,
          totalWorkflows
        },
        districtDistribution: districtResult.rows,
        taxpayerTypes: typeResult.rows,
        documentTypes: docTypeResult.rows,
        workflowStats: workflowStatusResult.rows
      })
    }

    const db = await loadDb()
    const taxpayers = db.taxpayers ?? []
    const documents = db.documents ?? []
    const workflows = db.workflows ?? []

    const totalTaxpayers = taxpayers.length
    const totalDocuments = documents.length
    const totalWorkflows = workflows.length

    const districtDistribution = taxpayers.reduce((acc, t) => {
      const district = t.district || 'Unknown'
      acc[district] = (acc[district] || 0) + 1
      return acc
    }, {})

    const taxpayerTypes = taxpayers.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1
      return acc
    }, {})

    const documentTypes = documents.reduce((acc, d) => {
      const type = d.type || 'Unclassified'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    const workflowStats = workflows.reduce((acc, w) => {
      acc[w.status] = (acc[w.status] || 0) + 1
      return acc
    }, {})

    res.json({
      summary: {
        totalTaxpayers,
        totalDocuments,
        totalWorkflows
      },
      districtDistribution: Object.entries(districtDistribution).map(([district, count]) => ({ district, count })),
      taxpayerTypes: Object.entries(taxpayerTypes).map(([type, count]) => ({ type, count })),
      documentTypes: Object.entries(documentTypes).map(([type, count]) => ({ type, count })),
      workflowStats: Object.entries(workflowStats).map(([status, count]) => ({ status, count }))
    })
  } catch (err) {
    next(err)
  }
})

// Generate taxpayer registration report
router.get('/taxpayers', authenticate, authorize({ permission: 'canGenerateReports' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active,
          COUNT(CASE WHEN type = 'Business' THEN 1 END) as business,
          COUNT(CASE WHEN type = 'Individual' THEN 1 END) as individual,
          COUNT(CASE WHEN type = 'Organization' THEN 1 END) as organization
        FROM taxpayers
      `)
      
      const districtResult = await pool.query(`
        SELECT district, COUNT(*) as count 
        FROM taxpayers 
        GROUP BY district 
        ORDER BY count DESC
      `)

      const recentResult = await pool.query(`
        SELECT * FROM taxpayers 
        ORDER BY registered DESC 
        LIMIT 20
      `)

      return res.json({
        report: {
          ...result.rows[0],
          byDistrict: districtResult.rows,
          recentRegistrations: recentResult.rows
        }
      })
    }

    const db = await loadDb()
    const taxpayers = db.taxpayers ?? []

    const report = {
      total: taxpayers.length,
      active: taxpayers.filter(t => t.status === 'Active').length,
      business: taxpayers.filter(t => t.type === 'Business').length,
      individual: taxpayers.filter(t => t.type === 'Individual').length,
      organization: taxpayers.filter(t => t.type === 'Organization').length,
      byDistrict: taxpayers.reduce((acc, t) => {
        const district = t.district || 'Unknown'
        acc[district] = (acc[district] || 0) + 1
        return acc
      }, {}),
      recentRegistrations: taxpayers.slice(0, 20)
    }

    res.json({ report })
  } catch (err) {
    next(err)
  }
})

// Generate document analysis report
router.get('/documents', authenticate, authorize({ permission: 'canGenerateReports' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN analysis_status = 'completed' THEN 1 END) as analyzed,
          COUNT(CASE WHEN analysis_status = 'pending' OR analysis_status IS NULL THEN 1 END) as pendingAnalysis
        FROM documents
      `)

      const typeResult = await pool.query(`
        SELECT type, COUNT(*) as count 
        FROM documents 
        GROUP BY type
      `)

      const recentResult = await pool.query(`
        SELECT * FROM documents 
        ORDER BY uploaded_at DESC 
        LIMIT 20
      `)

      return res.json({
        report: {
          ...result.rows[0],
          byType: typeResult.rows,
          recentDocuments: recentResult.rows
        }
      })
    }

    const db = await loadDb()
    const documents = db.documents ?? []

    const analyzed = documents.filter(d => d.analysisStatus === 'completed')
    const report = {
      total: documents.length,
      analyzed: analyzed.length,
      pendingAnalysis: documents.filter(d => d.analysisStatus === 'pending' || !d.analysisStatus).length,
      byType: documents.reduce((acc, d) => {
        const type = d.type || 'Unclassified'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {}),
      recentDocuments: documents.slice(0, 20)
    }

    res.json({ report })
  } catch (err) {
    next(err)
  }
})

// Generate compliance report
router.get('/compliance', authenticate, authorize({ permission: 'canGenerateReports' }), async (req, res, next) => {
  try {
    if (usePg) {
      const workflowResult = await pool.query(`
        SELECT 
          COUNT(*) as totalWorkflows,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approvedWorkflows,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejectedWorkflows,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingWorkflows
        FROM workflows
      `)

      const docResult = await pool.query(`
        SELECT 
          COUNT(*) as totalDocuments,
          COUNT(CASE WHEN analysis_status = 'completed' THEN 1 END) as documentsWithAnalysis,
          COUNT(CASE WHEN analysis_status != 'completed' OR analysis_status IS NULL THEN 1 END) as documentsWithoutAnalysis
        FROM documents
      `)

      const stats = workflowResult.rows[0]
      const docs = docResult.rows[0]

      return res.json({
        report: {
          totalWorkflows: parseInt(stats.totalWorkflows),
          approvedWorkflows: parseInt(stats.approvedWorkflows),
          rejectedWorkflows: parseInt(stats.rejectedWorkflows),
          pendingWorkflows: parseInt(stats.pendingWorkflows),
          approvalRate: stats.totalWorkflows > 0 
            ? (stats.approvedWorkflows / stats.totalWorkflows * 100).toFixed(2) 
            : 0,
          documentsWithAnalysis: parseInt(docs.documentsWithAnalysis),
          documentsWithoutAnalysis: parseInt(docs.documentsWithoutAnalysis),
          analysisRate: docs.totalDocuments > 0
            ? (docs.documentsWithAnalysis / docs.totalDocuments * 100).toFixed(2)
            : 0
        }
      })
    }

    const db = await loadDb()
    const workflows = db.workflows ?? []
    const documents = db.documents ?? []

    const report = {
      totalWorkflows: workflows.length,
      approvedWorkflows: workflows.filter(w => w.status === 'approved').length,
      rejectedWorkflows: workflows.filter(w => w.status === 'rejected').length,
      pendingWorkflows: workflows.filter(w => w.status === 'pending').length,
      approvalRate: workflows.length > 0 
        ? (workflows.filter(w => w.status === 'approved').length / workflows.length * 100).toFixed(2) 
        : 0,
      documentsWithAnalysis: documents.filter(d => d.analysisStatus === 'completed').length,
      documentsWithoutAnalysis: documents.filter(d => d.analysisStatus !== 'completed' || !d.analysisStatus).length,
      analysisRate: documents.length > 0
        ? (documents.filter(d => d.analysisStatus === 'completed').length / documents.length * 100).toFixed(2)
        : 0
    }

    res.json({ report })
  } catch (err) {
    next(err)
  }
})

// Export report as CSV
router.get('/export/:type', authenticate, authorize({ permission: 'canGenerateReports' }), async (req, res, next) => {
  try {
    const { type } = req.params
    let csvContent = ''
    let filename = ''

    if (usePg) {
      switch (type) {
        case 'taxpayers':
          const taxpayerResult = await pool.query('SELECT id, name, tin, type, district, status, registered FROM taxpayers')
          csvContent = 'ID,Name,TIN,Type,District,Status,Registered\n'
          taxpayerResult.rows.forEach(t => {
            csvContent += `${t.id},"${t.name}",${t.tin},${t.type},${t.district},${t.status},${t.registered}\n`
          })
          filename = 'taxpayers.csv'
          break

        case 'documents':
          const docResult = await pool.query('SELECT id, title, type, taxpayer_tin, status, uploaded_at FROM documents')
          csvContent = 'ID,Title,Type,Taxpayer TIN,Status,Uploaded At\n'
          docResult.rows.forEach(d => {
            csvContent += `${d.id},"${d.title}",${d.type},${d.taxpayer_tin || ''},${d.status || 'N/A'},${d.uploaded_at || 'N/A'}\n`
          })
          filename = 'documents.csv'
          break

        case 'workflows':
          const workflowResult = await pool.query('SELECT id, title, status, priority, assigned_to, created_at FROM workflows')
          csvContent = 'ID,Title,Status,Priority,Assigned To,Created At\n'
          workflowResult.rows.forEach(w => {
            csvContent += `${w.id},"${w.title}",${w.status},${w.priority},${w.assigned_to || 'Unassigned'},${w.created_at}\n`
          })
          filename = 'workflows.csv'
          break

        default:
          return res.status(400).json({ error: 'Invalid report type' })
      }

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      return res.send(csvContent)
    }

    const db = await loadDb()

    switch (type) {
      case 'taxpayers':
        const taxpayers = db.taxpayers ?? []
        csvContent = 'ID,Name,TIN,Type,District,Status,Registered\n'
        taxpayers.forEach(t => {
          csvContent += `${t.id},"${t.name}",${t.tin},${t.type},${t.district},${t.status},${t.registered}\n`
        })
        filename = 'taxpayers.csv'
        break

      case 'documents':
        const documents = db.documents ?? []
        csvContent = 'ID,Title,Type,Taxpayer TIN,Status,Uploaded At\n'
        documents.forEach(d => {
          csvContent += `${d.id},"${d.title}",${d.type},${d.taxpayerTin || ''},${d.status || 'N/A'},${d.uploadedAt || 'N/A'}\n`
        })
        filename = 'documents.csv'
        break

      case 'workflows':
        const workflows = db.workflows ?? []
        csvContent = 'ID,Title,Status,Priority,Assigned To,Created At\n'
        workflows.forEach(w => {
          csvContent += `${w.id},"${w.title}",${w.status},${w.priority},${w.assignedTo || 'Unassigned'},${w.createdAt}\n`
        })
        filename = 'workflows.csv'
        break

      default:
        return res.status(400).json({ error: 'Invalid report type' })
    }

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(csvContent)
  } catch (err) {
    next(err)
  }
})

export default router