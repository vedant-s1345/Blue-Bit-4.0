import { PALETTE } from './constants.js'

const BASE_URL = 'http://localhost:8082/api'

// Submit repo for analysis and wait for completion
export async function analyzeRepo(repoUrl, onProgress) {

  onProgress('Submitting repository…', 10)

  // Step 1 — Submit repo
  const submitRes = await fetch(`${BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl })
  })

  if (!submitRes.ok) throw new Error('Failed to submit repository')
  const { repositoryId } = await submitRes.json()

  onProgress('Cloning repository…', 25)

  // Step 2 — Poll until COMPLETED
  let status = 'PENDING'
  let attempts = 0
  while (status !== 'COMPLETED' && status !== 'FAILED' && attempts < 60) {
    await sleep(3000)
    const statusRes = await fetch(`${BASE_URL}/status/${repositoryId}`)
    if (!statusRes.ok) throw new Error(`Status check failed: ${statusRes.status}`)
    const statusData = await statusRes.json()
    status = statusData.status
    attempts++

    if (status === 'PROCESSING') onProgress('Parsing commits…', 50)
    if (status === 'FAILED') throw new Error('Repository analysis failed')
  }

  if (attempts >= 60) throw new Error('Analysis timed out')

  onProgress('Loading timeline…', 65)

  // Step 3 — Fetch all data in parallel
  const [statusData, timeline, heatmap, contributors, insights] = await Promise.all([
    fetch(`${BASE_URL}/status/${repositoryId}`).then(r => { if (!r.ok) throw new Error(`Status fetch failed: ${r.status}`); return r.json() }),
    fetch(`${BASE_URL}/timeline/${repositoryId}`).then(r => { if (!r.ok) throw new Error(`Timeline fetch failed: ${r.status}`); return r.json() }),
    fetch(`${BASE_URL}/heatmap/${repositoryId}`).then(r => { if (!r.ok) throw new Error(`Heatmap fetch failed: ${r.status}`); return r.json() }),
    fetch(`${BASE_URL}/contributors/${repositoryId}`).then(r => { if (!r.ok) throw new Error(`Contributors fetch failed: ${r.status}`); return r.json() }),
    fetch(`${BASE_URL}/ai-insights/${repositoryId}`).then(r => { if (!r.ok) throw new Error(`AI Insights fetch failed: ${r.status}`); return r.json() }),
  ])

  onProgress('Building visualizations…', 85)

  // Step 4 — Transform data to match frontend format
  return transformData(statusData, timeline, heatmap, contributors, insights, repoUrl)
}

function transformData(statusData, timeline, heatmap, contributors, insights, repoUrl) {

  // Build repoInfo from status data
  const repoInfo = {
    full_name: statusData.name || 'Unknown',
    stargazers_count: 0,
    language: detectLanguage(heatmap),
    open_issues_count: 0,
    description: `Analyzed by GitLens — ${statusData.totalCommits} commits`,
  }

  // Transform commits to GitHub API format
  const commits = timeline.map(c => ({
    sha: c.commitHash,
    author: { login: c.author },
    commit: {
      message: c.message,
      author: {
        date: c.commitDate,
        name: c.author,
      }
    }
  }))

  // Transform contributors
  const mappedContributors = contributors.map((c, i) => ({
    login: c.name,
    commits: c.totalCommits,
    color: PALETTE[i % PALETTE.length],
    linesAdded: c.linesAdded,
    linesDeleted: c.linesDeleted,
  }))

  // Build hourDay heatmap from commit dates
  const hourDay = Array.from({ length: 7 }, () => Array(24).fill(0))
  timeline.forEach(c => {
    if (c.commitDate) {
      const d = new Date(c.commitDate)
      if (!isNaN(d)) {
        hourDay[d.getDay()][d.getHours()]++
      }
    }
  })

  // Transform file heatmap
  const maxChanges = Math.max(...heatmap.map(f => f.commitCount || 1), 1)
  const fileList = heatmap.slice(0, 14).map(f => ({
    file: f.filePath,
    changes: f.commitCount || 0,
    additions: f.churnScore || 0,
    deletions: 0,
    churn: Math.round((f.hotspotScore || 0)),
    risk: mapRisk(f.risk),
  }))

  // Build collab edges from contributors
  const collabEdges = []
  for (let i = 0; i < Math.min(mappedContributors.length - 1, 4); i++) {
    for (let j = i + 1; j < Math.min(mappedContributors.length, 5); j++) {
      collabEdges.push({
        from: mappedContributors[i].login,
        to: mappedContributors[j].login,
        strength: Math.abs(mappedContributors[i].commits - mappedContributors[j].commits) + 1
      })
    }
  }

  const totalCommits = statusData.totalCommits || commits.length
  const top = mappedContributors[0]
  const busFactorPct = top ? Math.round((top.commits / totalCommits) * 100) : 0

  return {
    repoInfo,
    commits,
    contributors: mappedContributors,
    hourDay,
    fileList,
    collabEdges,
    totalCommits,
    busFactorPct,
    aiInsights: insights,
    owner: repoUrl.split('/').slice(-2)[0],
    repo: repoUrl.split('/').slice(-1)[0],
  }
}

// Map our risk levels to frontend risk levels
function mapRisk(risk) {
  const map = { HIGH: 'critical', MEDIUM: 'medium', LOW: 'low' }
  return map[risk] || 'low'
}

// Detect primary language from file extensions
function detectLanguage(heatmap) {
  const extCount = {}
  heatmap.forEach(f => {
    const ext = f.filePath.split('.').pop()
    extCount[ext] = (extCount[ext] || 0) + 1
  })
  const top = Object.entries(extCount).sort((a, b) => b[1] - a[1])[0]
  const langMap = {
    js: 'JavaScript', ts: 'TypeScript', java: 'Java',
    py: 'Python', go: 'Go', rb: 'Ruby', cs: 'C#',
    cpp: 'C++', c: 'C', php: 'PHP', kt: 'Kotlin',
  }
  return top ? (langMap[top[0]] || top[0].toUpperCase()) : 'Unknown'
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}