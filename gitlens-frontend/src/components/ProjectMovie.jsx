// Placeholder — replace with your full ProjectMovie component
import { useState, useEffect, useRef } from 'react'
import { PALETTE } from '../utils/constants.js'

export default function ProjectMovie({ commits }) {
  const [playing, setPlaying]   = useState(false)
  const [frame,   setFrame]     = useState(0)
  const [speed,   setSpeed]     = useState(1)
  const timerRef = useRef()

  const total = Math.min(commits.length, 200)

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setFrame(f => {
          if (f >= total - 1) { setPlaying(false); return f }
          return f + 1
        })
      }, Math.round(600 / speed))
    }
    return () => clearInterval(timerRef.current)
  }, [playing, total, speed])

  const commit = commits[frame]
  const author = commit?.author?.login || commit?.commit?.author?.name || '?'
  const msg    = commit?.commit?.message?.split('\n')[0] || ''
  const date   = commit?.commit?.author?.date
    ? new Date(commit.commit.author.date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  // Count commits per author up to current frame
  const authorCounts = {}
  commits.slice(0, frame + 1).forEach(c => {
    const a = c?.author?.login || c?.commit?.author?.name || 'unknown'
    authorCounts[a] = (authorCounts[a] || 0) + 1
  })
  const sorted = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxCount = sorted[0]?.[1] || 1

  return (
    <div style={{ fontFamily: "'JetBrains Mono',monospace" }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.3em', color: '#818cf8', marginBottom: 8, textTransform: 'uppercase' }}>◈ PROJECT MOVIE</div>
        <div style={{ color: '#e2e8f0', fontSize: 13 }}>Watch the repository grow commit by commit</div>
      </div>

      {/* Screen */}
      <div style={{ background: '#020617', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: 24, marginBottom: 20, minHeight: 260 }}>
        {/* Date + commit */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ color: '#6366f1', fontSize: 13, fontWeight: 700 }}>{date}</div>
          <div style={{ color: '#334155', fontSize: 11 }}>frame {frame + 1} / {total}</div>
        </div>

        <div style={{ color: '#f1f5f9', fontSize: 13, marginBottom: 20, lineHeight: 1.5, minHeight: 40 }}>
          {msg}
        </div>

        {/* Bar chart of contributors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map(([name, count], i) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 90, color: PALETTE[i % PALETTE.length], fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>@{name}</div>
              <div style={{ flex: 1, height: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(count / maxCount) * 100}%`, background: PALETTE[i % PALETTE.length], borderRadius: 4, transition: 'width 0.3s ease' }}/>
              </div>
              <div style={{ color: '#475569', fontSize: 10, width: 28, textAlign: 'right', flexShrink: 0 }}>{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setFrame(0)} style={btn}>⏮</button>
        <button onClick={() => setFrame(f => Math.max(0, f - 1))} style={btn}>◀</button>
        <button
          onClick={() => { if (!playing && frame >= total - 1) setFrame(0); setPlaying(p => !p) }}
          style={{ ...btn, width: 44, height: 44, background: playing ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: `1px solid ${playing ? '#ef4444' : '#6366f1'}`, color: '#fff' }}
        >{playing ? '⏸' : '▶'}</button>
        <button onClick={() => setFrame(f => Math.min(total - 1, f + 1))} style={btn}>▶</button>
        <button onClick={() => setFrame(total - 1)} style={btn}>⏭</button>

        {/* Speed */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
          {[0.5, 1, 2, 4].map(s => (
            <button key={s} onClick={() => setSpeed(s)} style={{ ...btn, background: speed === s ? 'rgba(99,102,241,0.25)' : 'transparent', color: speed === s ? '#a5b4fc' : '#475569', border: `1px solid ${speed === s ? '#6366f1' : 'rgba(255,255,255,0.08)'}` }}>
              {s}×
            </button>
          ))}
        </div>

        {/* Scrubber */}
        <input type="range" min={0} max={total - 1} value={frame}
          onChange={e => setFrame(Number(e.target.value))}
          style={{ flex: 1, minWidth: 100, accentColor: '#6366f1' }}
        />
      </div>
    </div>
  )
}

const btn = { width: 33, height: 33, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#64748b', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
