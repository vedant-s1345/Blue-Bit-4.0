//This feature show commits for particular file 
import { useEffect, useState, useMemo } from 'react'


// ── Extension → color family ──────────────────────────────────────────────────
const EXT_COLOR = {
  js:   '#f7df1e', jsx: '#61dafb', ts: '#3178c6', tsx: '#3178c6',
  py:   '#3572a5', java: '#b07219', go: '#00add8', rs: '#dea584',
  css:  '#563d7c', scss: '#c6538c', html: '#e34c26', md: '#083fa1',
  json: '#4ade80', yml: '#ef4444', yaml: '#ef4444', sh: '#89e051',
  sql:  '#e38c00', rb: '#cc342d',  php: '#4f5d95',
}
const DEFAULT_COLOR = '#818cf8'

function getExtColor(filename) {
  const ext = (filename || '').split('.').pop()?.toLowerCase()
  return EXT_COLOR[ext] || DEFAULT_COLOR
}

function getExt(filename) {
  return (filename || '').split('.').pop()?.toLowerCase() || '?'
}

// ── Squarified treemap layout ─────────────────────────────────────────────────
function squarify(items, x, y, w, h) {
  if (!items.length) return []
  const total = items.reduce((s, d) => s + d.area, 0)
  const rects = []
  let remaining = [...items]
  let cx = x, cy = y, cw = w, ch = h

  while (remaining.length) {
    const isHoriz = cw >= ch
    const band    = isHoriz ? ch : cw
    let row = [], rowArea = 0, best = Infinity

    for (let i = 0; i < remaining.length; i++) {
      const next = remaining[i]
      const testRow  = [...row, next]
      const testArea = rowArea + next.area
      const scaledBand = (testArea / (cw * ch)) * (isHoriz ? cw : ch)
      const scaledTotal = (isHoriz ? ch : cw)

      let worst = 0
      for (const d of testRow) {
        const scaledA = (d.area / testArea) * scaledBand * (isHoriz ? ch : cw)
        const side    = scaledA / scaledBand
        const ratio   = Math.max(scaledBand / side, side / scaledBand)
        if (ratio > worst) worst = ratio
      }

      if (worst <= best || row.length === 0) {
        best = worst; row = testRow; rowArea = testArea
      } else break
    }

    // Layout this row
    const rowFrac = rowArea / total
    const rowDim  = isHoriz ? cw * rowFrac / 1 : ch * rowFrac / 1

    // Simple sliced layout (good enough and stable)
    const sliceDim = isHoriz
      ? (rowArea / total) * cw
      : (rowArea / total) * ch

    let offset = isHoriz ? cy : cx
    for (const d of row) {
      const frac  = d.area / rowArea
      const rw    = isHoriz ? sliceDim : cw * frac
      const rh    = isHoriz ? ch * frac : sliceDim
      const rx    = isHoriz ? cx         : offset
      const ry    = isHoriz ? offset     : cy
      rects.push({ ...d, x: rx, y: ry, w: rw, h: rh })
      offset += isHoriz ? rh : rw
    }

    remaining = remaining.slice(row.length)
    if (isHoriz) { cx += sliceDim; cw -= sliceDim }
    else         { cy += sliceDim; ch -= sliceDim }
    if (cw < 1 || ch < 1) break
  }

  return rects
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FileActivityHeatmap({ files }) {
  const [sort,     setSort]     = useState('changes')  // changes | additions | deletions
  const [selected, setSelected] = useState(null)
  const [loaded,   setLoaded]   = useState(false)
  const [extFilter, setExtFilter] = useState('all')

  useEffect(() => { setTimeout(() => setLoaded(true), 120) }, [])

  // Normalize file objects
  const fileData = useMemo(() => (files || []).map(f => ({
    name:      f.file || f.filename || f.path || f.name || 'unknown',
    changes:   f.changes || f.count || 0,
    additions: f.additions || 0,
    deletions: f.deletions || 0,
    risk:      f.risk || 'low',
    churn:     f.churn || 0,
  })), [files])

  // Available extensions for filter pills
  const extensions = useMemo(() => {
    const exts = new Set(fileData.map(f => getExt(f.name)))
    return ['all', ...Array.from(exts).sort()]
  }, [fileData])

  const filtered = useMemo(() => {
    let d = extFilter === 'all' ? fileData : fileData.filter(f => getExt(f.name) === extFilter)
    return [...d].sort((a, b) => b[sort] - a[sort])
  }, [fileData, sort, extFilter])

  const maxVal = Math.max(...filtered.map(f => f[sort]), 1)

  // Compute treemap layout (600×320 virtual canvas)
  const TW = 600, TH = 320
  const treemapItems = filtered.map(f => ({ ...f, area: Math.max((f[sort] / maxVal) * TW * TH * 0.04, 40) }))
  const rects = useMemo(() => squarify(treemapItems, 0, 0, TW, TH), [treemapItems])

  // Risk → intensity overlay opacity
  const riskOpacity = { critical: 0.95, high: 0.75, medium: 0.5, low: 0.3 }

  return (
    <div style={{ fontFamily: "'JetBrains Mono',monospace" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.3em', color: '#818cf8', marginBottom: 6, textTransform: 'uppercase' }}>◈ File Activity Treemap</div>
        <div style={{ color: '#475569', fontSize: 11 }}>
          {filtered.length} files · tile area = {sort} · border intensity = risk · click any tile for details
        </div>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <span style={{ color: '#334155', fontSize: 10 }}>SORT:</span>
        {['changes', 'additions', 'deletions'].map(s => (
          <button key={s} onClick={() => setSort(s)} style={{
            fontSize: 10, padding: '4px 12px', borderRadius: 99, cursor: 'pointer',
            background: sort === s ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${sort === s ? '#6366f1' : 'rgba(255,255,255,0.09)'}`,
            color: sort === s ? '#a5b4fc' : '#64748b', textTransform: 'capitalize',
          }}>{s}</button>
        ))}
        <span style={{ color: '#334155', fontSize: 10, marginLeft: 8 }}>EXT:</span>
        {extensions.slice(0, 10).map(e => (
          <button key={e} onClick={() => setExtFilter(e)} style={{
            fontSize: 10, padding: '4px 10px', borderRadius: 99, cursor: 'pointer',
            background: extFilter === e ? (EXT_COLOR[e] || '#6366f1') + '22' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${extFilter === e ? (EXT_COLOR[e] || '#6366f1') : 'rgba(255,255,255,0.08)'}`,
            color: extFilter === e ? (EXT_COLOR[e] || '#a5b4fc') : '#64748b',
          }}>{e}</button>
        ))}
      </div>

      {/* Treemap */}
      <div style={{ position: 'relative', width: '100%', paddingBottom: `${(TH / TW) * 100}%`, marginBottom: 20, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          {rects.map((rect, i) => {
            const extColor = getExtColor(rect.name)
            const opacity  = riskOpacity[rect.risk] || 0.4
            const xPct = (rect.x / TW) * 100
            const yPct = (rect.y / TH) * 100
            const wPct = (rect.w / TW) * 100
            const hPct = (rect.h / TH) * 100
            const isSelected = selected?.name === rect.name
            const shortName  = rect.name.split('/').pop()
            const showLabel  = rect.w > 60 && rect.h > 28

            return (
              <div
                key={i}
                onClick={() => setSelected(isSelected ? null : rect)}
                style={{
                  position:   'absolute',
                  left:       `${xPct}%`, top:    `${yPct}%`,
                  width:      `${wPct}%`, height: `${hPct}%`,
                  background: extColor,
                  opacity:    loaded ? opacity : 0,
                  border:     isSelected
                    ? `2px solid #fff`
                    : `1px solid rgba(0,0,0,0.25)`,
                  boxSizing:  'border-box',
                  cursor:     'pointer',
                  transition: loaded ? `opacity 0.4s ${i * 0.01}s, border 0.15s, filter 0.15s` : 'none',
                  overflow:   'hidden',
                  display:    'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding:    3,
                }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.4)'; e.currentTarget.style.zIndex = '5' }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.zIndex = '1' }}
                title={`${rect.name}\n${rect.changes} edits · +${rect.additions} −${rect.deletions} · ${rect.risk}`}
              >
                {showLabel && (
                  <>
                    <div style={{ fontSize: Math.min(10, rect.w / 8), color: 'rgba(0,0,0,0.85)', fontWeight: 700, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {shortName}
                    </div>
                    {rect.h > 40 && (
                      <div style={{ fontSize: 8, color: 'rgba(0,0,0,0.65)', lineHeight: 1.2 }}>
                        {rect[sort]}×
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail card — shown on click */}
      {selected && (
        <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 12, background: getExtColor(selected.name) + '15', border: `1px solid ${getExtColor(selected.name)}44`, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ color: getExtColor(selected.name), fontWeight: 700, fontSize: 13, marginBottom: 4, wordBreak: 'break-all' }}>
              {selected.name}
            </div>
            <div style={{ color: '#64748b', fontSize: 10 }}>.{getExt(selected.name)} file</div>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              ['Edits',     selected.changes,   '#a5b4fc'],
              ['+Lines',    selected.additions,  '#4ade80'],
              ['−Lines',    selected.deletions,  '#f87171'],
              ['Risk',      selected.risk,       { critical:'#ef4444', high:'#f97316', medium:'#eab308', low:'#22c55e' }[selected.risk] || '#64748b'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ color, fontWeight: 700, fontSize: 16 }}>{val}</div>
                <div style={{ color: '#334155', fontSize: 9 }}>{label}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16, padding: 0, alignSelf: 'flex-start' }}>✕</button>
        </div>
      )}

      {/* List view (bottom) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.slice(0, 50).map((f, i) => {
          const pct      = (f[sort] / maxVal) * 100
          const extColor = getExtColor(f.name)
          const riskColor = { critical:'#ef4444', high:'#f97316', medium:'#eab308', low:'#22c55e' }[f.risk] || '#64748b'
          return (
            <div key={i}
              onClick={() => setSelected(selected?.name === f.name ? null : f)}
              style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${selected?.name === f.name ? extColor + '55' : 'rgba(255,255,255,0.05)'}`, transition: 'border 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Background fill bar */}
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg,${extColor}18 0%,${extColor}06 ${pct}%,transparent ${pct}%)` }}/>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px' }}>
                {/* Extension badge */}
                <span style={{ fontSize: 8, padding: '2px 5px', borderRadius: 4, background: extColor + '22', color: extColor, flexShrink: 0 }}>
                  .{getExt(f.name)}
                </span>
                {/* Filename */}
                <span style={{ flex: 1, fontSize: 11, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.name}>
                  {f.name}
                </span>
                {/* Stats */}
                <span style={{ color: '#4ade80', fontSize: 10, flexShrink: 0 }}>+{f.additions}</span>
                <span style={{ color: '#f87171', fontSize: 10, flexShrink: 0 }}>-{f.deletions}</span>
                <span style={{ fontSize: 10, flexShrink: 0, fontWeight: 700, color: '#a5b4fc' }}>{f.changes}×</span>
                {/* Risk pill */}
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: riskColor + '22', color: riskColor, textTransform: 'uppercase', flexShrink: 0 }}>
                  {f.risk}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Extension legend */}
      <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {Object.entries(EXT_COLOR).slice(0, 14).map(([ext, color]) => (
          <div key={ext} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#475569' }}>
            <div style={{ width: 8, height: 8, background: color, borderRadius: 2 }}/>
            .{ext}
          </div>
        ))}
      </div>
    </div>
  )
}
