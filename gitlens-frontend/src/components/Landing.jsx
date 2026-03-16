//MAIN ENTRY POINT IN FRONTEND
import { useState } from 'react'
import { submitRepo, pollStatus, fetchRepoData } from '../utils/api.js'
import { mapBackendData } from '../utils/backendMapper.js'
import { parseRepoUrl } from '../utils/github.js'
import { MOCK } from '../utils/mockData.js'

const QUICK = [
  ['facebook/react', '⚛'],
  ['microsoft/vscode', '💙'],
  ['torvalds/linux', '🐧'],
  ['vercel/next.js', '▲'],
]

export default function Landing({ onAnalyze }) {
  const [url,      setUrl]      = useState('')
  const [loading,  setLoading]  = useState(false)
  const [progress, setProgress] = useState(0)
  const [step,     setStep]     = useState('')
  const [error,    setError]    = useState('')

  const handle = async () => {
    if (!url.trim()) { setError('Enter a valid GitHub URL'); return }
    setError(''); setLoading(true); setProgress(0)
    try {
      // 1. Submit to backend
      setStep('Submitting repository…'); setProgress(5)
      const { repositoryId } = await submitRepo(url.trim())

      // 2. Poll until analysis completes
      const repoStatus = await pollStatus(
        repositoryId,
        (msg, pct) => { setStep(msg); setProgress(pct) }
      )

      // 3. Fetch all analytics
      setStep('Loading analytics…'); setProgress(95)
      const rawData = await fetchRepoData(repositoryId)

      // 4. Map to dashboard format
      const dashboardData = mapBackendData(url.trim(), repoStatus, rawData)
      onAnalyze(dashboardData)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      {/* Nebula blobs */}
      <div style={{ ...S.blob, top:'15%', left:'20%', width:700, height:700, background:'radial-gradient(circle,rgba(139,92,246,0.11) 0%,transparent 70%)' }}/>
      <div style={{ ...S.blob, bottom:'10%', right:'10%', width:500, height:500, background:'radial-gradient(circle,rgba(56,189,248,0.08) 0%,transparent 70%)' }}/>

      <div style={S.card}>
        <div style={S.badge}>◈ BLUEBIT 4.0 · PS10 · GIT HISTORY TIME TRAVELLER</div>

        <h1 style={S.title}>GitLens</h1>
        <p style={S.sub}>
          Transform git logs into cinematic animations,<br />
          heatmaps &amp; AI-powered insights — instantly.
        </p>

        {/* Feature pills */}
        <div style={S.pills}>
          {[['🎬','Cinematic Timeline'],['🔥','File Hotspots'],['⏰','Day × Hour Heatmap'],['🌌','Galaxy Graph'],['🤖','AI Insights']].map(([e,l])=>(
            <div key={l} style={S.pill}>{e} {l}</div>
          ))}
        </div>

        {!loading ? (
          <div style={S.inputBox}>
            {/* URL row */}
            <div style={S.inputRow}>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handle()}
                placeholder="https://github.com/owner/repo  or  owner/repo"
                style={S.input}
              />
              <button onClick={handle} style={S.analyseBtn}>ANALYSE →</button>
            </div>

            
            {error && <div style={S.error}>⚠ {error}</div>}

            {/* Quick picks */}
            <div style={S.quickRow}>
              {QUICK.map(([r, e]) => (
                <button key={r} onClick={() => setUrl(r)} style={S.quickBtn}>{e} {r}</button>
              ))}
            </div>

            {/* Demo button */}
            <div style={S.divider}/>
            <button onClick={() => onAnalyze(MOCK)} style={S.demoBtn}>
              🎬 &nbsp;Launch Demo with Mock Data — no GitHub needed
            </button>
          </div>
        ) : (
          <div style={S.loader}>
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
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    position: 'relative',
    zIndex: 1,
  },
  blob: { position: 'fixed', pointerEvents: 'none', borderRadius: '50%' },
  card: { textAlign: 'center', maxWidth: 760, width: '100%' },
  badge: {
    fontSize: 11, letterSpacing: '0.32em', color: '#818cf8',
    marginBottom: 22, fontFamily: "'JetBrains Mono',monospace", textTransform: 'uppercase',
  },
  title: {
    fontFamily: "'Syne','Segoe UI',sans-serif",
    fontSize: 'clamp(3rem,9vw,6rem)',
    fontWeight: 900, lineHeight: 1,
    marginBottom: 16,
    background: 'linear-gradient(135deg,#f0f4ff 0%,#c7d2fe 45%,#a5b4fc 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  sub: {
    color: '#94a3b8', fontSize: 17, marginBottom: 28,
    lineHeight: 1.75, fontFamily: "'DM Sans',sans-serif",
  },
  pills: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 },
  pill: {
    fontSize: 12, padding: '5px 14px', borderRadius: 99,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
    color: '#64748b', fontFamily: "'JetBrains Mono',monospace",
  },
  inputBox: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 20, padding: 24, backdropFilter: 'blur(12px)',
  },
  inputRow: { display: 'flex', gap: 10, marginBottom: 12 },
  input: {
    flex: 1, background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
    outline: 'none', color: '#f1f5f9', fontSize: 14,
    padding: '12px 16px', fontFamily: "'JetBrains Mono',monospace",
  },
  analyseBtn: {
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    border: 'none', color: '#fff', fontWeight: 800,
    fontSize: 14, padding: '12px 24px', borderRadius: 10,
    fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.06em', whiteSpace: 'nowrap',
  },
  tokenToggle: {
    background: 'none', border: 'none', color: '#475569',
    fontSize: 12, fontFamily: "'JetBrains Mono',monospace",
    marginBottom: 4, display: 'block', width: '100%', textAlign: 'left',
  },
  error: { marginTop: 12, color: '#f87171', fontSize: 12, fontFamily: "'JetBrains Mono',monospace", textAlign: 'left' },
  quickRow: { display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' },
  quickBtn: {
    fontSize: 11, padding: '5px 12px', borderRadius: 99,
    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
    color: '#64748b', fontFamily: "'JetBrains Mono',monospace",
  },
  divider: { height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' },
  demoBtn: {
    width: '100%', background: 'rgba(99,102,241,0.1)',
    border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8',
    fontSize: 14, padding: '12px', borderRadius: 12,
    fontFamily: "'DM Sans',sans-serif", fontWeight: 600,
  },
  loader: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 20, padding: 32, backdropFilter: 'blur(12px)',
  },
  loaderStep: { color: '#a5b4fc', fontFamily: "'JetBrains Mono',monospace", fontSize: 14, marginBottom: 16 },
  bar: { height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' },
  fill: { height: '100%', background: 'linear-gradient(90deg,#6366f1,#a855f7,#ec4899)', borderRadius: 99, transition: 'width 0.5s ease' },
  pct: { marginTop: 10, color: '#334155', fontFamily: "'JetBrains Mono',monospace", fontSize: 11 },
}
