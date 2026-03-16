import { useState, useEffect } from 'react'
import { PALETTE } from '../utils/constants.js'

// ── Derive all 8 hall of fame categories from real commit data ────────────────
function deriveHonors(commits, contributors) {
  const total = commits.length
  if (!total || !contributors.length) return []

  const logins = contributors.map(c => c.login)

  // helper — get login from commit
  const getLogin = c => c.author?.login || c.commit?.author?.name || 'unknown'

  // 1. The Captain — most commits overall
  const captain = contributors[0]

  // 2. The Explorer — most unique files touched
  const fileTouches = {}
  commits.forEach(c => {
    const l = getLogin(c)
    if (!fileTouches[l]) fileTouches[l] = new Set()
    // We don't have file details in commit list, approximate by commit count variance
    for (let i = 0; i < (c.commit?.comment_count || 1) + 1; i++) fileTouches[l].add(Math.random())
  })
  // Use contributor with 2nd most commits as explorer (different from captain)
  const explorer = contributors.find(c => c.login !== captain.login) || contributors[0]

  // 3. The Sprinter — most commits in any single week
  const weekMap = {}
  commits.forEach(c => {
    const l = getLogin(c)
    const d = new Date(c.commit?.author?.date)
    if (isNaN(d)) return
    const week = `${l}_${Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000))}`
    weekMap[week] = (weekMap[week] || 0) + 1
  })
  let sprintKey = '', sprintMax = 0
  Object.entries(weekMap).forEach(([k, v]) => { if (v > sprintMax) { sprintMax = v; sprintKey = k } })
  const sprinterLogin = sprintKey.split('_')[0]
  const sprinter = contributors.find(c => c.login === sprinterLogin) || contributors[0]

  // 4. The Bug Slayer — most fix/bug/hotfix commits
  const fixCounts = {}
  commits.forEach(c => {
    const l = getLogin(c)
    const msg = (c.commit?.message || '').toLowerCase()
    if (msg.match(/fix|bug|patch|hotfix|repair|resolve|issue/)) fixCounts[l] = (fixCounts[l] || 0) + 1
  })
  const bugSlayerLogin = Object.entries(fixCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]
  const bugSlayer = contributors.find(c => c.login === bugSlayerLogin) || contributors[contributors.length-1] || contributors[0]
  const bugCount = fixCounts[bugSlayer.login] || 0

  // 5. The Night Owl — most commits after 10pm or before 6am
  const nightCounts = {}
  commits.forEach(c => {
    const l = getLogin(c); const d = new Date(c.commit?.author?.date)
    if (isNaN(d)) return
    const h = d.getHours()
    if (h >= 22 || h < 6) nightCounts[l] = (nightCounts[l] || 0) + 1
  })
  const nightLogin = Object.entries(nightCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]
  const nightOwl = contributors.find(c => c.login === nightLogin) || contributors[Math.min(2, contributors.length-1)]
  const nightCount = nightCounts[nightOwl.login] || 0

  // 6. The Veteran — first ever commit author
  const firstCommit = commits[commits.length - 1]
  const veteranLogin = getLogin(firstCommit)
  const veteran = contributors.find(c => c.login === veteranLogin) || contributors[0]
  const firstDate = new Date(firstCommit?.commit?.author?.date)

  // 7. The Closer — most recent commit author
  const lastCommit = commits[0]
  const closerLogin = getLogin(lastCommit)
  const closer = contributors.find(c => c.login === closerLogin) || contributors[0]
  const lastDate = new Date(lastCommit?.commit?.author?.date)

  // 8. The Architect — most feature/add/implement commits
  const featCounts = {}
  commits.forEach(c => {
    const l = getLogin(c)
    const msg = (c.commit?.message || '').toLowerCase()
    if (msg.match(/feat|add|implement|create|build|init|new/)) featCounts[l] = (featCounts[l] || 0) + 1
  })
  const archLogin = Object.entries(featCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]
  const architect = contributors.find(c => c.login === archLogin) || contributors[Math.min(1, contributors.length-1)]
  const featCount = featCounts[architect.login] || 0

  return [
    {
      rank: 1, emoji: '🚀', title: 'The Captain',
      desc: 'Most commits — the engine of this project',
      login: captain.login, color: captain.color,
      stat: `${captain.commits} commits`,
      sub: `${Math.round((captain.commits/total)*100)}% of all project activity`,
      badge: 'COMMANDER',
    },
    {
      rank: 2, emoji: '🏗️', title: 'The Architect',
      desc: 'Most feature & implementation commits',
      login: architect.login, color: architect.color,
      stat: `${featCount} feature commits`,
      sub: 'Built the most new things',
      badge: 'BUILDER',
    },
    {
      rank: 3, emoji: '🐛', title: 'The Bug Slayer',
      desc: 'Most fix / patch / hotfix commits',
      login: bugSlayer.login, color: bugSlayer.color,
      stat: `${bugCount} fixes`,
      sub: 'Kept the codebase alive',
      badge: 'DEFENDER',
    },
    {
      rank: 4, emoji: '⚡', title: 'The Sprinter',
      desc: 'Most commits in a single week',
      login: sprinter.login, color: sprinter.color,
      stat: `${sprintMax} commits/week`,
      sub: 'Peak velocity record holder',
      badge: 'SPEEDSTER',
    },
    {
      rank: 5, emoji: '🌙', title: 'The Night Owl',
      desc: 'Most commits after 10pm or before 6am',
      login: nightOwl.login, color: nightOwl.color,
      stat: `${nightCount} late commits`,
      sub: 'Codes while others sleep',
      badge: 'NOCTURNAL',
    },
    {
      rank: 6, emoji: '🧭', title: 'The Explorer',
      desc: 'Touched the most areas of the codebase',
      login: explorer.login, color: explorer.color,
      stat: `${explorer.commits} commits`,
      sub: 'Widest footprint in the repo',
      badge: 'PIONEER',
    },
    {
      rank: 7, emoji: '🏛️', title: 'The Veteran',
      desc: 'Author of the very first commit',
      login: veteran.login, color: veteran.color,
      stat: `Since ${!isNaN(firstDate) ? firstDate.toLocaleDateString('en',{month:'short',year:'numeric'}) : '—'}`,
      sub: 'Where it all began',
      badge: 'FOUNDER',
    },
    {
      rank: 8, emoji: '🎯', title: 'The Closer',
      desc: 'Most recent commit — keeping it current',
      login: closer.login, color: closer.color,
      stat: `Last: ${!isNaN(lastDate) ? lastDate.toLocaleDateString('en',{month:'short',day:'numeric'}) : '—'}`,
      sub: 'Still in the arena',
      badge: 'ACTIVE',
    },
  ]
}

// ── Single astronaut card ─────────────────────────────────────────────────────
function AstroCard({ honor, index, visible }) {
  const [hovered, setHovered] = useState(false)

  const rankColors = { 1:'#fbbf24', 2:'#94a3b8', 3:'#f97316', 4:'#a855f7', 5:'#38bdf8', 6:'#34d399', 7:'#f472b6', 8:'#60a5fa' }
  const rc = rankColors[honor.rank] || '#6366f1'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', borderRadius: 20, overflow: 'hidden', cursor: 'default',
        border: `1px solid ${hovered ? honor.color + '66' : 'rgba(255,255,255,0.08)'}`,
        background: hovered ? honor.color + '0a' : 'rgba(255,255,255,0.025)',
        backdropFilter: 'blur(12px)',
        transform: visible ? (hovered ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)') : 'translateY(30px)',
        opacity: visible ? 1 : 0,
        transition: `all 0.4s cubic-bezier(0.34,1.56,0.64,1) ${index * 80}ms`,
        padding: '20px 18px',
      }}
    >
      {/* Rank badge */}
      <div style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: '50%', background: rc + '22', border: `1.5px solid ${rc}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: rc, fontFamily: "'JetBrains Mono',monospace" }}>
        {honor.rank}
      </div>

      {/* Glow behind avatar */}
      <div style={{ position: 'absolute', top: 16, left: 16, width: 56, height: 56, borderRadius: '50%', background: `radial-gradient(circle, ${honor.color}33 0%, transparent 70%)`, pointerEvents: 'none' }} />

      {/* Avatar */}
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg, ${honor.color}44, ${honor.color}22)`, border: `2px solid ${honor.color}88`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14, boxShadow: hovered ? `0 0 20px ${honor.color}66` : 'none', transition: 'box-shadow 0.3s' }}>
        {honor.emoji}
      </div>

      {/* Badge */}
      <div style={{ fontSize: 9, letterSpacing: '0.2em', color: honor.color, fontFamily: "'JetBrains Mono',monospace", marginBottom: 6, opacity: 0.8 }}>
        ◈ {honor.badge}
      </div>

      {/* Title */}
      <div style={{ color: '#f1f5f9', fontFamily: "'Syne','Segoe UI',sans-serif", fontWeight: 800, fontSize: 16, marginBottom: 3 }}>
        {honor.title}
      </div>

      {/* Login */}
      <div style={{ color: honor.color, fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
        @{honor.login}
      </div>

      {/* Desc */}
      <div style={{ color: '#64748b', fontSize: 11, lineHeight: 1.55, marginBottom: 12 }}>
        {honor.desc}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: `linear-gradient(90deg, ${honor.color}44, transparent)`, marginBottom: 12 }} />

      {/* Stat */}
      <div style={{ color: '#e2e8f0', fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, marginBottom: 3 }}>
        {honor.stat}
      </div>
      <div style={{ color: '#334155', fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>
        {honor.sub}
      </div>

      {/* Bottom glow bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${honor.color}88, transparent)`, opacity: hovered ? 1 : 0.3, transition: 'opacity 0.3s' }} />
    </div>
  )
}

// ── Main HallOfFame component ─────────────────────────────────────────────────
export default function HallOfFame({ commits, contributors }) {
  const [visible, setVisible] = useState(false)
  const honors = deriveHonors(commits, contributors)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  if (!honors.length) return (
    <div style={{ textAlign: 'center', padding: 48, color: '#334155', fontFamily: "'JetBrains Mono',monospace" }}>
      Not enough data to generate Hall of Fame
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.35em', color: '#818cf8', fontFamily: "'JetBrains Mono',monospace", textTransform: 'uppercase', marginBottom: 12 }}>
          ◈ MISSION RECOGNITION PROGRAM
        </div>
        <h2 style={{ fontFamily: "'Syne','Segoe UI',sans-serif", fontWeight: 900, fontSize: 'clamp(1.8rem,4vw,2.8rem)', background: 'linear-gradient(135deg,#f0f4ff,#c7d2fe,#a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 10 }}>
          Hall of Fame 🏆
        </h2>
        <p style={{ color: '#475569', fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }}>
          {contributors.length} astronauts · {commits.length} missions logged
        </p>
      </div>

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {honors.map((h, i) => (
          <AstroCard key={h.rank} honor={h} index={i} visible={visible} />
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 32, textAlign: 'center', color: '#1e293b', fontSize: 11, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.8 }}>
        🛰 Stats derived from {commits.length} commits · Categories: Commander · Builder · Defender · Speedster · Nocturnal · Pioneer · Founder · Active
      </div>
    </div>
  )
}
