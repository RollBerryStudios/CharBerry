import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

function applyTitlebarGutter() {
  const dpr = window.devicePixelRatio || 1
  const width = Math.round(176 * dpr) + 48
  document.documentElement.style.setProperty('--titlebar-controls-w', `${width}px`)
}

if (!/Mac/i.test(navigator.platform)) {
  applyTitlebarGutter()
  window.addEventListener('resize', applyTitlebarGutter)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
