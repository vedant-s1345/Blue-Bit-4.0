import { useState, useEffect } from 'react'
import { fmtDate } from '../utils/constants.js'

const GH = 'https://api.github.com'

// Fetch diff from GitHub — needs full 40-char SHA and valid token
async function fetchDiff(owner, repo, sha, token) {
  if (!sha || sha.length < 7) throw new Error('No valid SHA')
  const headers = {
    Accept: 'application/vnd.github+json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await fetch(`${GH}/repos/${owner}/${repo}/commits/${sha}`, { headers })
  if (res.status === 404) throw new Error('404')
  if (res.status === 403) throw new Error('rate-limited')
  if (!res.ok)            throw new Error(`GitHub ${res.status}`)
  return res.json()
}

export default function CommitModal({ commit, owner, repo, token, onClose }) {
  const [diff,     setDiff]    = useState(null)
  const [diffState, setDiffState] = useState('loading') // loading | ok | unavailable

  const sha     = commit?.sha || ''
  const message = commit?.commit?.message || ''
  const author  = commit?.author?.login || commit?.commit?.author?.name || 'unknown'
  const date    = commit?.commit?.author?.date
  const added   = commit?.linesAdded   ?? null
  const deleted = commit?.linesDeleted ?? null
  const ghUrl   = `https://github.com/${owner}/${repo}/commit/${sha}`

  useEffect(() => {
    if (!sha) return
    setDiffState('loading')
    fetchDiff(owner, repo, sha, token)
      .then(d  => { setDiff(d); setDiffState('ok') })
      .catch(() => setDiffState('unavailable'))
  }, [sha, owner, repo, token])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const stats = diff?.stats || {}
  const files  = diff?.files || []

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 740, maxHeight: '84vh',
          background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 20, display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#a5b4fc', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, marginBottom: 6 }}>
              {sha.slice(0, 12)} · {author} · {date ? fmtDate(date) : ''}
            </div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {message}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <a
              href={ghUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, padding: '6px 14px', borderRadius: 8, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc', textDecoration: 'none', fontFamily: "'JetBrains Mono',monospace" }}
            >
              View on GitHub ↗
            </a>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', fontSize: 14 }}>✕</button>
          </div>
        </div>

        {/* ── Stats bar — always shown from commit data we already have ── */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {diffState === 'ok' ? (
            <>
              <Stat label="Files changed" val={files.length} />
              <Stat label="Additions"     val={`+${stats.additions ?? 0}`} color="#4ade80" />
              <Stat label="Deletions"     val={`-${stats.deletions ?? 0}`} color="#f87171" />
            </>
          ) : (
            <>
              {added   !== null && <Stat label="Lines added"   val={`+${added}`}   color="#4ade80" />}
              {deleted !== null && <Stat label="Lines removed" val={`-${deleted}`} color="#f87171" />}
            </>
          )}
          <Stat label="SHA" val={sha.slice(0, 7)} />
          <Stat label="Author" val={author} />
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>

          {/* Loading */}
          {diffState === 'loading' && (
            <div style={{ color: '#475569', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, padding: '24px 0', textAlign: 'center' }}>
              Fetching diff from GitHub…
            </div>
          )}

          {/* Graceful degradation — no diff available */}
          {diffState === 'unavailable' && (
            <div style={{ padding: '14px 0' }}>
              <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 14 }}>
                <div style={{ color: '#818cf8', fontSize: 12, fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>
                  ℹ Diff not available — GitHub API requires a valid token for this repo
                </div>
                <div style={{ color: '#475569', fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>
                  Add a GitHub token in the URL input (format: <code style={{ color: '#a5b4fc' }}>owner/repo?token=ghp_…</code>) or view the full diff on GitHub:
                </div>
              </div>
              <a
                href={ghUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '10px 18px', borderRadius: 10, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: '#a5b4fc', textDecoration: 'none', fontFamily: "'JetBrains Mono',monospace" }}
              >
                Open commit on GitHub ↗
              </a>
              {/* Show the full commit message body if multi-line */}
              {message.includes('\n') && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ color: '#334155', fontSize: 10, fontFamily: "'JetBrains Mono',monospace", marginBottom: 8, letterSpacing: '0.1em' }}>COMMIT BODY</div>
                  <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {message.split('\n').slice(1).join('\n').trim()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* File diffs */}
          {diffState === 'ok' && files.map((f, i) => <FileRow key={i} file={f} owner={owner} repo={repo} sha={sha} />)}
        </div>

        {/* ── Parents footer ── */}
        {diffState === 'ok' && diff?.parents?.length > 0 && (
          <div style={{ padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: '#334155', fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>PARENTS:</span>
            {diff.parents.map(p => (
              <a key={p.sha} href={`https://github.com/${owner}/${repo}/commit/${p.sha}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 10, color: '#6366f1', fontFamily: "'JetBrains Mono',monospace" }}>
                {p.sha.slice(0, 7)}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, val, color }) {
  return (
    <div>
      <div style={{ color: color || '#a5b4fc', fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 14 }}>{val}</div>
      <div style={{ color: '#334155', fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>{label}</div>
    </div>
  )
}

function FileRow({ file, owner, repo, sha }) {
  const [open, setOpen] = useState(false)
  const total  = (file.additions || 0) + (file.deletions || 0)
  const addPct = total > 0 ? (file.additions / total) * 100 : 50
  const statusColor = { added:'#4ade80', removed:'#f87171', modified:'#60a5fa', renamed:'#fbbf24', copied:'#a78bfa' }[file.status] || '#64748b'

  return (
    <div style={{ marginBottom: 6, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
      >
        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: statusColor + '22', color: statusColor, fontFamily: "'JetBrains Mono',monospace", textTransform: 'uppercase', flexShrink: 0 }}>
          {file.status}
        </span>
        <span style={{ flex: 1, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.filename}>
          {file.filename}
        </span>
        <div style={{ width: 60, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ width: `${addPct}%`, height: '100%', background: '#4ade80' }} />
        </div>
        <span style={{ color: '#4ade80', fontSize: 10, fontFamily: "'JetBrains Mono',monospace", flexShrink: 0 }}>+{file.additions}</span>
        <span style={{ color: '#f87171', fontSize: 10, fontFamily: "'JetBrains Mono',monospace", flexShrink: 0 }}>-{file.deletions}</span>
        <span style={{ color: '#334155', fontSize: 11 }}>{open ? '▴' : '▾'}</span>
      </div>

      {open && (
        <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', overflowX: 'auto' }}>
          {file.patch ? (
            <>
              {file.patch.split('\n').slice(0, 80).map((line, i) => {
                const bg  = line.startsWith('+') ? 'rgba(74,222,128,0.1)' : line.startsWith('-') ? 'rgba(248,113,113,0.1)' : line.startsWith('@') ? 'rgba(99,102,241,0.1)' : 'transparent'
                const col = line.startsWith('+') ? '#86efac' : line.startsWith('-') ? '#fca5a5' : line.startsWith('@') ? '#a5b4fc' : '#475569'
                return (
                  <div key={i} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, lineHeight: 1.7, background: bg, color: col, paddingLeft: 4, whiteSpace: 'pre' }}>
                    {line}
                  </div>
                )
              })}
              {file.patch.split('\n').length > 80 && (
                <div style={{ color: '#334155', fontSize: 10, fontFamily: "'JetBrains Mono',monospace", paddingTop: 4 }}>
                  … {file.patch.split('\n').length - 80} more lines —{' '}
                  <a href={`https://github.com/${owner}/${repo}/commit/${sha}#diff-${btoa(file.filename).replace(/=/g,'')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>full diff on GitHub</a>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: '#334155', fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>No patch (binary or large file)</div>
          )}
        </div>
      )}
    </div>
  )
}
