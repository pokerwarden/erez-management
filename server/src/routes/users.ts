import { Router } from 'express'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'

const router = Router()

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'EMPLOYEE']).default('EMPLOYEE'),
})

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
  avatarUrl: z.string().optional(),
})

router.get('/', requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, avatarUrl: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  res.json(users)
})

router.post('/', requireAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (exists) return res.status(409).json({ error: 'Email already in use' })

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  const user = await prisma.user.create({
    data: { ...parsed.data, passwordHash, password: undefined } as any,
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
  })
  res.status(201).json(user)
})

router.put('/:id', requireAdmin, async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { password, ...rest } = parsed.data
  const data: Record<string, unknown> = { ...rest }
  if (password) data.passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
  })
  res.json(user)
})

router.delete('/:id', requireAdmin, async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

export default router
