/**
 * AuthService — contrato de autenticação da LIFT.
 *
 * ⚠️ Ainda NÃO existe autenticação real. A tela de login exibe o formulário,
 * mas não valida credenciais: o aluno pode entrar explicitamente no
 * "modo demonstração". Nenhuma senha é armazenada ou enviada.
 *
 * Integração futura (sugestão): Supabase Auth, Auth0, Firebase Auth ou backend
 * próprio com sessões httpOnly. Rotas /admin devem exigir papel "admin"
 * validado NO SERVIDOR.
 */
import type { User } from '@/types/models'

export interface AuthProvider {
  readonly available: boolean
  signIn(email: string, password: string): Promise<User>
  signUp(email: string, password: string, name: string): Promise<User>
  requestPasswordReset(email: string): Promise<void>
  signOut(): Promise<void>
}

export class AuthNotConfiguredError extends Error {
  constructor() {
    super('Autenticação ainda não conectada. Use o modo demonstração.')
  }
}

const notConfigured: AuthProvider = {
  available: false,
  signIn: async () => {
    throw new AuthNotConfiguredError()
  },
  signUp: async () => {
    throw new AuthNotConfiguredError()
  },
  requestPasswordReset: async () => {
    throw new AuthNotConfiguredError()
  },
  signOut: async () => {},
}

export const AuthService: AuthProvider = notConfigured
