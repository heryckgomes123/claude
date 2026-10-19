import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// O construtor (React Flow) e o SDK do Claude são carregados sob demanda, em chunks próprios.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
  },
})
