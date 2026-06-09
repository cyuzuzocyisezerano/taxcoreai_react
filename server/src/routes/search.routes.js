import { Router } from 'express'
import { loadDb } from '../data/store.js'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const db = await loadDb()
    const q = String(req.query.q || '').trim().toLowerCase()
    if (!q) {
      return res.json({ taxpayers: [], documents: [] })
    }

    const taxpayers = db.taxpayers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.tin.toLowerCase().includes(q) ||
        t.alias?.toLowerCase().includes(q) ||
        t.district.toLowerCase().includes(q),
    )

    const documents = db.documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        d.taxpayerTin.toLowerCase().includes(q),
    )

    res.json({ taxpayers, documents })
  } catch (err) {
    next(err)
  }
})

export default router
