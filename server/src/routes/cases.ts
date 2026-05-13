import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { emitToAll, emitToUser } from '../lib/socket'
import axios from 'axios'

const router = Router()

const caseSchema = z.object({
  title: z.string().min(1),
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'PENDING_CLIENT', 'PENDING_COURT', 'PENDING_RESPONSE', 'CLOSED', 'ARCHIVED']).optional(),
  courtDate: z.string().optional(),
  courtName: z.string().optional(),
  courtCaseNumber: z.string().optional(),
  caseType: z.string().optional(),
  initialPrice: z.number().optional().nullable(),
  totalCaseValue: z.number().optional().nullable(),
  workHours: z.number().optional().nullable(),
  clientProposal: z.number().optional().nullable(),
  totalUsed: z.number().optional().nullable(),
})

function generateCaseNumber(): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 90000) + 10000
  return `${year}-${rand}`
}

// GET /api/cases
router.get('/', requireAuth, async (req, res) => {
  const { status, caseType, assignee, search, page = '1', limit = '20' } = req.query as Record<string, string>

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (caseType) where.caseType = caseType
  if (assignee) where.assignments = { some: { userId: assignee } }
  if (search) {
    where.OR = [
      { caseNumber: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
      { clientName: { contains: search, mode: 'insensitive' } },
    ]
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { updatedAt: 'desc' },
      include: {
        assignments: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        _count: { select: { tasks: true, documents: true } },
      },
    }),
    prisma.case.count({ where }),
  ])

  res.json({ cases, total, page: parseInt(page), limit: parseInt(limit) })
})

// GET /api/cases/overview — cross-employee status view
router.get('/overview', requireAdmin, async (req, res) => {
  const [cases, users] = await Promise.all([
    prisma.case.findMany({
      where: { status: { notIn: ['ARCHIVED'] } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        caseNumber: true,
        courtCaseNumber: true,
        title: true,
        status: true,
        updatedAt: true,
        assignments: { include: { user: { select: { id: true, name: true } } } },
        tasks: { select: { id: true, status: true, assigneeId: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])
  res.json({ cases, users })
})

// GET /api/cases/:id
router.get('/:id', requireAuth, async (req, res) => {
  const caseItem = await prisma.case.findUnique({
    where: { id: req.params.id },
    include: {
      assignments: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      documents: { orderBy: { uploadedAt: 'desc' } },
      _count: { select: { comments: true } },
    },
  })
  if (!caseItem) return res.status(404).json({ error: 'Case not found' })
  res.json(caseItem)
})

// POST /api/cases
router.post('/', requireAdmin, async (req, res) => {
  const parsed = caseSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { courtDate, ...rest } = parsed.data
  const newCase = await prisma.case.create({
    data: {
      ...rest,
      caseNumber: generateCaseNumber(),
      courtDate: courtDate ? new Date(courtDate) : undefined,
    },
    include: { assignments: true },
  })

  emitToAll('case:created', newCase)

  // Notify n8n
  if (process.env.N8N_WEBHOOK_BASE) {
    axios
      .post(`${process.env.N8N_WEBHOOK_BASE}/case-created`, { case: newCase })
      .catch(() => {/* non-critical */})
  }

  res.status(201).json(newCase)
})

// PUT /api/cases/:id
router.put('/:id', requireAdmin, async (req, res) => {
  const existing = await prisma.case.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ error: 'Case not found' })

  const parsed = caseSchema.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { courtDate, ...rest } = parsed.data
  const updated = await prisma.case.update({
    where: { id: req.params.id },
    data: { ...rest, courtDate: courtDate ? new Date(courtDate) : undefined },
    include: { assignments: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } } },
  })

  emitToAll('case:updated', updated)

  if (updated.status !== existing.status && process.env.N8N_WEBHOOK_BASE) {
    axios
      .post(`${process.env.N8N_WEBHOOK_BASE}/case-status-changed`, {
        case: updated,
        oldStatus: existing.status,
        newStatus: updated.status,
      })
      .catch(() => {/* non-critical */})
  }

  res.json(updated)
})

// DELETE /api/cases/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  await prisma.case.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

// POST /api/cases/:id/assign
router.post('/:id/assign', requireAdmin, async (req, res) => {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const assignment = await prisma.caseAssignment.upsert({
    where: { caseId_userId: { caseId: req.params.id, userId } },
    create: { caseId: req.params.id, userId },
    update: {},
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })

  const caseItem = await prisma.case.findUnique({ where: { id: req.params.id } })
  if (caseItem) {
    await prisma.notification.create({
      data: {
        userId,
        title: 'תיק חדש הוקצה אליך',
        message: `הוקצית לתיק: ${caseItem.title}`,
        type: 'CASE_ASSIGNED',
        linkTo: `/cases/${req.params.id}`,
      },
    })
  }

  emitToAll('case:updated', { id: req.params.id })
  res.json(assignment)
})

// DELETE /api/cases/:id/assign/:userId
router.delete('/:id/assign/:userId', requireAdmin, async (req, res) => {
  await prisma.caseAssignment.delete({
    where: { caseId_userId: { caseId: req.params.id, userId: req.params.userId } },
  })
  emitToAll('case:updated', { id: req.params.id })
  res.json({ success: true })
})

// GET /api/cases/:id/status-requests
router.get('/:id/status-requests', requireAuth, async (req, res) => {
  const requests = await prisma.statusRequest.findMany({
    where: { caseId: req.params.id },
    include: {
      fromUser: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(requests)
})

// POST /api/cases/:id/status-requests
router.post('/:id/status-requests', requireAdmin, async (req, res) => {
  const { toUserId, message } = req.body
  if (!toUserId || !message) return res.status(400).json({ error: 'toUserId and message required' })

  const caseItem = await prisma.case.findUnique({ where: { id: req.params.id } })
  if (!caseItem) return res.status(404).json({ error: 'Case not found' })

  const statusReq = await prisma.statusRequest.create({
    data: { caseId: req.params.id, fromUserId: req.user!.id, toUserId, message },
    include: {
      fromUser: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
    },
  })

  await prisma.case.update({
    where: { id: req.params.id },
    data: { status: 'PENDING_RESPONSE' },
  })

  const notification = await prisma.notification.create({
    data: {
      userId: toUserId,
      title: 'בקשת התייחסות',
      message: `${req.user!.name}: ${message}`,
      type: 'STATUS_REQUEST',
      linkTo: `/cases/${req.params.id}`,
    },
  })

  emitToUser(toUserId, 'notification:new', notification)
  emitToAll('case:updated', { id: req.params.id })
  res.status(201).json(statusReq)
})

// PUT /api/cases/:id/status-requests/:reqId/resolve
router.put('/:id/status-requests/:reqId/resolve', requireAuth, async (req, res) => {
  await prisma.statusRequest.update({
    where: { id: req.params.reqId },
    data: { resolved: true },
  })

  const pending = await prisma.statusRequest.count({
    where: { caseId: req.params.id, resolved: false },
  })

  if (pending === 0) {
    await prisma.case.update({
      where: { id: req.params.id },
      data: { status: 'IN_PROGRESS' },
    })
  }

  emitToAll('case:updated', { id: req.params.id })
  res.json({ success: true })
})

export default router
