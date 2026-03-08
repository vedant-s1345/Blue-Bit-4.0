export const PALETTE = [
  '#e879f9', '#38bdf8', '#34d399', '#fb923c',
  '#a78bfa', '#f472b6', '#60a5fa', '#4ade80',
]

export const getRiskColor = (risk) => ({
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#22c55e',
}[risk] || '#6b7280')

export const lerp = (a, b, t) => a + (b - a) * t

export const fmtDate = (iso, opts = { month: 'short', day: 'numeric', year: 'numeric' }) => {
  const d = new Date(iso)
  return isNaN(d) ? '' : d.toLocaleDateString('en', opts)
}

export const fmtShortDate = (iso) =>
  fmtDate(iso, { month: 'short', day: 'numeric' })

export const fmtMonthYear = (iso) =>
  fmtDate(iso, { month: 'short', year: 'numeric' })

export const getAuthorColor = (login, contributors) => {
  const idx = contributors.findIndex(c => c.login === login)
  return idx >= 0 ? contributors[idx].color : PALETTE[0]
}
