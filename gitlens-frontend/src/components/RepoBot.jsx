import { useState, useRef, useEffect } from 'react'

// ── Build the system prompt with full repo context ────────────────────────────
function buildSystemPrompt(data) {
  const { owner, repo, commits, contributors, fileList, collabEdges, busFactorPct, totalCommits } = data

  const topContribs = contributors.slice(0, 6)
    .map(c => `  @${c.login}: ${c.commits} commits (${Math.round((c.commits / totalCommits) * 100)}%)`)
    .join('\n')

  const topFiles = fileList.slice(0, 8)
    .map(f => `  ${f.file} — ${f.changes} edits, risk: ${f.risk}`)
    .join('\n')

  const topEdges = collabEdges.slice(0, 4)
    .map(e => `  ${e.from} ↔ ${e.to} (${e.strength} shared commits)`)
    .join('\n')

  // Sample of recent commit messages
  const recentMsgs = commits.slice(0, 20)
    .map(c => `  [${c.sha?.slice(0, 7)}] ${c.author?.login || c.commit?.author?.name}: ${c.commit?.message?.split('\n')[0]}`)
    .join('\n')

  // Date span
  let span = 'unknown'
  if (commits.length > 1) {
    const d1 = new Date(commits[commits.length - 1]?.commit?.author?.date)
    const d2 = new Date(commits[0]?.commit?.author?.date)
    if (!isNaN(d1) && !isNaN(d2)) {
      const months = Math.round((d2 - d1) / (1000 * 60 * 60 * 24 * 30))
      span = `${months} months (${d1.toLocaleDateString('en', { month: 'short', year: 'numeric' })} → ${d2.toLocaleDateString('en', { month: 'short', year: 'numeric' })})`
    }
  }

  return `You are GitLens AI — an expert software engineering assistant embedded inside a git analytics dashboard for the repository **${owner}/${repo}**.

You have deep knowledge of this specific repository. Be concise, direct, and specific. Use bullet points when listing things. Reference actual commit SHAs, file names, and author names from the data below. Sound like a senior engineer doing a code review — not a generic chatbot.

=== REPOSITORY DATA ===

Repository: ${owner}/${repo}
Total commits analysed: ${totalCommits}
Active for: ${span}
Bus factor: ${busFactorPct}% (top contributor share)

TOP CONTRIBUTORS:
${topContribs || '  No data'}

HIGH-CHURN FILES (hotspots):
${topFiles || '  No data'}

COLLABORATION PAIRS:
${topEdges || '  No data'}

RECENT COMMITS (last 20):
${recentMsgs || '  No data'}

=== END DATA ===

Answer questions about this repo. If asked about something not in the data, say so clearly and suggest what the user could investigate. Keep responses under 200 words unless the user asks for a detailed analysis. Never make up commit SHAs or file names that aren't in the data above.`
}

const SUGGESTIONS = [
  'Who is driving the most development?',
  'Which files are most at risk?',
  'What does the collaboration graph tell us?',
  'Summarize the recent commit history',
  'What are the top 3 things to improve?',
  'Is there a bus factor risk?',
]

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      {!isUser && (
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, marginRight: 8, marginTop: 2 }}>
          ✦
        </div>
      )}
      <div style={{
        maxWidth: '82%',
        padding: '10px 14px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
        background: isUser
          ? 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(168,85,247,0.2))'
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isUser ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`,
        color: '#e2e8f0',
        fontSize: 13,
        lineHeight: 1.65,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontFamily: isUser ? "'DM Sans',sans-serif" : "'DM Sans',sans-serif",
      }}>
        {msg.content}
        {msg.loading && (
          <span style={{ display: 'inline-flex', gap: 3, marginLeft: 6, verticalAlign: 'middle' }}>
            {[0,1,2].map(i => (
              <span key={i} style={{
                width: 5, height: 5, borderRadius: '50%', background: '#818cf8', display: 'inline-block',
                animation: `botDot 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}/>
            ))}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RepoBot({ data }) {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hey! I'm your GitLens AI.\n\nI've read all ${data.totalCommits} commits in **${data.owner}/${data.repo}**. Ask me anything — who's doing the most work, which files are risky, what the commit patterns look like, or what to focus on next.`,
    }
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()
  const inputRef  = useRef()
  const systemPrompt = useRef(buildSystemPrompt(data))

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [open, messages])

  const send = async (text) => {
    const userMsg = text || input.trim()
    if (!userMsg || loading) return
    setInput('')

    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages([...newMessages, { role: 'assistant', content: '', loading: true }])
    setLoading(true)

    try {
      const res = await fetch('http://localhost:8082/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: systemPrompt.current,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const json  = await res.json()
      if (!res.ok) throw new Error(json?.error || `Server error ${res.status}`)
      const reply = json?.reply || 'Sorry, I could not generate a response.'

      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: reply, loading: false }
        return updated
      })
    } catch (e) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: `Error: ${e.message}`, loading: false }
        return updated
      })
    }
    setLoading(false)
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 900,
          width: 54, height: 54, borderRadius: '50%',
          background: open ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg,#6366f1,#a855f7)',
          border: `1px solid ${open ? '#ef4444' : '#6366f1'}`,
          color: '#fff', fontSize: open ? 18 : 20,
          boxShadow: open ? 'none' : '0 0 24px rgba(99,102,241,0.5)',
          transition: 'all 0.22s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title={open ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {open ? '✕' : '✦'}
      </button>

      {/* Unread dot */}
      {!open && (
        <div style={{
          position: 'fixed', bottom: 72, right: 28, zIndex: 901,
          width: 10, height: 10, borderRadius: '50%',
          background: '#4ade80', boxShadow: '0 0 8px #4ade80',
          animation: 'botPulse 2s infinite',
        }}/>
      )}

      {/* ── Chat panel ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 92, right: 28, zIndex: 900,
          width: 380, height: 520,
          background: '#0c1424', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 20, display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        }}>

          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
              ✦
            </div>
            <div>
              <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13 }}>GitLens AI</div>
              <div style={{ color: '#4ade80', fontSize: 10, fontFamily: "'JetBrains Mono',monospace", display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}/>
                knows your repo
              </div>
            </div>
            <div style={{ flex: 1 }}/>
            <button
              onClick={() => setMessages([{
                role: 'assistant',
                content: `Chat cleared! I still know everything about **${data.owner}/${data.repo}**. What do you want to know?`
              }])}
              style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#475569', fontFamily: "'JetBrains Mono',monospace" }}
              title="Clear chat"
            >
              clear
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 4px', scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}>
            {messages.map((m, i) => <Bubble key={i} msg={m} />)}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions (shown only when just 1 message) */}
          {messages.length === 1 && (
            <div style={{ padding: '0 10px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SUGGESTIONS.slice(0, 4).map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    fontSize: 10, padding: '4px 10px', borderRadius: 99,
                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                    color: '#818cf8', fontFamily: "'JetBrains Mono',monospace", cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask about this repo…"
              rows={1}
              disabled={loading}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                color: '#f1f5f9', fontSize: 13, padding: '8px 12px',
                resize: 'none', outline: 'none', lineHeight: 1.5,
                fontFamily: "'DM Sans',sans-serif",
                opacity: loading ? 0.5 : 1,
              }}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 10, alignSelf: 'flex-end',
                background: loading || !input.trim()
                  ? 'rgba(99,102,241,0.1)'
                  : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                border: '1px solid rgba(99,102,241,0.4)',
                color: '#fff', fontSize: 16,
                transition: 'all 0.15s',
              }}
            >
              {loading ? '…' : '↑'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes botDot  { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        @keyframes botPulse{ 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
      `}</style>
    </>
  )
}
