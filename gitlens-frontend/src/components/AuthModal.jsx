import { useState } from 'react'
import { login, register } from '../utils/authApi.js'

export default function AuthModal({ onAuth, onClose }) {
  const [mode,     setMode]     = useState('login')   // 'login' | 'signup'
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handle = async () => {
    setError('')
    if (!email.trim() || !password.trim()) { setError('Email and password are required'); return }
    if (mode === 'signup' && !name.trim()) { setError('Name is required'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    try {
      const auth = mode === 'login'
        ? await login(email.trim(), password)
        : await register(name.trim(), email.trim(), password)
      onAuth(auth)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.badge}>◈ GitLens · Auth</div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>

        <h2 style={S.title}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p style={S.sub}>
          {mode === 'login'
            ? 'Log in to access your saved repos and skip re-analysis.'
            : 'Sign up to save your analyses across sessions.'}
        </p>

        {/* Mode toggle */}
        <div style={S.toggle}>
          <button
            onClick={() => { setMode('login'); setError('') }}
            style={{ ...S.toggleBtn, ...(mode === 'login' ? S.toggleActive : {}) }}
          >
            Log In
          </button>
          <button
            onClick={() => { setMode('signup'); setError('') }}
            style={{ ...S.toggleBtn, ...(mode === 'signup' ? S.toggleActive : {}) }}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <div style={S.form}>
          {mode === 'signup' && (
            <input
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              style={S.input}
              autoFocus
            />
          )}
          <input
            placeholder="Email address"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handle()}
            style={S.input}
            autoFocus={mode === 'login'}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handle()}
            style={S.input}
          />

          {error && <div style={S.error}>⚠ {error}</div>}

          <button onClick={handle} disabled={loading} style={{ ...S.submitBtn, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Log In →' : 'Create Account →'}
          </button>
        </div>

        {/* Switch mode */}
        <p style={S.switchText}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
            style={S.switchLink}
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>

        <div style={S.divider}/>
        <p style={S.guestNote}>
          You can always analyse repos without logging in — data just won't be saved.
        </p>
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
    borderRadius: 24, padding: 36, maxWidth: 440, width: '100%',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
    position: 'relative',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  badge: { fontSize: 10, letterSpacing: '0.3em', color: '#818cf8', fontFamily: "'JetBrains Mono',monospace" },
  closeBtn: {
    background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#475569',
    width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 13,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontFamily: "'Syne','Segoe UI',sans-serif", fontWeight: 900, fontSize: 28,
    background: 'linear-gradient(135deg,#f0f4ff 0%,#c7d2fe 45%,#a5b4fc 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    marginBottom: 8,
  },
  sub: { color: '#64748b', fontSize: 13, fontFamily: "'DM Sans',sans-serif", marginBottom: 24, lineHeight: 1.6 },
  toggle: {
    display: 'flex', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 4, marginBottom: 24,
  },
  toggleBtn: {
    flex: 1, background: 'none', border: 'none', color: '#475569',
    padding: '8px 0', borderRadius: 9, cursor: 'pointer',
    fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600,
  },
  toggleActive: {
    background: 'rgba(99,102,241,0.25)', color: '#a5b4fc',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, outline: 'none', color: '#f1f5f9',
    fontSize: 14, padding: '12px 16px',
    fontFamily: "'JetBrains Mono',monospace", width: '100%', boxSizing: 'border-box',
  },
  error: {
    color: '#f87171', fontSize: 12,
    fontFamily: "'JetBrains Mono',monospace", padding: '8px 12px',
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 8,
  },
  submitBtn: {
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    border: 'none', color: '#fff', fontWeight: 800,
    fontSize: 14, padding: '13px 24px', borderRadius: 10,
    fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.06em', cursor: 'pointer',
    marginTop: 4,
  },
  switchText: { textAlign: 'center', color: '#475569', fontSize: 13, fontFamily: "'DM Sans',sans-serif", marginTop: 20 },
  switchLink: {
    background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer',
    fontSize: 13, fontFamily: "'DM Sans',sans-serif", textDecoration: 'underline',
  },
  divider: { height: 1, background: 'rgba(255,255,255,0.06)', margin: '18px 0' },
  guestNote: { textAlign: 'center', color: '#334155', fontSize: 11, fontFamily: "'JetBrains Mono',monospace" },
}
