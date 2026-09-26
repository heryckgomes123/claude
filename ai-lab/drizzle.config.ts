import 'dotenv/config'
import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.local', override: true })

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
})
