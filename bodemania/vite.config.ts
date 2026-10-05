import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * `npm run build`        → site normal em dist/ (para publicar na Vercel/Netlify).
 * `npm run build:single` → UM único arquivo HTML em dist-single/index.html,
 *                          com JS, CSS, fontes e imagens embutidos — abre direto
 *                          no navegador (computador ou celular), sem servidor.
 */
export default defineConfig(({ mode }) => {
  const single = mode === 'single'
  return {
    base: './',
    plugins: [react(), tailwindcss(), ...(single ? [viteSingleFile({ removeViteModuleLoader: true })] : [])],
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 800,
      outDir: single ? 'dist-single' : 'dist',
      assetsInlineLimit: single ? 100_000_000 : 4096,
    },
  }
})
