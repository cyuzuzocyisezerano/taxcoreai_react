import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { loadDb } from '../data/store.js'
import { pool } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { logAudit } from '../services/audit.service.js'

const router = Router()

const usePg = Boolean(process.env.DATABASE_URL)

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name || user.name,
    email: user.email,
    role: user.role,
    title: user.title,
  }
}

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body

    if (!username?.trim() || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    let user
    if (usePg) {
      const result = await pool.query(
        'SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1',
        [username.trim()]
      )
      user = result.rows[0]
    } else {
      const db = await loadDb()
      user = db.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase())
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const valid = await bcrypt.compare(password, user.password_hash || user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn },
    )

    // Login should not fail if audit logging fails (e.g., DB not ready)
    try {
      await logAudit({
        action: 'LOGIN',
        userId: user.id,
        username: user.username,
        details: 'Successful login',
      })
    } catch {
      // ignore
    }


    res.json({
      token,
      user: publicUser(user),
    })
  } catch (err) {
    next(err)
  }
})

router.get('/me', authenticate, async (req, res, next) => {
  try {
    let user
    if (usePg) {
      const result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [req.user.sub])
      user = result.rows[0]
    } else {
      const db = await loadDb()
      user = db.users.find((u) => u.id === req.user.sub)
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user: publicUser(user) })
  } catch (err) {
    next(err)
  }
})

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await logAudit({
      action: 'LOGOUT',
      userId: req.user.sub,
      username: req.user.username,
      details: 'User signed out',
    })
    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    next(err)
  }
})

export default router
