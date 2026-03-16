// React hooks
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { getAuthorColor, fmtDate } from '../utils/constants.js'
import FilterBar from './FilterBar'
import HallOfFame from './HallOfFame'
//imports for icons 
import { Clapperboard } from "lucide-react"
import { GalleryVerticalEnd } from "lucide-react"
import { Radio } from "lucide-react"
import { Clock2 } from "lucide-react"
import { UserRound } from "lucide-react"
import { Bot } from "lucide-react"
 // imports till here 
// Visualization components
import TimelineBars   from './TimelineBars.jsx'
import CommitGrid     from './CommitGrid.jsx'
import FileHeatmap    from './FileHeatmap.jsx'
import DayHourHeatmap from './DayHourHeatmap.jsx'
import Galaxy         from './Galaxy.jsx'
import AIInsights     from './AIInsights.jsx'

const TABS = [
  { id: 'timeline', label: '🎬 Timeline'      },
  { id: 'hotspot',  label: '🔥 File Hotspots' },
  { id: 'dayhour',  label: '⏰ Day × Hour'    },
  { id: 'galaxy',   label: '🌌 Contributors'  },
  { id: 'insights', label: '🤖 AI Insights'   },
  { id: 'halloffame', label: '🏆 Hall of Fame' },
]

export default function Dashboard({ data, onReset }) {
  const { repoInfo, commits, contributors, hourDay, fileList, collabEdges, owner, repo } = data

  const [playing, setPlaying] = useState(false)
  const [idx,     setIdx]     = useState(0)
  const [tab,     setTab]     = useState('timeline')
  const [filters, setFilters] = useState({
    author: "all",
    keyword: "",
    timeRange: "all"
  })
  const playRef = useRef()

  // Filtered commits based on active filters
  const filteredCommits = useMemo(() => {
    return commits.filter(commit => {
      const author = commit?.author?.login || commit?.commit?.author?.name
      if (filters.author !== "all" && author !== filters.author) return false
      if (filters.keyword && !commit.commit?.message?.toLowerCase().includes(filters.keyword.toLowerCase())) return false
      if (filters.timeRange === "6months") {
        const limit = new Date()
        limit.setMonth(limit.getMonth() - 6)
        const commitDate = new Date(commit.commit?.author?.date)
        if (commitDate < limit) return false
      }
      return true
    })
  }, [commits, filters])

  const togglePlay = useCallback(() => {
    setPlaying(p => {
      if (!p && idx >= filteredCommits.length - 1) setIdx(0)
      return !p
    })
  }, [idx, filteredCommits.length])

  useEffect(() => {
    if (playing) {
      playRef.current = setInterval(() => {
        setIdx(i => {
          if (i >= filteredCommits.length - 1) { setPlaying(false); return i }
          return i + 1
        })
      }, 380)
    }
    return () => clearInterval(playRef.current)
  }, [playing, filteredCommits.length])

  const commit = filteredCommits[idx]
  const authorLogin = commit?.author?.login || commit?.commit?.author?.name || 'unknown'
  const authorColor = getAuthorColor(authorLogin, contributors)
  const commitDate  = commit && new Date(commit.commit?.author?.date)

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, paddingBottom: 60 }}>
      <div style={{ position:'fixed', top:'5%', right:'5%', width:400, height:400, background:'radial-gradient(circle,rgba(139,92,246,0.07) 0%,transparent 70%)', pointerEvents:'none' }}/>

      {/* Header */}
      <header style={S.header}>
        <button onClick={onReset} style={S.backBtn}>← New Repo</button>
        <div>
          <div style={S.headerBadge}>◈ GitLens · Git History Time Traveller</div>
          <div style={S.headerRepo}>{owner}/{repo}</div>
        </div>
        <div style={{ flex: 1 }} />
        {[
          [commits.length.toLocaleString(), 'Commits'],
          [contributors.length, 'Contributors'],
          [repoInfo?.stargazers_count?.toLocaleString() || '—', '⭐ Stars'],
          [repoInfo?.language || '—', 'Language'],
        ].map(([v, l]) => (
          <div key={l} style={S.stat}>
            <div style={S.statVal}>{v}</div>
            <div style={S.statLbl}>{l}</div>
          </div>
        ))}
      </header>

      <div style={S.content}>

        <FilterBar
          filters={filters}
          setFilters={setFilters}
          authors={contributors.map(c => c.login)}
        />   
       {/* Player */}
        <div style={S.player}>
          <div style={S.controls}>
            <button onClick={togglePlay} style={{ ...S.playBtn, background: playing ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderColor: playing ? '#ef4444' : '#6366f1' }}>
              {playing ? '⏸' : '▶'}
            </button>
            <button onClick={() => setIdx(Math.max(0, idx - 1))} style={S.stepBtn}>◀</button>
            <button onClick={() => setIdx(Math.min(commits.length - 1, idx + 1))} style={S.stepBtn}>▶</button>

            {commit && (
              <div style={S.commitInfo}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:authorColor, boxShadow:`0 0 8px ${authorColor}`, flexShrink:0 }}/>
                <div style={{ minWidth: 0 }}>
                  <div style={S.commitMsg}>{commit.commit?.message?.split('\n')[0]}</div>
                  <div style={S.commitMeta}>
                    <span style={{ color: authorColor }}>{authorLogin}</span>
                    {' · '}
                    {commitDate && !isNaN(commitDate) ? fmtDate(commitDate.toISOString()) : ''}
                    {' · '}
                    <span style={{ color: '#475569' }}>{commit.sha?.slice(0, 7)}</span>
                  </div>
                </div>
              </div>
            )}
            <div style={S.counter}>{idx + 1} / {filteredCommits.length}</div>
          </div>
            <TimelineBars
                        commits={filteredCommits}
                        currentIdx={idx}
                        onSeek={setIdx}
                        contributors={contributors}
                      />
        </div>

        {/* Tabs */}
        <div style={S.tabBar}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              ...S.tabBtn,
              background:   tab === t.id ? 'rgba(99,102,241,0.22)' : 'transparent',
              color:        tab === t.id ? '#a5b4fc' : '#475569',
              borderBottom: tab === t.id ? '2px solid #6366f1'     : '2px solid transparent',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Panels */}
        <div style={S.panel}>
          {tab === 'timeline' && (
            <CommitGrid commits={filteredCommits} currentIdx={idx} onSeek={setIdx} contributors={contributors} />
          )}
          {tab === 'hotspot' && (
            fileList.length > 0
              ? <FileHeatmap files={fileList} />
              : <Empty msg="No file data — add a GitHub token to increase API rate limits" />
          )}
          {tab === 'dayhour' && <DayHourHeatmap hourDay={hourDay} />}
          {tab === 'galaxy'  && (
            contributors.length > 0
              ? <Galaxy contributors={contributors} edges={collabEdges} commits={commits} />
              : <Empty msg="No contributor data available" />
          )}
          {tab === 'insights' && (
            <AIInsights data={data} />
          )}

          {tab === 'halloffame' && (
            <HallOfFame
              commits={commits}
              contributors={contributors}
            />
          )}

        </div>
      </div>
    </div>
  )
}

function Empty({ msg }) {
  return <div style={{ color:'#334155', textAlign:'center', padding:48, fontFamily:"'JetBrains Mono',monospace", fontSize:13 }}>{msg}</div>
}

const S = {
  header: { padding:'14px 24px', borderBottom:'1px solid rgba(255,255,255,0.06)', backdropFilter:'blur(16px)', background:'rgba(2,6,23,0.82)', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', position:'sticky', top:0, zIndex:50 },
  backBtn: { background:'none', border:'1px solid rgba(255,255,255,0.1)', color:'#475569', fontSize:12, padding:'6px 12px', borderRadius:8, fontFamily:"'JetBrains Mono',monospace" },
  headerBadge: { fontSize:10, letterSpacing:'0.3em', color:'#818cf8', fontFamily:"'JetBrains Mono',monospace", textTransform:'uppercase' },
  headerRepo: { color:'#e2e8f0', fontWeight:700, fontSize:14, fontFamily:"'JetBrains Mono',monospace" },
  stat: { textAlign:'center' },
  statVal: { fontSize:17, fontWeight:800, color:'#a5b4fc', fontFamily:"'JetBrains Mono',monospace" },
  statLbl: { fontSize:10, color:'#334155', fontFamily:"'JetBrains Mono',monospace" },
  content: { maxWidth:1280, margin:'0 auto', padding:'24px 18px' },
  player: { background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:20, padding:20, marginBottom:22, backdropFilter:'blur(8px)' },
  controls: { display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap' },
  playBtn: { width:44, height:44, borderRadius:'50%', border:'1px solid', color:'#fff', fontSize:16, flexShrink:0 },
  stepBtn: { width:33, height:33, borderRadius:'50%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', color:'#64748b', fontSize:13 },
  commitInfo: { display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 },
  commitMsg: { color:'#f1f5f9', fontWeight:600, fontSize:13, fontFamily:"'JetBrains Mono',monospace", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  commitMeta: { color:'#334155', fontSize:11, fontFamily:"'JetBrains Mono',monospace" },
  counter: { color:'#334155', fontFamily:"'JetBrains Mono',monospace", fontSize:11, flexShrink:0 },
  tabBar: { display:'flex', gap:4, marginBottom:18, background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:5, flexWrap:'wrap' },
  tabBtn: { flex:'1 1 auto', padding:'9px 10px', borderRadius:10, border:'none', fontWeight:600, fontSize:12, transition:'all 0.18s' },
  panel: { background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:20, padding:24, backdropFilter:'blur(8px)' },
}
