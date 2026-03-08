import { useState } from 'react'
import { getRiskColor } from '../utils/constants.js'

export default function FileHeatmap({ files }) {
  const [sort, setSort] = useState('changes')
  const sorted = [...files].sort((a, b) => b[sort] - a[sort])
  const maxV   = Math.max(...sorted.map(f => f[sort]), 1)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['changes', 'additions', 'deletions'].map(s => (
          <button
            key={s}
            onClick={() => setSort(s)}
            style={{
              fontSize: 11, padding: '4px 14px', borderRadius: 99,
              border: `1px solid ${sort === s ? '#6366f1' : 'rgba(255,255,255,0.09)'}`,
              background: sort === s ? 'rgba(99,102,241,0.18)' : 'transparent',
              color: sort === s ? '#a5b4fc' : '#475569',
              fontFamily: "'JetBrains Mono',monospace", textTransform: 'capitalize',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map(f => {
          const pct = (f[sort] / maxV) * 100
          const rc  = getRiskColor(f.risk)

          return (
            <div
              key={f.file}
              style={{ position: 'relative', borderRadius: 9, overflow: 'hidden', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
            >
              {/* background fill bar */}
              <div style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(90deg,${rc}22 0%,${rc}08 ${pct}%,transparent ${pct}%)`,
              }}/>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: rc, flexShrink: 0, boxShadow: `0 0 6px ${rc}` }}/>
                <span style={{ flex: 1, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.file}>
                  {f.file}
                </span>
                <span style={{ color: '#4ade80', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, flexShrink: 0 }}>+{f.additions}</span>
                <span style={{ color: '#f87171', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, flexShrink: 0 }}>-{f.deletions}</span>
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: rc + '22', color: rc, fontFamily: "'JetBrains Mono',monospace", textTransform: 'uppercase', flexShrink: 0 }}>
                  {f.risk}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
