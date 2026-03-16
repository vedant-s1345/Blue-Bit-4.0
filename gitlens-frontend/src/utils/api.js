const BASE = 'http://localhost:8082/api'

// Submit a repo for analysis, returns { repositoryId, status }
export async function submitRepo(repoUrl) {
  const res = await fetch(`${BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to start analysis')
  }
  return res.json()
}

// Poll status until COMPLETED or FAILED
export async function pollStatus(repoId, onProgress) {
  const steps = [
    [10, 'Cloning repository…'],
    [30, 'Parsing commits…'],
    [55, 'Analysing file changes…'],
    [75, 'Calculating hotspots…'],
    [90, 'Finalising analytics…'],
  ]
  let stepIdx = 0

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BASE}/status/${repoId}`)
        const data = await res.json()

        // Advance progress steps for visual feedback
        if (stepIdx < steps.length) {
          onProgress(steps[stepIdx][1], steps[stepIdx][0])
          stepIdx++
        }

        if (data.status === 'COMPLETED') {
          clearInterval(interval)
          onProgress('Done!', 100)
          resolve(data)
        } else if (data.status === 'FAILED') {
          clearInterval(interval)
          reject(new Error('Repository analysis failed. Check backend logs.'))
        }
      } catch (e) {
        clearInterval(interval)
        reject(e)
      }
    }, 2000) // poll every 2 seconds
  })
}

// Fetch all analytics data for a completed repo
export async function fetchRepoData(repoId) {
  const [timeline, heatmap, contributors, insights] = await Promise.all([
    fetch(`${BASE}/timeline/${repoId}?page=0&size=1000`).then(r => r.json()),
    fetch(`${BASE}/heatmap/${repoId}`).then(r => r.json()),
    fetch(`${BASE}/contributors/${repoId}`).then(r => r.json()),
    fetch(`${BASE}/ai-insights/${repoId}`).then(r => r.json()),
  ])

  return { timeline, heatmap, contributors, insights }
}
