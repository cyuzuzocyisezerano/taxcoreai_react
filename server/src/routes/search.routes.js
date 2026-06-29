import { Router } from 'express'
import { loadDb } from '../data/store.js'
import { pool } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/authorize.js'

const router = Router()

const usePg = Boolean(process.env.DATABASE_URL)

router.get('/', authenticate, authorize({ permission: 'canViewDocuments' }), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase()
    if (!q) {
      return res.json({ taxpayers: [], documents: [] })
    }

    try {
      const searchPattern = `%${q}%`
      let taxpayers = []
      let documents = []

      if (usePg) {
        const taxpayerResult = await pool.query(
          `SELECT id, name, tin, type, district, status, registered, alias, business_name, address, contact, email, phone, tax_regime, business_activity, bank_name, bank_account, authorized_representative, representative_id, representative_contact
           FROM taxpayers
           WHERE LOWER(name) LIKE $1 OR LOWER(alias) LIKE $1 OR tin::text LIKE $1 OR LOWER(district) LIKE $1 OR LOWER(business_name) LIKE $1 OR LOWER(email) LIKE $1
           ORDER BY registered DESC LIMIT 50`,
          [searchPattern]
        )
        taxpayers = taxpayerResult.rows

        const documentResult = await pool.query(
          `SELECT id, title, type, status, taxpayer_tin AS "taxpayerTin", taxpayer_name AS "taxpayerName", file_name AS "fileName", uploaded_at AS "uploadedAt"
           FROM documents
           WHERE LOWER(title) LIKE $1 OR LOWER(type) LIKE $1 OR LOWER(taxpayer_name) LIKE $1
           ORDER BY uploaded_at DESC LIMIT 50`,
          [searchPattern]
        )
        documents = documentResult.rows
      } else {
        const db = await loadDb()
        taxpayers = db.taxpayers.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.tin.toLowerCase().includes(q) ||
            t.alias?.toLowerCase().includes(q) ||
            t.district.toLowerCase().includes(q) ||
            t.businessName?.toLowerCase().includes(q) ||
            t.email?.toLowerCase().includes(q),
        )
        documents = db.documents.filter(
          (d) =>
            d.title.toLowerCase().includes(q) ||
            d.type?.toLowerCase().includes(q) ||
            d.taxpayerTin?.toLowerCase().includes(q) ||
            d.taxpayerName?.toLowerCase().includes(q),
        )
      }

      return res.json({ taxpayers, documents })
    } catch (dbError) {
      console.error('Search error:', dbError)
      return res.status(500).json({ error: 'Search failed', details: dbError.message })
    }
  } catch (err) {
    console.error('Search route error:', err)
    return res.status(500).json({ error: 'Search failed', details: err.message })
  }
})

export default router