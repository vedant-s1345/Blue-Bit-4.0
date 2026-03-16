
import { useState } from 'react'
import SpaceIntro      from './components/SpaceIntro.jsx'    
import Landing         from './components/Landing.jsx'
import Dashboard       from './components/Dashboard.jsx'
import SpaceBackground from './components/SpaceBackground.jsx'

export default function App() {
  const [page,     setPage]     = useState('intro')          // CHANGE idle → intro
  const [repoData, setRepoData] = useState(null)

  if (page === 'intro') {                                    
    return <SpaceIntro onEnter={() => setPage('landing')} /> 
  }                                                          

  return (
    <div style={{ minHeight: '100vh', background: '#020617', position: 'relative' }}>
      <SpaceBackground phase={page} />
      {!repoData
        ? <Landing
            onAnalyze={(data) => { setRepoData(data); setPage('dashboard') }}
            onLoadingChange={(loading) => setPage(loading ? 'loading' : 'landing')}
          />
        : <Dashboard data={repoData} onReset={() => { setRepoData(null); setPage('landing') }} />
      }
    </div>
  )
}
