import { Router } from 'express'
import { loadDb, saveDb } from '../data/store.js'
import { pool } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/authorize.js'
import { logAudit } from '../services/audit.service.js'

const router = Router()

const usePg = Boolean(process.env.DATABASE_URL)

// Helper to transform database row (snake_case) to API format (camelCase)
function transformWorkflowRow(row) {
  if (!row) return row
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    documentId: row.document_id,
    taxpayerTin: row.taxpayer_tin,
    taxpayerName: row.taxpayer_name,
    assignedTo: row.assigned_to,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    currentStage: row.current_stage,
    stages: row.stages,
    rejectionReason: row.rejection_reason,
    owner: row.owner,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Get all workflows
router.get('/', authenticate, authorize({ permission: 'canViewWorkflows' }), async (req, res, next) => {
  try {
    const { status, assignedTo, priority, overdue, stage, search } = req.query

    if (usePg) {
      const where = []
      const params = []

      if (status && status !== 'all') {
        params.push(String(status))
        where.push(`status = $${params.length}`)
      }
      if (assignedTo) {
        params.push(String(assignedTo))
        where.push(`assigned_to = $${params.length}`)
      }
      if (priority && priority !== 'all') {
        params.push(String(priority))
        where.push(`priority = $${params.length}`)
      }
      if (stage && stage !== 'all') {
        params.push(String(stage))
        where.push(`current_stage = $${params.length}`)
      }
      if (overdue === 'true') {
        where.push(`due_date IS NOT NULL AND due_date < CURRENT_DATE AND status NOT IN ('completed', 'approved', 'rejected')`)
      }
      if (search) {
        params.push(`%${search}%`)
        where.push(`(title ILIKE $${params.length} OR taxpayer_name ILIKE $${params.length} OR taxpayer_tin ILIKE $${params.length})`)
      }

      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
      const sql = `SELECT w.*, u.username as assigned_username, u.full_name as assigned_full_name FROM workflows w 
        LEFT JOIN users u ON w.assigned_to = u.id
        ${whereClause} ORDER BY 
        CASE w.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END,
        w.due_date ASC NULLS LAST,
        w.created_at DESC
        LIMIT 100`
      const result = await pool.query(sql, params)
      const workflows = result.rows.map(row => {
        const workflow = transformWorkflowRow(row)
        workflow.assignedUsername = row.assigned_username
        workflow.assignedFullName = row.assigned_full_name
        return workflow
      })
      return res.json({ workflows, total: workflows.length })
    }

    const db = await loadDb()
    let workflows = db.workflows ?? []

    if (status && status !== 'all') {
      workflows = workflows.filter(w => w.status === status)
    }
    if (assignedTo) {
      workflows = workflows.filter(w => w.assignedTo === assignedTo)
    }
    if (priority && priority !== 'all') {
      workflows = workflows.filter(w => w.priority === priority)
    }
    if (stage && stage !== 'all') {
      workflows = workflows.filter(w => w.currentStage === stage)
    }
    if (overdue === 'true') {
      workflows = workflows.filter(w => w.dueDate && new Date(w.dueDate) < new Date() && !['completed', 'approved', 'rejected'].includes(w.status))
    }
    if (search) {
      const s = search.toLowerCase()
      workflows = workflows.filter(w => 
        w.title.toLowerCase().includes(s) || 
        (w.taxpayerName && w.taxpayerName.toLowerCase().includes(s)) ||
        (w.taxpayerTin && w.taxpayerTin.toLowerCase().includes(s))
      )
    }

    // attach assignedUsername and assignedFullName from users in file DB
    const users = db.users ?? []
    workflows = workflows.map((w) => {
      const assignedUser = users.find(u => u.id === w.assignedTo)
      return {
        ...w,
        assignedUsername: assignedUser?.username,
        assignedFullName: assignedUser?.name || assignedUser?.full_name || undefined,
      }
    })

    res.json({ workflows, total: workflows.length })
  } catch (err) {
    next(err)
  }
})

// Get workflow by ID
router.get('/:id', authenticate, authorize({ permission: 'canViewWorkflows' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query(
        'SELECT w.*, u.username as assigned_username, u.full_name as assigned_full_name FROM workflows w LEFT JOIN users u ON w.assigned_to = u.id WHERE w.id = $1 LIMIT 1', 
        [req.params.id]
      )
      if (!result.rows.length) return res.status(404).json({ error: 'Workflow not found' })
      const workflow = transformWorkflowRow(result.rows[0])
      workflow.assignedUsername = result.rows[0].assigned_username
      workflow.assignedFullName = result.rows[0].assigned_full_name
      return res.json({ workflow })
    }

    const db = await loadDb()
    const workflow = db.workflows.find(w => w.id === req.params.id)
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' })
    res.json({ workflow })
  } catch (err) {
    next(err)
  }
})

// Create new workflow
router.post('/', authenticate, authorize({ permission: 'canCreateWorkflows' }), async (req, res, next) => {
  try {
    const { title, description, documentId, taxpayerTin, taxpayerName, assignedTo, priority, dueDate, stages } = req.body

    if (!title) {
      return res.status(400).json({ error: 'Title is required' })
    }

    const id = `wf-${Date.now()}`

    if (usePg) {
      const result = await pool.query(
        `INSERT INTO workflows (id, title, description, document_id, taxpayer_tin, taxpayer_name, assigned_to, status, priority, due_date, current_stage, stages, owner, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING *`,
         [
          id,
          title,
          description || '',
          documentId || null,
          taxpayerTin || null,
          taxpayerName || null,
          assignedTo || null,
          'pending',
          priority || 'medium',
          dueDate || null,
          'received',
          JSON.stringify(stages || [
            { name: 'received', status: 'completed', completedAt: new Date().toISOString() },
            { name: 'verified', status: 'pending', completedAt: null },
            { name: 'approved', status: 'pending', completedAt: null },
            { name: 'archived', status: 'pending', completedAt: null }
          ]),
          req.user?.username,
          req.user?.username,
          new Date(),
          new Date()
        ]
      )

      await logAudit({
        action: 'WORKFLOW_CREATE',
        userId: req.user?.sub,
        username: req.user?.username,
        details: `Created workflow: ${title}`
      })

      return res.status(201).json({ workflow: transformWorkflowRow(result.rows[0]) })
    }

    const db = await loadDb()
    const workflow = {
      id,
      title,
      description: description || '',
      documentId: documentId || null,
      taxpayerTin: taxpayerTin || null,
      taxpayerName: taxpayerName || null,
      assignedTo: assignedTo || null,
      status: 'pending',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      currentStage: 'received',
      stages: stages || [
        { name: 'received', status: 'completed', completedAt: new Date().toISOString() },
        { name: 'verified', status: 'pending', completedAt: null },
        { name: 'approved', status: 'pending', completedAt: null },
        { name: 'archived', status: 'pending', completedAt: null }
      ],
      owner: req.user?.username,
      createdBy: req.user?.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    db.workflows.unshift(workflow)
    await saveDb(db)

    await logAudit({
      action: 'WORKFLOW_CREATE',
      userId: req.user?.sub,
      username: req.user?.username,
      details: `Created workflow: ${title}`
    })

    res.status(201).json({ workflow })
  } catch (err) {
    next(err)
  }
})

// Update workflow status/stage
router.patch('/:id', authenticate, authorize({ permission: 'canEditWorkflows' }), async (req, res, next) => {
  try {
    const { status, assignedTo, priority, dueDate, currentStage, stageAction, comment } = req.body

    if (usePg) {
      const allowedFields = ['status', 'assigned_to', 'priority', 'due_date', 'current_stage']
      const setClauses = []
      const params = []
      let paramCount = 0

      if (status !== undefined) {
        paramCount++
        setClauses.push(`status = $${paramCount}`)
        params.push(status)
      }
      if (assignedTo !== undefined) {
        paramCount++
        setClauses.push(`assigned_to = $${paramCount}`)
        params.push(assignedTo)
      }
      if (priority !== undefined) {
        paramCount++
        setClauses.push(`priority = $${paramCount}`)
        params.push(priority)
      }
      if (dueDate !== undefined) {
        paramCount++
        setClauses.push(`due_date = $${paramCount}`)
        params.push(dueDate)
      }
      if (currentStage !== undefined) {
        paramCount++
        setClauses.push(`current_stage = $${paramCount}`)
        params.push(currentStage)
      }

      setClauses.push(`updated_at = CURRENT_TIMESTAMP`)
      paramCount++
      params.push(req.params.id)

      const sql = `UPDATE workflows SET ${setClauses.join(', ')} WHERE id = $${paramCount} RETURNING *`
      const result = await pool.query(sql, params)

      if (!result.rows.length) return res.status(404).json({ error: 'Workflow not found' })

      const workflow = transformWorkflowRow(result.rows[0])

      // Handle stage progression
      if (stageAction && workflow.stages) {
        const stages = workflow.stages
        const stageIndex = stages.findIndex((s) => s.name === workflow.current_stage)
        if (stageIndex !== -1 && stageIndex < stages.length - 1) {
          stages[stageIndex].status = 'completed'
          stages[stageIndex].completedAt = new Date().toISOString()
          stages[stageIndex + 1].status = 'in_progress'
          
          await pool.query(
            `UPDATE workflows SET stages = $1, current_stage = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
            [JSON.stringify(stages), stages[stageIndex + 1].name, req.params.id]
          )

          await pool.query(
            `INSERT INTO workflow_history (id, workflow_id, action, from_stage, to_stage, from_status, to_status, user_id, username, comment, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              `hist-${Date.now()}`,
              req.params.id,
              'STAGE_PROGRESS',
              workflow.current_stage,
              stages[stageIndex + 1].name,
              'in_progress',
              'in_progress',
              req.user.sub,
              req.user.username,
              comment || null,
              new Date()
            ]
          )
        }
      }

      if (comment) {
        await pool.query(
          `INSERT INTO workflow_comments (id, workflow_id, user_id, username, comment, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [`comment-${Date.now()}`, req.params.id, req.user.sub, req.user.username, comment, new Date()]
        )
      }

      await logAudit({
        action: 'WORKFLOW_UPDATE',
        userId: req.user?.sub,
        username: req.user?.username,
        details: `Updated workflow ${req.params.id}`
      })

      const updated = await pool.query('SELECT * FROM workflows WHERE id = $1', [req.params.id])
      return res.json({ workflow: transformWorkflowRow(updated.rows[0]) })
    }

    const db = await loadDb()
    const index = db.workflows.findIndex(w => w.id === req.params.id)

    if (index === -1) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    const workflow = db.workflows[index]
    const allowedUpdates = ['status', 'assignedTo', 'priority', 'dueDate', 'currentStage']
    const updates = {}

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key]
      }
    }

    // Handle stage progression
    if (req.body.stageAction && workflow.stages) {
      const stageIndex = workflow.stages.findIndex(s => s.name === workflow.currentStage)
      if (stageIndex !== -1 && stageIndex < workflow.stages.length - 1) {
        workflow.stages[stageIndex].status = 'completed'
        workflow.stages[stageIndex].completedAt = new Date().toISOString()
        workflow.stages[stageIndex + 1].status = 'in_progress'
        workflow.currentStage = workflow.stages[stageIndex + 1].name
        updates.currentStage = workflow.currentStage
      }
    }

    db.workflows[index] = { ...workflow, ...updates, updatedAt: new Date().toISOString() }
    await saveDb(db)

    await logAudit({
      action: 'WORKFLOW_UPDATE',
      userId: req.user?.sub,
      username: req.user?.username,
      details: `Updated workflow ${workflow.id}: ${JSON.stringify(updates)}`
    })

    res.json({ workflow: db.workflows[index] })
  } catch (err) {
    next(err)
  }
})

// Approve workflow (Supervisor/Admin only)
router.post('/:id/approve', authenticate, authorize({ permission: 'canApproveWorkflows' }), async (req, res, next) => {
  try {
    const { comment } = req.body

    if (usePg) {
      const result = await pool.query(
        `UPDATE workflows 
         SET status = 'approved', current_stage = 'approved', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [req.params.id]
      )

      if (!result.rows.length) return res.status(404).json({ error: 'Workflow not found' })

      const workflow = transformWorkflowRow(result.rows[0])

      if (workflow.stages) {
        const stages = workflow.stages
        const stageIndex = stages.findIndex((s) => s.name === 'approved')
        if (stageIndex !== -1) {
          stages[stageIndex].status = 'completed'
          stages[stageIndex].completedAt = new Date().toISOString()
          if (stageIndex + 1 < stages.length) {
            stages[stageIndex + 1].status = 'in_progress'
          }
          await pool.query(
            `UPDATE workflows SET stages = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [JSON.stringify(stages), req.params.id]
          )
        }
      }

      if (comment) {
        await pool.query(
          `INSERT INTO workflow_comments (id, workflow_id, user_id, username, comment, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [`comment-${Date.now()}`, req.params.id, req.user.sub, req.user.username, comment, new Date()]
        )
      }

      await pool.query(
        `INSERT INTO workflow_history (id, workflow_id, action, from_status, to_status, user_id, username, comment, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [`hist-${Date.now()}`, req.params.id, 'APPROVE', 'pending', 'approved', req.user.sub, req.user.username, comment || null, new Date()]
      )

      await logAudit({
        action: 'WORKFLOW_APPROVE',
        userId: req.user?.sub,
        username: req.user?.username,
        details: `Approved workflow ${req.params.id}`
      })

      const updated = await pool.query('SELECT * FROM workflows WHERE id = $1', [req.params.id])
      return res.json({ workflow: transformWorkflowRow(updated.rows[0]) })
    }

    const db = await loadDb()
    const index = db.workflows.findIndex(w => w.id === req.params.id)

    if (index === -1) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    const workflow = db.workflows[index]
    workflow.status = 'approved'
    workflow.currentStage = 'approved'

    if (workflow.stages) {
      const stageIndex = workflow.stages.findIndex(s => s.name === 'approved')
      if (stageIndex !== -1) {
        workflow.stages[stageIndex].status = 'completed'
        workflow.stages[stageIndex].completedAt = new Date().toISOString()
        if (stageIndex + 1 < workflow.stages.length) {
          workflow.stages[stageIndex + 1].status = 'in_progress'
          workflow.currentStage = workflow.stages[stageIndex + 1].name
        }
      }
    }

    workflow.updatedAt = new Date().toISOString()
    await saveDb(db)

    await logAudit({
      action: 'WORKFLOW_APPROVE',
      userId: req.user?.sub,
      username: req.user?.username,
      details: `Approved workflow ${workflow.id}: ${workflow.title}`
    })

    res.json({ workflow })
  } catch (err) {
    next(err)
  }
})

// Reject workflow
router.post('/:id/reject', authenticate, authorize({ permission: 'canApproveWorkflows' }), async (req, res, next) => {
  try {
    const { reason, comment } = req.body

    if (usePg) {
      const result = await pool.query(
        `UPDATE workflows 
         SET status = 'rejected', rejection_reason = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [reason || 'No reason provided', req.params.id]
      )

      if (!result.rows.length) return res.status(404).json({ error: 'Workflow not found' })

      if (comment) {
        await pool.query(
          `INSERT INTO workflow_comments (id, workflow_id, user_id, username, comment, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [`comment-${Date.now()}`, req.params.id, req.user.sub, req.user.username, comment, new Date()]
        )
      }

      await pool.query(
        `INSERT INTO workflow_history (id, workflow_id, action, from_status, to_status, user_id, username, comment, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [`hist-${Date.now()}`, req.params.id, 'REJECT', 'pending', 'rejected', req.user.sub, req.user.username, comment || null, JSON.stringify({ reason }), new Date()]
      )

      await logAudit({
        action: 'WORKFLOW_REJECT',
        userId: req.user?.sub,
        username: req.user?.username,
        details: `Rejected workflow ${req.params.id}: ${reason || 'No reason'}`
      })

      const updated = await pool.query('SELECT * FROM workflows WHERE id = $1', [req.params.id])
      return res.json({ workflow: transformWorkflowRow(updated.rows[0]) })
    }

    const db = await loadDb()
    const index = db.workflows.findIndex(w => w.id === req.params.id)

    if (index === -1) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    const workflow = db.workflows[index]
    workflow.status = 'rejected'
    workflow.rejectionReason = req.body.reason || 'No reason provided'
    workflow.updatedAt = new Date().toISOString()
    await saveDb(db)

    await logAudit({
      action: 'WORKFLOW_REJECT',
      userId: req.user?.sub,
      username: req.user?.username,
      details: `Rejected workflow ${workflow.id}: ${workflow.title}. Reason: ${req.body.reason || 'No reason'}`
    })

    res.json({ workflow })
  } catch (err) {
    next(err)
  }
})

// Escalate workflow
router.post('/:id/escalate', authenticate, authorize({ permission: 'canEditWorkflows' }), async (req, res, next) => {
  try {
    const { reason, comment } = req.body

    if (usePg) {
      const result = await pool.query(
        `UPDATE workflows 
         SET status = 'escalated', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [req.params.id]
      )

      if (!result.rows.length) return res.status(404).json({ error: 'Workflow not found' })

      if (comment) {
        await pool.query(
          `INSERT INTO workflow_comments (id, workflow_id, user_id, username, comment, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [`comment-${Date.now()}`, req.params.id, req.user.sub, req.user.username, comment, new Date()]
        )
      }

      await pool.query(
        `INSERT INTO workflow_history (id, workflow_id, action, from_status, to_status, user_id, username, comment, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [`hist-${Date.now()}`, req.params.id, 'ESCALATE', result.rows[0].status, 'escalated', req.user.sub, req.user.username, comment || null, JSON.stringify({ reason }), new Date()]
      )

      await logAudit({
        action: 'WORKFLOW_ESCALATE',
        userId: req.user?.sub,
        username: req.user?.username,
        details: `Escalated workflow ${req.params.id}: ${reason || 'No reason'}`
      })

      const updated = await pool.query('SELECT * FROM workflows WHERE id = $1', [req.params.id])
      return res.json({ workflow: transformWorkflowRow(updated.rows[0]) })
    }

    const db = await loadDb()
    const index = db.workflows.findIndex(w => w.id === req.params.id)

    if (index === -1) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    const workflow = db.workflows[index]
    workflow.status = 'escalated'
    workflow.updatedAt = new Date().toISOString()
    await saveDb(db)

    await logAudit({
      action: 'WORKFLOW_ESCALATE',
      userId: req.user?.sub,
      username: req.user?.username,
      details: `Escalated workflow ${workflow.id}: ${reason || 'No reason'}`
    })

    res.json({ workflow })
  } catch (err) {
    next(err)
  }
})

// Delete workflow
router.delete('/:id', authenticate, authorize({ permission: 'canEditWorkflows' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query('DELETE FROM workflows WHERE id = $1 RETURNING id', [req.params.id])
      if (!result.rows.length) return res.status(404).json({ error: 'Workflow not found' })

      await logAudit({
        action: 'WORKFLOW_DELETE',
        userId: req.user?.sub,
        username: req.user?.username,
        details: `Deleted workflow ${req.params.id}`
      })

      return res.json({ message: 'Workflow deleted successfully' })
    }

    const db = await loadDb()
    const index = db.workflows.findIndex(w => w.id === req.params.id)

    if (index === -1) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    const workflow = db.workflows[index]
    db.workflows.splice(index, 1)
    await saveDb(db)

    await logAudit({
      action: 'WORKFLOW_DELETE',
      userId: req.user?.sub,
      username: req.user?.username,
      details: `Deleted workflow ${workflow.id}: ${workflow.title}`
    })

    res.json({ message: 'Workflow deleted successfully' })
  } catch (err) {
    next(err)
  }
})

// Get workflow comments
router.get('/:id/comments', authenticate, authorize({ permission: 'canViewWorkflows' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query(
        'SELECT * FROM workflow_comments WHERE workflow_id = $1 ORDER BY created_at DESC',
        [req.params.id]
      )
      return res.json({ comments: result.rows })
    }

    res.json({ comments: [] })
  } catch (err) {
    next(err)
  }
})

// Add workflow comment
router.post('/:id/comments', authenticate, authorize({ permission: 'canEditWorkflows' }), async (req, res, next) => {
  try {
    const { comment } = req.body

    if (!comment) {
      return res.status(400).json({ error: 'Comment is required' })
    }

    if (usePg) {
      const result = await pool.query(
        `INSERT INTO workflow_comments (id, workflow_id, user_id, username, comment, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [`comment-${Date.now()}`, req.params.id, req.user.sub, req.user.username, comment, new Date()]
      )
      return res.status(201).json({ comment: result.rows[0] })
    }

    res.status(201).json({ comment: { id: `comment-${Date.now()}`, comment, username: req.user?.username, createdAt: new Date() } })
  } catch (err) {
    next(err)
  }
})

// Get workflow history
router.get('/:id/history', authenticate, authorize({ permission: 'canViewWorkflows' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query(
        'SELECT * FROM workflow_history WHERE workflow_id = $1 ORDER BY created_at DESC',
        [req.params.id]
      )
      return res.json({ history: result.rows })
    }

    res.json({ history: [] })
  } catch (err) {
    next(err)
  }
})

// Get pending tasks for current user
router.get('/tasks/pending', authenticate, async (req, res, next) => {
  try {
    const userId = req.user?.sub

    if (usePg) {
      const result = await pool.query(
        `SELECT * FROM workflows 
         WHERE assigned_to = $1 AND status NOT IN ('completed', 'approved', 'rejected')
         ORDER BY 
           CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END,
           due_date ASC NULLS LAST,
           created_at DESC`,
        [userId]
      )
      return res.json({ tasks: result.rows, total: result.rows.length })
    }

    const db = await loadDb()
    const tasks = db.workflows.filter(w => 
      w.assignedTo === userId && !['completed', 'approved', 'rejected'].includes(w.status)
    )
    res.json({ tasks, total: tasks.length })
  } catch (err) {
    next(err)
  }
})

// Get unassigned workflows (for supervisors to assign)
router.get('/unassigned', authenticate, authorize({ permission: 'canViewWorkflows' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query(
        `SELECT * FROM workflows 
         WHERE assigned_to IS NULL AND status NOT IN ('completed', 'approved', 'rejected')
         ORDER BY 
           CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END,
           due_date ASC NULLS LAST,
           created_at DESC`,
      )
      const workflows = result.rows.map(transformWorkflowRow)
      return res.json({ workflows, total: workflows.length })
    }

    const db = await loadDb()
    const workflows = db.workflows.filter(w => 
      w.assignedTo === null && !['completed', 'approved', 'rejected'].includes(w.status)
    )
    res.json({ workflows, total: workflows.length })
  } catch (err) {
    next(err)
  }
})

// Get all users for assignment
router.get('/users', authenticate, authorize({ permission: 'canViewUsers' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query(
        `SELECT id, username, full_name, email, role FROM users WHERE is_active = true ORDER BY full_name`
      )
      return res.json({ users: result.rows })
    }

    const db = await loadDb()
    const users = (db.users || []).filter(u => u.isActive !== false).map(u => ({
      id: u.id,
      username: u.username,
      full_name: u.fullName || u.username,
      email: u.email,
      role: u.role
    }))
    res.json({ users })
  } catch (err) {
    next(err)
  }
})

// Assign workflow to user
router.post('/:id/assign', authenticate, authorize({ permission: 'canEditWorkflows' }), async (req, res, next) => {
  try {
    const { userId, comment } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required for assignment' })
    }

    if (usePg) {
      // Get workflow details
      const workflowResult = await pool.query('SELECT * FROM workflows WHERE id = $1 LIMIT 1', [req.params.id])
      if (!workflowResult.rows.length) return res.status(404).json({ error: 'Workflow not found' })

      const workflow = workflowResult.rows[0]

      // Get user details
      const userResult = await pool.query('SELECT id, username, full_name, role FROM users WHERE id = $1 LIMIT 1', [userId])
      if (!userResult.rows.length) return res.status(404).json({ error: 'User not found' })

      const user = userResult.rows[0]

      // Update workflow assignment
      const updateResult = await pool.query(
        `UPDATE workflows 
         SET assigned_to = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [userId, req.params.id]
      )

      const updatedWorkflow = transformWorkflowRow(updateResult.rows[0])

      // Add comment if provided
      if (comment) {
        await pool.query(
          `INSERT INTO workflow_comments (id, workflow_id, user_id, username, comment, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [`comment-${Date.now()}`, req.params.id, req.user.sub, req.user.username, `Assigned to ${user.full_name}: ${comment}`, new Date()]
        )
      }

      // Add to history
      await pool.query(
        `INSERT INTO workflow_history (id, workflow_id, action, from_status, to_status, user_id, username, comment, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          `hist-${Date.now()}`,
          req.params.id,
          'ASSIGN',
          workflow.assigned_to || 'unassigned',
          userId,
          req.user.sub,
          req.user.username,
          comment || null,
          JSON.stringify({ assignedTo: userId, assignedToName: user.full_name }),
          new Date()
        ]
      )

      // Create notification for assigned user
      await createNotification({
        type: 'workflow_assignment',
        title: 'Workflow Assigned',
        message: `You have been assigned to workflow: ${workflow.title}`,
        userId: userId,
        category: 'task',
        priority: workflow.priority === 'critical' || workflow.priority === 'high' ? 'high' : 'medium',
        metadata: {
          workflowId: workflow.id,
          workflowTitle: workflow.title,
          assignedBy: req.user.username
        },
        actionUrl: `/workflows/${workflow.id}`
      })

      await logAudit({
        action: 'WORKFLOW_ASSIGN',
        userId: req.user?.sub,
        username: req.user?.username,
        details: `Assigned workflow ${workflow.id} to ${user.full_name}`
      })

      return res.json({ workflow: updatedWorkflow })
    }

    const db = await loadDb()
    const index = db.workflows.findIndex(w => w.id === req.params.id)
    if (index === -1) return res.status(404).json({ error: 'Workflow not found' })

    const user = (db.users || []).find(u => u.id === userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    db.workflows[index].assignedTo = userId
    db.workflows[index].updatedAt = new Date().toISOString()
    await saveDb(db)

    await logAudit({
      action: 'WORKFLOW_ASSIGN',
      userId: req.user?.sub,
      username: req.user?.username,
      details: `Assigned workflow ${db.workflows[index].id} to ${user.fullName || user.username}`
    })

    res.json({ workflow: db.workflows[index] })
  } catch (err) {
    next(err)
  }
})

// Get SLA compliance stats
router.get('/analytics/sla', authenticate, authorize({ permission: 'canViewWorkflows' }), async (req, res, next) => {
  try {
    if (usePg) {
      const totalResult = await pool.query("SELECT COUNT(*) as count FROM workflows WHERE status NOT IN ('completed', 'approved', 'rejected')")
      const overdueResult = await pool.query("SELECT COUNT(*) as count FROM workflows WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'approved', 'rejected')")
      const completedResult = await pool.query("SELECT COUNT(*) as count FROM workflows WHERE status IN ('completed', 'approved')")
      const byPriorityResult = await pool.query(
        `SELECT priority, COUNT(*) as count FROM workflows 
         WHERE status NOT IN ('completed', 'approved', 'rejected')
         GROUP BY priority`
      )
      const byStageResult = await pool.query(
        `SELECT current_stage, COUNT(*) as count FROM workflows 
         WHERE status NOT IN ('completed', 'approved', 'rejected')
         GROUP BY current_stage`
      )

      return res.json({
        total: parseInt(totalResult.rows[0].count),
        overdue: parseInt(overdueResult.rows[0].count),
        completed: parseInt(completedResult.rows[0].count),
        complianceRate: totalResult.rows[0].count > 0 ? ((completedResult.rows[0].count / totalResult.rows[0].count) * 100).toFixed(2) : 0,
        byPriority: byPriorityResult.rows,
        byStage: byStageResult.rows
      })
    }

    const db = await loadDb()
    const active = db.workflows.filter(w => !['completed', 'approved', 'rejected'].includes(w.status))
    const overdue = active.filter(w => w.dueDate && new Date(w.dueDate) < new Date())
    const completed = db.workflows.filter(w => ['completed', 'approved'].includes(w.status))

    const byPriority = {}
    const byStage = {}
    active.forEach(w => {
      byPriority[w.priority] = (byPriority[w.priority] || 0) + 1
      byStage[w.currentStage] = (byStage[w.currentStage] || 0) + 1
    })

    res.json({
      total: active.length,
      overdue: overdue.length,
      completed: completed.length,
      complianceRate: db.workflows.length > 0 ? ((completed.length / db.workflows.length) * 100).toFixed(2) : 0,
      byPriority: Object.entries(byPriority).map(([priority, count]) => ({ priority, count })),
      byStage: Object.entries(byStage).map(([current_stage, count]) => ({ current_stage, count }))
    })
  } catch (err) {
    next(err)
  }
})

// Get workflow analytics
router.get('/analytics/overview', authenticate, authorize({ permission: 'canViewWorkflows' }), async (req, res, next) => {
  try {
    if (usePg) {
      const totalResult = await pool.query('SELECT COUNT(*) as count FROM workflows')
      const statusResult = await pool.query(
        `SELECT status, COUNT(*) as count FROM workflows GROUP BY status ORDER BY status`
      )
      const priorityResult = await pool.query(
        `SELECT priority, COUNT(*) as count FROM workflows GROUP BY priority ORDER BY priority`
      )
      const stageResult = await pool.query(
        `SELECT current_stage, COUNT(*) as count FROM workflows GROUP BY current_stage ORDER BY current_stage`
      )
      const assignedResult = await pool.query(
        `SELECT assigned_to, COUNT(*) as count FROM workflows 
         WHERE assigned_to IS NOT NULL AND status NOT IN ('completed', 'approved', 'rejected')
         GROUP BY assigned_to ORDER BY count DESC LIMIT 10`
      )

      return res.json({
        total: parseInt(totalResult.rows[0].count),
        byStatus: statusResult.rows,
        byPriority: priorityResult.rows,
        byStage: stageResult.rows,
        byAssigned: assignedResult.rows
      })
    }

    const db = await loadDb()
    const byStatus = {}
    const byPriority = {}
    const byStage = {}
    const byAssigned = {}

    db.workflows.forEach(w => {
      byStatus[w.status] = (byStatus[w.status] || 0) + 1
      byPriority[w.priority] = (byPriority[w.priority] || 0) + 1
      byStage[w.currentStage] = (byStage[w.currentStage] || 0) + 1
      if (w.assignedTo && !['completed', 'approved', 'rejected'].includes(w.status)) {
        byAssigned[w.assignedTo] = (byAssigned[w.assignedTo] || 0) + 1
      }
    })

    res.json({
      total: db.workflows.length,
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      byPriority: Object.entries(byPriority).map(([priority, count]) => ({ priority, count })),
      byStage: Object.entries(byStage).map(([current_stage, count]) => ({ current_stage, count })),
      byAssigned: Object.entries(byAssigned).map(([assigned_to, count]) => ({ assigned_to, count }))
    })
  } catch (err) {
    next(err)
  }
})

// Batch processing endpoints
router.post('/batches', authenticate, authorize({ permission: 'canCreateWorkflows' }), async (req, res, next) => {
  try {
    const { name, description, filters, workflowTemplate, workflowIds } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Batch name is required' })
    }

    const batchId = `batch-${Date.now()}`

    if (usePg) {
      const result = await pool.query(
        `INSERT INTO workflow_batches (id, name, description, status, total_items, workflow_template, filters, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          batchId,
          name,
          description || null,
          'pending',
          workflowIds ? workflowIds.length : 0,
          JSON.stringify(workflowTemplate || {}),
          JSON.stringify(filters || {}),
          req.user?.username,
          new Date(),
          new Date()
        ]
      )

      await logAudit({
        action: 'WORKFLOW_BATCH_CREATE',
        userId: req.user?.sub,
        username: req.user?.username,
        details: `Created workflow batch: ${name}`
      })

      return res.status(201).json({ batch: result.rows[0] })
    }

    const db = await loadDb()
    const batch = {
      id: batchId,
      name,
      description: description || '',
      status: 'pending',
      totalItems: workflowIds ? workflowIds.length : 0,
      processedItems: 0,
      failedItems: 0,
      workflowTemplate: workflowTemplate || {},
      filters: filters || {},
      workflowIds: workflowIds || [],
      createdBy: req.user?.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    db.workflowBatches = db.workflowBatches || []
    db.workflowBatches.unshift(batch)
    await saveDb(db)

    await logAudit({
      action: 'WORKFLOW_BATCH_CREATE',
      userId: req.user?.sub,
      username: req.user?.username,
      details: `Created workflow batch: ${name}`
    })

    res.status(201).json({ batch })
  } catch (err) {
    next(err)
  }
})

// Get all batches
router.get('/batches', authenticate, authorize({ permission: 'canViewWorkflows' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query('SELECT * FROM workflow_batches ORDER BY created_at DESC LIMIT 50')
      return res.json({ batches: result.rows, total: result.rows.length })
    }

    const db = await loadDb()
    const batches = db.workflowBatches || []
    res.json({ batches, total: batches.length })
  } catch (err) {
    next(err)
  }
})

// Get batch by ID
router.get('/batches/:id', authenticate, authorize({ permission: 'canViewWorkflows' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query('SELECT * FROM workflow_batches WHERE id = $1 LIMIT 1', [req.params.id])
      if (!result.rows.length) return res.status(404).json({ error: 'Batch not found' })
      return res.json({ batch: result.rows[0] })
    }

    const db = await loadDb()
    const batch = (db.workflowBatches || []).find(b => b.id === req.params.id)
    if (!batch) return res.status(404).json({ error: 'Batch not found' })
    res.json({ batch })
  } catch (err) {
    next(err)
  }
})

// Process batch
router.post('/batches/:id/process', authenticate, authorize({ permission: 'canEditWorkflows' }), async (req, res, next) => {
  try {
    if (usePg) {
      const batchResult = await pool.query('SELECT * FROM workflow_batches WHERE id = $1 LIMIT 1', [req.params.id])
      if (!batchResult.rows.length) return res.status(404).json({ error: 'Batch not found' })

      const batch = batchResult.rows[0]
      if (batch.status === 'processing') {
        return res.status(400).json({ error: 'Batch is already being processed' })
      }

      await pool.query(
        `UPDATE workflow_batches SET status = 'processing', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [req.params.id]
      )

      await logAudit({
        action: 'WORKFLOW_BATCH_PROCESS',
        userId: req.user?.sub,
        username: req.user?.username,
        details: `Started processing batch: ${batch.name}`
      })

      return res.json({ message: 'Batch processing started', batchId: req.params.id })
    }

    const db = await loadDb()
    const batchIndex = (db.workflowBatches || []).findIndex(b => b.id === req.params.id)
    if (batchIndex === -1) return res.status(404).json({ error: 'Batch not found' })

    const batch = db.workflowBatches[batchIndex]
    if (batch.status === 'processing') {
      return res.status(400).json({ error: 'Batch is already being processed' })
    }

    batch.status = 'processing'
    batch.startedAt = new Date().toISOString()
    batch.updatedAt = new Date().toISOString()
    db.workflowBatches[batchIndex] = batch
    await saveDb(db)

    await logAudit({
      action: 'WORKFLOW_BATCH_PROCESS',
      userId: req.user?.sub,
      username: req.user?.username,
      details: `Started processing batch: ${batch.name}`
    })

    res.json({ message: 'Batch processing started', batchId: req.params.id })
  } catch (err) {
    next(err)
  }
})

// Cancel batch
router.post('/batches/:id/cancel', authenticate, authorize({ permission: 'canEditWorkflows' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query(
        `UPDATE workflow_batches SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [req.params.id]
      )
      if (!result.rows.length) return res.status(404).json({ error: 'Batch not found' })

      await logAudit({
        action: 'WORKFLOW_BATCH_CANCEL',
        userId: req.user?.sub,
        username: req.user?.username,
        details: `Cancelled batch: ${result.rows[0].name}`
      })

      return res.json({ batch: result.rows[0] })
    }

    const db = await loadDb()
    const batchIndex = (db.workflowBatches || []).findIndex(b => b.id === req.params.id)
    if (batchIndex === -1) return res.status(404).json({ error: 'Batch not found' })

    db.workflowBatches[batchIndex].status = 'cancelled'
    db.workflowBatches[batchIndex].updatedAt = new Date().toISOString()
    await saveDb(db)

    await logAudit({
      action: 'WORKFLOW_BATCH_CANCEL',
      userId: req.user?.sub,
      username: req.user?.username,
      details: `Cancelled batch: ${db.workflowBatches[batchIndex].name}`
    })

    res.json({ batch: db.workflowBatches[batchIndex] })
  } catch (err) {
    next(err)
  }
})

// SLA Rules endpoints
router.get('/sla-rules', authenticate, authorize({ permission: 'canViewWorkflows' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query('SELECT * FROM workflow_sla_rules WHERE active = true ORDER BY priority, stage')
      return res.json({ rules: result.rows })
    }

    res.json({ rules: [] })
  } catch (err) {
    next(err)
  }
})

router.post('/sla-rules', authenticate, authorize({ permission: 'canEditWorkflows' }), async (req, res, next) => {
  try {
    const { name, priority, stage, maxHours, escalationUserId, escalationMessage } = req.body

    if (!name || !priority || !stage || !maxHours) {
      return res.status(400).json({ error: 'Name, priority, stage, and maxHours are required' })
    }

    const ruleId = `sla-${Date.now()}`

    if (usePg) {
      const result = await pool.query(
        `INSERT INTO workflow_sla_rules (id, name, priority, stage, max_hours, escalation_user_id, escalation_message, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [ruleId, name, priority, stage, maxHours, escalationUserId || null, escalationMessage || null, true, new Date(), new Date()]
      )

      await logAudit({
        action: 'SLA_RULE_CREATE',
        userId: req.user?.sub,
        username: req.user?.username,
        details: `Created SLA rule: ${name}`
      })

      return res.status(201).json({ rule: result.rows[0] })
    }

    res.status(201).json({ rule: { id: ruleId, name, priority, stage, maxHours, active: true } })
  } catch (err) {
    next(err)
  }
})

// Export workflows
router.get('/export/:format', authenticate, authorize({ permission: 'canViewWorkflows' }), async (req, res, next) => {
  try {
    const { format } = req.params
    const { status, priority, assignedTo, overdue } = req.query

    let workflows = []

    if (usePg) {
      const where = []
      const params = []

      if (status && status !== 'all') {
        params.push(String(status))
        where.push(`status = $${params.length}`)
      }
      if (assignedTo) {
        params.push(String(assignedTo))
        where.push(`assigned_to = $${params.length}`)
      }
      if (priority && priority !== 'all') {
        params.push(String(priority))
        where.push(`priority = $${params.length}`)
      }
      if (overdue === 'true') {
        where.push(`due_date IS NOT NULL AND due_date < CURRENT_DATE AND status NOT IN ('completed', 'approved', 'rejected')`)
      }

      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
      const result = await pool.query(`SELECT * FROM workflows ${whereClause} ORDER BY created_at DESC`, params)
      workflows = result.rows
    } else {
      const db = await loadDb()
      workflows = db.workflows || []
      if (status && status !== 'all') workflows = workflows.filter(w => w.status === status)
      if (assignedTo) workflows = workflows.filter(w => w.assignedTo === assignedTo)
      if (priority && priority !== 'all') workflows = workflows.filter(w => w.priority === priority)
      if (overdue === 'true') workflows = workflows.filter(w => w.dueDate && new Date(w.dueDate) < new Date() && !['completed', 'approved', 'rejected'].includes(w.status))
    }

    if (format === 'csv') {
      const headers = 'ID,Title,Status,Priority,Current Stage,Assigned To,Due Date,Created At\n'
      const rows = workflows.map(w => 
        `${w.id},"${w.title}",${w.status},${w.priority},${w.current_stage || w.currentStage},${w.assigned_to || w.assignedTo || ''},${w.due_date || w.dueDate || ''},${w.created_at || w.createdAt}`
      ).join('\n')
      
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename=workflows-${new Date().toISOString().split('T')[0]}.csv`)
      res.send(headers + rows)
    } else {
      res.json({ workflows })
    }

    await logAudit({
      action: 'WORKFLOW_EXPORT',
      userId: req.user?.sub,
      username: req.user?.username,
      details: `Exported ${workflows.length} workflows in ${format} format`
    })
  } catch (err) {
    next(err)
  }
})

export default router