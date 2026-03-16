import { useState } from "react"

export default function FilterBar({ filters, setFilters, authors }) {

  const [search, setSearch] = useState(filters.keyword)

  const updateKeyword = (value) => {
    setSearch(value)

    setFilters(prev => ({
      ...prev,
      keyword: value
    }))
  }

  return (
    <div style={styles.container}>

      {/* Author Filter */}
      <select
        value={filters.author}
        onChange={(e) =>
          setFilters(prev => ({
            ...prev,
            author: e.target.value
          }))
        }
        style={styles.select}
      >
        <option value="all">All Authors</option>

        {authors.map(a => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}

      </select>

      {/* Commit Search */}
      <input
        type="text"
        placeholder="Search commit message..."
        value={search}
        onChange={(e) => updateKeyword(e.target.value)}
        style={styles.input}
      />

      {/* Time Filter */}
      <select
        value={filters.timeRange}
        onChange={(e) =>
          setFilters(prev => ({
            ...prev,
            timeRange: e.target.value
          }))
        }
        style={styles.select}
      >
        <option value="all">All Time</option>
        <option value="6months">Last 6 Months</option>
      </select>

      {/* Clear Filters */}
      <button
        onClick={() =>
          setFilters({
            author: "all",
            keyword: "",
            timeRange: "all"
          })
        }
        style={styles.clear}
      >
        Clear
      </button>

    </div>
  )
}

const styles = {

  container: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 20,
    padding: 14,
    borderRadius: 14,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)"
  },

  select: {
    padding: "8px 10px",
    borderRadius: 8,
    background: "#020617",
    border: "1px solid #334155",
    color: "#cbd5f5",
    fontSize: 12
  },

  input: {
    padding: "8px 10px",
    borderRadius: 8,
    background: "#020617",
    border: "1px solid #334155",
    color: "#e2e8f0",
    width: 220,
    fontSize: 12
  },

  clear: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #ef4444",
    background: "transparent",
    color: "#ef4444",
    fontSize: 12,
    cursor: "pointer"
  }
}