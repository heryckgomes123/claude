import 'server-only'
import { z } from 'zod'
import { AccessError } from '../auth/viewer'

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message }
}

export function fail(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, fieldErrors }
}

export function fromZod(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form'
    if (!fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fail('Revise os campos destacados.', fieldErrors)
}

/** Converte erros esperados em respostas amigáveis; erros inesperados são registrados e mascarados. */
export function handleActionError(error: unknown): ActionResult<never> {
  if (error instanceof AccessError) return fail(error.message)
  if (error instanceof z.ZodError) return fromZod(error)
  if (isUniqueViolation(error)) return fail('Já existe um registro com esses dados.')
  console.error('[action]', error)
  return fail('Não foi possível concluir agora. Tente novamente em instantes.')
}

export function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string; cause?: { code?: string } })?.code ?? (error as { cause?: { code?: string } })?.cause?.code
  return code === '23505'
}
