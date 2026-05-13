import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import https from 'https'

const router = Router()

const GITHUB_REPO = 'pokerwarden/erez-management'

function getCurrentVersion(): string {
  try {
    // In Docker, version.txt is copied to /app/version.txt
    const versionPath = path.join(process.cwd(), 'version.txt')
    return fs.readFileSync(versionPath, 'utf-8').trim()
  } catch {
    return '1.0.0'
  }
}

function fetchLatestRelease(): Promise<{ version: string; url: string } | null> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases/latest`,
      headers: { 'User-Agent': 'lawfirm-system' },
    }
    const req = https.get(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.tag_name) {
            resolve({
              version: json.tag_name.replace(/^v/, ''),
              url: json.html_url,
            })
          } else {
            resolve(null)
          }
        } catch {
          resolve(null)
        }
      })
    })
    req.on('error', () => resolve(null))
    req.setTimeout(5000, () => { req.destroy(); resolve(null) })
  })
}

function compareVersions(current: string, latest: string): boolean {
  const parse = (v: string) => v.split('.').map(Number)
  const [cMaj, cMin, cPatch] = parse(current)
  const [lMaj, lMin, lPatch] = parse(latest)
  if (lMaj !== cMaj) return lMaj > cMaj
  if (lMin !== cMin) return lMin > cMin
  return lPatch > cPatch
}

// GET /api/version — current version
router.get('/', (_req, res) => {
  res.json({ version: getCurrentVersion() })
})

// GET /api/version/check — check if update available
router.get('/check', async (_req, res) => {
  const current = getCurrentVersion()
  const latest = await fetchLatestRelease()

  if (!latest) {
    return res.json({ current, updateAvailable: false, error: 'לא ניתן לבדוק עדכונים כרגע' })
  }

  const updateAvailable = compareVersions(current, latest.version)
  res.json({
    current,
    latest: latest.version,
    updateAvailable,
    releaseUrl: latest.url,
  })
})

export default router
