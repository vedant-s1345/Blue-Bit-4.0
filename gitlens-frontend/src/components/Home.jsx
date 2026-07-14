import { useState, useEffect, useCallback } from 'react'
import { fetchMyRepos, deleteMyRepo } from '../utils/authApi.js'
import { loadRepo, parseRepoUrl } from '../utils/github.js'

const QUICK = [
  { slug: 'facebook/react',      emoji: '⚛',  label: 'React'   },
  { slug: 'microsoft/vscode',    emoji: '💙',  label: 'VS Code' },
  { slug: 'torvalds/linux',      emoji: '🐧',  label: 'Linux'   },
  { slug: 'vercel/next.js',      emoji: '▲',   label: 'Next.js' },
]

const LANG_COLOR = {
  JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3572A5',
  Java: '#b07219',       Go: '#00ADD8',          Rust: '#dea584',
  'C++': '#f34b7d',      Ruby: '#701516',        default: '#6366f1',
}

function langDot(lang) {
  return LANG_COLOR[lang] || LANG_COLOR.default
}

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr)
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 30)  return `${d}d ago`
  if (d < 365) return `${Math.floor(d / 30)}mo ago`
  return `${Math.floor(d / 365)}y ago`
}

export default function Home({ auth, onAnalyze, onLogout }) {
  const [repos,      setRepos]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [fetchErr,   setFetchErr]   = useState('')
  const [url,        setUrl]        = useState('')
  const [analysing,  setAnalysing]  = useState(false)
  const [step,       setStep]       = useState('')
  const [error,      setError]      = useState('')
  const [opening,    setOpening]    = useState(null)
  const [openStep,   setOpenStep]   = useState('')
  const [filter,     setFilter]     = useState('')
  const [greeting,   setGreeting]   = useState('Hello')

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting('Good morning')
    else if (h < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  const loadRepos = useCallback(() => {
    setLoading(true)
    fetchMyRepos(auth.token)
      .then(data => { setRepos(data); setFetchErr('') })
      .catch(e => setFetchErr(e.message))
      .finally(() => setLoading(false))
  }, [auth.token])

  useEffect(() => { loadRepos() }, [loadRepos])

  const handleAnalyse = async (rawUrl) => {
    const target = rawUrl || url
    if (!target.trim()) { setError('Enter a GitHub URL'); return }
    setError(''); setAnalysing(true); setStep('Fetching from GitHub…')
    const parsed = parseRepoUrl(target.trim())
    if (!parsed) { setError('Invalid GitHub URL'); setAnalysing(false); return }
    try {
      const data = await loadRepo(
        parsed.owner, parsed.repo, null,
        (msg) => setStep(msg),
        auth.token
      )
      onAnalyze({ ...data, jwtToken: auth.token })
    } catch (e) {
      setError(e.message || 'Failed to fetch repo')
      setAnalysing(false)
    }
  }

  const openRepo = async (repo) => {
    setOpening(repo.id)
    setOpenStep('Fetching from GitHub…')
    try {
      const parsed = parseRepoUrl(repo.url)
      if (!parsed) throw new Error('Invalid URL')
      const data = await loadRepo(
        parsed.owner, parsed.repo, null,
        (msg) => setOpenStep(msg),
        auth.token
      )
      onAnalyze({ ...data, token: null, jwtToken: auth.token })
    } catch (e) {
      setOpening(null)
      setOpenStep('')
      setFetchErr(e.message || 'Failed to open repo')
    }
  }

  const removeRepo = async (e, repoId) => {
    e.stopPropagation()
    try {
      await deleteMyRepo(repoId, auth.token)
      setRepos(prev => prev.filter(r => r.id !== repoId))
    } catch {}
  }

  const filtered = repos.filter(r =>
    r.name?.toLowerCase().includes(filter.toLowerCase()) ||
    r.url?.toLowerCase().includes(filter.toLowerCase())
  )

  const completed  = repos.filter(r => r.status === 'COMPLETED').length
  const totalCommits = repos.reduce((s, r) => s + (r.totalCommits || 0), 0)

  // Loading overlay while opening a repo
  if (opening !== null) {
    return (
      <div style={S.overlay}>
        <div style={S.openingCard}>
          <div style={S.spinnerWrap}>
            <div style={S.spinner} />
          </div>
          <div style={S.openingStep}>{openStep || 'Loading…'}</div>
          <div style={S.openingHint}>Fetching commit history & analytics</div>
        </div>
      </div>
    )
  }

  // Analysing overlay
  if (analysing) {
    return (
      <div style={S.overlay}>
        <div style={S.openingCard}>
          <div style={S.spinnerWrap}><div style={S.spinner} /></div>
          <div style={S.openingStep}>{step || 'Starting analysis…'}</div>
          <div style={S.openingHint}>This usually takes 5–15 seconds</div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>

      {/* ── Top nav ── */}
      <nav style={S.nav}>
        <div style={S.navBrand}>
          <span style={S.navDiamond}>◈</span>
          <span style={S.navTitle}>GitLens</span>
        </div>
        <div style={S.navRight}>
          <div style={S.navUser}>
            <div style={S.avatar}>{auth.name[0].toUpperCase()}</div>
            <div>
              <div style={S.navName}>{auth.name}</div>
              <div style={S.navEmail}>{auth.email}</div>
            </div>
          </div>
          <button onClick={onLogout} style={S.logoutBtn}>Log Out</button>
        </div>
      </nav>

      <div style={S.content}>

        {/* ── Header ── */}
        <div style={S.header}>
          <div>
            <div style={S.greeting}>{greeting}, <span style={S.greetingName}>{auth.name.split(' ')[0]}</span></div>
            <div style={S.subGreeting}>Your Git analytics hub — explore commit history, hotspots & AI insights</div>
          </div>
          {/* Stats strip */}
          <div style={S.statsStrip}>
            <div style={S.stat}>
              <div style={S.statNum}>{repos.length}</div>
              <div style={S.statLabel}>Repos</div>
            </div>
            <div style={S.statDivider} />
            <div style={S.stat}>
              <div style={S.statNum}>{completed}</div>
              <div style={S.statLabel}>Analysed</div>
            </div>
            <div style={S.statDivider} />
            <div style={S.stat}>
              <div style={S.statNum}>{totalCommits > 999 ? `${(totalCommits/1000).toFixed(1)}k` : totalCommits}</div>
              <div style={S.statLabel}>Commits</div>
            </div>
          </div>
        </div>

        {/* ── Analyse new repo ── */}
        <section style={S.section}>
          <div style={S.sectionLabel}>◈ ANALYSE A REPOSITORY</div>
          <div style={S.analyseBox}>
            <div style={S.analyseInputRow}>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAnalyse()}
                placeholder="github.com/owner/repo"
                style={S.analyseInput}
              />
              <button onClick={() => handleAnalyse()} style={S.analyseBtn}>
                Analyse →
              </button>
            </div>
            {error && <div style={S.errorMsg}>⚠ {error}</div>}
            <div style={S.quickRow}>
              {QUICK.map(q => (
                <button key={q.slug} onClick={() => handleAnalyse(q.slug)} style={S.quickBtn}>
                  {q.emoji} {q.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Repos grid ── */}
        <section style={S.section}>
          <div style={S.sectionHeader}>
            <div style={S.sectionLabel}>◈ YOUR REPOSITORIES</div>
            {repos.length > 3 && (
              <input
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Filter repos…"
                style={S.filterInput}
              />
            )}
          </div>

          {loading ? (
            <div style={S.loadingRow}>
              <div style={S.spinner} />
              <span style={S.loadingText}>Loading your repos…</span>
            </div>
          ) : fetchErr ? (
            <div style={S.errorBox}>⚠ {fetchErr}</div>
          ) : filtered.length === 0 ? (
            <div style={S.emptyState}>
              <div style={S.emptyIcon}>🔭</div>
              <div style={S.emptyTitle}>No repos yet</div>
              <div style={S.emptyHint}>Analyse a repo above to see it here</div>
            </div>
          ) : (
            <div style={S.repoGrid}>
              {filtered.map(repo => {
                const isReady = repo.status === 'COMPLETED'
                const repoName = repo.name || repo.url?.split('/').pop() || 'Unknown'
                const owner = repo.url?.replace('https://github.com/', '').split('/')[0] || ''
                return (
                  <div
                    key={repo.id}
                    onClick={() => openRepo(repo)}
                    style={{ ...S.repoCard, cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    {/* Card top */}
                    <div style={S.cardTop}>
                      <div style={S.cardIcon}>
                        {repoName[0]?.toUpperCase() || '?'}
                      </div>
                      <button
                        onClick={e => removeRepo(e, repo.id)}
                        style={S.removeBtn}
                        title="Remove"
                      >×</button>
                    </div>

                    {/* Repo info */}
                    <div style={S.cardOwner}>{owner}</div>
                    <div style={S.cardName}>{repoName}</div>

                    {/* Meta */}
                    <div style={S.cardMeta}>
                      {repo.totalCommits != null && (
                        <span style={S.metaChip}>
                          📝 {repo.totalCommits.toLocaleString()} commits
                        </span>
                      )}
                      {repo.analyzedAt && (
                        <span style={S.metaChip}>
                          🕐 {timeAgo(repo.analyzedAt)}
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div style={S.cardFooter}>
                      <span style={{
                        ...S.statusBadge,
                        background: isReady ? 'rgba(34,197,94,0.12)' : 'rgba(99,102,241,0.12)',
                        color: isReady ? '#4ade80' : '#818cf8',
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: isReady ? '#22c55e' : '#6366f1',
                          display: 'inline-block', marginRight: 5,
                        }} />
                        {isReady ? 'Ready' : repo.status}
                      </span>
                      <span style={S.openHint}>Open →</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Feature strip ── */}
        <section style={S.featureStrip}>
          {[
            ['🎬', 'Cinematic Timeline', 'Watch your repo history unfold commit by commit'],
            ['🔥', 'File Hotspots',      'Surface the most-changed files at a glance'],
            ['⏰', 'Day × Hour Heatmap', 'See when your team actually codes'],
            ['🤖', 'AI Insights',        'Groq-powered analysis of risks & recommendations'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={S.featureCard}>
              <span style={S.featureIcon}>{icon}</span>
              <div style={S.featureTitle}>{title}</div>
              <div style={S.featureDesc}>{desc}</div>
            </div>
          ))}
        </section>

      </div>
    </div>
  )
}

const S = {
  page: {
    minHeight: '100vh',
    position: 'relative',
    zIndex: 1,
  },

  overlay: {
    position: 'fixed', inset: 0, zIndex: 999,
    background: 'rgba(2,6,23,0.92)', backdropFilter: 'blur(12px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  openingCard: {
    textAlign: 'center', padding: '48px 56px',
    background: 'rgba(15,23,42,0.9)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 24,
  },
  spinnerWrap: { marginBottom: 24 },
  spinner: {
    width: 40, height: 40, borderRadius: '50%',
    border: '3px solid rgba(99,102,241,0.2)',
    borderTopColor: '#6366f1',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto',
  },
  openingStep: {
    color: '#a5b4fc', fontFamily: "'JetBrains Mono',monospace",
    fontSize: 14, marginBottom: 8,
  },
  openingHint: {
    color: '#334155', fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
  },

  // Nav
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 10,
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    backdropFilter: 'blur(12px)',
    position: 'sticky', top: 0, zIndex: 100,
    background: 'rgba(2,6,23,0.8)',
    minWidth: 0,
  },
  navBrand: { display: 'flex', alignItems: 'center', gap: 8 },
  navDiamond: { color: '#6366f1', fontSize: 16 },
  navTitle: {
    fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 20,
    background: 'linear-gradient(135deg,#f0f4ff,#a5b4fc)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  navRight: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 1, minWidth: 0, flexWrap: 'wrap' },
  navUser: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' },
  avatar: {
    width: 34, height: 34, borderRadius: '50%',
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 800, fontSize: 14,
    fontFamily: "'Syne',sans-serif",
  },
  navName: { color: '#e2e8f0', fontWeight: 700, fontSize: 13, fontFamily: "'JetBrains Mono',monospace" },
  navEmail: { color: '#334155', fontSize: 10, fontFamily: "'JetBrains Mono',monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 },
  logoutBtn: {
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
    color: '#f87171', fontSize: 11, padding: '6px 12px', borderRadius: 8,
    fontFamily: "'JetBrains Mono',monospace", cursor: 'pointer',
  },

  // Content
  content: { maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' },

  // Header
  header: {
    display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between', flexWrap: 'wrap',
    gap: 24, marginBottom: 48,
  },
  greeting: {
    fontFamily: "'Syne',sans-serif", fontWeight: 900,
    fontSize: 'clamp(1.8rem,4vw,2.8rem)',
    color: '#f0f4ff', marginBottom: 8,
  },
  greetingName: {
    background: 'linear-gradient(135deg,#a5b4fc,#818cf8)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  subGreeting: {
    color: '#475569', fontFamily: "'DM Sans',sans-serif", fontSize: 14,
  },
  statsStrip: {
    display: 'flex', alignItems: 'center', gap: 0,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16, padding: '16px 24px',
  },
  stat: { textAlign: 'center', padding: '0 20px' },
  statNum: {
    fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 28,
    background: 'linear-gradient(135deg,#f0f4ff,#a5b4fc)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  statLabel: { color: '#334155', fontSize: 11, fontFamily: "'JetBrains Mono',monospace", marginTop: 2 },
  statDivider: { width: 1, height: 40, background: 'rgba(255,255,255,0.06)' },

  // Section
  section: { marginBottom: 48 },
  sectionHeader: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10, letterSpacing: '0.28em', color: '#6366f1',
    fontFamily: "'JetBrains Mono',monospace", marginBottom: 16,
  },

  // Analyse box
  analyseBox: {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 20, padding: '24px',
  },
  analyseInputRow: { display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  analyseInput: {
    flex: 1, minWidth: 0,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
    outline: 'none', color: '#f1f5f9', fontSize: 14,
    padding: '12px 16px', fontFamily: "'JetBrains Mono',monospace",
    width: '100%',
  },
  analyseBtn: {
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    border: 'none', color: '#fff', fontWeight: 800,
    fontSize: 14, padding: '12px 24px', borderRadius: 10,
    fontFamily: "'JetBrains Mono',monospace", cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  errorMsg: {
    color: '#f87171', fontSize: 12,
    fontFamily: "'JetBrains Mono',monospace", marginBottom: 8,
  },
  quickRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  quickBtn: {
    padding: '5px 14px', borderRadius: 99,
    border: '1px solid rgba(255,255,255,0.09)',
    background: 'rgba(255,255,255,0.03)', color: '#64748b',
    fontFamily: "'JetBrains Mono',monospace", fontSize: 11, cursor: 'pointer',
  },

  // Filter
  filterInput: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 8, color: '#94a3b8', fontSize: 12,
    padding: '6px 12px', fontFamily: "'JetBrains Mono',monospace",
    outline: 'none',
  },

  // Repo grid
  repoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  repoCard: {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16, padding: '20px',
    transition: 'border-color 0.18s, transform 0.18s',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardIcon: {
    width: 40, height: 40, borderRadius: 10,
    background: 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.3))',
    border: '1px solid rgba(99,102,241,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#a5b4fc', fontWeight: 900, fontSize: 18,
    fontFamily: "'Syne',sans-serif",
  },
  removeBtn: {
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
    color: '#f87171', fontSize: 16, width: 26, height: 26,
    borderRadius: 6, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cardOwner: { color: '#334155', fontSize: 11, fontFamily: "'JetBrains Mono',monospace" },
  cardName: {
    color: '#e2e8f0', fontWeight: 700, fontSize: 16,
    fontFamily: "'Syne',sans-serif",
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  cardMeta: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  metaChip: {
    fontSize: 10, color: '#475569',
    fontFamily: "'JetBrains Mono',monospace",
  },
  cardFooter: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 8,
    paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  statusBadge: {
    fontSize: 11, padding: '3px 10px', borderRadius: 99,
    fontFamily: "'JetBrains Mono',monospace",
    display: 'inline-flex', alignItems: 'center',
  },
  openHint: {
    color: '#6366f1', fontSize: 12,
    fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
  },

  // Empty / loading
  loadingRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '32px 0', color: '#334155',
    fontFamily: "'JetBrains Mono',monospace", fontSize: 13,
  },
  loadingText: { color: '#334155' },
  errorBox: {
    color: '#f87171', fontSize: 12, padding: '12px 16px',
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10,
    fontFamily: "'JetBrains Mono',monospace",
  },
  emptyState: { textAlign: 'center', padding: '56px 0' },
  emptyIcon: { fontSize: 40, marginBottom: 16 },
  emptyTitle: {
    color: '#475569', fontFamily: "'Syne',sans-serif",
    fontWeight: 700, fontSize: 18, marginBottom: 8,
  },
  emptyHint: {
    color: '#334155', fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
  },

  // Feature strip
  featureStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 12,
  },
  featureCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 14, padding: '20px',
  },
  featureIcon: { fontSize: 24, display: 'block', marginBottom: 10 },
  featureTitle: {
    color: '#94a3b8', fontFamily: "'JetBrains Mono',monospace",
    fontWeight: 700, fontSize: 12, marginBottom: 6,
  },
  featureDesc: {
    color: '#334155', fontFamily: "'DM Sans',sans-serif",
    fontSize: 12, lineHeight: 1.6,
  },
}
