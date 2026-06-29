import { Router } from 'express'
import { loadDb } from '../data/store.js'
import { pool } from '../db.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    if (process.env.DATABASE_URL) {
      const result = await pool.query(
        'SELECT id, username, name AS "fullName", role FROM users',
      )

      return res.json(result.rows)
    }

    const db = await loadDb()
    const users = (db.users ?? []).map((user) => ({
      id: user.id,
      username: user.username,
      fullName: user.name,
      role: user.role,
    }))

    res.json(users)
  } catch (err) {
    next(err)
  }
})

export default router

