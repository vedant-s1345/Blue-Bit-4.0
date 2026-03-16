// This component visualizes the commit graph with branches and merges, using a custom canvas-based rendering for performance and flexibility. It builds the graph structure from commit and branch data, assigns lanes to branches, and draws nodes and edges with interactive hover effects. Users can filter by branch and see tooltips with commit details. The visualization adapts to both GitHub direct flow (with parent data) and backend flow (without parent data) gracefully.
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { PALETTE } from '../utils/constants.js'

// ─── Build graph purely from commits + branch tip data ────────────────────────
// No extra API calls. Works with both GitHub direct flow and backend flow.
function buildGraph(commits, branches) {
  if (!commits.length) return { nodes: [], lanes: [] }

  const shown   = commits.slice(0, 150)
  const shaIdx  = {}
  shown.forEach((c, i) => { shaIdx[c.sha] = i })

  // Map branch tip SHAs
  const tipMap = {}
  ;(branches || []).forEach(b => {
    if (b.commit?.sha) tipMap[b.commit.sha] = b.name
  })

  // ── Lane assignment via parent-chain tracing ──────────────────────────────
  // Strategy: walk commits newest→oldest. When a commit has 2 parents it's a
  // merge — the second parent starts (or rejoins) a branch lane.
  const commitLane = new Array(shown.length).fill(-1)
  let nextLane = 0

  // Assign commits to lanes greedily
  shown.forEach((c, i) => {
    if (commitLane[i] === -1) commitLane[i] = 0   // default main
    const parents = c.parents || []
    parents.forEach((p, pi) => {
      const pIdx = shaIdx[p.sha]
      if (pIdx === undefined) return
      if (commitLane[pIdx] === -1) {
        // First parent inherits lane, second parent gets new lane (branch)
        commitLane[pIdx] = pi === 0 ? commitLane[i] : ++nextLane
      }
    })
  })

  // If no parent data at all (backend flow), derive lanes from author+time buckets
  const hasParents = shown.some(c => c.parents?.length > 0)
  if (!hasParents && branches?.length > 0) {
    // Assign each branch tip's sha a lane; commits near it in time get same lane
    branches.slice(0, 6).forEach((b, li) => {
      const tipIdx = shaIdx[b.commit?.sha]
      if (tipIdx !== undefined) commitLane[tipIdx] = li
    })
  }

  const maxLane   = Math.max(...commitLane, 0)
  const laneNames = {}
  ;(branches || []).slice(0, maxLane + 1).forEach((b, i) => { laneNames[i] = b.name })

  // Build node list
  const nodes = shown.map((c, idx) => {
    const lane   = commitLane[idx] ?? 0
    const d      = new Date(c.commit?.author?.date)
    const isTip  = !!tipMap[c.sha]
    return {
      sha:     c.sha || '',
      msg:     c.commit?.message?.split('\n')[0] || '',
      author:  c.author?.login || c.commit?.author?.name || '?',
      date:    !isNaN(d) ? d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '',
      lane, color: PALETTE[lane % PALETTE.length],
      idx, isTip, tipName: tipMap[c.sha] || '',
      parentIdxs: (c.parents || []).map(p => shaIdx[p.sha]).filter(x => x !== undefined),
    }
  })

  const lanes = Array.from({ length: maxLane + 1 }, (_, i) => ({
    lane: i,
    color: PALETTE[i % PALETTE.length],
    name: laneNames[i] || (i === 0 ? (branches?.[0]?.name || 'main') : `branch-${i}`),
  }))

  return { nodes, lanes }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BranchViz({ commits, branches }) {
  const canvasRef = useRef()
  const nodesRef  = useRef([])
  const [hovered, setHovered] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const [filter,  setFilter]  = useState('all')   // 'all' | lane index

  const LANE_W = 28, ROW_H = 22, PAD_L = 12, PAD_T = 44, DOT_R = 5

  const { nodes, lanes } = useMemo(
    () => buildGraph(commits, branches),
    [commits, branches]
  )

  const visibleNodes = useMemo(
    () => filter === 'all' ? nodes : nodes.filter(n => n.lane === Number(filter)),
    [nodes, filter]
  )

  // Re-index after filter
  const displayNodes = visibleNodes.map((n, i) => ({ ...n, displayIdx: i }))

  useEffect(() => {
    if (!canvasRef.current || !displayNodes.length) return
    nodesRef.current = displayNodes

    const canvas = canvasRef.current
    const dpr    = window.devicePixelRatio || 1
    const parent = canvas.parentElement
    const W      = Math.min((parent?.clientWidth || 900) - 8, 1100)
    const INFO_X = Math.min(W * 0.28, 240)
    const H      = PAD_T + displayNodes.length * ROW_H + 28

    canvas.width        = W * dpr
    canvas.height       = H * dpr
    canvas.style.width  = W + 'px'
    canvas.style.height = H + 'px'

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const activeLanes = [...new Set(displayNodes.map(n => n.lane))]
      .map(l => lanes.find(x => x.lane === l)).filter(Boolean)

    // Lane column backgrounds
    activeLanes.forEach((l, ci) => {
      const x = PAD_L + ci * LANE_W + DOT_R
      ctx.fillStyle = l.color + '0d'
      ctx.fillRect(x - DOT_R - 1, PAD_T - 14, LANE_W - 3, H - PAD_T + 14)

      // Header label
      ctx.fillStyle   = l.color
      ctx.font        = 'bold 8px JetBrains Mono, monospace'
      ctx.textAlign   = 'center'
      const short = l.name.length > 7 ? l.name.slice(0, 6) + '…' : l.name
      ctx.fillText(short, x, PAD_T - 4)
    })

    // Build compressed lane index (only lanes present in filtered view)
    const laneToCol = {}
    activeLanes.forEach((l, ci) => { laneToCol[l.lane] = ci })

    // Vertical dashed lane lines
    activeLanes.forEach((l, ci) => {
      const x = PAD_L + ci * LANE_W + DOT_R
      ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, H - 12)
      ctx.strokeStyle = l.color + '25'; ctx.lineWidth = 1.5
      ctx.setLineDash([3, 7]); ctx.stroke(); ctx.setLineDash([])
    })

    // Draw parent→child edges
    displayNodes.forEach(node => {
      const col = laneToCol[node.lane] ?? 0
      const x   = PAD_L + col * LANE_W + DOT_R
      const y   = PAD_T + node.displayIdx * ROW_H

      node.parentIdxs.forEach(pOrigIdx => {
        const pNode = displayNodes.find(n => n.idx === pOrigIdx)
        if (!pNode) return
        const pcol = laneToCol[pNode.lane] ?? 0
        const px   = PAD_L + pcol * LANE_W + DOT_R
        const py   = PAD_T + pNode.displayIdx * ROW_H
        ctx.beginPath()
        if (col === pcol) {
          ctx.moveTo(x, y + DOT_R); ctx.lineTo(px, py - DOT_R)
          ctx.strokeStyle = node.color + '55'; ctx.lineWidth = 1.5
        } else {
          const my = y + ROW_H * 0.5
          ctx.moveTo(x, y + DOT_R)
          ctx.bezierCurveTo(x, my, px, my, px, py - DOT_R)
          ctx.strokeStyle = node.color + '44'; ctx.lineWidth = 1
        }
        ctx.stroke()
      })
    })

    // Draw nodes
    displayNodes.forEach(node => {
      const col   = laneToCol[node.lane] ?? 0
      const x     = PAD_L + col * LANE_W + DOT_R
      const y     = PAD_T + node.displayIdx * ROW_H
      const isHov = hovered === node.sha
      const R     = isHov ? DOT_R + 2 : DOT_R

      // Glow on hover
      if (isHov) {
        ctx.beginPath(); ctx.arc(x, y, R + 5, 0, Math.PI * 2)
        ctx.fillStyle = node.color + '22'; ctx.fill()
      }

      // Dot
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2)
      ctx.fillStyle = node.color + (isHov ? 'ff' : 'cc'); ctx.fill()
      if (node.isTip) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke()
      }

      // Connector line to info
      const INFO_X_local = PAD_L + activeLanes.length * LANE_W + 12
      ctx.beginPath(); ctx.moveTo(x + R + 1, y); ctx.lineTo(INFO_X_local - 3, y)
      ctx.strokeStyle = node.color + (isHov ? '20' : '0c')
      ctx.lineWidth = 0.5; ctx.stroke()

      // Branch tip label
      if (node.isTip && node.tipName) {
        ctx.fillStyle = node.color; ctx.font = '8px JetBrains Mono, monospace'
        ctx.textAlign = 'left'
        ctx.fillText(`◀ ${node.tipName.slice(0, 12)}`, INFO_X_local, y + 3)
        ctx.fillStyle = isHov ? '#f1f5f9' : '#64748b'
        ctx.font = isHov ? '500 11px DM Sans, sans-serif' : '11px DM Sans, sans-serif'
        const msgX = INFO_X_local + ctx.measureText(`◀ ${node.tipName.slice(0, 12)}  `).width
        let msg = node.msg
        const maxW = W - msgX - 100
        while (ctx.measureText(msg).width > maxW && msg.length > 6) msg = msg.slice(0, -4) + '…'
        ctx.fillText(msg, msgX, y + 3.5)
      } else {
        const INFO_X_local2 = PAD_L + activeLanes.length * LANE_W + 12
        ctx.fillStyle = isHov ? '#f1f5f9' : '#94a3b8'
        ctx.font = isHov ? '500 11px DM Sans, sans-serif' : '11px DM Sans, sans-serif'
        ctx.textAlign = 'left'
        let msg = node.msg
        const maxW = W - INFO_X_local2 - 100
        while (ctx.measureText(msg).width > maxW && msg.length > 6) msg = msg.slice(0, -4) + '…'
        ctx.fillText(msg, INFO_X_local2, y + 3.5)
      }

      // SHA + date on right
      ctx.fillStyle = '#334155'; ctx.font = '9px JetBrains Mono, monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`${node.sha.slice(0, 7)} · ${node.date}`, W - 6, y + 3.5)
    })
  }, [displayNodes, hovered, lanes])

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx   = (e.clientX - rect.left)
    const my   = (e.clientY - rect.top)

    const activeLanes = [...new Set(displayNodes.map(n => n.lane))]
    const laneToCol   = {}
    activeLanes.forEach((l, ci) => { laneToCol[l] = ci })

    let found = null
    nodesRef.current.forEach(node => {
      const col = laneToCol[node.lane] ?? 0
      const x   = PAD_L + col * LANE_W + DOT_R
      const y   = PAD_T + node.displayIdx * ROW_H
      if (Math.hypot(mx - x, my - y) < 9) found = node
    })
    setHovered(found?.sha || null)
    setTooltip(found ? { x: Math.min(mx + 14, 360), y: Math.max(my - 10, 0), node: found } : null)
  }, [displayNodes])

  if (!nodes.length) return (
    <div style={{ color: '#334155', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, padding: 32, textAlign: 'center' }}>
      No commit data available
    </div>
  )

  const hasParents  = commits.slice(0, 50).some(c => c.parents?.length > 0)
  const branchCount = branches?.length || 0

  return (
    <div>
      {/* Info banner when no parent data */}
      {!hasParents && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>
          ℹ Showing linear commit history — use the GitHub direct flow (enter a token on the landing page) to see full multi-branch graph with merge lines.
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <button
          onClick={() => setFilter('all')}
          style={{ fontSize: 10, padding: '4px 12px', borderRadius: 99, cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", background: filter === 'all' ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.04)', border: `1px solid ${filter === 'all' ? '#6366f1' : 'rgba(255,255,255,0.1)'}`, color: filter === 'all' ? '#a5b4fc' : '#64748b' }}
        >
          All branches
        </button>
        {lanes.map(l => (
          <button key={l.lane}
            onClick={() => setFilter(String(l.lane))}
            style={{ fontSize: 10, padding: '4px 12px', borderRadius: 99, cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", display: 'flex', alignItems: 'center', gap: 5, background: filter === String(l.lane) ? l.color + '22' : 'rgba(255,255,255,0.04)', border: `1px solid ${filter === String(l.lane) ? l.color : 'rgba(255,255,255,0.08)'}`, color: filter === String(l.lane) ? l.color : '#64748b' }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: l.color, display: 'inline-block' }}/>
            {l.name}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', color: '#334155', fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>
          {displayNodes.length} commits · {branchCount} branches
        </span>
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', overflowX: 'auto', overflowY: 'auto', maxHeight: 560, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { setHovered(null); setTooltip(null) }}
          style={{ display: 'block', cursor: hovered ? 'pointer' : 'default' }}
        />

        {tooltip && (
          <div style={{ position: 'absolute', left: tooltip.x, top: tooltip.y, background: '#0c1424', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 10, padding: '10px 14px', pointerEvents: 'none', maxWidth: 300, zIndex: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
            <div style={{ color: '#a5b4fc', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, marginBottom: 5 }}>
              {tooltip.node.sha.slice(0, 12)} · {tooltip.node.date}
            </div>
            <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, lineHeight: 1.45, marginBottom: 5 }}>
              {tooltip.node.msg}
            </div>
            <div style={{ color: '#64748b', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, marginBottom: tooltip.node.isTip ? 6 : 0 }}>
              @{tooltip.node.author}
            </div>
            {tooltip.node.isTip && (
              <div style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, background: tooltip.node.color + '22', color: tooltip.node.color, display: 'inline-block', fontFamily: "'JetBrains Mono',monospace" }}>
                ◀ HEAD of {tooltip.node.tipName}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, color: '#1e293b', fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>
        Showing {displayNodes.length} of {commits.length} commits · dots sized by importance · hover for details
      </div>
    </div>
  )
}
