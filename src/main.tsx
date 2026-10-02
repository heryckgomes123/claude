import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'

// Nunca tocar dois vídeos ao mesmo tempo: ao iniciar um, os outros pausam.
document.addEventListener(
  'play',
  (event) => {
    document.querySelectorAll('video').forEach((video) => {
      if (video !== event.target && !video.paused) video.pause()
    })
  },
  true,
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
