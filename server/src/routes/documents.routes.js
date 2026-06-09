import { Router } from 'express'
import { loadDb, saveDb } from '../data/store.js'
import fs from 'fs'
import multer from 'multer'
import { fileURLToPath } from 'url'
import path from 'path'
import { pool } from '../db.js'

const router = Router()

// Allow public GET access for documents. If `DATABASE_URL` is set, query Postgres.
const usePg = Boolean(process.env.DATABASE_URL)

router.get('/', async (req, res, next) => {
  try {
    const { taxpayerTin, q } = req.query

    if (usePg) {
      const where = []
      const params = []

      if (taxpayerTin) {
        params.push(String(taxpayerTin))
        where.push(`taxpayer_tin = $${params.length}`)
      }

      if (q) {
        params.push(`%${String(q).toLowerCase()}%`)
        where.push(`(LOWER(title) LIKE $${params.length} OR LOWER(type) LIKE $${params.length})`)
      }

      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
      const sql = `SELECT id, taxpayer_tin AS "taxpayerTin", title, type, status, uploaded_at AS "uploadedAt" FROM documents ${whereClause} ORDER BY uploaded_at DESC LIMIT 200`
      const result = await pool.query(sql, params)
      return res.json({ documents: result.rows, total: result.rows.length })
    }

    const db = await loadDb()
    let results = [...db.documents]

    if (req.query.taxpayerTin) {
      results = results.filter((d) => d.taxpayerTin === req.query.taxpayerTin)
    }

    res.json({ documents: results, total: results.length })
  } catch (err) {
    next(err)
  }
})

// Get a single document by id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    if (usePg) {
      const sql = `SELECT id, taxpayer_tin AS "taxpayerTin", title, type, status, uploaded_at AS "uploadedAt" FROM documents WHERE id = $1 LIMIT 1`
      const result = await pool.query(sql, [id])
      if (!result.rows.length) return res.status(404).json({ error: 'Document not found' })
      return res.json({ document: result.rows[0] })
    }

    const db = await loadDb()
    const doc = db.documents.find((d) => d.id === id)
    if (!doc) return res.status(404).json({ error: 'Document not found' })
    res.json({ document: doc })
  } catch (err) {
    next(err)
  }
})

// Upload a new document (multipart/form-data: file, title, taxpayerTin, type)
const filesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'files')
if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, filesDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
})

// Server-side validation: accept only PDFs and images, limit size to 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg']
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Invalid file type'))
  },
})

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File is required' })
    const { title = req.file.originalname, taxpayerTin = null, type = '' } = req.body

    const db = await loadDb()
    const id = `doc-${Date.now()}`
    const newDoc = {
      id,
      title,
      taxpayerTin,
      type,
      status: 'Uploaded',
      fileName: req.file.filename,
      uploadedAt: new Date().toISOString(),
    }
    db.documents.unshift(newDoc)
    await saveDb(db)

    res.status(201).json({ document: newDoc })
  } catch (err) {
    next(err)
  }
})

// Serve the raw file for a document (download/preview)
router.get('/:id/file', async (req, res, next) => {
  try {
    const { id } = req.params
    const db = await loadDb()
    const doc = db.documents.find((d) => d.id === id)
    if (!doc) return res.status(404).json({ error: 'Document not found' })

    if (!doc.fileName) return res.status(404).json({ error: 'No file available for this document' })

    // Resolve file in server/files (two levels up from src/routes)
    const fileUrl = new URL(`../../files/${doc.fileName}`, import.meta.url)
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
