import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { loadDb } from '../data/store.js'
import { authenticate } from '../middleware/auth.js'
import { logAudit } from '../services/audit.service.js'

const router = Router()

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
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

    const db = await loadDb()
    const user = db.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase())

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn },
    )

    await logAudit({
      action: 'LOGIN',
      userId: user.id,
      username: user.username,
      details: 'Successful login',
    })

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
    const db = await loadDb()
    const user = db.users.find((u) => u.id === req.user.sub)

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
