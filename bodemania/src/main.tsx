import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { api } from './api'
import App from './App'
import { initAnalytics } from './lib/analytics'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// carrega sessão e catálogo (a interface já aparece com esqueletos de carregamento)
void api.init().catch((e) => console.error('[init]', e))
initAnalytics()

// Remove a tela de carregamento assim que a aplicação monta
requestAnimationFrame(() => {
  const loader = document.getElementById('boot')
  if (!loader) return
  loader.dataset.state = 'done'
  window.setTimeout(() => loader.remove(), 500)
})
