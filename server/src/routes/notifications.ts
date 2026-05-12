import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const { read, limit = '20' } = req.query as Record<string, string>

  const where: Record<string, unknown> = { userId: req.user!.id }
  if (read === 'false') where.read = false

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit),
  })

  const unreadCount = await prisma.notification.count({
    where: { userId: req.user!.id, read: false },
  })

  res.json({ notifications, unreadCount })
})

router.put('/:id/read', requireAuth, async (req, res) => {
  const notif = await prisma.notification.findUnique({ where: { id: req.params.id } })
  if (!notif || notif.userId !== req.user!.id) {
    return res.status(404).json({ error: 'Not found' })
  }
  const updated = await prisma.notification.update({
    where: { id: req.params.id },
    data: { read: true },
  })
  res.json(updated)
})

router.put('/read-all', requireAuth, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, read: false },
    data: { read: true },
  })
  res.json({ success: true })
})

export default router
