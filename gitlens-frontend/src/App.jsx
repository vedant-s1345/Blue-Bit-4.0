import { useState } from 'react'
import Landing from './components/Landing.jsx'
import Dashboard from './components/Dashboard.jsx'
import StarField from './components/StarField.jsx'

export default function App() {
  const [repoData, setRepoData] = useState(null)

  return (
    <div style={{ minHeight: '100vh', background: '#020617', position: 'relative' }}>
      <StarField />
      {!repoData
        ? <Landing onAnalyze={setRepoData} />
        : <Dashboard data={repoData} onReset={() => setRepoData(null)} />
      }
    </div>
  )
}
