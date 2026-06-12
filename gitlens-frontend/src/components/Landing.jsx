import { useState } from 'react'
import { submitRepo, pollStatus, fetchRepoData } from '../utils/api.js'
import { mapBackendData } from '../utils/backendMapper.js'
import { loadRepo, parseRepoUrl } from '../utils/github.js'
import { analyzeForUser} from '../utils/authApi.js'
import { MOCK } from '../utils/mockData.js'
import { useIsMobile } from '../utils/useIsMobile.js'
import AuthModal from './AuthModal.jsx'
import MyRepos   from './MyRepos.jsx'

const QUICK = [
  ['facebook/react', '⚛'],
  ['microsoft/vscode', '💙'],
  ['torvalds/linux', '🐧'],
  ['vercel/next.js', '▲'],
]

export default function Landing({ onAnalyze, auth, onLogin, onLogout }) {
  const [url,         setUrl]         = useState('')
  const [ghToken,     setGhToken]     = useState(() => {
    try { return localStorage.getItem('gitlens_gh_token') || '' } catch { return '' }
  })
  const [showToken,   setShowToken]   = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [step,        setStep]        = useState('')
  const [error,       setError]       = useState('')
  const [showAuth,    setShowAuth]    = useState(false)
  const [showMyRepos, setShowMyRepos] = useState(false)
  const isMobile = useIsMobile()

  const saveGhToken = (val) => {
    setGhToken(val)
    try { if (val) localStorage.setItem('gitlens_gh_token', val); else localStorage.removeItem('gitlens_gh_token') } catch {}
  }

  const handle = async () => {
    if (!url.trim()) { setError('Enter a valid GitHub URL'); return }
    setError(''); setLoading(true); setProgress(0)

    const raw = url.trim()
    const parsed = parseRepoUrl(raw)

    // Always build canonical URL for storage
    const canonicalUrl = parsed
      ? `https://github.com/${parsed.owner}/${parsed.repo}`
      : raw.startsWith('http') ? raw.replace(/\.git$/, '') : `https://github.com/${raw}`

    // ── Logged-in path ────────────────────────────────────────────────────────
    if (auth) {

      // 1. GitHub API first (fast) — works for new AND cached repos
      if (parsed) {
        try {
          setStep('Fetching from GitHub…'); setProgress(10)
          const data = await loadRepo(
            parsed.owner, parsed.repo, ghToken.trim() || null,
            (msg, pct) => { setStep(msg); setProgress(pct) },
            auth.token  // ← pass JWT token
          )
          // Save bookmark after — non-blocking
          setStep('Saving to your account…'); setProgress(97)
          try { await analyzeForUser(canonicalUrl, auth.token) } catch (_) {}
          onAnalyze({ ...data, token: ghToken.trim() || null })
          return
        } catch (e) {
          if (!e.message.includes('403') && !e.message.includes('401')) {
            setError(e.message); setLoading(false); return
          }
          // Rate limited — fall back to JGit
          setStep('Rate limited — using backend…'); setProgress(5)
        }
      }

      // 2. Rate-limited fallback only — JGit backend parse
      try {
        const result = await analyzeForUser(canonicalUrl, auth.token)
        const repoId = result.repositoryId
        if (result.cached) {
          setStep('Loading cached results…'); setProgress(90)
        } else {
          await pollStatus(repoId, (msg, pct) => { setStep(msg); setProgress(pct) })
          setStep('Loading analytics…'); setProgress(95)
        }
        const rawData = await fetchRepoData(repoId)
        const fakeStatus = { id: repoId, status: 'COMPLETED' }
        const dashData = mapBackendData(canonicalUrl, fakeStatus, rawData)
        onAnalyze({ ...dashData, token: ghToken.trim() || null })
      } catch (e) {
        setError(e.message); setLoading(false)
      }
      return
    }
    // ── Guest path — GitHub API only, no DB writes ─────────
    if (parsed) {
      try {
        const data = await loadRepo(
          parsed.owner, parsed.repo, ghToken.trim() || null,
          (msg, pct) => { setStep(msg); setProgress(pct) }
        )
        onAnalyze({ ...data, token: ghToken.trim() || null })
        return
      } catch (e) {
        setError(
          e.message.includes('403') || e.message.includes('401')
            ? 'GitHub rate limit hit. Add a GitHub token above, or log in to use backend parsing.'
            : e.message
        )
        setLoading(false)
      }
    } else {
      setError('Please enter a valid GitHub URL (e.g. github.com/owner/repo)')
      setLoading(false)
    }
  }

  return (
    <div style={{ ...S.page, padding: isMobile ? '1rem' : '2rem' }}>

      {showAuth && (
        <AuthModal
          onAuth={(authData) => { onLogin(authData); setShowAuth(false) }}
          onClose={() => setShowAuth(false)}
        />
      )}

      {showMyRepos && auth && (
        <MyRepos
          auth={auth}
          onAnalyze={(data) => { setShowMyRepos(false); onAnalyze(data) }}
          onClose={() => setShowMyRepos(false)}
        />
      )}

      <div style={{ ...S.blob, top:'15%', left:'20%', width:700, height:700, background:'radial-gradient(circle,rgba(139,92,246,0.11) 0%,transparent 70%)' }}/>
      <div style={{ ...S.blob, bottom:'10%', right:'10%', width:500, height:500, background:'radial-gradient(circle,rgba(56,189,248,0.08) 0%,transparent 70%)' }}/>

      <div style={S.card}>

        {/* ════ HERO — untouched ════ */}
        <div style={{ ...S.badge, fontSize: isMobile ? 9 : 11, letterSpacing: isMobile ? '0.18em' : '0.32em' }}>
          ◈ BLUEBIT 4.0 · PS10 · GIT HISTORY TIME TRAVELLER
        </div>
        <h1 style={{ ...S.title, fontSize: isMobile ? 'clamp(2.5rem,15vw,4rem)' : 'clamp(3rem,9vw,6rem)' }}>
          GitLens
        </h1>
        <p style={{ ...S.sub, fontSize: isMobile ? 14 : 17 }}>
          Transform git logs into cinematic animations,{isMobile ? ' ' : <br />}
          heatmaps &amp; AI-powered insights — instantly.
        </p>
        <div style={{ ...S.pills, gap: isMobile ? 6 : 8 }}>
          {[['🎬','Cinematic Timeline'],['🔥','File Hotspots'],['⏰','Day × Hour'],['🌌','Galaxy'],['🤖','AI Insights']].map(([e,l])=>(
            <div key={l} style={{ ...S.pill, fontSize: isMobile ? 11 : 12 }}>{e} {l}</div>
          ))}
        </div>
        {/* ════ END HERO ════ */}

        {!loading ? (
          <div style={{ ...S.inputBox, padding: isMobile ? 16 : 24 }}>

            {/* ── Auth bar ── */}
            <div style={{ ...S.authBar, flexDirection: isMobile ? 'column' : 'row', marginBottom: 16 }}>
              {auth ? (
                <>
                  <div style={S.authUser}>
                    <div style={S.authAvatar}>{auth.name[0].toUpperCase()}</div>
                    <div>
                      <div style={S.authName}>{auth.name}</div>
                      <div style={S.authEmail}>{auth.email}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => setShowMyRepos(true)} style={S.myReposBtn}>
                      📂 My Repos
                    </button>
                    <button onClick={onLogout} style={S.logoutBtn}>Log Out</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={S.guestMsg}>
                    <span style={{ color: '#818cf8' }}>✦</span>
                    {' '}
                    <span style={{ color: '#475569' }}>Log in to save analyses &amp; skip re-parsing</span>
                  </div>
                  <button onClick={() => setShowAuth(true)} style={S.loginBtn}>
                    Log In / Sign Up
                  </button>
                </>
              )}
            </div>

            {/* URL row */}
            <div style={{ ...S.inputRow, flexDirection: isMobile ? 'column' : 'row' }}>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handle()}
                placeholder="github.com/owner/repo"
                style={S.input}
              />
              <button onClick={handle} style={{ ...S.analyseBtn, width: isMobile ? '100%' : 'auto' }}>
                ANALYSE →
              </button>
            </div>

            {/* GitHub token */}
            <div style={{ marginBottom: 8 }}>
              <button onClick={() => setShowToken(s => !s)} style={S.tokenToggle}>
                {showToken ? '▾' : '▸'} GitHub token{ghToken ? ' ✓ saved' : ' (optional)'}
              </button>
              {showToken && (
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input
                    type="password"
                    value={ghToken}
                    onChange={e => saveGhToken(e.target.value)}
                    placeholder="ghp_…"
                    style={{ ...S.input, fontSize: 12, padding: '8px 12px', flex: 1 }}
                  />
                  {ghToken && (
                    <button onClick={() => saveGhToken('')} style={{ ...S.analyseBtn, padding: '8px 12px', fontSize: 11, background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444' }}>
                      Clear
                    </button>
                  )}
                </div>
              )}
              {showToken && (
                <div style={{ marginTop: 6, fontSize: 10, color: '#334155', fontFamily: "'JetBrains Mono',monospace", textAlign: 'left' }}>
                  Stored locally in your browser. Generate at{' '}
                  <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>
                    github.com/settings/tokens
                  </a> — read-only public_repo scope is enough.
                </div>
              )}
            </div>

            {error && <div style={S.error}>⚠ {error}</div>}

            {/* Quick picks */}
            <div style={{ ...S.quickRow, gap: isMobile ? 6 : 8 }}>
              {QUICK.map(([r, e]) => (
                <button key={r} onClick={() => setUrl(r)} style={{ ...S.quickBtn, fontSize: isMobile ? 10 : 11 }}>
                  {e} {isMobile ? r.split('/')[1] : r}
                </button>
              ))}
            </div>

            <div style={S.divider}/>
            <button onClick={() => onAnalyze(MOCK)} style={S.demoBtn}>
              🎬 &nbsp;Launch Demo — no GitHub needed
            </button>
          </div>
        ) : (
          <div style={{ ...S.loader, padding: isMobile ? 20 : 32 }}>
            <div style={S.loaderStep}>{step}</div>
            <div style={S.bar}>
              <div style={{ ...S.fill, width: `${progress}%` }}/>
            </div>
            <div style={S.pct}>{progress}% complete</div>
          </div>
        )}
      </div>
    </div>
  )
}

const S = {
  page:      { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 },
  blob:      { position: 'fixed', pointerEvents: 'none', borderRadius: '50%' },
  card:      { textAlign: 'center', maxWidth: 760, width: '100%' },
  badge:     { letterSpacing: '0.32em', color: '#818cf8', marginBottom: 22, fontFamily: "'JetBrains Mono',monospace", textTransform: 'uppercase' },
  title:     { fontFamily: "'Syne','Segoe UI',sans-serif", fontWeight: 900, lineHeight: 1, marginBottom: 16, background: 'linear-gradient(135deg,#f0f4ff 0%,#c7d2fe 45%,#a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  sub:       { color: '#94a3b8', marginBottom: 28, lineHeight: 1.75, fontFamily: "'DM Sans',sans-serif" },
  pills:     { display: 'flex', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 },
  pill:      { padding: '5px 14px', borderRadius: 99, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#64748b', fontFamily: "'JetBrains Mono',monospace" },
  inputBox:  { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, backdropFilter: 'blur(12px)' },
  authBar:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 },
  authUser:  { display: 'flex', alignItems: 'center', gap: 10 },
  authAvatar:{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0, fontFamily: "'Syne',sans-serif" },
  authName:  { color: '#e2e8f0', fontWeight: 700, fontSize: 13, fontFamily: "'JetBrains Mono',monospace" },
  authEmail: { color: '#475569', fontSize: 10, fontFamily: "'JetBrains Mono',monospace" },
  myReposBtn:{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: '#818cf8', fontSize: 12, padding: '6px 12px', borderRadius: 9, fontFamily: "'JetBrains Mono',monospace", cursor: 'pointer', fontWeight: 600 },
  logoutBtn: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 11, padding: '6px 10px', borderRadius: 9, fontFamily: "'JetBrains Mono',monospace", cursor: 'pointer' },
  guestMsg:  { fontSize: 12, fontFamily: "'JetBrains Mono',monospace", textAlign: 'left' },
  loginBtn:  { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 12, padding: '7px 16px', borderRadius: 9, fontFamily: "'JetBrains Mono',monospace", cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' },
  inputRow:  { display: 'flex', gap: 10, marginBottom: 12 },
  input:     { flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, outline: 'none', color: '#f1f5f9', fontSize: 14, padding: '12px 16px', fontFamily: "'JetBrains Mono',monospace", width: '100%' },
  analyseBtn:{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', fontWeight: 800, fontSize: 14, padding: '12px 24px', borderRadius: 10, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.06em', whiteSpace: 'nowrap', cursor: 'pointer' },
  tokenToggle:{ background: 'none', border: 'none', color: '#475569', fontSize: 11, fontFamily: "'JetBrains Mono',monospace", cursor: 'pointer', display: 'block', width: '100%', textAlign: 'left', padding: '2px 0' },
  error:     { marginTop: 8, marginBottom: 4, color: '#f87171', fontSize: 12, fontFamily: "'JetBrains Mono',monospace", textAlign: 'left' },
  quickRow:  { display: 'flex', marginTop: 12, flexWrap: 'wrap' },
  quickBtn:  { padding: '5px 12px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#64748b', fontFamily: "'JetBrains Mono',monospace", cursor: 'pointer' },
  divider:   { height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' },
  demoBtn:   { width: '100%', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontSize: 14, padding: '12px', borderRadius: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, cursor: 'pointer' },
  loader:    { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, backdropFilter: 'blur(12px)' },
  loaderStep:{ color: '#a5b4fc', fontFamily: "'JetBrains Mono',monospace", fontSize: 14, marginBottom: 16 },
  bar:       { height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' },
  fill:      { height: '100%', background: 'linear-gradient(90deg,#6366f1,#a855f7,#ec4899)', borderRadius: 99, transition: 'width 0.5s ease' },
  pct:       { marginTop: 10, color: '#334155', fontFamily: "'JetBrains Mono',monospace", fontSize: 11 },
}
