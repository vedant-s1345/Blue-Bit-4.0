import { useState } from 'react'
import SpaceIntro      from './components/SpaceIntro.jsx'
import Landing         from './components/Landing.jsx'
import Dashboard       from './components/Dashboard.jsx'
import SpaceBackground from './components/SpaceBackground.jsx'

export default function App() {
  const [stage,    setStage]    = useState('intro')
  const [repoData, setRepoData] = useState(null)

  // SpaceIntro → Landing
  const handleEnter = () => setStage('landing')

  // Landing → Dashboard
  const handleAnalyze = (data) => { setRepoData(data); setStage('dashboard') }

  // Dashboard → Landing (reset)
  const handleReset = () => { setRepoData(null); setStage('landing') }

  if (stage === 'intro') {
    return <SpaceIntro onEnter={handleEnter} />
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020617', position: 'relative' }}>
      <SpaceBackground />
      {stage === 'landing'   && <Landing   onAnalyze={handleAnalyze} />}
      {stage === 'dashboard' && repoData && <Dashboard data={repoData} onReset={handleReset} />}
    </div>
  )
}