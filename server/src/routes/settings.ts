import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()

const uploadDir = process.env.UPLOAD_DIR || './uploads'
const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, _file, cb) => cb(null, `logo-${Date.now()}.png`),
})
const logoUpload = multer({ storage: logoStorage, limits: { fileSize: 5 * 1024 * 1024 } })

const settingsSchema = z.object({
  firmName: z.string().min(1).optional(),
  primaryColor: z.string().optional(),
  emailFrom: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
})

router.get('/', requireAuth, async (_req, res) => {
  const settings = await prisma.firmSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  })
  res.json(settings)
})

router.put('/', requireAdmin, async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const settings = await prisma.firmSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...parsed.data },
    update: parsed.data,
  })
  res.json(settings)
})

router.post('/logo', requireAdmin, logoUpload.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  const settings = await prisma.firmSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', firmLogo: req.file.path },
    update: { firmLogo: req.file.path },
  })
  res.json(settings)
})

export default router
