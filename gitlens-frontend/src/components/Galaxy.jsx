import { useEffect, useRef, useState, useCallback } from 'react'
import { PALETTE } from '../utils/constants.js'

const W = 560, H = 380
const cx = W / 2, cy = H / 2

// ─── ORBIT NETWORK (canvas) ──────────────────────────────────────────────────
function OrbitCanvas({ contributors, edges, selectedAuthor, onSelect }) {
  const ref = useRef()
  const af  = useRef()
  const nodesRef = useRef([])
  const maxC = Math.max(...contributors.map(c => c.commits), 1)
  const maxE = Math.max(...edges.map(e => e.strength), 1)

  useEffect(() => {
    if (!contributors.length) return
    nodesRef.current = contributors.map((c, i) => {
      const angle = i === 0 ? 0 : ((i - 1) / (contributors.length - 1)) * Math.PI * 2 - Math.PI / 2
      const ring  = i === 0 ? 0 : i < 3 ? 120 : i < 6 ? 185 : 230
      return {
        ...c, color: c.color || PALETTE[i % PALETTE.length],
        x: i === 0 ? cx : cx + Math.cos(angle) * ring,
        y: i === 0 ? cy : cy + Math.sin(angle) * ring,
        r: 13 + (c.commits / maxC) * 20,
        t: i === 0 ? 0 : angle, ring,
        speed: ring > 0 ? (0.0015 + i * 0.0002) * (i % 2 ? -1 : 1) : 0,
        pulse: Math.random() * Math.PI * 2,
      }
    })

    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let frame = 0

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // Central glow
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90)
      cg.addColorStop(0, 'rgba(99,102,241,0.18)')
      cg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H)

      // Orbit rings
      ;[120, 185, 230].forEach(r => {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255,255,255,0.04)'
        ctx.lineWidth = 1; ctx.setLineDash([4, 10]); ctx.stroke(); ctx.setLineDash([])
      })

      // Animate
      nodesRef.current.forEach(n => {
        if (n.ring > 0) { n.t += n.speed; n.x = cx + Math.cos(n.t) * n.ring; n.y = cy + Math.sin(n.t) * n.ring }
      })

      // Edges
      edges.forEach(e => {
        const a = nodesRef.current.find(n => n.login === e.from)
        const b = nodesRef.current.find(n => n.login === e.to)
        if (!a || !b) return
        const str = e.strength / maxE
        const isHighlighted = !selectedAuthor || selectedAuthor === e.from || selectedAuthor === e.to
        if (!isHighlighted) return

        const mx_ = (a.x + b.x) / 2 + (a.y - b.y) * 0.2 * (str > 0.5 ? 1 : -1)
        const my_ = (a.y + b.y) / 2 + (b.x - a.x) * 0.2 * (str > 0.5 ? 1 : -1)
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx_, my_, b.x, b.y)
        ctx.strokeStyle = `rgba(168,85,247,${0.1 + str * 0.5})`
        ctx.lineWidth = 0.5 + str * 3; ctx.stroke()

        // Particle
        const pt = ((frame * 0.007 + (e.strength * 23 % 100) / 100) % 1)
        const px = a.x * (1-pt)**2 + mx_ * 2*pt*(1-pt) + b.x * pt*pt
        const py = a.y * (1-pt)**2 + my_ * 2*pt*(1-pt) + b.y * pt*pt
        const pg = ctx.createRadialGradient(px, py, 0, px, py, 6)
        pg.addColorStop(0, a.color + '99'); pg.addColorStop(1, 'transparent')
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fillStyle = a.color; ctx.fill()
      })

      // Nodes
      nodesRef.current.forEach(n => {
        const isSelected = selectedAuthor === n.login
        const isDimmed   = selectedAuthor && !isSelected
        const pulse = Math.sin(frame * 0.045 + n.pulse) * 0.1 + 1
        const r = n.r * pulse * (isSelected ? 1.2 : 1)

        ctx.globalAlpha = isDimmed ? 0.3 : 1

        const atmo = ctx.createRadialGradient(n.x, n.y, r*0.4, n.x, n.y, r*3)
        atmo.addColorStop(0, n.color + (isSelected ? '44' : '22')); atmo.addColorStop(1, 'transparent')
        ctx.fillStyle = atmo; ctx.beginPath(); ctx.arc(n.x, n.y, r*3, 0, Math.PI*2); ctx.fill()

        if (isSelected) {
          ctx.beginPath(); ctx.arc(n.x, n.y, r+6, 0, Math.PI*2)
          ctx.strokeStyle = n.color + '88'; ctx.lineWidth = 2
          ctx.setLineDash([4,6]); ctx.stroke(); ctx.setLineDash([])
        }

        const ng = ctx.createRadialGradient(n.x-r*.3, n.y-r*.3, 0, n.x, n.y, r)
        ng.addColorStop(0, n.color+'ff'); ng.addColorStop(1, n.color+'88')
        ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI*2); ctx.fill()

        ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.textAlign='center'; ctx.textBaseline='middle'
        ctx.font = `bold ${Math.max(9,r*.55)}px 'JetBrains Mono',monospace`
        ctx.fillText((n.login||'?')[0].toUpperCase(), n.x, n.y)

        ctx.font = `${9 + (n.commits/maxC)*2}px 'JetBrains Mono',monospace`
        ctx.fillStyle = n.color+'ee'; ctx.fillText(n.login, n.x, n.y+r+12)
        ctx.font = "8px monospace"; ctx.fillStyle='#475569'
        ctx.fillText(`${n.commits}c`, n.x, n.y+r+22)

        ctx.globalAlpha = 1
      })

      frame++; af.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(af.current)
  }, [contributors, edges, selectedAuthor])

  const handleClick = useCallback(e => {
    const rect = ref.current.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (W / rect.width)
    const my = (e.clientY - rect.top)  * (H / rect.height)
    const hit = nodesRef.current.find(n => Math.hypot(n.x - mx, n.y - my) <= n.r + 8)
    onSelect(hit ? (hit.login === selectedAuthor ? null : hit.login) : null)
  }, [selectedAuthor, onSelect])

  return (
    <canvas ref={ref} width={W} height={H} onClick={handleClick}
      style={{ borderRadius: 14, maxWidth: '100%', cursor: 'crosshair', border: '1px solid rgba(255,255,255,0.06)' }}
    />
  )
}

// ─── CONTRIBUTION % BAR ───────────────────────────────────────────────────────
function ContribBar({ contributors, selectedAuthor, onSelect }) {
  const total = contributors.reduce((s, c) => s + c.commits, 0)
  return (
    <div>
      <div style={{ fontSize: 11, color: '#475569', fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>
        Contribution % · {total} total commits
      </div>
      {/* Stacked bar */}
      <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
        {contributors.map(c => (
          <div key={c.login}
            onClick={() => onSelect(c.login === selectedAuthor ? null : c.login)}
            title={`${c.login}: ${Math.round((c.commits/total)*100)}%`}
            style={{ flex: c.commits, background: c.color, cursor: 'pointer', opacity: selectedAuthor && selectedAuthor !== c.login ? 0.3 : 1, transition: 'opacity 0.2s' }}
          />
        ))}
      </div>
      {/* Author rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {contributors.map(c => {
          const pct = Math.round((c.commits / total) * 100)
          const isSelected = selectedAuthor === c.login
          return (
            <div key={c.login} onClick={() => onSelect(c.login === selectedAuthor ? null : c.login)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                background: isSelected ? c.color + '15' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isSelected ? c.color + '44' : 'rgba(255,255,255,0.05)'}`,
                transition: 'all 0.18s', opacity: selectedAuthor && !isSelected ? 0.4 : 1 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0, boxShadow: `0 0 6px ${c.color}` }}/>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#e2e8f0', flex: 1 }}>{c.login}</span>
              {/* mini bar */}
              <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: c.color, borderRadius: 99 }}/>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: c.color, width: 32, textAlign: 'right' }}>{pct}%</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#334155', width: 40, textAlign: 'right' }}>{c.commits}c</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── ACTIVITY PATTERNS ────────────────────────────────────────────────────────
function ActivityPatterns({ commits, contributors, selectedAuthor }) {
  const DAYS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  // Filter commits by selected author
  const filtered = selectedAuthor
    ? commits.filter(c => (c.author?.login || c.commit?.author?.name) === selectedAuthor)
    : commits

  // Hour distribution
  const byHour = Array(24).fill(0)
  // Day distribution
  const byDay  = Array(7).fill(0)
  // Month distribution
  const byMonth = Array(12).fill(0)

  filtered.forEach(c => {
    const d = new Date(c.commit?.author?.date)
    if (isNaN(d)) return
    byHour[d.getHours()]++
    byDay[d.getDay()]++
    byMonth[d.getMonth()]++
  })

  const maxH = Math.max(...byHour, 1)
  const maxD = Math.max(...byDay, 1)
  const maxM = Math.max(...byMonth, 1)

  const authorColor = selectedAuthor
    ? (contributors.find(c => c.login === selectedAuthor)?.color || '#6366f1')
    : '#6366f1'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Hour of day */}
      <div>
        <div style={{ fontSize: 11, color: '#475569', fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>
          ⏰ Commits by Hour {selectedAuthor ? `· ${selectedAuthor}` : '· all contributors'}
        </div>
        <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 56 }}>
          {byHour.map((v, h) => (
            <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }} title={`${h}:00 — ${v} commits`}>
              <div style={{ width: '100%', height: Math.max(2, (v/maxH)*52), borderRadius: '2px 2px 0 0', background: v > 0 ? authorColor + 'cc' : 'rgba(255,255,255,0.05)', transition: 'height 0.3s' }}/>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {['12am','6am','12pm','6pm','12am'].map((l,i) => (
            <span key={i} style={{ fontSize: 9, color: '#334155', fontFamily: "'JetBrains Mono',monospace" }}>{l}</span>
          ))}
        </div>
      </div>

      {/* Day of week */}
      <div>
        <div style={{ fontSize: 11, color: '#475569', fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>
          📅 Commits by Day of Week
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 52 }}>
          {byDay.map((v, d) => (
            <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', height: Math.max(2, (v/maxD)*46), borderRadius: '3px 3px 0 0', background: v > 0 ? authorColor + 'cc' : 'rgba(255,255,255,0.05)', transition: 'height 0.3s' }}/>
              <span style={{ fontSize: 9, color: '#334155', fontFamily: "'JetBrains Mono',monospace" }}>{DAYS[d]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Month */}
      <div>
        <div style={{ fontSize: 11, color: '#475569', fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>
          📆 Commits by Month
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 52 }}>
          {byMonth.map((v, m) => (
            <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', height: Math.max(2, (v/maxM)*46), borderRadius: '3px 3px 0 0', background: v > 0 ? authorColor + 'cc' : 'rgba(255,255,255,0.05)', transition: 'height 0.3s' }}/>
              <span style={{ fontSize: 8, color: '#334155', fontFamily: "'JetBrains Mono',monospace" }}>{MONTHS[m]}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ─── WHO WROTE WHAT ───────────────────────────────────────────────────────────
function WhoWroteWhat({ commits, contributors, selectedAuthor }) {
  const filtered = selectedAuthor
    ? commits.filter(c => (c.author?.login || c.commit?.author?.name) === selectedAuthor)
    : commits

  const recent = filtered.slice(0, 12)
  const authorColor = selectedAuthor
    ? (contributors.find(c => c.login === selectedAuthor)?.color || '#6366f1')
    : null

  return (
    <div>
      <div style={{ fontSize: 11, color: '#475569', fontFamily: "'JetBrains Mono',monospace", marginBottom: 12 }}>
        📝 Recent commits {selectedAuthor ? `by ${selectedAuthor}` : '— all authors'} ({filtered.length} total)
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
        {recent.map((c, i) => {
          const login = c.author?.login || c.commit?.author?.name || '?'
          const ci    = contributors.findIndex(x => x.login === login)
          const col   = authorColor || (ci >= 0 ? contributors[ci].color : PALETTE[0])
          const d     = new Date(c.commit?.author?.date)
          return (
            <div key={c.sha || i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0, marginTop: 4 }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.commit?.message?.split('\n')[0]}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: col, fontFamily: "'JetBrains Mono',monospace" }}>{login}</span>
                  <span style={{ fontSize: 10, color: '#334155', fontFamily: "'JetBrains Mono',monospace" }}>
                    {!isNaN(d) ? d.toLocaleDateString('en', { month:'short', day:'numeric', year:'numeric' }) : ''}
                  </span>
                  <span style={{ fontSize: 10, color: '#1e293b', fontFamily: "'JetBrains Mono',monospace", marginLeft: 'auto' }}>{c.sha?.slice(0,7)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export default function Galaxy({ contributors, edges, commits = [] }) {
  const [selectedAuthor, setSelectedAuthor] = useState(null)
  const [subTab, setSubTab] = useState('network')

  const subTabs = [
    { id: 'network',  label: '🌌 Network'    },
    { id: 'activity', label: '⏰ Activity'   },
    { id: 'commits',  label: '📝 Who & When' },
    { id: 'percent',  label: '📊 % Share'    },
  ]

  const selected = contributors.find(c => c.login === selectedAuthor)

  return (
    <div>
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 4 }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            flex: '1 1 auto', padding: '7px 10px', borderRadius: 9, border: 'none',
            background: subTab === t.id ? 'rgba(99,102,241,0.22)' : 'transparent',
            color: subTab === t.id ? '#a5b4fc' : '#475569',
            fontWeight: 600, fontSize: 11, fontFamily: "'JetBrains Mono',monospace",
            borderBottom: subTab === t.id ? '2px solid #6366f1' : '2px solid transparent',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Author filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        <button onClick={() => setSelectedAuthor(null)} style={{
          fontSize: 11, padding: '4px 12px', borderRadius: 99, border: `1px solid ${!selectedAuthor ? '#6366f1' : 'rgba(255,255,255,0.09)'}`,
          background: !selectedAuthor ? 'rgba(99,102,241,0.18)' : 'transparent',
          color: !selectedAuthor ? '#a5b4fc' : '#475569', fontFamily: "'JetBrains Mono',monospace",
        }}>All Authors</button>
        {contributors.map(c => (
          <button key={c.login} onClick={() => setSelectedAuthor(c.login === selectedAuthor ? null : c.login)} style={{
            fontSize: 11, padding: '4px 12px', borderRadius: 99,
            border: `1px solid ${selectedAuthor === c.login ? c.color + '88' : 'rgba(255,255,255,0.09)'}`,
            background: selectedAuthor === c.login ? c.color + '18' : 'transparent',
            color: selectedAuthor === c.login ? c.color : '#475569',
            fontFamily: "'JetBrains Mono',monospace", display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color }}/>
            {c.login}
          </button>
        ))}
      </div>

      {/* Selected author summary card */}
      {selected && (
        <div style={{ background: selected.color + '0d', border: `1px solid ${selected.color}33`, borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: selected.color + '22', border: `2px solid ${selected.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: selected.color }}>
            {selected.login[0].toUpperCase()}
          </div>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, fontFamily: "'JetBrains Mono',monospace" }}>{selected.login}</div>
            <div style={{ color: '#64748b', fontSize: 12, fontFamily: "'JetBrains Mono',monospace', marginTop: 2" }}>
              {selected.commits} commits · {Math.round((selected.commits / contributors.reduce((s,c)=>s+c.commits,0))*100)}% of project
            </div>
          </div>
          {edges.filter(e => e.from===selected.login||e.to===selected.login).slice(0,3).map(e => {
            const partner = e.from===selected.login ? e.to : e.from
            const pc = contributors.find(c=>c.login===partner)
            return (
              <div key={partner} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.04)', padding:'5px 10px', borderRadius:99, fontSize:11, color:'#64748b', fontFamily:"'JetBrains Mono',monospace" }}>
                <div style={{ width:6,height:6,borderRadius:'50%',background:pc?.color||'#6366f1' }}/>
                ↔ {partner} <span style={{color:'#6366f1'}}>({e.strength}×)</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Sub-tab panels */}
      {subTab === 'network' && (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <OrbitCanvas contributors={contributors} edges={edges} selectedAuthor={selectedAuthor} onSelect={setSelectedAuthor} />
          <div style={{ flex: 1, minWidth: 160, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
            <div style={{ color: '#334155', fontSize: 10, fontFamily: "'JetBrains Mono',monospace", marginBottom: 12 }}>LEGEND</div>
            <div style={{ color: '#475569', fontSize: 11, fontFamily: "'JetBrains Mono',monospace", lineHeight: 2 }}>
              ◉ Node size = commits<br/>
              ━ Arc width = collaboration<br/>
              ● Particles = handoffs<br/>
              ⟳ Orbit = activity
            </div>
            <div style={{ marginTop: 16 }}>
              {contributors.map((c,i) => (
                <div key={c.login} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                  <div style={{ width:8,height:8,borderRadius:'50%',background:c.color }}/>
                  <span style={{ fontSize:11,color:'#64748b',fontFamily:"'JetBrains Mono',monospace",flex:1 }}>{c.login}</span>
                  <span style={{ fontSize:10,color:'#334155',fontFamily:"'JetBrains Mono',monospace" }}>{c.commits}c</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:16, fontSize:10, color:'#1e293b', fontFamily:"'JetBrains Mono',monospace" }}>Click node or pill<br/>to filter by author</div>
          </div>
        </div>
      )}

      {subTab === 'activity' && (
        <ActivityPatterns commits={commits} contributors={contributors} selectedAuthor={selectedAuthor} />
      )}

      {subTab === 'commits' && (
        <WhoWroteWhat commits={commits} contributors={contributors} selectedAuthor={selectedAuthor} />
      )}

      {subTab === 'percent' && (
        <ContribBar contributors={contributors} selectedAuthor={selectedAuthor} onSelect={setSelectedAuthor} />
      )}
    </div>
  )
}
