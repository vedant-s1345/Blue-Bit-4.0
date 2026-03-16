import { useState, useMemo } from 'react'
import { getRiskColor } from '../utils/constants.js'

// Given a fileActivity map, compute churn scores filtered by a date window
function computeFiltered(files, fileActivity, fromDate, toDate) {
  if (!fileActivity || Object.keys(fileActivity).length === 0) return files

  const from = fromDate ? new Date(fromDate).getTime() : 0
  const to   = toDate   ? new Date(toDate).getTime()   : Infinity

  return files.map(f => {
    const events = (fileActivity[f.file] || []).filter(ev => {
      const t = new Date(ev.date).getTime()
      return t >= from && t <= to
    })
    if (events.length === 0) return { ...f, changes: 0, additions: 0, deletions: 0 }
    return {
      ...f,
      changes:   events.length,
      additions: events.reduce((s, e) => s + e.additions, 0),
      deletions: events.reduce((s, e) => s + e.deletions, 0),
    }
  }).filter(f => f.changes > 0)
}

function getRiskFromChanges(changes) {
  return changes > 8 ? 'critical' : changes > 5 ? 'high' : changes > 2 ? 'medium' : 'low'
}

export default function FileHeatmap({ files, fileActivity, commits }) {
  const [sort,      setSort]      = useState('changes')
  const [fromDate,  setFromDate]  = useState('')
  const [toDate,    setToDate]    = useState('')
  const [sliderIdx, setSliderIdx] = useState(100)   // 0–100 → % of history to include

  // Earliest and latest dates from commits for slider bounds
  const [minDate, maxDate] = useMemo(() => {
    if (!commits?.length) return ['', '']
    const sorted = [...commits].sort((a, b) =>
      new Date(a.commit?.author?.date) - new Date(b.commit?.author?.date)
    )
    return [
      sorted[0]?.commit?.author?.date?.slice(0, 10) || '',
      sorted[sorted.length - 1]?.commit?.author?.date?.slice(0, 10) || '',
    ]
  }, [commits])

  // Derive slider-controlled date range
  const sliderFrom = useMemo(() => {
    if (!minDate || !maxDate) return ''
    const mn = new Date(minDate).getTime()
    const mx = new Date(maxDate).getTime()
    const pct = sliderIdx / 100
    // sliderIdx = 100 means "all history", lower = recent only
    const cutoff = mx - (mx - mn) * pct
    return new Date(cutoff).toISOString().slice(0, 10)
  }, [sliderIdx, minDate, maxDate])

  // Active from/to: manual override > slider
  const effectiveFrom = fromDate || sliderFrom
  const effectiveTo   = toDate   || maxDate

  const filteredFiles = useMemo(() => {
    const base = (effectiveFrom || effectiveTo)
      ? computeFiltered(files, fileActivity, effectiveFrom, effectiveTo)
      : files
    const withRisk = base.map(f => ({ ...f, risk: getRiskFromChanges(f.changes) }))
    return [...withRisk].sort((a, b) => b[sort] - a[sort])
  }, [files, fileActivity, effectiveFrom, effectiveTo, sort])

  const maxV = Math.max(...filteredFiles.map(f => f[sort]), 1)
  const hasTimeData = fileActivity && Object.keys(fileActivity).length > 0
  const usingFilter = !!(effectiveFrom || effectiveTo)

  return (
    <div>
      {/* Sort controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
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

        {/* Time filter badge */}
        {usingFilter && (
          <span style={{ fontSize: 10, color: '#818cf8', fontFamily: "'JetBrains Mono',monospace", marginLeft: 8 }}>
            ⏱ {effectiveFrom} → {effectiveTo || 'now'}
          </span>
        )}
        {usingFilter && (
          <button
            onClick={() => { setFromDate(''); setToDate(''); setSliderIdx(100) }}
            style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontFamily: "'JetBrains Mono',monospace" }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Time slider — only shown when we have timeline data */}
      {hasTimeData && minDate && (
        <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ color: '#818cf8', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, flexShrink: 0 }}>
              📅 TIME WINDOW
            </span>
            <span style={{ color: '#475569', fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>
              {sliderIdx}% of history
            </span>
          </div>
          <input
            type="range" min={5} max={100} value={sliderIdx}
            onChange={e => { setSliderIdx(Number(e.target.value)); setFromDate(''); setToDate('') }}
            style={{ width: '100%', accentColor: '#6366f1' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 9, color: '#334155', fontFamily: "'JetBrains Mono',monospace" }}>{minDate}</span>
            <span style={{ fontSize: 9, color: '#334155', fontFamily: "'JetBrains Mono',monospace" }}>{maxDate}</span>
          </div>

          {/* Manual date pickers */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <input
              type="date" value={fromDate} min={minDate} max={maxDate}
              onChange={e => setFromDate(e.target.value)}
              style={{ fontSize: 10, padding: '4px 8px', borderRadius: 6, background: '#020617', border: '1px solid #334155', color: '#cbd5f5', fontFamily: "'JetBrains Mono',monospace" }}
            />
            <span style={{ color: '#334155', alignSelf: 'center', fontSize: 10 }}>→</span>
            <input
              type="date" value={toDate} min={minDate} max={maxDate}
              onChange={e => setToDate(e.target.value)}
              style={{ fontSize: 10, padding: '4px 8px', borderRadius: 6, background: '#020617', border: '1px solid #334155', color: '#cbd5f5', fontFamily: "'JetBrains Mono',monospace" }}
            />
          </div>
        </div>
      )}

      {/* File rows */}
      {filteredFiles.length === 0 ? (
        <div style={{ color: '#334155', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, padding: 24, textAlign: 'center' }}>
          No file activity in selected time window
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredFiles.map(f => {
            const pct = (f[sort] / maxV) * 100
            const rc  = getRiskColor(f.risk)
            return (
              <div
                key={f.file}
                style={{ position: 'relative', borderRadius: 9, overflow: 'hidden', transition: 'transform 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
              >
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
      )}
    </div>
  )
}
