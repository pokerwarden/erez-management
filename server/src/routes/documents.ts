import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { prisma } from '../lib/prisma'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()

const uploadDir = process.env.UPLOAD_DIR || './uploads'
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${unique}${path.extname(file.originalname)}`)
  },
})

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain',
]

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '20')) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('File type not allowed'))
    }
  },
})

router.get('/cases/:id/documents', requireAuth, async (req, res) => {
  const docs = await prisma.document.findMany({
    where: { caseId: req.params.id },
    orderBy: { uploadedAt: 'desc' },
  })
  res.json(docs)
})

router.post('/cases/:id/documents', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  const caseExists = await prisma.case.findUnique({ where: { id: req.params.id } })
  if (!caseExists) return res.status(404).json({ error: 'Case not found' })

  const doc = await prisma.document.create({
    data: {
      name: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      caseId: req.params.id,
    },
  })
  res.status(201).json(doc)
})

router.delete('/documents/:id', requireAdmin, async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } })
  if (!doc) return res.status(404).json({ error: 'Document not found' })

  // Remove file from disk
  if (fs.existsSync(doc.filePath)) {
    fs.unlinkSync(doc.filePath)
  }

  await prisma.document.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

// Serve uploaded files
router.get('/files/:filename', requireAuth, (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename)
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' })
  res.sendFile(path.resolve(filePath))
})

export default router
