import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * npm run build         → site de produção em dist/ (Vercel). URLs limpas (/loja), base "/".
 * npm run build:single  → UM arquivo HTML em dist-single/ para testes (modo demonstração, rotas #/…).
 *                          Lê as variáveis de .env.single (sem banco de dados).
 */
export default defineConfig(({ mode }) => {
  const single = mode === 'single'
  return {
    base: single ? './' : '/',
    plugins: [react(), tailwindcss(), ...(single ? [viteSingleFile({ removeViteModuleLoader: true })] : [])],
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 900,
      outDir: single ? 'dist-single' : 'dist',
      assetsInlineLimit: single ? 100_000_000 : 4096,
    },
    test: { include: ['tests/**/*.test.ts'], testTimeout: 30_000, fileParallelism: false },
  }
})
