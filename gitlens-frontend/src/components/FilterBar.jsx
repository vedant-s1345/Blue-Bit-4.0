import { useState } from 'react'

const FILE_TYPES = ['all', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.md', '.css', '.html']

export default function FilterBar({ filters, setFilters, authors }) {
  const [search, setSearch] = useState(filters.keyword || '')

  const updateKeyword = (value) => {
    setSearch(value)
    setFilters(prev => ({ ...prev, keyword: value }))
  }

  const sel = {
    fontSize: 12, padding: '8px 10px', borderRadius: 8,
    background: '#020617', border: '1px solid #334155', color: '#cbd5f5',
  }

  return (
    <div style={{
      display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20,
      padding: 14, borderRadius: 14,
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    }}>

      {/* Author */}
      <select
        value={filters.author}
        onChange={e => setFilters(prev => ({ ...prev, author: e.target.value }))}
        style={sel}
      >
        <option value="all">All Authors</option>
        {authors.map(a => <option key={a} value={a}>{a}</option>)}
      </select>

      {/* Keyword */}
      <input
        type="text"
        placeholder="Search commit message…"
        value={search}
        onChange={e => updateKeyword(e.target.value)}
        style={{ ...sel, width: 200 }}
      />

      {/* File type */}
      <select
        value={filters.fileType || 'all'}
        onChange={e => setFilters(prev => ({ ...prev, fileType: e.target.value }))}
        style={sel}
        title="Filter heatmap by file extension"
      >
        {FILE_TYPES.map(t => (
          <option key={t} value={t}>{t === 'all' ? 'All file types' : t}</option>
        ))}
      </select>

      {/* Time range */}
      <select
        value={filters.timeRange}
        onChange={e => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
        style={sel}
      >
        <option value="all">All Time</option>
        <option value="1month">Last Month</option>
        <option value="3months">Last 3 Months</option>
        <option value="6months">Last 6 Months</option>
        <option value="1year">Last Year</option>
      </select>

      {/* Jump to commit SHA */}
      <input
        type="text"
        placeholder="Jump to SHA / date…"
        value={filters.jumpQuery || ''}
        onChange={e => setFilters(prev => ({ ...prev, jumpQuery: e.target.value }))}
        style={{ ...sel, width: 160 }}
        title="Type a SHA prefix or date (YYYY-MM-DD) to jump to that commit"
      />

      {/* Speed control */}
      <select
        value={filters.speed || '1'}
        onChange={e => setFilters(prev => ({ ...prev, speed: e.target.value }))}
        style={sel}
        title="Playback speed"
      >
        <option value="0.5">Speed 0.5×</option>
        <option value="1">Speed 1×</option>
        <option value="2">Speed 2×</option>
        <option value="4">Speed 4×</option>
      </select>

      {/* Clear */}
      <button
        onClick={() => {
          setSearch('')
          setFilters({ author: 'all', keyword: '', fileType: 'all', timeRange: 'all', jumpQuery: '', speed: '1' })
        }}
        style={{
          fontSize: 11, padding: '8px 12px', borderRadius: 8,
          border: '1px solid #ef4444', background: 'transparent',
          color: '#ef4444', cursor: 'pointer',
        }}
      >
        Clear
      </button>
    </div>
  )
}
