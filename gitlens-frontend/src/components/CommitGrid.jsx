import { PALETTE } from '../utils/constants.js'

export default function CommitGrid({ commits, currentIdx, onSeek, contributors }) {
  return (
    <div>
      <div style={{ color: '#334155', fontSize: 11, marginBottom: 18, fontFamily: "'JetBrains Mono',monospace" }}>
        Showing {Math.min(80, commits.length)} of {commits.length} commits · colored by contributor · click any bar or card to jump
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 9 }}>
        {commits.slice(0, 80).map((cm, i) => {
          const d     = new Date(cm.commit?.author?.date)
          const login = cm.author?.login || cm.commit?.author?.name || '?'
          const ci    = contributors.findIndex(x => x.login === login)
          const col   = ci >= 0 ? contributors[ci].color : PALETTE[0]
          const active = i <= currentIdx
          const cur    = i === currentIdx

          return (
            <div
              key={cm.sha || i}
              onClick={() => onSeek(i)}
              style={{
                padding: '10px 12px', borderRadius: 10,
                border: `1px solid ${cur ? col + '55' : 'rgba(255,255,255,0.05)'}`,
                background: cur ? col + '10' : active ? 'rgba(255,255,255,0.02)' : 'transparent',
                cursor: 'pointer', opacity: active ? 1 : 0.35,
                transition: 'all 0.18s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0 }}/>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#334155' }}>{cm.sha?.slice(0, 7)}</span>
                <span style={{ fontSize: 9, color: '#1e293b', marginLeft: 'auto', fontFamily: "'JetBrains Mono',monospace" }}>
                  {!isNaN(d) ? d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''}
                </span>
              </div>
              <div style={{
                color: '#e2e8f0', fontSize: 12, fontWeight: 600, marginBottom: 3, lineHeight: 1.35,
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {cm.commit?.message?.split('\n')[0]}
              </div>
              <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: col }}>{login}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
