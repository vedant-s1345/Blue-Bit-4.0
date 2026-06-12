import { useState, useEffect } from 'react'
import { fetchMyRepos, deleteMyRepo } from '../utils/authApi.js'
// import { fetchRepoData, pollStatus } from '../utils/api.js'
// import { mapBackendData } from '../utils/backendMapper.js'

export default function MyRepos({ auth, onAnalyze, onClose }) {
  const [repos,    setRepos]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [opening,  setOpening]  = useState(null)   // repo id being loaded
  const [step,     setStep]     = useState('')
  const [error,    setError]    = useState('')
  const [fetchErr, setFetchErr] = useState('')      // error loading the list itself

  useEffect(() => {
    fetchMyRepos(auth.token)
      .then(data => { setRepos(data); setFetchErr('') })
      .catch(e   => setFetchErr(e.message || 'Could not load repos'))
      .finally(  () => setLoading(false))
  }, [auth.token])

  const openRepo = async (repo) => {
    setOpening(repo.id)
    setStep('Fetching from GitHub…')
    setError('')
    try {
      const { loadRepo, parseRepoUrl } = await import('../utils/github.js')
      const parsed = parseRepoUrl(repo.url)
      if (!parsed) throw new Error('Invalid repo URL')

      const data = await loadRepo(
        parsed.owner, parsed.repo, null,
        (msg) => setStep(msg),
        auth.token   // pass JWT so store call updates contributors
      )
      onAnalyze({ ...data, token: null , jwtToken: auth.token })
    } catch (e) {
      setError(e.message || 'Failed to open repo')
      setOpening(null)
    }
  }

  const removeRepo = async (e, repoId) => {
    e.stopPropagation()
    try {
      await deleteMyRepo(repoId, auth.token)
      setRepos(prev => prev.filter(r => r.id !== repoId))
    } catch {}
  }

  const statusBadge = (status) => {
    const cfg = {
      COMPLETED:  { bg: 'rgba(34,197,94,0.12)',  color: '#4ade80', dot: '#22c55e', label: 'Ready'      },
      PROCESSING: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', dot: '#f59e0b', label: 'Processing' },
      PENDING:    { bg: 'rgba(99,102,241,0.12)', color: '#818cf8', dot: '#6366f1', label: 'Queued'     },
      FAILED:     { bg: 'rgba(239,68,68,0.12)',  color: '#f87171', dot: '#ef4444', label: 'Failed'     },
    }
    const c = cfg[status] || cfg.PENDING
    return (
      <span style={{ ...S.badge, background: c.bg, color: c.color }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, display: 'inline-block', marginRight: 5 }}/>
        {c.label}
      </span>
    )
  }

  // ── Loading overlay while opening a repo ────────────────────────────────────
  if (opening !== null) {
    return (
      <div style={S.overlay}>
        <div style={S.modal}>
          <div style={S.header}>
            <div style={S.badgeLabel}>◈ GitLens · Loading</div>
          </div>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={S.spinner}/>
            <div style={S.stepText}>{step || 'Loading…'}</div>
            {error && (
              <>
                <div style={{ ...S.errorBox, marginTop: 16 }}>⚠ {error}</div>
                <button onClick={() => setOpening(null)} style={{ ...S.openBtnSecondary, marginTop: 16 }}>
                  ← Back to My Repos
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Main list ────────────────────────────────────────────────────────────────
  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={S.header}>
          <div>
            <div style={S.badgeLabel}>◈ GitLens · Your Repos</div>
            <h2 style={S.title}>Saved Analyses</h2>
          </div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>

        <p style={S.sub}>
          👋 Hey <strong style={{ color: '#a5b4fc' }}>{auth.name}</strong> — here are your saved repositories.
          Completed ones load instantly.
        </p>

        {fetchErr && <div style={S.errorBox}>⚠ {fetchErr}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#475569', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
            <div style={S.spinner}/>
            Loading your repos…
          </div>
        ) : repos.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔭</div>
            <div style={{ color: '#475569', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
              No saved repos yet. Analyse one to get started!
            </div>
          </div>
        ) : (
          <div style={S.list}>
            {repos.map(repo => (
              <div
                key={repo.id}
                onClick={() => openRepo(repo)}
                style={S.repoCard}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
              >
                <div style={S.repoCardLeft}>
                  <div style={S.repoName}>{repo.name}</div>
                  <div style={S.repoUrl}>{repo.url.replace('https://github.com/', '')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                    {statusBadge(repo.status)}
                    {repo.totalCommits != null && (
                      <span style={{ color: '#334155', fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>
                        {repo.totalCommits.toLocaleString()} commits
                      </span>
                    )}
                    {repo.analyzedAt && (
                      <span style={{ color: '#1e293b', fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>
                        {new Date(repo.analyzedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={e => { e.stopPropagation(); openRepo(repo) }}
                    style={repo.status === 'COMPLETED' ? S.openBtn : S.openBtnSecondary}
                  >
                    {repo.status === 'COMPLETED' ? 'Open →' : 'Analyse'}
                  </button>
                  <button
                    onClick={e => removeRepo(e, repo.id)}
                    style={S.removeBtn}
                    title="Remove from saved"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  modal: {
    background: 'rgba(15,23,42,0.97)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 24, padding: 36, maxWidth: 560, width: '100%',
    maxHeight: '85vh', overflowY: 'auto',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
  },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  badgeLabel:{ fontSize: 10, letterSpacing: '0.3em', color: '#818cf8', fontFamily: "'JetBrains Mono',monospace", marginBottom: 8 },
  title: {
    fontFamily: "'Syne','Segoe UI',sans-serif", fontWeight: 900, fontSize: 24,
    background: 'linear-gradient(135deg,#f0f4ff 0%,#c7d2fe 45%,#a5b4fc 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0,
  },
  closeBtn: {
    background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#475569',
    width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 13, flexShrink: 0,
  },
  sub:    { color: '#64748b', fontSize: 13, fontFamily: "'DM Sans',sans-serif", marginBottom: 20, lineHeight: 1.6 },
  empty:  { textAlign: 'center', padding: '40px 20px' },
  list:   { display: 'flex', flexDirection: 'column', gap: 10 },
  repoCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14, padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.18s',
  },
  repoCardLeft: { minWidth: 0, flex: 1 },
  repoName: { color: '#e2e8f0', fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", fontSize: 14, marginBottom: 2 },
  repoUrl:  { color: '#334155', fontSize: 11, fontFamily: "'JetBrains Mono',monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  badge:    { fontSize: 11, padding: '3px 9px', borderRadius: 99, fontFamily: "'JetBrains Mono',monospace", display: 'inline-flex', alignItems: 'center' },
  openBtn: {
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    border: 'none', color: '#fff', fontWeight: 700, fontSize: 12,
    padding: '7px 14px', borderRadius: 9, cursor: 'pointer',
    fontFamily: "'JetBrains Mono',monospace", whiteSpace: 'nowrap',
  },
  openBtnSecondary: {
    background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)',
    color: '#818cf8', fontWeight: 700, fontSize: 12, padding: '7px 14px',
    borderRadius: 9, cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", whiteSpace: 'nowrap',
  },
  removeBtn: {
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
    color: '#f87171', fontSize: 16, width: 28, height: 28, borderRadius: 8,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  errorBox: {
    color: '#f87171', fontSize: 12, marginBottom: 16,
    fontFamily: "'JetBrains Mono',monospace", padding: '8px 12px',
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8,
  },
  spinner: {
    width: 36, height: 36, borderRadius: '50%',
    border: '3px solid rgba(99,102,241,0.2)', borderTop: '3px solid #6366f1',
    animation: 'spin 0.8s linear infinite', margin: '0 auto 20px',
  },
  stepText: { color: '#a5b4fc', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 },
}
