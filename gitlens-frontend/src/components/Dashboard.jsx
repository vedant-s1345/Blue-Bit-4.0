import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { getAuthorColor, fmtDate } from '../utils/constants.js'

// ── Imports (yours + mine, merged) ───────────────────────────────────────────
import FilterBar          from './FilterBar'
import HallOfFame         from './HallOfFame'
import CommitModal        from './CommitModal'
import BranchViz          from './BranchViz'
import RepoBot            from './RepoBot'
import RepoCity           from './RepoCity'

import {
  GalleryVerticalEnd, Radio, Clock2, UserRound,
  Bot, Trophy, GitBranch, Building2,
} from 'lucide-react'

import TimelineBars    from './TimelineBars.jsx'
import CommitGrid      from './CommitGrid.jsx'
import FileHeatmap     from './FileHeatmap.jsx'
import DayHourHeatmap  from './DayHourHeatmap.jsx'
import Galaxy          from './Galaxy.jsx'
import AIInsights      from './AIInsights.jsx'

// ── Tab definitions (all tabs from both versions) ────────────────────────────
const mkLabel = (Icon, cls, text) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <Icon size={18} className={cls} />{text}
  </span>
)

const TABS = [
  { id: 'timeline',   label: mkLabel(GalleryVerticalEnd, 'timelineIcon',   'Timeline')       },
  { id: 'hotspot',    label: mkLabel(Radio,              'hotspotIcon',     'File Hotspots')  },
  { id: 'dayhour',    label: mkLabel(Clock2,             'dayHourIcon',     'Day × Hour')     },
  { id: 'galaxy',     label: mkLabel(UserRound,          'contributorIcon', 'Contributors')   },
  { id: 'repocity',   label: mkLabel(Building2,          'cityIcon',        'Repo City')      },
  { id: 'branches',   label: mkLabel(GitBranch,          'branchIcon',      'Branches')       },
  { id: 'halloffame', label: mkLabel(Trophy,             'hofIcon',         'Hall of Fame')   },
  { id: 'insights',   label: mkLabel(Bot,                'aiIcon',          'AI Insights')    },
]

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard({ data, onReset }) {
  const {
    repoInfo, commits, contributors, hourDay,
    fileList, fileActivity, branches, collabEdges, owner, repo,
  } = data

  const [playing,     setPlaying]     = useState(false)
  const [idx,         setIdx]         = useState(0)
  const [tab,         setTab]         = useState('timeline')
  const [filters,     setFilters]     = useState({
    author: 'all', keyword: '', fileType: 'all',
    timeRange: 'all', jumpQuery: '', speed: '1',
  })
  const [modalCommit, setModalCommit] = useState(null)
  const playRef = useRef()
  const token   = data.token || null

  // ── Filtered commits ───────────────────────────────────────────────────────
  const filteredCommits = useMemo(() => {
    return commits.filter(commit => {
      const author = commit?.author?.login || commit?.commit?.author?.name
      if (filters.author !== 'all' && author !== filters.author) return false
      if (filters.keyword && !commit.commit?.message?.toLowerCase().includes(filters.keyword.toLowerCase())) return false
      const commitDate = new Date(commit.commit?.author?.date)
      if (filters.timeRange !== 'all') {
        const limit = new Date()
        const months = { '1month': 1, '3months': 3, '6months': 6, '1year': 12 }[filters.timeRange]
        if (months) { limit.setMonth(limit.getMonth() - months); if (commitDate < limit) return false }
      }
      return true
    })
  }, [commits, filters])

  // ── Filetype-filtered file lists for heatmap tabs ─────────────────────────
  const filteredFileList = useMemo(() => {
    if (!filters.fileType || filters.fileType === 'all') return fileList
    return fileList.filter(f => f.file.endsWith(filters.fileType))
  }, [fileList, filters.fileType])

  const filteredFileActivity = useMemo(() => {
    if (!filters.fileType || filters.fileType === 'all') return fileActivity
    const out = {}
    Object.keys(fileActivity || {}).forEach(k => {
      if (k.endsWith(filters.fileType)) out[k] = fileActivity[k]
    })
    return out
  }, [fileActivity, filters.fileType])

  // ── Jump to SHA / date ────────────────────────────────────────────────────
  useEffect(() => {
    const q = (filters.jumpQuery || '').trim().toLowerCase()
    if (!q) return
    let found = filteredCommits.findIndex(c => c.sha?.toLowerCase().startsWith(q))
    if (found < 0 && /^\d{4}-\d{2}-\d{2}/.test(q))
      found = filteredCommits.findIndex(c => c.commit?.author?.date?.slice(0, 10) === q.slice(0, 10))
    if (found >= 0) setIdx(found)
  }, [filters.jumpQuery, filteredCommits])

  // ── Playback ──────────────────────────────────────────────────────────────
  const speed    = parseFloat(filters.speed || '1')
  const interval = Math.round(380 / speed)

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
      }, interval)
    }
    return () => clearInterval(playRef.current)
  }, [playing, filteredCommits.length, interval])

  const commit      = filteredCommits[idx]
  const authorLogin = commit?.author?.login || commit?.commit?.author?.name || 'unknown'
  const authorColor = getAuthorColor(authorLogin, contributors)
  const commitDate  = commit && new Date(commit.commit?.author?.date)

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, paddingBottom: 60 }}>
      <div style={{ position: 'fixed', top: '5%', right: '5%', width: 400, height: 400, background: 'radial-gradient(circle,rgba(139,92,246,0.07) 0%,transparent 70%)', pointerEvents: 'none' }}/>

      {/* ── Header ── */}
      <header style={S.header}>
        <button onClick={onReset} style={S.backBtn}>← New Repo</button>
        <div>
          <div style={S.headerBadge}>◈ GitLens · Git History Time Traveller</div>
          <div style={S.headerRepo}>{owner}/{repo}</div>
        </div>
        <div style={{ flex: 1 }} />
        {[
          [commits.length.toLocaleString(),                          'Commits'],
          [contributors.length,                                      'Contributors'],
          [repoInfo?.stargazers_count?.toLocaleString() || '—',     '⭐ Stars'],
          [repoInfo?.language || '—',                               'Language'],
          [(branches || []).length || '—',                          '🌿 Branches'],
        ].map(([v, l]) => (
          <div key={l} style={S.stat}>
            <div style={S.statVal}>{v}</div>
            <div style={S.statLbl}>{l}</div>
          </div>
        ))}
      </header>

      <div style={S.content}>

        {/* ── Filter bar ── */}
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          authors={contributors.map(c => c.login)}
        />

        {/* ── Player ── */}
        <div style={S.player}>
          <div style={S.controls}>
            <button
              onClick={togglePlay}
              style={{ ...S.playBtn, background: playing ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderColor: playing ? '#ef4444' : '#6366f1' }}
            >
              {playing ? '⏸' : '▶'}
            </button>
            <button onClick={() => setIdx(Math.max(0, idx - 1))}                          style={S.stepBtn}>◀</button>
            <button onClick={() => setIdx(Math.min(filteredCommits.length - 1, idx + 1))} style={S.stepBtn}>▶</button>
            <button onClick={() => setIdx(0)}                                              style={S.stepBtn}>⏮</button>
            <button onClick={() => setIdx(filteredCommits.length - 1)}                    style={S.stepBtn}>⏭</button>

            {commit && (
              <div
                style={{ ...S.commitInfo, cursor: 'pointer' }}
                onClick={() => setModalCommit(commit)}
                title="Click for full diff"
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: authorColor, boxShadow: `0 0 8px ${authorColor}`, flexShrink: 0 }}/>
                <div style={{ minWidth: 0 }}>
                  <div style={S.commitMsg}>{commit.commit?.message?.split('\n')[0]}</div>
                  <div style={S.commitMeta}>
                    <span style={{ color: authorColor }}>{authorLogin}</span>
                    {' · '}
                    {commitDate && !isNaN(commitDate) ? fmtDate(commitDate.toISOString()) : ''}
                    {' · '}
                    <span style={{ color: '#475569' }}>{commit.sha?.slice(0, 7)}</span>
                    <span style={{ color: '#334155', marginLeft: 6, fontSize: 10 }}>↗ click for diff</span>
                  </div>
                </div>
              </div>
            )}
            <div style={S.counter}>{idx + 1} / {filteredCommits.length}</div>
          </div>
          <TimelineBars commits={filteredCommits} currentIdx={idx} onSeek={setIdx} contributors={contributors} />
        </div>

        {/* ── Tabs ── */}
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

        {/* ── Panels ── */}
        <div style={S.panel}>

          {tab === 'timeline' && (
            <CommitGrid commits={filteredCommits} currentIdx={idx} onSeek={setIdx} contributors={contributors} onCommitClick={setModalCommit} />
          )}

          {tab === 'hotspot' && (
            filteredFileList.length > 0
              ? <FileHeatmap files={filteredFileList} fileActivity={filteredFileActivity} commits={filteredCommits} />
              : <Empty msg="No file data — add a GitHub token to increase API rate limits" />
          )}

          {tab === 'dayhour' && <DayHourHeatmap hourDay={hourDay} />}

          {tab === 'galaxy' && (
            contributors.length > 0
              ? <Galaxy contributors={contributors} edges={collabEdges} commits={commits} />
              : <Empty msg="No contributor data available" />
          )}

          {tab === 'repocity' && (
            contributors.length > 0
              ? <RepoCity contributors={contributors} fileList={filteredFileList} collabEdges={collabEdges} commits={commits} repoInfo={repoInfo} />
              : <Empty msg="No contributor data available" />
          )}

          {tab === 'branches' && (
            <BranchViz commits={commits} branches={branches || []} owner={owner} repo={repo} token={token} />
          )}

          {tab === 'halloffame' && (
            <HallOfFame commits={commits} contributors={contributors} />
          )}

          {tab === 'insights' && (
            <AIInsights data={data} />
          )}

        </div>
      </div>

      {/* ── Floating AI bot ── */}
      <RepoBot data={data} />

      {/* ── Commit detail modal ── */}
      {modalCommit && (
        <CommitModal
          commit={modalCommit}
          owner={owner}
          repo={repo}
          token={token}
          onClose={() => setModalCommit(null)}
        />
      )}
    </div>
  )
}

function Empty({ msg }) {
  return (
    <div style={{ color: '#334155', textAlign: 'center', padding: 48, fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
      {msg}
    </div>
  )
}

const S = {
  header:     { padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)', background: 'rgba(2,6,23,0.82)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 50 },
  backBtn:    { background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#475569', fontSize: 12, padding: '6px 12px', borderRadius: 8, fontFamily: "'JetBrains Mono',monospace", cursor: 'pointer' },
  headerBadge:{ fontSize: 10, letterSpacing: '0.3em', color: '#818cf8', fontFamily: "'JetBrains Mono',monospace", textTransform: 'uppercase' },
  headerRepo: { color: '#e2e8f0', fontWeight: 700, fontSize: 14, fontFamily: "'JetBrains Mono',monospace" },
  stat:       { textAlign: 'center' },
  statVal:    { fontSize: 17, fontWeight: 800, color: '#a5b4fc', fontFamily: "'JetBrains Mono',monospace" },
  statLbl:    { fontSize: 10, color: '#334155', fontFamily: "'JetBrains Mono',monospace" },
  content:    { maxWidth: 1280, margin: '0 auto', padding: '24px 18px' },
  player:     { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 20, marginBottom: 22, backdropFilter: 'blur(8px)' },
  controls:   { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  playBtn:    { width: 44, height: 44, borderRadius: '50%', border: '1px solid', color: '#fff', fontSize: 16, flexShrink: 0, cursor: 'pointer' },
  stepBtn:    { width: 33, height: 33, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#64748b', fontSize: 13, cursor: 'pointer' },
  commitInfo: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', transition: 'background 0.15s' },
  commitMsg:  { color: '#f1f5f9', fontWeight: 600, fontSize: 13, fontFamily: "'JetBrains Mono',monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  commitMeta: { color: '#334155', fontSize: 11, fontFamily: "'JetBrains Mono',monospace" },
  counter:    { color: '#334155', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, flexShrink: 0 },
  tabBar:     { display: 'flex', gap: 4, marginBottom: 18, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 5, flexWrap: 'wrap' },
  tabBtn:     { flex: '1 1 auto', padding: '9px 10px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 12, transition: 'all 0.18s', cursor: 'pointer' },
  panel:      { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, backdropFilter: 'blur(8px)' },
}
