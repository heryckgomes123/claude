import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../src/server/db/schema'

config({ path: '.env' })
config({ path: '.env.local', override: true })

export function connect() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('✖ DATABASE_URL não definida (.env.local ou variável de ambiente).')
    process.exit(1)
  }
  const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} })
  const db = drizzle(client, { schema, casing: 'snake_case' })
  return { db, close: () => client.end() }
}
