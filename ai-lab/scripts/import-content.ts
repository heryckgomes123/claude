/**
 * Importação em massa de conteúdo a partir de um JSON no formato de src/lib/content-bundle.ts.
 *   npm run content:import -- caminho/arquivo.json [--update] [--dry-run]
 */
import { readFile } from 'node:fs/promises'
import { contentBundleSchema } from '../src/lib/content-bundle'
import { ingestContent } from '../src/server/content-ingest'
import { connect } from './_db'

async function main() {
  const file = process.argv.slice(2).find((a) => !a.startsWith('--'))
  if (!file) {
    console.error('Uso: npm run content:import -- arquivo.json [--update] [--dry-run]')
    process.exit(1)
  }
  const parsed = contentBundleSchema.safeParse(JSON.parse(await readFile(file, 'utf8')))
  if (!parsed.success) {
    console.error('✖ Arquivo inválido:')
    for (const issue of parsed.error.issues.slice(0, 30)) console.error(`  • ${issue.path.join('.')}: ${issue.message}`)
    process.exit(1)
  }
  const b = parsed.data
  console.log(
    `Arquivo válido: ${b.prompts.length} prompts, ${b.workflows.length} workflows, ${b.tools.length} ferramentas, ${b.references.length} referências, ${b.tutorials.length} tutoriais.`,
  )
  if (process.argv.includes('--dry-run')) return

  const { db, close } = connect()
  try {
    const report = await ingestContent(db, b, { update: process.argv.includes('--update'), log: console.log })
    console.log(`✓ ${report.created} criados, ${report.updated} atualizados, ${report.skipped} mantidos`)
    for (const w of report.warnings) console.warn(`  ⚠ ${w}`)
  } finally {
    await close()
  }
}

main().catch((error) => {
  console.error('✖ Importação falhou:', error)
  process.exit(1)
})
