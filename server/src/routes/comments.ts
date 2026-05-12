import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { emitToAll } from '../lib/socket'

const router = Router()

const commentSchema = z.object({
  content: z.string().min(1),
  caseId: z.string().optional(),
  taskId: z.string().optional(),
})

router.get('/cases/:id/comments', requireAuth, async (req, res) => {
  const comments = await prisma.comment.findMany({
    where: { caseId: req.params.id },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  })
  res.json(comments)
})

router.get('/tasks/:id/comments', requireAuth, async (req, res) => {
  const comments = await prisma.comment.findMany({
    where: { taskId: req.params.id },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  })
  res.json(comments)
})

router.post('/', requireAuth, async (req, res) => {
  const parsed = commentSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  if (!parsed.data.caseId && !parsed.data.taskId) {
    return res.status(400).json({ error: 'Either caseId or taskId is required' })
  }

  const comment = await prisma.comment.create({
    data: { ...parsed.data, userId: req.user!.id },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })

  emitToAll('comment:created', comment)
  res.status(201).json(comment)
})

export default router
