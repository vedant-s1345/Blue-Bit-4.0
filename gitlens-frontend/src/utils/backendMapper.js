import { PALETTE } from './constants.js'

export function mapBackendData(repoUrl, repoStatus, { timeline, heatmap, contributors, insights }) {

  // Parse owner/repo from URL
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/\s.]+)/)
  const owner = match ? match[1] : 'unknown'
  const repo  = match ? match[2] : 'unknown'

  // Map contributors
  const mappedContributors = contributors.map((c, i) => ({
    login:   c.name,
    email:   c.email,
    commits: c.totalCommits,
    linesAdded:   c.linesAdded,
    linesDeleted: c.linesDeleted,
    color: PALETTE[i % PALETTE.length],
  }))

  // Map commits (from paginated response or plain array)
  const commitList = timeline.content || timeline
  const mappedCommits = commitList.map(c => ({
    sha: c.commitHash,
    author: { login: c.author },
    commit: {
      author: { name: c.author, email: c.authorEmail, date: c.commitDate },
      message: c.message,
    },
    linesAdded:   c.linesAdded,
    linesDeleted: c.linesDeleted,
  }))

  // Build day×hour heatmap from commit dates
  const hourDay = Array.from({ length: 7 }, () => Array(24).fill(0))
  mappedCommits.forEach(c => {
    const d = new Date(c.commit.author.date)
    if (!isNaN(d)) hourDay[d.getDay()][d.getHours()]++
  })

  // Map file heatmap
  const mappedFiles = heatmap.map(f => ({
    file:      f.filePath,
    changes:   f.commitCount,
    additions: f.churnScore,
    deletions: 0,
    churn:     Math.round(f.hotspotScore),
    risk:      f.risk?.toLowerCase() || 'low',
  }))

  // Build collab edges from commit sequence
  const eMap = {}
  for (let i = 0; i < mappedCommits.length - 1; i++) {
    const a = mappedCommits[i].author.login
    for (let j = i + 1; j < Math.min(i + 4, mappedCommits.length); j++) {
      const b = mappedCommits[j].author.login
      if (a !== b) {
        const key = [a, b].sort().join('|||')
        eMap[key] = (eMap[key] || 0) + 1
      }
    }
  }
  const collabEdges = Object.entries(eMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([key, strength]) => {
      const [from, to] = key.split('|||')
      return { from, to, strength }
    })

  // Bus factor %
  const top = mappedContributors[0]
  const totalCommits = mappedCommits.length
  const busFactorPct = top ? Math.round((top.commits / totalCommits) * 100) : 0

  return {
    owner,
    repo,
    repoId: repoStatus.id,
    repoInfo: { stargazers_count: null, language: null },
    commits:      mappedCommits,
    contributors: mappedContributors,
    hourDay,
    fileList:     mappedFiles,
    fileActivity: {},
    branches:     [],        // BranchViz will self-fetch from GitHub
    collabEdges,
    totalCommits,
    busFactorPct,
    aiInsights:   insights,
  }
}