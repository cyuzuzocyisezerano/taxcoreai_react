import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export function authenticate(req, res, next) {
  const header = req.headers.authorization
  const queryToken = typeof req.query?.token === 'string' ? req.query.token : null
  const bearerToken = header?.startsWith('Bearer ') ? header.slice(7) : null
  const token = queryToken || bearerToken

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret)
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
