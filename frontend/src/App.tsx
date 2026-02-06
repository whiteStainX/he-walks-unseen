import { useEffect } from 'react'

import { GameShell } from './app/GameShell'
import { applyThemeCssVars, minimalMonoTheme } from './render/theme'
import './App.css'

function App() {
  useEffect(() => {
    applyThemeCssVars(minimalMonoTheme)
  }, [])

  return <GameShell />
}

export default App
