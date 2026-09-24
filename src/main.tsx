import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'

/**
 * VITE_TARGET=preview → build de pré-visualização hospedada (link de teste):
 * sem service worker e com fontes carregadas pelo Google Fonts (ver scripts/build-preview.mjs).
 */
const isPreview = import.meta.env.VITE_TARGET === 'preview'

if (!isPreview) {
  import('@fontsource-variable/archivo/wdth.css')
  import('@fontsource-variable/inter')
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
