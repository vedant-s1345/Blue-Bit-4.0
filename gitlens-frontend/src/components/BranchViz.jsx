import { useEffect, useRef, useState, useCallback } from 'react'
import { PALETTE } from '../utils/constants.js'

const GH = 'https://api.github.com'

// Fetch a page of commits for a specific branch SHA
async function fetchBranchCommits(owner, repo, branchSha, token, max = 60) {
  const headers = {
    Accept: 'application/vnd.github+json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await fetch(
    `${GH}/repos/${owner}/${repo}/commits?sha=${branchSha}&per_page=${max}`,
    { headers }
  )
  if (!res.ok) return []
  return res.json()
}

// ─────────────────────────────────────────────────────────────────────────────
export default function BranchViz({ commits: defaultCommits, branches, owner, repo, token }) {
  const canvasRef  = useRef()
  const nodesRef   = useRef([])
  const [loading,  setLoading]  = useState(true)
  const [laneData, setLaneData] = useState(null)   // { nodes, lanes }
  const [hovered,  setHovered]  = useState(null)
  const [tooltip,  setTooltip]  = useState(null)
  const [errMsg,   setErrMsg]   = useState('')

  // ── Layout constants ─────────────────────────────────────────────────────
  const LANE_W = 30
  const ROW_H  = 24
  const PAD_L  = 16
  const PAD_T  = 52
  const DOT_R  = 5
  const INFO_X = 280

  // ── Build lane data from per-branch commits ───────────────────────────────
  useEffect(() => {
    if (!branches?.length) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setErrMsg('')

      try {
        // Take top 6 branches (avoid too many API calls)
        const topBranches = branches.slice(0, 6)
        const laneColors  = {}
        const laneNames   = {}
        const branchCommitLists = {}

        // Fetch commits per branch in parallel
        const results = await Promise.allSettled(
          topBranches.map((b, i) =>
            fetchBranchCommits(owner, repo, b.commit.sha, token, 50)
              .then(cs => ({ branch: b, idx: i, commits: cs }))
          )
        )

        // Build sha→lane map — first branch that claims a SHA wins
        const shaLane = {}
        const lanesList = []

        results.forEach(r => {
          if (r.status !== 'fulfilled') return
          const { branch, idx, commits: cs } = r.value
          if (!cs.length) return

          const lane = lanesList.length
          laneColors[lane] = PALETTE[lane % PALETTE.length]
          laneNames[lane]  = branch.name
          branchCommitLists[lane] = cs
          lanesList.push({ lane, color: laneColors[lane], name: branch.name, tipSha: branch.commit.sha, count: cs.length })

          cs.forEach(c => {
            if (shaLane[c.sha] === undefined) shaLane[c.sha] = lane
          })
        })

        if (cancelled) return

        // Merge all commits into a sorted timeline (deduplicated)
        const allShas  = new Set()
        const allCommits = []
        lanesList.forEach(({ lane }) => {
          ;(branchCommitLists[lane] || []).forEach(c => {
            if (!allShas.has(c.sha)) {
              allShas.add(c.sha)
              allCommits.push({ ...c, lane: shaLane[c.sha] })
            }
          })
        })
        allCommits.sort((a, b) => new Date(b.commit?.author?.date) - new Date(a.commit?.author?.date))

        // Build node list (top 120)
        const nodes = allCommits.slice(0, 120).map((c, idx) => {
          const d      = new Date(c.commit?.author?.date)
          const lane   = c.lane ?? 0
          const isTip  = lanesList.some(l => l.tipSha === c.sha)
          const tipName = lanesList.find(l => l.tipSha === c.sha)?.name || ''
          return {
            sha:    c.sha,
            msg:    c.commit?.message?.split('\n')[0] || '',
            author: c.author?.login || c.commit?.author?.name || '?',
            date:   !isNaN(d) ? d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '',
            lane, color: laneColors[lane] || PALETTE[0],
            idx, isTip, tipName,
          }
        })

        setLaneData({ nodes, lanes: lanesList })
      } catch (e) {
        if (!cancelled) setErrMsg(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [branches, owner, repo, token])

  // ── Draw canvas ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!laneData || !canvasRef.current) return
    const { nodes, lanes } = laneData
    nodesRef.current = nodes

    const canvas = canvasRef.current
    const dpr = window.devicePixelRatio || 1
    const W   = Math.min(INFO_X + 460, (canvas.parentElement?.clientWidth || 900) - 8)
    const H   = PAD_T + nodes.length * ROW_H + 32

    canvas.width        = W * dpr
    canvas.height       = H * dpr
    canvas.style.width  = W + 'px'
    canvas.style.height = H + 'px'

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    // Lane backgrounds + headers
    lanes.forEach(l => {
      const x = PAD_L + l.lane * LANE_W + DOT_R
      ctx.fillStyle = l.color + '10'
      ctx.fillRect(x - DOT_R - 2, PAD_T - 18, LANE_W - 4, H - PAD_T + 18)

      ctx.fillStyle = l.color
      ctx.font = 'bold 9px JetBrains Mono, monospace'
      ctx.textAlign = 'center'
      const short = l.name.length > 7 ? l.name.slice(0, 6) + '…' : l.name
      ctx.fillText(short, x, PAD_T - 6)
    })

    // Vertical lane lines
    lanes.forEach(l => {
      const x = PAD_L + l.lane * LANE_W + DOT_R
      ctx.beginPath()
      ctx.moveTo(x, PAD_T)
      ctx.lineTo(x, H - 16)
      ctx.strokeStyle = l.color + '30'
      ctx.lineWidth = 1.5
      ctx.setLineDash([3, 6])
      ctx.stroke()
      ctx.setLineDash([])
    })

    // Nodes
    nodes.forEach(node => {
      const x    = PAD_L + node.lane * LANE_W + DOT_R
      const y    = PAD_T + node.idx * ROW_H
      const isHov = hovered === node.sha

      // Connector to info line
      ctx.beginPath()
      ctx.moveTo(x + DOT_R + 2, y)
      ctx.lineTo(INFO_X - 4, y)
      ctx.strokeStyle = node.color + (isHov ? '30' : '12')
      ctx.lineWidth = 0.5
      ctx.stroke()

      // Dot
      ctx.beginPath()
      ctx.arc(x, y, isHov ? DOT_R + 2 : DOT_R, 0, Math.PI * 2)
      ctx.fillStyle = isHov ? node.color : node.color + 'cc'
      ctx.fill()
      if (node.isTip) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // Branch tip label (to the left of info area)
      if (node.isTip) {
        const tipX = INFO_X - 8
        ctx.fillStyle = node.color
        ctx.font = '9px JetBrains Mono, monospace'
        ctx.textAlign = 'right'
        const shortName = node.tipName.length > 10 ? node.tipName.slice(0, 9) + '…' : node.tipName
        ctx.fillText(`◀ ${shortName}`, tipX, y + 3.5)
      }

      // Commit message
      ctx.textAlign = 'left'
      ctx.fillStyle = isHov ? '#f1f5f9' : '#94a3b8'
      ctx.font = isHov ? '500 11px DM Sans, sans-serif' : '11px DM Sans, sans-serif'
      const maxW = W - INFO_X - 120
      let msg = node.msg
      while (ctx.measureText(msg).width > maxW && msg.length > 8) msg = msg.slice(0, -4) + '…'
      ctx.fillText(msg, INFO_X, y + 4)

      // SHA + date
      ctx.fillStyle = '#334155'
      ctx.font = '10px JetBrains Mono, monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`${node.sha.slice(0, 7)} · ${node.date}`, W - 8, y + 4)
    })
  }, [laneData, hovered])

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    let found = null
    nodesRef.current.forEach(node => {
      const x = PAD_L + node.lane * LANE_W + DOT_R
      const y = PAD_T + node.idx * ROW_H
      if (Math.hypot(mx - x, my - y) < 9) found = node
    })
    setHovered(found?.sha || null)
    setTooltip(found ? { x: Math.min(mx + 12, 300), y: my - 8, node: found } : null)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ color: '#475569', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, padding: '32px 0', textAlign: 'center' }}>
      <div style={{ marginBottom: 10 }}>Fetching commits per branch…</div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: `botDot 1.2s ease-in-out ${i*0.2}s infinite` }}/>
        ))}
      </div>
      <style>{`@keyframes botDot{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  )

  if (errMsg) return (
    <div style={{ color: '#f87171', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, padding: 24 }}>
      Could not load branch commits: {errMsg}
    </div>
  )

  if (!laneData?.nodes?.length) return (
    <div style={{ color: '#334155', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, padding: 24 }}>
      No commit data available for branches
    </div>
  )

  const { nodes, lanes } = laneData

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        {lanes.map(l => (
          <div key={l.lane} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 99, background: l.color + '15', border: `1px solid ${l.color}44` }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }}/>
            <span style={{ fontSize: 10, color: l.color, fontFamily: "'JetBrains Mono',monospace" }}>{l.name}</span>
            <span style={{ fontSize: 9, color: '#334155', fontFamily: "'JetBrains Mono',monospace" }}>{l.count} commits</span>
          </div>
        ))}
        {branches.length > 6 && (
          <span style={{ fontSize: 10, color: '#334155', fontFamily: "'JetBrains Mono',monospace", alignSelf: 'center' }}>
            +{branches.length - 6} more branches
          </span>
        )}
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', overflowX: 'auto' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { setHovered(null); setTooltip(null) }}
          style={{ display: 'block', cursor: hovered ? 'pointer' : 'default' }}
        />

        {tooltip && (
          <div style={{
            position: 'absolute', left: tooltip.x, top: tooltip.y,
            background: '#0f172a', border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: 10, padding: '10px 14px', pointerEvents: 'none',
            maxWidth: 280, zIndex: 10,
          }}>
            <div style={{ color: '#a5b4fc', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, marginBottom: 4 }}>
              {tooltip.node.sha.slice(0, 12)} · {tooltip.node.date}
            </div>
            <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, lineHeight: 1.4, marginBottom: 4 }}>
              {tooltip.node.msg}
            </div>
            <div style={{ color: '#64748b', fontFamily: "'JetBrains Mono',monospace", fontSize: 10 }}>
              @{tooltip.node.author}
            </div>
            {tooltip.node.isTip && (
              <div style={{ marginTop: 6, fontSize: 9, padding: '2px 8px', borderRadius: 4, background: tooltip.node.color + '22', color: tooltip.node.color, display: 'inline-block', fontFamily: "'JetBrains Mono',monospace" }}>
                ◀ HEAD of {tooltip.node.tipName}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, color: '#1e293b', fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>
        Showing top {lanes.length} branches · {nodes.length} commits · hover dots for details
      </div>
    </div>
  )
}
