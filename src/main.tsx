import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Remove a tela de carregamento assim que a aplicação monta
requestAnimationFrame(() => {
  const loader = document.getElementById('boot')
  if (!loader) return
  loader.dataset.state = 'done'
  window.setTimeout(() => loader.remove(), 700)
})
