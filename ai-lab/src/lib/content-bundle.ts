import { z } from 'zod'
import { DIFFICULTIES, MEDIA_TYPES, PRICING_STATUSES, VERIFICATION_STATUSES } from './labels'

/**
 * Formato de ingestão de conteúdo (seed e importação em massa via JSON).
 * O time de conteúdo adiciona itens em /content ou num arquivo JSON e roda
 * `npm run db:seed` ou `npm run content:import -- arquivo.json`. Nenhuma alteração de UI é necessária.
 *
 * Referências entre itens usam slugs: ferramentas por slug; relacionados como "TIPO:slug"
 * (ex.: "WORKFLOW:foto-de-produto-para-video-comercial").
 */

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug inválido')
const keyValue = z.object({ label: z.string().min(1), value: z.string().min(1) })
const ref = z.string().regex(/^(PROMPT|WORKFLOW|TOOL|REFERENCE|TUTORIAL):[a-z0-9-]+$/, 'use TIPO:slug')

const base = z.object({
  slug,
  title: z.string().min(2).max(160),
  summary: z.string().max(400).default(''),
  description: z.string().max(8000).default(''),
  category: slug.optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  tags: z.array(z.string().min(1).max(40)).default([]),
  featured: z.boolean().default(false),
  status: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
  coverImageUrl: z.url().optional(),
  related: z.array(ref).default([]),
})

export const promptSeedSchema = base.extend({
  body: z.string().min(10),
  negativePrompt: z.string().optional(),
  mediaType: z.enum(MEDIA_TYPES).default('IMAGE'),
  aspectRatio: z.string().max(20).optional(),
  parameters: z.array(keyValue).default([]),
  recommendedSettings: z.array(keyValue).default([]),
  expectedResult: z.string().optional(),
  tips: z.array(z.string()).default([]),
  variables: z
    .array(
      z.object({
        key: z.string().regex(/^[a-zA-Z0-9_-]+$/),
        label: z.string(),
        placeholder: z.string().optional(),
        defaultValue: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .default([]),
  tools: z.array(slug).default([]),
})

export const workflowSeedSchema = base.extend({
  objective: z.string().default(''),
  estimatedMinutes: z.number().int().positive().optional(),
  inputs: z.array(z.string()).default([]),
  expectedOutput: z.string().optional(),
  alternatives: z.array(z.string()).default([]),
  troubleshooting: z.array(z.object({ problem: z.string(), solution: z.string() })).default([]),
  requiredTools: z.array(slug).default([]),
  optionalTools: z.array(slug).default([]),
  steps: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().default(''),
        tool: slug.optional(),
        prompt: slug.optional(),
        settings: z.string().optional(),
        tip: z.string().optional(),
      }),
    )
    .min(1),
})

export const toolSeedSchema = base.extend({
  websiteUrl: z.url().optional(),
  logoUrl: z.url().optional(),
  pricingStatus: z.enum(PRICING_STATUSES).default('UNKNOWN'),
  pricingNote: z.string().optional(),
  primaryUse: z.string().optional(),
  capabilities: z.array(z.string()).default([]),
  supportedMedia: z.array(z.enum(MEDIA_TYPES)).default([]),
  strengths: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([]),
  verificationStatus: z.enum(VERIFICATION_STATUSES).default('NEEDS_REVIEW'),
  verifiedAt: z.iso.datetime().optional(),
})

export const referenceSeedSchema = base.extend({
  sourceName: z.string().optional(),
  sourceUrl: z.url().optional(),
  style: z.string().optional(),
  notes: z.string().optional(),
  palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).default([]),
  aspectRatio: z.string().optional(),
  tools: z.array(slug).default([]),
})

export const tutorialSeedSchema = base.extend({
  objective: z.string().default(''),
  estimatedMinutes: z.number().int().positive().optional(),
  prerequisites: z.array(z.string()).default([]),
  mistakes: z.array(z.string()).default([]),
  proTips: z.array(z.string()).default([]),
  tools: z.array(slug).default([]),
  steps: z.array(z.object({ title: z.string(), body: z.string().default(''), prompt: slug.optional() })).min(1),
})

export const categorySeedSchema = z.object({
  kind: z.enum(['CONTENT', 'TOOL']).default('CONTENT'),
  slug,
  name: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
})

export const contentBundleSchema = z.object({
  categories: z.array(categorySeedSchema).default([]),
  tools: z.array(toolSeedSchema).default([]),
  prompts: z.array(promptSeedSchema).default([]),
  workflows: z.array(workflowSeedSchema).default([]),
  references: z.array(referenceSeedSchema).default([]),
  tutorials: z.array(tutorialSeedSchema).default([]),
})

export type ContentBundleInput = z.input<typeof contentBundleSchema>
export type ContentBundle = z.output<typeof contentBundleSchema>
