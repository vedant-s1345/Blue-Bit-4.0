import { useState, useEffect } from 'react'
import SpaceIntro      from './components/SpaceIntro.jsx'
import Landing         from './components/Landing.jsx'
import Dashboard       from './components/Dashboard.jsx'
import SpaceBackground from './components/SpaceBackground.jsx'
import { getStoredAuth, setStoredAuth, clearStoredAuth, verifyToken } from './utils/authApi.js'

export default function App() {
  const [stage,    setStage]    = useState('intro')
  const [repoData, setRepoData] = useState(null)
  const [auth,     setAuth]     = useState(null)   // { token, userId, name, email } | null

  // On mount: restore + verify stored auth
  useEffect(() => {
    const stored = getStoredAuth()
    if (stored?.token) {
      verifyToken(stored.token).then(result => {
        if (result) setAuth(result)
        else clearStoredAuth()
      })
    }
  }, [])

  const handleLogin = (authData) => {
    setStoredAuth(authData)
    setAuth(authData)
  }

  const handleLogout = () => {
    clearStoredAuth()
    setAuth(null)
  }

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
      {stage === 'landing' && (
        <Landing
          onAnalyze={handleAnalyze}
          auth={auth}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      )}
      {stage === 'dashboard' && repoData && (
        <Dashboard
          data={repoData}
          onReset={handleReset}
          auth={auth}
        />
      )}
    </div>
  )
}
