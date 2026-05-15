import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import https from 'https'

const router = Router()

// Same GitHub repo that hosts version.json (like GTO's update.json)
const VERSION_JSON_URL = process.env.VERSION_JSON_URL ||
  'https://raw.githubusercontent.com/pokerwarden/erez-management/main/version.json'

function getCurrentVersion(): string {
  try {
    const versionPath = path.join(process.cwd(), 'version.txt')
    return fs.readFileSync(versionPath, 'utf-8').trim()
  } catch {
    return '1.0.0'
  }
}

interface VersionJson {
  version: string
  releaseDate: string
  downloadUrl: string
  changelog: string
}

function fetchVersionJson(): Promise<VersionJson | null> {
  return new Promise((resolve) => {
    const url = new URL(VERSION_JSON_URL)
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      headers: { 'User-Agent': 'lawfirm-system' },
    }
    const req = https.get(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve(JSON.parse(data) as VersionJson)
        } catch {
          resolve(null)
        }
      })
    })
    req.on('error', () => resolve(null))
    req.setTimeout(5000, () => { req.destroy(); resolve(null) })
  })
}

function isNewer(current: string, latest: string): boolean {
  const parse = (v: string) => v.split('.').map(Number)
  const [cMaj, cMin, cPatch] = parse(current)
  const [lMaj, lMin, lPatch] = parse(latest)
  if (lMaj !== cMaj) return lMaj > cMaj
  if (lMin !== cMin) return lMin > cMin
  return lPatch > cPatch
}

// GET /api/version
router.get('/', (_req, res) => {
  res.json({ version: getCurrentVersion() })
})

// GET /api/version/check
router.get('/check', async (_req, res) => {
  const current = getCurrentVersion()
  const remote = await fetchVersionJson()

  if (!remote) {
    return res.json({ current, updateAvailable: false, error: 'לא ניתן לבדוק עדכונים כרגע' })
  }

  const updateAvailable = isNewer(current, remote.version)
  res.json({
    current,
    latest: remote.version,
    updateAvailable,
    downloadUrl: remote.downloadUrl,
    changelog: remote.changelog,
    releaseDate: remote.releaseDate,
  })
})

export default router
