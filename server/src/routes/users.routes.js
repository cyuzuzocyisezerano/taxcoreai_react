import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { loadDb, saveDb } from '../data/store.js'
import { pool } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/authorize.js'

const router = Router()

router.get('/', authenticate, authorize({ permission: 'canViewUsers' }), async (_req, res, next) => {
  try {
    if (process.env.DATABASE_URL) {
      const result = await pool.query(
        'SELECT id, username, full_name AS "fullName", role, email, is_active FROM users ORDER BY username',
      )

      return res.json(result.rows)
    }

    const db = await loadDb()
    const users = (db.users ?? []).map((user) => ({
      id: user.id,
      username: user.username,
      fullName: user.name,
      role: user.role,
      email: user.email,
      isActive: user.isActive ?? true,
    }))

    res.json(users)
  } catch (err) {
    next(err)
  }
})

router.post('/', authenticate, authorize({ permission: 'canAddUsers' }), async (req, res, next) => {
  try {
    const { username, fullName, email, password, role = 'Officer' } = req.body

    if (!username?.trim() || !fullName?.trim() || !password) {
      return res.status(400).json({ error: 'Username, full name, and password are required' })
    }

    if (process.env.DATABASE_URL) {
      const existing = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1', [username.trim()])
      if (existing.rowCount) {
        return res.status(409).json({ error: 'A user with that username already exists' })
      }

      const passwordHash = await bcrypt.hash(password, 10)
      const id = `user-${Date.now()}`
      const result = await pool.query(
        `INSERT INTO users (id, username, email, full_name, password_hash, role, title, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, username, full_name AS "fullName", role, email, is_active AS "isActive"`,
        [id, username.trim(), email?.trim() || null, fullName.trim(), passwordHash, role, role, true],
      )

      return res.status(201).json(result.rows[0])
    }

    const db = await loadDb()
    if ((db.users ?? []).some((user) => user.username.toLowerCase() === username.trim().toLowerCase())) {
      return res.status(409).json({ error: 'A user with that username already exists' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const newUser = {
      id: `user-${Date.now()}`,
      username: username.trim(),
      name: fullName.trim(),
      email: email?.trim() || null,
      passwordHash,
      role,
      title: role,
      isActive: true,
    }

    db.users.push(newUser)
    await saveDb(db)

    return res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      fullName: newUser.name,
      role: newUser.role,
      email: newUser.email,
      isActive: newUser.isActive,
    })
  } catch (err) {
    next(err)
  }
})

export default router

