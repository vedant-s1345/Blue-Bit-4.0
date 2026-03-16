// This component renders a heatmap visualization of commit frequency by day of week and hour of day. It takes a 2D array of commit counts (hourDay) as input, where hourDay[day][hour] gives the number of commits for that day and hour. The heatmap uses a color gradient to represent commit frequency, with tooltips on hover showing the exact count for each cell. Below the heatmap, it also displays summary cards for each day of the week, showing total commits and peak hour. The component is designed to be visually appealing and informative, providing insights into when commits are most frequent in the repository's history.
import { useState } from 'react'
import { lerp } from '../utils/constants.js'

const DAYS  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function getColor(val, maxVal) {
  if (val === 0) return 'rgba(255,255,255,0.03)'
  const t = val / maxVal
  const r = Math.round(lerp(209, 22, t))
  const g = Math.round(lerp(240, 163, t))
  const b = Math.round(lerp(220, 74, t))
  return `rgba(${r},${g},${b},${0.25 + t * 0.75})`
}

export default function DayHourHeatmap({ hourDay }) {
  const maxVal = Math.max(...hourDay.flat(), 1)
  const [tip, setTip] = useState(null)

  return (
    <div>
      <div style={{ color: '#475569', fontSize: 12, marginBottom: 20, fontFamily: "'JetBrains Mono',monospace" }}>
        Commit frequency by day of week × hour of day · hover any cell for details
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 660 }}>

          {/* Hour header */}
          <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(24,1fr)', marginBottom: 6 }}>
            <div/>
            {HOURS.map(h => (
              <div key={h} style={{ textAlign: 'center', fontSize: 9, color: '#475569', fontFamily: "'JetBrains Mono',monospace" }}>
                {h === 0 ? '12a' : h < 12 ? `${h}` : h === 12 ? '12p' : `${h - 12}`}
              </div>
            ))}
          </div>

          {/* Rows */}
          {DAYS.map((day, di) => (
            <div key={day} style={{ display: 'grid', gridTemplateColumns: '90px repeat(24,1fr)', marginBottom: 3 }}>
              <div style={{ fontSize: 12, color: '#64748b', fontFamily: "'JetBrains Mono',monospace", display: 'flex', alignItems: 'center', paddingRight: 10, justifyContent: 'flex-end' }}>
                {day}
              </div>
              {HOURS.map(h => {
                const val = hourDay[di][h]
                return (
                  <div
                    key={h}
                    onMouseEnter={e => setTip({ day, h, val, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTip(null)}
                    style={{
                      height: 30, margin: '0 1.5px', borderRadius: 5,
                      background: getColor(val, maxVal),
                      border: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'default', transition: 'transform 0.1s', position: 'relative', zIndex: 1,
                    }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.2)'; e.currentTarget.style.zIndex = 10 }}
                    onMouseOut={e  => { e.currentTarget.style.transform = 'scale(1)';   e.currentTarget.style.zIndex = 1  }}
                  />
                )
              })}
            </div>
          ))}

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 10, color: '#334155', fontFamily: "'JetBrains Mono',monospace" }}>Low (0)</span>
            {[0, 0.17, 0.34, 0.5, 0.67, 0.84, 1].map(t => (
              <div key={t} style={{ width: 20, height: 13, borderRadius: 3, background: getColor(Math.round(t * maxVal), maxVal) }}/>
            ))}
            <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'JetBrains Mono',monospace" }}>High ({maxVal})</span>
          </div>

        </div>
      </div>

      {/* Daily summary cards */}
      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10 }}>
        {DAYS.map((day, di) => {
          const total = hourDay[di].reduce((a, b) => a + b, 0)
          const peak  = hourDay[di].indexOf(Math.max(...hourDay[di]))
          if (!total) return null
          return (
            <div key={day} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 13px' }}>
              <div style={{ color: '#64748b', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, marginBottom: 4 }}>{day.slice(0,3)}</div>
              <div style={{ color: '#a5b4fc', fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 700 }}>{total}</div>
              <div style={{ color: '#334155', fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>peak {peak}:00</div>
            </div>
          )
        })}
      </div>

      {/* Tooltip */}
      {tip && (
        <div style={{
          position: 'fixed', top: tip.y - 70, left: tip.x - 75,
          background: 'rgba(2,6,23,0.97)', border: '1px solid rgba(139,92,246,0.5)',
          borderRadius: 10, padding: '8px 13px', zIndex: 9999, pointerEvents: 'none',
          fontFamily: "'JetBrains Mono',monospace", backdropFilter: 'blur(12px)',
        }}>
          <div style={{ color: '#a5b4fc', fontWeight: 700, fontSize: 12 }}>{tip.day} · {String(tip.h).padStart(2,'0')}:00</div>
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{tip.val} commit{tip.val !== 1 ? 's' : ''}</div>
        </div>
      )}
    </div>
  )
}
