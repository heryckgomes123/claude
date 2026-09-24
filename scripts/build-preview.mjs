/**
 * Gera dist-preview/app.html: build do app para pré-visualização hospedada
 * (link privado para testar no celular). O host envolve a página no próprio
 * <html>/<head>/<body>, então extraímos só o conteúdo.
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'

execSync('npx tsc -b && npx vite build --outDir dist-preview --emptyOutDir', {
  stdio: 'inherit',
  env: { ...process.env, VITE_TARGET: 'preview' },
})

const html = fs.readFileSync('dist-preview/index.html', 'utf8')
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1]
const keep = head
  .split('\n')
  .filter((l) => /<title>|<script|<link rel="(stylesheet|modulepreload)"/.test(l))
  .join('\n')

const page = `<title>LIFT FITNESS</title>
<meta name="theme-color" content="#07090d">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Inter:wght@100..900&display=swap">
<style>
  /* Nomes usados pelos tokens do app (Fontsource) → faces do Google Fonts */
  :root { --font-display: 'Archivo', system-ui, sans-serif; --font-sans: 'Inter', system-ui, -apple-system, sans-serif; color-scheme: dark; }
  html, body { background: #07090d; }
  /* o host já recua o conteúdo pelas áreas seguras do topo */
  :root { --safe-top: 0px; }
</style>
${keep.replace(/<title>.*<\/title>\n?/, '')}
${body.trim()}
`
fs.writeFileSync('dist-preview/app.html', page)
console.log('dist-preview/app.html pronto')
