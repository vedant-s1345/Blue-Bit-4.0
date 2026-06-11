const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8082/api'

// ── Persist auth in localStorage ─────────────────────────────────────────────
export function getStoredAuth() {
  try {
    const raw = localStorage.getItem('gitlens_auth')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function setStoredAuth(auth) {
  try { localStorage.setItem('gitlens_auth', JSON.stringify(auth)) } catch {}
}

export function clearStoredAuth() {
  try { localStorage.removeItem('gitlens_auth') } catch {}
}

// ── Auth calls ────────────────────────────────────────────────────────────────
export async function register(name, email, password) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Registration failed')
  return data
}

export async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Login failed')
  return data
}

export async function verifyToken(token) {
  const res = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

// ── User-scoped repo calls ────────────────────────────────────────────────────
export async function fetchMyRepos(token) {
  const res = await fetch(`${BASE}/user/repos`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  // Throw with the real server message so MyRepos can show it
  if (!res.ok) {
    let msg = `Failed to load repos (${res.status})`
    try { const d = await res.json(); msg = d.error || d.message || msg } catch {}
    throw new Error(msg)
  }
  return res.json()
}

export async function analyzeForUser(repoUrl, token) {
  // Normalize shorthand owner/repo → full URL before sending
  let url = repoUrl.trim()
  if (!url.startsWith('http') && !url.startsWith('github.com')) {
    // e.g. "facebook/react"
    if (url.match(/^[^/]+\/[^/]+$/)) url = `https://github.com/${url}`
  } else if (url.startsWith('github.com/')) {
    url = `https://${url}`
  }
  url = url.replace(/\.git$/, '')

  const res = await fetch(`${BASE}/user/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ repoUrl: url }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to start analysis')
  return data
}

export async function deleteMyRepo(repoId, token) {
  const res = await fetch(`${BASE}/user/repos/${repoId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to remove repo')
}
