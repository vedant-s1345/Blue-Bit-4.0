import { PALETTE } from '../utils/constants.js'

export default function TimelineBars({ commits, currentIdx, onSeek, contributors }) {
  const show = commits.slice(0, 80)

  return (
    <div>
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 80 }}>
        {show.map((c, i) => {
          const login = c.author?.login || c.commit?.author?.name || '?'
          const ci    = contributors.findIndex(x => x.login === login)
          const col   = ci >= 0 ? contributors[ci].color : PALETTE[0]
          const d     = new Date(c.commit?.author?.date)
          const h     = 12 + ((!isNaN(d) ? d.getDay() : 0) / 6) * 62
          const active = i <= currentIdx
          const cur    = i === currentIdx

          return (
            <div
              key={c.sha || i}
              onClick={() => onSeek(i)}
              title={c.commit?.message?.split('\n')[0]}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
            >
              <div style={{
                width: '100%',
                height: Math.max(6, h),
                borderRadius: '3px 3px 0 0',
                background: cur
                  ? `linear-gradient(180deg,#fff,${col})`
                  : active ? col + 'cc' : 'rgba(255,255,255,0.06)',
                transition: 'all 0.22s',
                boxShadow: cur ? `0 0 10px ${col}` : 'none',
                transform: cur ? 'scaleY(1.12)' : 'scaleY(1)',
                transformOrigin: 'bottom',
              }}/>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, color: '#334155', fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>
        {commits[commits.length - 1] && (
          <span>{new Date(commits[commits.length - 1].commit?.author?.date).toLocaleDateString('en', { month: 'short', year: 'numeric' })}</span>
        )}
        {commits[0] && (
          <span>{new Date(commits[0].commit?.author?.date).toLocaleDateString('en', { month: 'short', year: 'numeric' })}</span>
        )}
      </div>
    </div>
  )
}
