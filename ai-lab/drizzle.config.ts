import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Precedência: variáveis reais do ambiente > .env.local > .env
config({ path: '.env.local' })
config({ path: '.env' })

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
})
