/**
 * Pós-processa o build de arquivo único (dist-single/index.html):
 *  1. Bodemania-teste.html — o script vira <script> clássico no fim do <body>.
 *     Mais leitores/navegadores executam scripts clássicos do que módulos, inclusive
 *     abrindo o arquivo direto do disco (file://).
 *  2. dist-single/online.html — mesma página sem <html>/<head>/<body>, no formato
 *     usado para publicar a versão online de teste.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const html = readFileSync('dist-single/index.html', 'utf8')
const scripts = [...html.matchAll(/<script type="module"[^>]*>([\s\S]*?)<\/script>/g)]
if (scripts.length !== 1) throw new Error(`Esperava 1 script inline, achei ${scripts.length}`)
const code = scripts[0][1]
if (/\bimport\.meta\b|^\s*(import|export)\s/m.test(code)) throw new Error('O bundle usa recursos de módulo — não dá para virar script clássico.')

const classic = `<script>\n(function(){\n${code}\n})();\n</script>`
const withoutModule = html.replace(scripts[0][0], '')
const standalone = withoutModule.replace('</body>', () => `${classic}\n</body>`)
writeFileSync('Bodemania-teste.html', standalone)

const online = standalone
  .replace(/<!doctype html>/i, '')
  .replace(/<\/?html[^>]*>/gi, '')
  .replace(/<\/?head>/gi, '')
  .replace(/<\/?body>/gi, '')
  .replace(/<meta (charset|name="viewport")[^>]*>/gi, '')
  .replace(/<title>[^<]*<\/title>/, '<title>Bodemania</title>')
  .trim()
writeFileSync('dist-single/online.html', online)
console.log(`Bodemania-teste.html: ${(standalone.length / 1024).toFixed(0)} KB · online.html: ${(online.length / 1024).toFixed(0)} KB`)
