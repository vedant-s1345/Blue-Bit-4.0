import { useState } from 'react'
import { submitRepo, pollStatus, fetchRepoData } from '../utils/api.js'
import { mapBackendData } from '../utils/backendMapper.js'
import { loadRepo, parseRepoUrl } from '../utils/github.js'
import { MOCK } from '../utils/mockData.js'
import { useIsMobile } from '../utils/useIsMobile.js'

const QUICK = [
  ['facebook/react', '⚛'],
  ['microsoft/vscode', '💙'],
  ['torvalds/linux', '🐧'],
  ['vercel/next.js', '▲'],
]

export default function Landing({ onAnalyze }) {
  const [url,        setUrl]        = useState('')
  const [token,      setToken]      = useState(() => {
    try { return localStorage.getItem('gitlens_gh_token') || '' } catch { return '' }
  })
  const [showToken,  setShowToken]  = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [progress,   setProgress]   = useState(0)
  const [step,       setStep]       = useState('')
  const [error,      setError]      = useState('')
  const isMobile = useIsMobile()

  const saveToken = (val) => {
    setToken(val)
    try { if (val) localStorage.setItem('gitlens_gh_token', val); else localStorage.removeItem('gitlens_gh_token') } catch {}
  }

  const handle = async () => {
    if (!url.trim()) { setError('Enter a valid GitHub URL'); return }
    setError(''); setLoading(true); setProgress(0)

    const parsed = parseRepoUrl(url.trim())
    if (parsed) {
      try {
        const data = await loadRepo(
          parsed.owner, parsed.repo, token.trim() || null,
          (msg, pct) => { setStep(msg); setProgress(pct) }
        )
        onAnalyze({ ...data, token: token.trim() || null })
        return
      } catch (e) {
        if (e.message.includes('403') || e.message.includes('401')) {
          setError('GitHub rate limit hit — add a token below for higher limits. Falling back to backend…')
        }
      }
    }

    try {
      setStep('Submitting repository…'); setProgress(5)
      const { repositoryId } = await submitRepo(url.trim())
      const repoStatus = await pollStatus(
        repositoryId,
        (msg, pct) => { setStep(msg); setProgress(pct) }
      )
      setStep('Loading analytics…'); setProgress(95)
      const rawData = await fetchRepoData(repositoryId)
      const dashboardData = mapBackendData(url.trim(), repoStatus, rawData)
      onAnalyze({ ...dashboardData, token: token.trim() || null })
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ ...S.page, padding: isMobile ? '1rem' : '2rem' }}>
      <div style={{ ...S.blob, top:'15%', left:'20%', width:700, height:700, background:'radial-gradient(circle,rgba(139,92,246,0.11) 0%,transparent 70%)' }}/>
      <div style={{ ...S.blob, bottom:'10%', right:'10%', width:500, height:500, background:'radial-gradient(circle,rgba(56,189,248,0.08) 0%,transparent 70%)' }}/>

      <div style={S.card}>
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

        {!loading ? (
          <div style={{ ...S.inputBox, padding: isMobile ? 16 : 24 }}>
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
                {showToken ? '▾' : '▸'} GitHub token{token ? ' ✓ saved' : ' (optional)'}
              </button>
              {showToken && (
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input
                    type="password"
                    value={token}
                    onChange={e => saveToken(e.target.value)}
                    placeholder="ghp_…"
                    style={{ ...S.input, fontSize: 12, padding: '8px 12px', flex: 1 }}
                  />
                  {token && (
                    <button onClick={() => saveToken('')} style={{ ...S.analyseBtn, padding: '8px 12px', fontSize: 11, background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444' }}>
                      Clear
                    </button>
                  )}
                </div>
              )}
              {showToken && (
                <div style={{ marginTop: 6, fontSize: 10, color: '#334155', fontFamily: "'JetBrains Mono',monospace", textAlign: 'left' }}>
                  Token is stored locally in your browser. Generate one at{' '}
                  <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>
                    github.com/settings/tokens
                  </a>{' '}— read-only public_repo scope is enough.
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
  page:        { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 },
  blob:        { position: 'fixed', pointerEvents: 'none', borderRadius: '50%' },
  card:        { textAlign: 'center', maxWidth: 760, width: '100%' },
  badge:       { letterSpacing: '0.32em', color: '#818cf8', marginBottom: 22, fontFamily: "'JetBrains Mono',monospace", textTransform: 'uppercase' },
  title:       { fontFamily: "'Syne','Segoe UI',sans-serif", fontWeight: 900, lineHeight: 1, marginBottom: 16, background: 'linear-gradient(135deg,#f0f4ff 0%,#c7d2fe 45%,#a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  sub:         { color: '#94a3b8', marginBottom: 28, lineHeight: 1.75, fontFamily: "'DM Sans',sans-serif" },
  pills:       { display: 'flex', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 },
  pill:        { padding: '5px 14px', borderRadius: 99, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#64748b', fontFamily: "'JetBrains Mono',monospace" },
  inputBox:    { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, backdropFilter: 'blur(12px)' },
  inputRow:    { display: 'flex', gap: 10, marginBottom: 12 },
  input:       { flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, outline: 'none', color: '#f1f5f9', fontSize: 14, padding: '12px 16px', fontFamily: "'JetBrains Mono',monospace", width: '100%' },
  analyseBtn:  { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', fontWeight: 800, fontSize: 14, padding: '12px 24px', borderRadius: 10, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.06em', whiteSpace: 'nowrap', cursor: 'pointer' },
  tokenToggle: { background: 'none', border: 'none', color: '#475569', fontSize: 11, fontFamily: "'JetBrains Mono',monospace", cursor: 'pointer', display: 'block', width: '100%', textAlign: 'left', padding: '2px 0' },
  error:       { marginTop: 8, marginBottom: 4, color: '#f87171', fontSize: 12, fontFamily: "'JetBrains Mono',monospace", textAlign: 'left' },
  quickRow:    { display: 'flex', marginTop: 12, flexWrap: 'wrap' },
  quickBtn:    { padding: '5px 12px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#64748b', fontFamily: "'JetBrains Mono',monospace", cursor: 'pointer' },
  divider:     { height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' },
  demoBtn:     { width: '100%', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontSize: 14, padding: '12px', borderRadius: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 600, cursor: 'pointer' },
  loader:      { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, backdropFilter: 'blur(12px)' },
  loaderStep:  { color: '#a5b4fc', fontFamily: "'JetBrains Mono',monospace", fontSize: 14, marginBottom: 16 },
  bar:         { height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' },
  fill:        { height: '100%', background: 'linear-gradient(90deg,#6366f1,#a855f7,#ec4899)', borderRadius: 99, transition: 'width 0.5s ease' },
  pct:         { marginTop: 10, color: '#334155', fontFamily: "'JetBrains Mono',monospace", fontSize: 11 },
}
