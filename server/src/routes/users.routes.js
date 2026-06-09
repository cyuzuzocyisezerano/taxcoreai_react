import { Router } from 'express'
import { pool } from '../db.js' // adjust path based on your project
import { loadDb } from '../data/store.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    if (process.env.DATABASE_URL) {
      const result = await pool.query('SELECT id, username, full_name AS fullName, role FROM users')
      return res.json(result.rows)
    }

    const db = await loadDb()
    const users = db.users?.map((user) => ({
      id: user.id,
      username: user.username,
      fullName: user.name,
      role: user.role,
    }))
    res.json(users)
  } catch (err) {
    console.error(err)
    res.status(500).json({
      error: 'Database query connection failed',
    })
  }
})

export default router