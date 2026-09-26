import { randomBytes } from 'node:crypto'

export const E2E_DB = process.env.E2E_DATABASE_URL ?? 'postgres://intelra:intelra@localhost:5432/intelra_lab_e2e'
export const ADMIN = { email: 'admin@e2e.intelra.test', password: 'E2E-Admin-Password-2026' }
export const MEMBER = { email: 'membro@e2e.intelra.test', password: 'E2E-Member-Password-2026', name: 'Membro Teste' }
export const OTHER = { email: 'outro@e2e.intelra.test', password: 'E2E-Other-Password-2026', name: 'Outro Membro' }
export const STATE = { admin: 'tests/e2e/.auth/admin.json', member: 'tests/e2e/.auth/member.json' }

export const uniqueEmail = (prefix: string) => `${prefix}-${randomBytes(4).toString('hex')}@e2e.intelra.test`
