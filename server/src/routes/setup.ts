import { Router } from 'express'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const router = Router()

const initSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

router.get('/status', async (_req, res) => {
  const count = await prisma.user.count()
  res.json({ initialized: count > 0 })
})

router.post('/init', async (req, res) => {
  const count = await prisma.user.count()
  if (count > 0) {
    return res.status(403).json({ error: 'Already initialized' })
  }

  const parsed = initSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const { name, email, password } = parsed.data
  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: 'ADMIN' },
    select: { id: true, name: true, email: true, role: true },
  })

  // Create default firm settings
  await prisma.firmSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  })

  res.json({ success: true, user })
})

export default router
