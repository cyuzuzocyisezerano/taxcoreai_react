import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { config } from './config.js'
import { errorHandler } from './middleware/errorHandler.js'
import healthRoutes from './routes/health.routes.js'
import authRoutes from './routes/auth.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import taxpayersRoutes from './routes/taxpayers.routes.js'
import documentsRoutes from './routes/documents.routes.js'
import auditRoutes from './routes/audit.routes.js'
import usersRoutes from './routes/users.routes.js'
import searchRoutes from './routes/search.routes.js'
import notificationsRoutes from './routes/notifications.routes.js'
import workflowsRoutes from './routes/workflows.routes.js'
import reportsRoutes from './routes/reports.routes.js'
import settingsRoutes from './routes/settings.routes.js'
import aiRoutes from './routes/ai.routes.js'




export function createApp() {
  const app = express()
  app.use(
    cors({
      origin: (origin, cb) => {
        // allow non-browser requests (curl, server-to-server) or same-origin (no origin)
        if (!origin) return cb(null, true)
        if (config.allowAnyOrigin) return cb(null, true)
        if (Array.isArray(config.clientUrls) && config.clientUrls.includes(origin)) return cb(null, true)
        return cb(null, false)
      },
      credentials: true,
    }),
  )
  app.use(express.json())

  // In production serve the built frontend from /dist
  if (process.env.NODE_ENV === 'production') {
    // Try current working dir `dist`, then parent `../dist` (repo root build)
    let staticDir = path.join(process.cwd(), 'dist')
    if (!fs.existsSync(staticDir)) staticDir = path.join(process.cwd(), '..', 'dist')
    console.log('Serving static from', staticDir)
    app.use(express.static(staticDir))
    // Ensure root serves index.html explicitly
    app.get('/', (req, res) => res.sendFile(path.join(staticDir, 'index.html')))
    // Serve index.html for any non-API GET request (SPA fallback)
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next()
      if (req.path.startsWith('/api')) return next()
      res.sendFile(path.join(staticDir, 'index.html'))
    })
  }

  app.use(healthRoutes)
  app.use('/api/auth', authRoutes)
  app.use('/api/dashboard', dashboardRoutes)
  app.use('/api/taxpayers', taxpayersRoutes)
  app.use('/api/documents', documentsRoutes)
  app.use('/api/audit-logs', auditRoutes)
  app.use('/api/users', usersRoutes)
  app.use('/api/search', searchRoutes)
  app.use('/api/notifications', notificationsRoutes)
  app.use('/api/workflows', workflowsRoutes)
  app.use('/api/reports', reportsRoutes)
  app.use('/api/settings', settingsRoutes)
  app.use('/api/ai-assistant', aiRoutes)

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  app.use(errorHandler)

  return app
}
