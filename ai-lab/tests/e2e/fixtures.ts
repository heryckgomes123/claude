import { randomBytes } from 'node:crypto'

export const E2E_DB = process.env.E2E_DATABASE_URL ?? 'postgres://intelra:intelra@localhost:5432/intelra_lab_e2e'
export const ADMIN = { email: 'professor@e2e.intelra.test', password: 'E2E-Admin-Password-2026' }
export const MEMBER = { email: 'aluno@e2e.intelra.test', password: 'E2E-Member-Password-2026', name: 'Aluno Teste' }
export const STATE = { admin: 'tests/e2e/.auth/admin.json', member: 'tests/e2e/.auth/member.json' }
export const HOTTOK = 'e2e-hottok'
export const KIWIFY_TOKEN = 'e2e-kiwify-token'

export const uniqueEmail = (prefix: string) => `${prefix}-${randomBytes(4).toString('hex')}@e2e.intelra.test`
