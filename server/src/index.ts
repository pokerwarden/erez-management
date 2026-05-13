import 'dotenv/config'
import express from 'express'
import http from 'http'
import cors from 'cors'
import path from 'path'
import cookieParser from 'cookie-parser'

import { initSocket } from './lib/socket'
import setupRouter from './routes/setup'
import authRouter from './routes/auth'
import casesRouter from './routes/cases'
import tasksRouter from './routes/tasks'
import commentsRouter from './routes/comments'
import documentsRouter from './routes/documents'
import notificationsRouter from './routes/notifications'
import usersRouter from './routes/users'
import settingsRouter from './routes/settings'
import webhooksRouter from './routes/webhooks'
import versionRouter from './routes/version'

const app = express()
const httpServer = http.createServer(app)

// Init Socket.IO
initSocket(httpServer)

// Middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

// Serve static React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'public')))
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/setup', setupRouter)
app.use('/api/auth', authRouter)
app.use('/api/cases', casesRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/comments', commentsRouter)
app.use('/api', commentsRouter) // /api/cases/:id/comments and /api/tasks/:id/comments
app.use('/api', documentsRouter) // /api/cases/:id/documents etc.
app.use('/api/notifications', notificationsRouter)
app.use('/api/users', usersRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/webhooks', webhooksRouter)
app.use('/api/version', versionRouter)

// Fallback to React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
  })
}

const PORT = parseInt(process.env.PORT || '3000', 10)
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app
