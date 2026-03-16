// Runs off the main thread — handles O(n) + O(n²) analytics computation
// so the UI stays responsive while parsing large repos

self.onmessage = function ({ data: { commits, PALETTE } }) {
  const cMap   = {}
  const hourDay = Array.from({ length: 7 }, () => Array(24).fill(0))
  const eMap   = {}
  const total  = commits.length

  for (let i = 0; i < total; i++) {
    const c      = commits[i]
    const login  = c.author?.login || c.commit?.author?.name || 'unknown'

    // contributor map
    if (!cMap[login]) cMap[login] = { login, commits: 0 }
    cMap[login].commits++

    // day × hour heatmap
    const d = new Date(c.commit?.author?.date)
    if (!isNaN(d)) hourDay[d.getDay()][d.getHours()]++

    // collaboration edges (look-ahead window of 4)
    for (let j = i + 1; j < Math.min(i + 4, total); j++) {
      const b = commits[j].author?.login || commits[j].commit?.author?.name || 'unknown'
      if (login !== b) {
        const key = [login, b].sort().join('|||')
        eMap[key] = (eMap[key] || 0) + 1
      }
    }

    // progress every 50 commits — maps to 48-88% of the loading bar
    if (i % 50 === 0) {
      self.postMessage({ type: 'progress', pct: Math.round((i / total) * 40) + 48 })
    }
  }

  // Sort contributors and assign colours
  const contributors = Object.values(cMap)
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 8)
    .map((c, i) => ({ ...c, color: PALETTE[i % PALETTE.length] }))

  // Top collab edges
  const collabEdges = Object.entries(eMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([key, strength]) => {
      const [from, to] = key.split('|||')
      return { from, to, strength }
    })

  const top          = contributors[0]
  const busFactorPct = top ? Math.round((top.commits / total) * 100) : 0

  self.postMessage({ type: 'done', contributors, hourDay, collabEdges, busFactorPct })
}
