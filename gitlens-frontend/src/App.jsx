import { useState, useEffect } from 'react'
import SpaceIntro      from './components/SpaceIntro.jsx'
import Landing         from './components/Landing.jsx'
import Dashboard       from './components/Dashboard.jsx'
import Home            from './components/Home.jsx'
import SpaceBackground from './components/SpaceBackground.jsx'
import { getStoredAuth, setStoredAuth, clearStoredAuth, verifyToken } from './utils/authApi.js'

export default function App() {
  const [stage,    setStage]    = useState('intro')
  const [repoData, setRepoData] = useState(null)
  const [auth,     setAuth]     = useState(null)

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
    setStage('home')  // ← go to home after login
  }

  const handleLogout = () => {
    clearStoredAuth()
    setAuth(null)
    setStage('landing')
  }

  const handleEnter = () => {
    // After intro — go to home if logged in, else landing
    if (auth) setStage('home')
    else setStage('landing')
  }

  const handleAnalyze = (data) => {
    setRepoData(data)
    setStage('dashboard')
  }

  const handleReset = () => {
    setRepoData(null)
    // Go back to home if logged in, else landing
    if (auth) setStage('home')
    else setStage('landing')
  }

  // When auth changes and we're on landing, switch to home
  useEffect(() => {
    if (auth && stage === 'landing') setStage('home')
    if (!auth && stage === 'home') setStage('landing')
  }, [auth])

  if (stage === 'intro') {
    return <SpaceIntro onEnter={handleEnter} />
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020617', position: 'relative' }}>
      <SpaceBackground />

      {/* Guest landing */}
      {stage === 'landing' && (
        <Landing
          onAnalyze={handleAnalyze}
          auth={auth}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      )}

      {/* Logged-in home */}
      {stage === 'home' && auth && (
        <Home
          auth={auth}
          onAnalyze={handleAnalyze}
          onLogout={handleLogout}
        />
      )}

      {/* Dashboard */}
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
