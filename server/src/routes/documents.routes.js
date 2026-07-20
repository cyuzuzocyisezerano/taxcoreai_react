import { Router } from 'express'
import { loadDb, saveDb } from '../data/store.js'
import fs from 'fs'
import multer from 'multer'
import { fileURLToPath } from 'url'
import path from 'path'
import { pool } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/authorize.js'
import { analysisQueue, canUseQueue, runAnalysisSynchronously } from '../services/jobQueue.js'
import { logAudit } from '../services/audit.service.js'
import { createNotification } from './notifications.routes.js'

const router = Router()

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const filesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'files')
    cb(null, filesDir)
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, unique + ext)
  }
})

const upload = multer({ storage })

function getFilesRoot() {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'files')
}

async function moveDocumentToInternalArchive(documentFileName, filesDir) {
  if (!documentFileName) {
    return null
  }

  const archiveDir = path.join(filesDir, 'internal-archive')
  await fs.promises.mkdir(archiveDir, { recursive: true })

  const parsedName = path.basename(documentFileName)
  const ext = path.extname(parsedName)
  const baseName = path.basename(parsedName, ext)

  const sourcePath = path.isAbsolute(documentFileName)
    ? documentFileName
    : path.join(filesDir, documentFileName)

  let targetName = `${baseName}${ext}`
  let targetPath = path.join(archiveDir, targetName)
  let counter = 1

  while (await fs.promises.access(targetPath).then(() => true).catch(() => false)) {
    targetName = `${baseName}-${counter}${ext}`
    targetPath = path.join(archiveDir, targetName)
    counter += 1
  }

  try {
    await fs.promises.access(sourcePath)
    if (sourcePath !== targetPath) {
      await fs.promises.rename(sourcePath, targetPath)
    }
  } catch {
    // The original file may already be absent; use the target path as the archived location.
  }

  return path.join('internal-archive', targetName)
}

// Allow public GET access for documents. If `DATABASE_URL` is set, query Postgres.
const usePg = Boolean(process.env.DATABASE_URL)

// Get all documents with advanced filtering
router.get('/', authenticate, authorize({ permission: 'canViewDocuments' }), async (req, res, next) => {
  try {
    const { taxpayerTin, q, category, type, status, folderId, expirySoon } = req.query

    if (usePg) {
      try {
        const where = []
        const params = []

        if (taxpayerTin) {
          params.push(String(taxpayerTin))
          where.push(`taxpayer_tin = $${params.length}`)
        }

        if (q) {
          params.push(`%${String(q).toLowerCase()}%`)
          where.push(`(LOWER(title) LIKE $${params.length} OR LOWER(taxpayer_name) LIKE $${params.length})`)
        }

        if (category && category !== 'all') {
          params.push(String(category))
          where.push(`category = $${params.length}`)
        }

        if (type && type !== 'all') {
          params.push(String(type))
          where.push(`type = $${params.length}`)
        }

        if (status && status !== 'all') {
          params.push(String(status))
          where.push(`status = $${params.length}`)
        }

        if (expirySoon === 'true') {
          where.push(`expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'`)
        }

        if (folderId) {
          params.push(String(folderId))
          where.push(`id IN (SELECT document_id FROM document_folder_items WHERE folder_id = $${params.length})`)
        }

        const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
        const sql = `SELECT id, title, type, status, taxpayer_tin, taxpayer_name, file_name, uploaded_by, uploaded_at, created_at, updated_at FROM documents ${whereClause} ORDER BY uploaded_at DESC LIMIT 200`
        const result = await pool.query(sql, params)
        return res.json({ documents: result.rows, total: result.rows.length })
      } catch (err) {
        console.warn('Postgres unavailable for document listing, using JSON fallback:', err.message)
      }
    }

    const db = await loadDb()
    let results = [...db.documents]

    if (taxpayerTin) {
      results = results.filter((d) => d.taxpayerTin === String(taxpayerTin))
    }

    if (q) {
      const term = String(q).toLowerCase()
      results = results.filter(
        (d) =>
          d.title.toLowerCase().includes(term) ||
          d.type?.toLowerCase().includes(term) ||
          d.taxpayerName?.toLowerCase().includes(term),
      )
    }

    if (category && category !== 'all') {
      results = results.filter((d) => String(d.category || 'Other').toLowerCase() === String(category).toLowerCase())
    }

    if (type && type !== 'all') {
      results = results.filter((d) => String(d.type || '').toLowerCase() === String(type).toLowerCase())
    }

    if (status && status !== 'all') {
      results = results.filter((d) => String(d.status || '').toLowerCase() === String(status).toLowerCase())
    }

    res.json({ documents: results, total: results.length })
  } catch (err) {
    next(err)
  }
})

// Upload a single document
router.post('/', authenticate, authorize({ permission: 'canAddDocuments' }), upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file
    if (!file) return res.status(400).json({ error: 'File is required' })

    const { title, taxpayerTin, taxpayerName, type, tags } = req.body
    const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const safeName = path.basename(file.originalname || 'upload')
    const fileName = `${id}-${safeName}`
    const filesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'files')
    const filePath = path.join(filesDir, fileName)

    await fs.promises.mkdir(filesDir, { recursive: true })
    await fs.promises.copyFile(file.path, filePath)
    await fs.promises.unlink(file.path).catch(() => {})

    const parseTags = (value) => {
      if (!value) return []
      if (Array.isArray(value)) return value
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          return Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          return value.split(',').map((t) => t.trim()).filter(Boolean)
        }
      }
      return [String(value)]
    }

    const normalizedTags = parseTags(tags)

    if (usePg) {
      try {
        const result = await pool.query(
          `INSERT INTO documents (
            id, title, type, category, status, taxpayer_tin, taxpayer_name,
            file_name, file_path, file_size, mime_type, version, tags,
            uploaded_by, uploaded_at, analysis_status, created_at, updated_at
          ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
          RETURNING *`,
          [
            id,
            title || safeName,
            type || 'Other',
            'Other',
            'Active',
            taxpayerTin || null,
            taxpayerName || null,
            fileName,
            filePath,
            file.size,
            file.mimetype,
            1,
            JSON.stringify(normalizedTags),
            req.user.sub,
            new Date(),
            'pending',
            new Date(),
            new Date()
          ]
        )

        await logAudit({
          action: 'DOCUMENT_UPLOAD',
          userId: req.user.sub,
          username: req.user.username,
          details: `Uploaded document ${fileName}`,
        })

        return res.status(201).json({ document: result.rows[0] })
      } catch (err) {
        console.warn('Postgres unavailable for document upload, using JSON fallback:', err.message)
      }
    }

    const db = await loadDb()
    const doc = {
      id,
      title: title || safeName,
      type: type || 'Other',
      category: 'Other',
      status: 'Active',
      taxpayerTin: taxpayerTin || null,
      taxpayerName: taxpayerName || null,
      fileName,
      filePath,
      fileSize: file.size,
      mimeType: file.mimetype,
      version: 1,
      tags: normalizedTags,
      uploadedBy: req.user.sub,
      uploadedAt: new Date().toISOString(),
      analysisStatus: 'pending',
    }

    db.documents.unshift(doc)
    await saveDb(db)

    await logAudit({
      action: 'DOCUMENT_UPLOAD',
      userId: req.user.sub,
      username: req.user.username,
      details: `Uploaded document ${fileName}`,
    })

    res.status(201).json({ document: doc })
  } catch (err) {
    next(err)
  }
})

// Get a single document by id
router.get('/:id', authenticate, authorize({ permission: 'canViewDocuments' }), async (req, res, next) => {
  try {
    const { id } = req.params

    if (usePg) {
      try {
        const sql = `SELECT * FROM documents WHERE id = $1 LIMIT 1`
        const result = await pool.query(sql, [id])
        if (result.rows.length) {
          // Increment access count
          await pool.query(
            'UPDATE documents SET access_count = access_count + 1, last_accessed_at = $1 WHERE id = $2',
            [new Date(), id]
          )

          // Log access
          await pool.query(
            `INSERT INTO document_access_logs (id, document_id, user_id, username, action, ip_address, accessed_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [`log-${Date.now()}`, id, req.user.sub, req.user.username, 'VIEW', req.ip, new Date()]
          )

          return res.json({ document: result.rows[0] })
        }
      } catch (err) {
        console.warn('Postgres unavailable for document lookup, using JSON fallback:', err.message)
      }
    }

    const db = await loadDb()
    const doc = db.documents.find((d) => d.id === id)
    if (!doc) return res.status(404).json({ error: 'Document not found' })
    res.json({ document: doc })
  } catch (err) {
    next(err)
  }
})

function withTimeout(promiseFactory, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      console.error(`[documents] ${label} timed out after ${timeoutMs}ms`)
      reject(new Error(`${label} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    Promise.resolve()
      .then(promiseFactory)
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

// Trigger analysis for a document
router.post('/:id/analyze', authenticate, authorize({ permission: 'canAddDocuments', actionType: 'DOCUMENT_ANALYSIS' }), async (req, res, next) => {
  console.log(`[documents] analyze.start ${req.params.id}`)

  try {
    const { id } = req.params

    const db = await withTimeout(() => loadDb(), 5000, 'loadDb for analysis')
    if (!db || !Array.isArray(db.documents)) {
      console.error('Invalid store shape: documents array missing', { hasDb: !!db, hasDocuments: !!db?.documents, isArray: Array.isArray(db?.documents) })
      return res.status(500).json({ error: 'Document store is not initialized correctly' })
    }

    const doc = db.documents.find((d) => d.id === id)
    if (!doc) {
      console.warn(`[documents] analyze.document-not-found ${id}`)
      return res.status(404).json({ error: 'Document not found' })
    }
    if (!doc.fileName) {
      console.warn(`[documents] analyze.no-file ${id}`)
      return res.status(400).json({ error: 'No file available for analysis' })
    }

    const filesDir = getFilesRoot()
    const filePath = path.join(filesDir, doc.fileName)

    if (!fs.existsSync(filePath)) {
      console.warn(`[documents] analyze.file-not-found ${filePath}`)
      return res.status(404).json({ error: 'File not found on server' })
    }

    console.log(`[documents] analyze.file-ready ${filePath}`)

    const useQueue = await withTimeout(() => canUseQueue(), 3000, 'canUseQueue')
    console.log(`[documents] analyze.queue-enabled ${useQueue}`)

    if (useQueue && analysisQueue) {
      try {
        const job = await withTimeout(() => analysisQueue.add({
          documentId: doc.id,
          filePath,
          fileName: doc.fileName,
        }), 5000, 'queue.add')

        doc.analysisJobId = job.id
        doc.status = 'Processing'
        await withTimeout(() => saveDb(db), 5000, 'saveDb after queue assignment')

        console.log(`[documents] analyze.queued ${id} -> ${job.id}`)
        return res.json({ jobId: job.id, status: 'queued' })
      } catch (queueErr) {
        console.warn('[documents] queue analysis failed, falling back:', queueErr?.message || queueErr)
      }
    }

    doc.status = 'Processing'
    await withTimeout(() => saveDb(db), 5000, 'saveDb before sync analysis')

    let result
    try {
      result = await withTimeout(() => runAnalysisSynchronously({
        documentId: doc.id,
        filePath,
        fileName: doc.fileName,
      }), 20000, 'runAnalysisSynchronously')
    } catch (analysisErr) {
      console.error('[documents] runAnalysisSynchronously failed', analysisErr?.message || analysisErr)
      try {
        doc.status = 'Analysis Failed'
        await saveDb(db)
      } catch (resetErr) {
        console.error('Failed to reset document status after analysis failure:', resetErr)
      }
      return res.status(500).json({ error: 'Analysis failed', details: analysisErr?.message || 'Unknown error' })
    }

    console.log(`[documents] analyze.complete ${id}`)
    return res.json({ jobId: null, status: 'completed', result })
  } catch (err) {
    console.error('[documents] analyze.route crashed', err?.message || err)
    return res.status(500).json({ error: 'Analysis failed', details: err?.message || 'Unknown error' })
  }
})

// Approve a document for archival
router.post('/:id/approve-archive', authenticate, authorize({ permission: 'canApproveDocuments' }), async (req, res, next) => {
  try {
    const { id } = req.params
    const filesDir = getFilesRoot()

    if (usePg) {
      try {
        const result = await pool.query('SELECT * FROM documents WHERE id = $1 LIMIT 1', [id])
        if (result.rows.length) {
          const current = result.rows[0]
          const archivedFileName = await moveDocumentToInternalArchive(current.file_name || current.file_path || '', filesDir)
          const archivedPath = archivedFileName ? path.join(filesDir, archivedFileName) : path.join(filesDir, current.file_name || current.file_path || '')

          const updated = await pool.query(
            `UPDATE documents
             SET status = $1, file_name = $2, file_path = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            ['Archived', archivedFileName || current.file_name, archivedPath, id]
          )

          await logAudit({
            action: 'DOCUMENT_ARCHIVE_APPROVE',
            userId: req.user?.sub,
            username: req.user?.username,
            details: `Approved document ${id} for archival`,
          })

          return res.json({ document: updated.rows[0] })
        }
      } catch (err) {
        console.warn('Postgres unavailable for archive approval, using JSON fallback:', err.message)
      }
    }

    const db = await loadDb()
    const doc = db.documents.find((d) => d.id === id)
    if (!doc) return res.status(404).json({ error: 'Document not found' })

    const archivedFileName = await moveDocumentToInternalArchive(doc.fileName || '', filesDir)
    doc.fileName = archivedFileName || doc.fileName
    doc.filePath = archivedFileName ? path.join(filesDir, archivedFileName) : doc.filePath
    doc.status = 'Archived'
    doc.archiveApprovedBy = req.user?.username || req.user?.sub
    doc.archiveApprovedAt = new Date().toISOString()
    doc.archiveLocation = 'internal-archive'
    await saveDb(db)

    await logAudit({
      action: 'DOCUMENT_ARCHIVE_APPROVE',
      userId: req.user?.sub,
      username: req.user?.username,
      details: `Approved document ${id} for archival`,
    })

    res.json({ document: doc })
  } catch (err) {
    next(err)
  }
})

// Update document metadata
router.patch('/:id', authenticate, authorize({ permission: 'canEditDocuments' }), async (req, res, next) => {
  try {
    const { id } = req.params

    if (usePg) {
      const allowed = [
        'title', 'description', 'type', 'category', 'status',
        'taxpayerTin', 'taxpayerName', 'taxpayerId',
        'periodStart', 'periodEnd', 'expiryDate',
        'tags', 'retentionPolicy', 'metadata'
      ]
      const setClauses = []
      const params = []
      let paramCount = 0

      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          paramCount++
          const dbKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase())
          setClauses.push(`${dbKey} = $${paramCount}`)
          params.push(key === 'tags' || key === 'metadata' ? JSON.stringify(req.body[key]) : req.body[key])
        }
      }

      if (!setClauses.length) {
        return res.status(400).json({ error: 'No valid fields to update' })
      }

      paramCount++
      params.push(id)

      const sql = `UPDATE documents SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`
      const result = await pool.query(sql, params)
      
      await logAudit({
        action: 'DOCUMENT_UPDATE',
        userId: req.user.sub,
        username: req.user.username,
        details: `Updated document ${id}`,
      })
      
      return res.json({ document: result.rows[0] })
    }

    const db = await loadDb()
    const doc = db.documents.find((d) => d.id === id)
    if (!doc) return res.status(404).json({ error: 'Document not found' })

    const allowedUpdates = ['title', 'type', 'taxpayerTin', 'expiryDate', 'version', 'status']
    const updates = {}
    const previousVersion = { ...doc }

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key]
      }
    }

    // Handle versioning
    if (req.body.newVersion && doc.version) {
      if (!doc.previousVersions) doc.previousVersions = []
      doc.previousVersions.push({
        version: doc.version,
        title: doc.title,
        type: doc.type,
        updatedAt: doc.updatedAt || doc.uploadedAt,
        updatedBy: req.user?.username
      })
      updates.version = req.body.newVersion
    }

    Object.assign(doc, updates, { updatedAt: new Date().toISOString() })
    await saveDb(db)

    await logAudit({
      action: 'DOCUMENT_UPDATE',
      userId: req.user?.sub,
      username: req.user?.username,
      details: `Updated document ${id}: ${JSON.stringify({ ...updates, previousVersion })}`
    })

    res.json({ document: doc })
  } catch (err) {
    next(err)
  }
})

// Create new version of document
router.post('/:id/version', authenticate, authorize({ permission: 'canAddDocuments' }), upload.single('file'), async (req, res, next) => {
  try {
    const { id } = req.params
    const db = await loadDb()
    const doc = db.documents.find((d) => d.id === id)
    if (!doc) return res.status(404).json({ error: 'Document not found' })
    if (!req.file) return res.status(400).json({ error: 'File is required' })

    // Save current version to history
    if (!doc.previousVersions) doc.previousVersions = []
    doc.previousVersions.push({
      version: doc.version,
      fileName: doc.fileName,
      title: doc.title,
      type: doc.type,
      uploadedAt: doc.uploadedAt,
      uploadedBy: doc.metadata?.uploadedBy
    })

    // Update with new version
    const newVersion = String(Number(doc.version) + 0.1)
    doc.fileName = req.file.filename
    doc.version = newVersion
    doc.uploadedAt = new Date().toISOString()
    doc.metadata = {
      ...doc.metadata,
      uploadedBy: req.user?.username,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      changeDescription: req.body.changeDescription || 'Version update'
    }
    doc.status = 'Updated'
    await saveDb(db)

    // Re-analyze the new version
    try {
      const filesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'files')
      const filePath = req.file.path || path.join(filesDir, req.file.filename)
      const job = await analysisQueue.add({
        documentId: doc.id,
        filePath,
        fileName: req.file.filename,
      })
      doc.analysisJobId = job.id
      doc.status = 'Processing'
      await saveDb(db)
    } catch (err) {
      console.error('Failed to queue analysis job:', err?.message || err)
    }

    await logAudit({
      action: 'DOCUMENT_VERSION_CREATE',
      userId: req.user?.sub,
      username: req.user?.username,
      details: `Created version ${newVersion} of document ${id}`
    })

    res.json({ document: doc })
  } catch (err) {
    next(err)
  }
})

// Get document versions
router.get('/:id/versions', authenticate, authorize({ permission: 'canViewDocuments' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query(
        'SELECT * FROM document_versions WHERE document_id = $1 ORDER BY version DESC',
        [req.params.id]
      )
      return res.json({ versions: result.rows })
    }

    const db = await loadDb()
    const doc = db.documents.find((d) => d.id === req.params.id)
    if (!doc) return res.status(404).json({ error: 'Document not found' })

    const versions = [
      {
        version: doc.version,
        fileName: doc.fileName,
        title: doc.title,
        type: doc.type,
        uploadedAt: doc.uploadedAt,
        uploadedBy: doc.metadata?.uploadedBy,
        isCurrent: true
      },
      ...(doc.previousVersions || []).map(v => ({ ...v, isCurrent: false }))
    ]

    res.json({ versions })
  } catch (err) {
    next(err)
  }
})

// Check document expiry status
router.get('/:id/expiry-status', authenticate, authorize({ permission: 'canViewDocuments' }), async (req, res, next) => {
  try {
    const db = await loadDb()
    const doc = db.documents.find((d) => d.id === req.params.id)
    if (!doc) return res.status(404).json({ error: 'Document not found' })

    if (!doc.expiryDate) {
      return res.json({ hasExpiry: false, status: 'No expiry date set' })
    }

    const expiryDate = new Date(doc.expiryDate)
    const now = new Date()
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))

    let status = 'valid'
    if (daysUntilExpiry < 0) {
      status = 'expired'
    } else if (daysUntilExpiry <= 30) {
      status = 'expiring_soon'
    }

    res.json({
      hasExpiry: true,
      expiryDate: doc.expiryDate,
      daysUntilExpiry,
      status,
      message: status === 'expired' 
        ? `Expired ${Math.abs(daysUntilExpiry)} days ago`
        : status === 'expiring_soon'
        ? `Expires in ${daysUntilExpiry} days`
        : `Valid for ${daysUntilExpiry} more days`
    })
  } catch (err) {
    next(err)
  }
})

// Get document access logs
router.get('/:id/access-logs', authenticate, authorize({ permission: 'canViewDocuments' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query(
        'SELECT * FROM document_access_logs WHERE document_id = $1 ORDER BY accessed_at DESC LIMIT 50',
        [req.params.id]
      )
      return res.json({ logs: result.rows })
    }

    // Placeholder for JSON storage
    res.json({ logs: [] })
  } catch (err) {
    next(err)
  }
})

// Get all folders
router.get('/folders', authenticate, authorize({ permission: 'canViewDocuments' }), async (req, res, next) => {
  try {
    if (usePg) {
      const result = await pool.query('SELECT * FROM document_folders ORDER BY path ASC')
      return res.json({ folders: result.rows })
    }

    // Placeholder for JSON storage
    res.json({ folders: [] })
  } catch (err) {
    next(err)
  }
})

// Create new folder
router.post('/folders', authenticate, authorize({ permission: 'canManageDocuments' }), async (req, res, next) => {
  try {
    const { name, parentId } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' })
    }

    const id = `folder-${Date.now()}`
    
    if (usePg) {
      // Build path
      let folderPath = `/${name}`
      if (parentId) {
        const parentResult = await pool.query('SELECT * FROM document_folders WHERE id = $1', [parentId])
        if (parentResult.rows.length) {
          folderPath = `${parentResult.rows[0].path}/${name}`
        }
      }

      const result = await pool.query(
        `INSERT INTO document_folders (id, name, parent_id, path, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [id, name, parentId || null, folderPath, req.user.sub, new Date(), new Date()]
      )
      
      return res.status(201).json({ folder: result.rows[0] })
    }

    const folder = {
      id,
      name,
      parentId: parentId || null,
      createdAt: new Date().toISOString(),
    }

    res.status(201).json({ folder })
  } catch (err) {
    next(err)
  }
})

// Add document to folder
router.post('/:documentId/folders/:folderId', authenticate, authorize({ permission: 'canManageDocuments' }), async (req, res, next) => {
  try {
    const { documentId, folderId } = req.params

    if (usePg) {
      const result = await pool.query(
        `INSERT INTO document_folder_items (id, folder_id, document_id, added_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (folder_id, document_id) DO NOTHING
         RETURNING *`,
        [`item-${Date.now()}`, folderId, documentId, new Date()]
      )
      return res.status(201).json({ item: result.rows[0] })
    }

    res.status(201).json({ message: 'Document added to folder' })
  } catch (err) {
    next(err)
  }
})

// Remove document from folder
router.delete('/:documentId/folders/:folderId', authenticate, authorize({ permission: 'canManageDocuments' }), async (req, res, next) => {
  try {
    const { documentId, folderId } = req.params

    if (usePg) {
      await pool.query(
        'DELETE FROM document_folder_items WHERE folder_id = $1 AND document_id = $2',
        [folderId, documentId]
      )
      return res.json({ message: 'Document removed from folder' })
    }

    res.json({ message: 'Document removed from folder' })
  } catch (err) {
    next(err)
  }
})

// Bulk upload documents
router.post('/bulk-upload', authenticate, authorize({ permission: 'canAddDocuments' }), upload.array('files', 50), async (req, res, next) => {
  try {
    const files = req.files
    const { taxpayerTin, taxpayerName, category, type, tags } = req.body

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' })
    }

    const uploaded = []

    if (usePg) {
      for (const file of files) {
        const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const fileName = `${id}-${file.originalname}`
        const filePath = path.join(process.cwd(), 'server', 'files', fileName)
        await fs.promises.writeFile(filePath, file.buffer)

        const result = await pool.query(
          `INSERT INTO documents (
            id, title, type, category, status, taxpayer_tin, taxpayer_name,
            file_name, file_path, file_size, mime_type, version, tags,
            uploaded_by, uploaded_at, analysis_status, created_at, updated_at
          ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
          RETURNING *`,
          [
            id,
            file.originalname,
            type || 'Other',
            category || 'Other',
            'Active',
            taxpayerTin || null,
            taxpayerName || null,
            fileName,
            filePath,
            file.size,
            file.mimetype,
            1,
            tags ? JSON.stringify(tags) : null,
            req.user.sub,
            new Date(),
            'pending',
            new Date(),
            new Date()
          ]
        )

        uploaded.push(result.rows[0])
      }

      await logAudit({
        action: 'DOCUMENT_BULK_UPLOAD',
        userId: req.user.sub,
        username: req.user.username,
        details: `Bulk uploaded ${uploaded.length} documents`,
      })

      return res.status(201).json({ documents: uploaded })
    }

    const docs = await loadDb()

    for (const file of files) {
      const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const fileName = `${id}-${file.originalname}`
      const filePath = path.join(process.cwd(), 'server', 'files', fileName)

      await fs.promises.writeFile(filePath, file.buffer)

      const doc = {
        id,
        title: file.originalname,
        type: type || 'Other',
        category: category || 'Other',
        status: 'Active',
        taxpayerTin: taxpayerTin || null,
        taxpayerName: taxpayerName || null,
        fileName,
        filePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        version: 1,
        tags: tags ? JSON.parse(tags) : null,
        uploadedBy: req.user.sub,
        uploadedAt: new Date().toISOString(),
        analysisStatus: 'pending',
      }

      docs.documents.unshift(doc)
      uploaded.push(doc)
    }

    await saveDb(docs)

    await logAudit({
      action: 'DOCUMENT_BULK_UPLOAD',
      userId: req.user.sub,
      username: req.user.username,
      details: `Bulk uploaded ${uploaded.length} documents`,
    })

    res.status(201).json({ documents: uploaded })
  } catch (err) {
    next(err)
  }
})

// Export documents
router.get('/export', authenticate, authorize({ permission: 'canViewDocuments' }), async (req, res, next) => {
  try {
    const { format = 'json' } = req.query

    if (usePg) {
      const result = await pool.query('SELECT * FROM documents ORDER BY uploaded_at DESC')
      const documents = result.rows

      if (format === 'csv') {
        // Convert to CSV
        const headers = Object.keys(documents[0] || {}).join(',')
        const rows = documents.map(doc => Object.values(doc).join(','))
        const csv = [headers, ...rows].join('\n')
        
        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', 'attachment; filename=documents.csv')
        return res.send(csv)
      }

      return res.json({ documents })
    }

    const db = await loadDb()
    res.json({ documents: db.documents })
  } catch (err) {
    next(err)
  }
})

// Serve the raw file for a document (download/preview)
router.get('/:id/file', authenticate, authorize({ permission: 'canViewDocuments' }), async (req, res, next) => {
  try {
    const { id } = req.params
    let fileName = null

    if (usePg) {
      const result = await pool.query('SELECT id, file_name FROM documents WHERE id = $1 LIMIT 1', [id])
      if (!result.rows.length) return res.status(404).json({ error: 'Document not found' })
      fileName = result.rows[0].file_name
    } else {
      const db = await loadDb()
      const doc = db.documents.find((d) => d.id === id)
      if (!doc) return res.status(404).json({ error: 'Document not found' })
      fileName = doc.fileName
    }

    if (!fileName) return res.status(404).json({ error: 'No file available for this document' })

    // Resolve file in server/files (two levels up from src/routes)
    const fileUrl = new URL(`../../files/${fileName}`, import.meta.url)
    const filePath = fileURLToPath(fileUrl)
    if (!path.isAbsolute(filePath)) return res.status(500).json({ error: 'Invalid file path' })
    return res.sendFile(filePath, (err) => {
      if (err) return next(err)
    })
  } catch (err) {
    next(err)
  }
})

export default router