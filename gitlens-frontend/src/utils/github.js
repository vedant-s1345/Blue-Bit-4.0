import { PALETTE } from './constants.js'

const GH = 'https://api.github.com'

async function ghFetch(url, token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${res.statusText}`)
  return res.json()
}

async function fetchPages(url, token, max = 300) {
  let out = [], page = 1
  while (true) {
    const sep  = url.includes('?') ? '&' : '?'
    const data = await ghFetch(`${url}${sep}per_page=100&page=${page}`, token)
    if (!Array.isArray(data) || data.length === 0) break
    out = [...out, ...data]
    if (data.length < 100 || out.length >= max) break
    page++
  }
  return out
}

// Offload heavy analytics to a WebWorker if available
function runWorker(commits) {
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(
        new URL('../workers/analytics.worker.js', import.meta.url),
        { type: 'module' }
      )
      worker.onmessage = ({ data }) => {
        if (data.type === 'done') { worker.terminate(); resolve(data) }
      }
      worker.onerror = (e) => { worker.terminate(); reject(e) }
      worker.postMessage({ commits, PALETTE })
    } catch (_) {
      reject(new Error('worker-unavailable'))
    }
  })
}

// Synchronous fallback (same logic, runs on main thread)
function runSync(commits) {
  const cMap    = {}
  const hourDay = Array.from({ length: 7 }, () => Array(24).fill(0))
  const eMap    = {}
  const total   = commits.length

  commits.forEach((c, i) => {
    const login = c.author?.login || c.commit?.author?.name || 'unknown'
    if (!cMap[login]) cMap[login] = { login, commits: 0 }
    cMap[login].commits++
    const d = new Date(c.commit?.author?.date)
    if (!isNaN(d)) hourDay[d.getDay()][d.getHours()]++
    for (let j = i + 1; j < Math.min(i + 4, total); j++) {
      const b = commits[j].author?.login || commits[j].commit?.author?.name || 'unknown'
      if (login !== b) {
        const key = [login, b].sort().join('|||')
        eMap[key] = (eMap[key] || 0) + 1
      }
    }
  })

  const contributors = Object.values(cMap)
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 8)
    .map((c, i) => ({ ...c, color: PALETTE[i % PALETTE.length] }))

  const collabEdges = Object.entries(eMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([key, strength]) => {
      const [from, to] = key.split('|||')
      return { from, to, strength }
    })

  const top          = contributors[0]
  const busFactorPct = top ? Math.round((top.commits / total) * 100) : 0
  return { contributors, hourDay, collabEdges, busFactorPct }
}

export async function loadRepo(owner, repo, token, onProgress) {
  onProgress('Fetching repository info…', 8)
  const repoInfo = await ghFetch(`${GH}/repos/${owner}/${repo}`, token)

  onProgress('Loading commit history…', 22)
  const commits = await fetchPages(`${GH}/repos/${owner}/${repo}/commits`, token, 300)

  onProgress('Running analytics (WebWorker)…', 44)
  let analytics
  try {
    analytics = await runWorker(commits)
  } catch (_) {
    analytics = runSync(commits)
  }
  const { contributors, hourDay, collabEdges, busFactorPct } = analytics

  onProgress('Sampling file diffs…', 60)
  const fChurn       = {}
  const fileActivity = {}   // filename -> [{date, additions, deletions}]

  for (let i = 0; i < Math.min(60, commits.length); i += 8) {
    try {
      const det        = await ghFetch(`${GH}/repos/${owner}/${repo}/commits/${commits[i].sha}`, token)
      const sampleDate = commits[i].commit?.author?.date || null

      ;(det.files || []).forEach(f => {
        if (!fChurn[f.filename]) {
          fChurn[f.filename] = { file: f.filename, changes: 0, additions: 0, deletions: 0 }
        }
        fChurn[f.filename].changes++
        fChurn[f.filename].additions += f.additions || 0
        fChurn[f.filename].deletions += f.deletions || 0

        if (sampleDate) {
          if (!fileActivity[f.filename]) fileActivity[f.filename] = []
          fileActivity[f.filename].push({
            date: sampleDate, additions: f.additions || 0, deletions: f.deletions || 0,
          })
        }
      })
    } catch (_) {}
  }

  onProgress('Fetching branches…', 84)
  let branches = []
  try {
    branches = await fetchPages(`${GH}/repos/${owner}/${repo}/branches`, token, 100)
  } catch (_) {}

  onProgress('Finalising…', 94)

  const maxCh    = Math.max(...Object.values(fChurn).map(x => x.changes), 1)
  const fileList = Object.values(fChurn)
    .sort((a, b) => b.changes - a.changes)
    .slice(0, 14)
    .map(f => ({
      ...f,
      churn: Math.min(100, Math.round((f.changes / maxCh) * 100)),
      risk:  f.changes > 8 ? 'critical' : f.changes > 5 ? 'high' : f.changes > 2 ? 'medium' : 'low',
    }))

  onProgress('Done!', 100)

  return {
    repoInfo, commits, contributors,
    hourDay, fileList, fileActivity, branches,
    collabEdges, busFactorPct,
    totalCommits: commits.length,
    owner, repo,
  }
}

export function parseRepoUrl(input) {
  const clean = input.trim().replace(/\/$/, '')
  const m     = clean.match(/github\.com\/([^/]+)\/([^/\s]+)/)
  if (m) return { owner: m[1], repo: m[2].replace(/\.git$/, '') }
  const parts = clean.split('/').filter(Boolean)
  if (parts.length === 2) return { owner: parts[0], repo: parts[1] }
  return null
}
