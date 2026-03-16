// This component generates AI-driven insights based on commit data and contributor activity. It identifies key risks like bus factor, hotspots, and collaboration patterns, and presents them in an interactive card format. Each insight is color-coded by severity and can be expanded for more details. The component also includes a status header with real-time data indicators and prompts users to explore further analysis through the AI Chat feature.
import { useState } from 'react'


const COLORS = {
  critical: { bg: 'rgba(239,68,68,0.07)',   border: '#ef444430', text: '#f87171' },
  warning:  { bg: 'rgba(249,115,22,0.07)',  border: '#f9731630', text: '#fb923c' },
  info:     { bg: 'rgba(99,102,241,0.07)',  border: '#6366f130', text: '#818cf8' },
  success:  { bg: 'rgba(34,197,94,0.07)',   border: '#22c55e30', text: '#4ade80' },
  ai:       { bg: 'rgba(168,85,247,0.07)',  border: '#a855f730', text: '#c084fc' },
}

export default function AIInsights({ data }) {
  const { contributors, busFactorPct, totalCommits, fileList, collabEdges, commits, aiInsights } = data
  const [open, setOpen] = useState(null)

  const top     = contributors[0]
  const topPair = collabEdges[0]
  const hotFile = fileList[0]

  let span = '—'
  if (commits.length > 1) {
    const d1 = new Date(commits[commits.length - 1]?.commit?.author?.date)
    const d2 = new Date(commits[0]?.commit?.author?.date)
    if (!isNaN(d1) && !isNaN(d2))
      span = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24 * 30))) + ' months'
  }

  const insights = [
    top && busFactorPct > 35 && {
      type: busFactorPct > 65 ? 'critical' : 'warning',
      icon: '⚠️',
      title: `Bus Factor Risk: ${busFactorPct}%`,
      desc: `@${top.login} authored ${busFactorPct}% of all ${totalCommits} commits. If they become unavailable the project faces serious continuity risk. Distribute ownership across at least 3 active contributors and add thorough documentation.`,
      metric: `${top.commits} / ${totalCommits} commits`,
    },
    hotFile && {
      type: hotFile.risk === 'critical' ? 'critical' : 'warning',
      icon: '🔥',
      title: `Hotspot: ${hotFile.file.split('/').pop()}`,
      desc: `"${hotFile.file}" was modified ${hotFile.changes}× — highest churn in the repository. High churn signals unstable requirements, missing abstraction layers, or technical debt.`,
      metric: `${hotFile.changes} edits · +${hotFile.additions} −${hotFile.deletions}`,
    },
    topPair && {
      type: 'info',
      icon: '🌐',
      title: `Top Pair: ${topPair.from} ↔ ${topPair.to}`,
      desc: `These developers share the strongest collaboration signal (${topPair.strength} proximity events). Ideal candidates for cross-reviews and pair-programming.`,
      metric: `${topPair.strength} proximity events`,
    },
    contributors.length < 3 && {
      type: 'warning',
      icon: '👥',
      title: 'Small Contributor Base',
      desc: `Only ${contributors.length} unique contributor${contributors.length !== 1 ? 's' : ''} found. Projects with fewer than 3 active contributors carry high concentration risk.`,
      metric: `${contributors.length} contributor${contributors.length !== 1 ? 's' : ''}`,
    },
    {
      type: 'success',
      icon: '📡',
      title: 'Repository Scan Complete',
      desc: `GitLens analysed ${totalCommits} commits across ${contributors.length} contributors spanning ${span}. Use the ✦ AI Chat button (bottom-right) for interactive analysis and deeper questions.`,
      metric: `${totalCommits} commits · ${contributors.length} authors · ${span}`,
    },
    aiInsights && {
      type: 'ai',
      icon: '🤖',
      title: 'AI Analysis (Backend)',
      desc: [aiInsights.summary, aiInsights.technicalDebt, aiInsights.busFactorWarning, aiInsights.recommendations].filter(Boolean).join('\n\n'),
      metric: 'Powered by Gemini via backend',
    },
  ].filter(Boolean)

  return (
    <div>
      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', animation: 'pulse 1.5s infinite' }}/>
        <span style={{ color: '#475569', fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }}>
          Derived from real commit data · click cards to expand
        </span>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: '#64748b', fontFamily: "'JetBrains Mono',monospace", padding: '5px 12px', borderRadius: 8, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
          ✦ More analysis → AI Chat (bottom right)
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {insights.map((ins, i) => {
          const c = COLORS[ins.type] || COLORS.info
          const isOpen = open === i
          return (
            <div
              key={i}
              onClick={() => setOpen(isOpen ? null : i)}
              style={{
                background: c.bg, border: `1px solid ${c.border}`,
                borderRadius: 12, padding: isOpen ? '14px 16px' : '11px 16px',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{ins.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: c.text, fontWeight: 700, fontSize: 13 }}>{ins.title}</div>
                  <div style={{ color: '#475569', fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>{ins.metric}</div>
                </div>
                <div style={{ color: '#334155', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</div>
              </div>
              {isOpen && (
                <div style={{ marginTop: 10, borderTop: `1px solid ${c.border}`, paddingTop: 10, color: '#94a3b8', fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                  {ins.desc}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.5)} }`}</style>
    </div>
  )
}
