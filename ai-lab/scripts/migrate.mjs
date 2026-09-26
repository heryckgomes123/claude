/**
 * Aplica as migrações SQL de ./drizzle no banco de DATABASE_URL.
 * Usado localmente (`npm run db:migrate`) e no build da Netlify (`npm run build:netlify`).
 */
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

config({ path: '.env' })
config({ path: '.env.local', override: true })

const url = process.env.DATABASE_URL
if (!url) {
  console.error('\n✖ DATABASE_URL não está definida. Configure-a nas variáveis de ambiente (Netlify → Site configuration → Environment variables).\n')
  process.exit(1)
}

const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} })
try {
  await migrate(drizzle(client), { migrationsFolder: './drizzle' })
  console.log('✓ Migrações aplicadas')
} catch (error) {
  console.error('✖ Falha ao aplicar migrações:', error.message ?? error)
  process.exitCode = 1
} finally {
  await client.end()
}
