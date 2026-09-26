import { z } from 'zod'

/** Schemas de entrada compartilhados entre formulários e server actions. */

export const trimmed = (max: number) => z.string().trim().max(max, `Máximo de ${max} caracteres`)
export const requiredText = (max: number, label = 'Campo') =>
  z.string().trim().min(1, `${label} é obrigatório`).max(max, `Máximo de ${max} caracteres`)

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres`)
    .optional()
    .transform((v) => (v ? v : null))

export const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^https?:\/\//i.test(v), 'Use uma URL completa (https://…)')
  .refine((v) => {
    if (v === null) return true
    try {
      new URL(v)
      return true
    } catch {
      return false
    }
  }, 'URL inválida')

export const uuid = z.uuid('Identificador inválido')

export const slugSchema = z
  .string()
  .trim()
  .min(2, 'Slug muito curto')
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas letras minúsculas, números e hífens')

export const collectionSchema = z.object({
  name: requiredText(80, 'Nome'),
  description: optionalText(280),
})

export const userPromptSchema = z.object({
  title: requiredText(140, 'Título'),
  body: requiredText(8000, 'Prompt'),
  negativePrompt: optionalText(2000),
  notes: optionalText(4000),
})

export const accessCodeInputSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(6, 'Código inválido')
  .max(64, 'Código inválido')
  .regex(/^[A-Z0-9-]+$/, 'Código inválido')
