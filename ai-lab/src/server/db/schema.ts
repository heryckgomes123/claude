/**
 * INTELRA AI LAB — schema do banco (PostgreSQL / Drizzle).
 *
 * Organização:
 * 1. Autenticação (tabelas exigidas pelo Better Auth)
 * 2. Acesso: planos, entitlements, memberships, códigos de acesso
 * 3. Taxonomia: categorias e tags
 * 4. Conteúdo: `content_item` é o supertipo de todo conteúdo publicável
 *    (prompt, workflow, ferramenta, referência, tutorial). Cada tipo tem uma
 *    tabela 1:1 com os campos específicos. Isso permite favoritos, histórico,
 *    tags, coleções, busca global e o grafo de relações com FKs reais.
 * 5. Espaço do usuário: favoritos, coleções, histórico, prompts próprios, experimentos
 * 6. Operação: novidades do Lab e rate limit
 */
import { sql, type SQL } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

export type KeyValue = { label: string; value: string }
export type Troubleshooting = { problem: string; solution: string }

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const contentTypeEnum = pgEnum('content_type', ['PROMPT', 'WORKFLOW', 'TOOL', 'REFERENCE', 'TUTORIAL'])
export const contentStatusEnum = pgEnum('content_status', ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'])
export const difficultyEnum = pgEnum('difficulty', ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'])
export const mediaTypeEnum = pgEnum('media_type', ['IMAGE', 'VIDEO', 'AUDIO', 'TEXT', 'THREE_D'])
export const pricingStatusEnum = pgEnum('pricing_status', ['FREE', 'FREEMIUM', 'PAID', 'TRIAL', 'UNKNOWN'])
export const verificationStatusEnum = pgEnum('verification_status', ['VERIFIED', 'NEEDS_REVIEW', 'OUTDATED'])
export const relationKindEnum = pgEnum('relation_kind', [
  'RELATED',
  'COMPATIBLE_TOOL',
  'REQUIRED_TOOL',
  'OPTIONAL_TOOL',
])
export const historyActionEnum = pgEnum('history_action', ['VIEW', 'COPY', 'VISIT'])
export const membershipStatusEnum = pgEnum('membership_status', [
  'ACTIVE',
  'TRIALING',
  'PAST_DUE',
  'CANCELED',
  'EXPIRED',
])
export const membershipSourceEnum = pgEnum('membership_source', ['MANUAL', 'ACCESS_CODE', 'SIGNUP_DEFAULT', 'EXTERNAL'])
export const categoryKindEnum = pgEnum('category_kind', ['CONTENT', 'TOOL'])
export const updateKindEnum = pgEnum('update_kind', ['NEW_CONTENT', 'FEATURE', 'ANNOUNCEMENT'])
export const publishStateEnum = pgEnum('publish_state', ['DRAFT', 'PUBLISHED'])

/* -------------------------------------------------------------------------- */
/* 1. Autenticação (Better Auth)                                              */
/* -------------------------------------------------------------------------- */

export const user = pgTable(
  'user',
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    /** Papel de acesso. Ver src/server/access/roles.ts para a matriz de permissões. */
    role: text().notNull().default('USER'),
    ...timestamps,
  },
  (t) => [check('user_role_check', sql`${t.role} in ('USER', 'ADMIN')`)],
)

export const session = pgTable(
  'session',
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (t) => [index('session_user_idx').on(t.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...timestamps,
  },
  (t) => [index('account_user_idx').on(t.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
)

/** Armazenamento de rate limit do Better Auth (persistente — funciona em serverless). */
export const rateLimit = pgTable('rate_limit', {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: 'number' }).notNull(),
})

/* -------------------------------------------------------------------------- */
/* 2. Acesso                                                                  */
/* -------------------------------------------------------------------------- */

export const plan = pgTable('plan', {
  id: uuid().primaryKey().defaultRandom(),
  /** FREE | PRO | LAB | ENTERPRISE — identificador estável usado por integrações. */
  code: text().notNull().unique(),
  name: text().notNull(),
  description: text(),
  isActive: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  ...timestamps,
})

export const planEntitlement = pgTable(
  'plan_entitlement',
  {
    planId: uuid()
      .notNull()
      .references(() => plan.id, { onDelete: 'cascade' }),
    /** Chave de entitlement. Ver src/server/access/entitlements.ts */
    key: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.planId, t.key] })],
)

export const membership = pgTable(
  'membership',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    planId: uuid()
      .notNull()
      .references(() => plan.id, { onDelete: 'restrict' }),
    status: membershipStatusEnum().notNull().default('ACTIVE'),
    source: membershipSourceEnum().notNull().default('MANUAL'),
    startsAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** null = sem data de término (acesso vitalício ou até cancelamento). */
    endsAt: timestamp({ withTimezone: true }),
    /** Referência externa (ex.: id da venda na plataforma de pagamento). */
    externalRef: text(),
    note: text(),
    ...timestamps,
  },
  (t) => [index('membership_user_idx').on(t.userId, t.status)],
)

export const accessCode = pgTable('access_code', {
  id: uuid().primaryKey().defaultRandom(),
  /** SHA-256 do código. O código em texto puro só é exibido na criação. */
  codeHash: text().notNull().unique(),
  codeHint: text().notNull(),
  planId: uuid()
    .notNull()
    .references(() => plan.id, { onDelete: 'restrict' }),
  /** Duração do acesso concedido em dias; null = sem término. */
  durationDays: integer(),
  maxRedemptions: integer().notNull().default(1),
  redemptionCount: integer().notNull().default(0),
  expiresAt: timestamp({ withTimezone: true }),
  disabledAt: timestamp({ withTimezone: true }),
  note: text(),
  createdById: text().references(() => user.id, { onDelete: 'set null' }),
  ...timestamps,
})

export const accessCodeRedemption = pgTable(
  'access_code_redemption',
  {
    codeId: uuid()
      .notNull()
      .references(() => accessCode.id, { onDelete: 'cascade' }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    redeemedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.codeId, t.userId] })],
)

/* -------------------------------------------------------------------------- */
/* 3. Taxonomia                                                               */
/* -------------------------------------------------------------------------- */

export const category = pgTable(
  'category',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** CONTENT = prompts, workflows, referências, tutoriais · TOOL = diretório de ferramentas */
    kind: categoryKindEnum().notNull().default('CONTENT'),
    slug: text().notNull(),
    name: text().notNull(),
    description: text(),
    /** Nome de ícone Lucide (ver src/components/lab/category-icon.tsx). */
    icon: text(),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex('category_kind_slug_uq').on(t.kind, t.slug)],
)

export const tag = pgTable('tag', {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

/* -------------------------------------------------------------------------- */
/* 4. Conteúdo                                                                */
/* -------------------------------------------------------------------------- */

export const contentItem = pgTable(
  'content_item',
  {
    id: uuid().primaryKey().defaultRandom(),
    type: contentTypeEnum().notNull(),
    slug: text().notNull(),
    title: text().notNull(),
    /** Descrição curta usada em cards e resultados de busca. */
    summary: text().notNull().default(''),
    /** Texto longo (o que é, quando usar). */
    description: text().notNull().default(''),
    coverImageUrl: text(),
    categoryId: uuid().references(() => category.id, { onDelete: 'set null' }),
    difficulty: difficultyEnum(),
    status: contentStatusEnum().notNull().default('DRAFT'),
    featured: boolean().notNull().default(false),
    /** Entitlement extra exigido para ver o conteúdo (conteúdo premium futuro). null = qualquer membro. */
    requiredEntitlement: text(),
    /** Texto auxiliar de busca mantido pela aplicação (tags, ferramentas, sinônimos). */
    searchKeywords: text().notNull().default(''),
    search: tsvector().generatedAlwaysAs(
      (): SQL => sql`
        setweight(to_tsvector('portuguese', intelra_unaccent(coalesce(title, ''))), 'A') ||
        setweight(to_tsvector('portuguese', intelra_unaccent(coalesce(search_keywords, ''))), 'A') ||
        setweight(to_tsvector('portuguese', intelra_unaccent(coalesce(summary, ''))), 'B') ||
        setweight(to_tsvector('portuguese', intelra_unaccent(coalesce(description, ''))), 'C')`,
    ),
    viewCount: integer().notNull().default(0),
    useCount: integer().notNull().default(0),
    favoriteCount: integer().notNull().default(0),
    publishedAt: timestamp({ withTimezone: true }),
    createdById: text().references(() => user.id, { onDelete: 'set null' }),
    updatedById: text().references(() => user.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('content_type_slug_uq').on(t.type, t.slug),
    index('content_listing_idx').on(t.type, t.status, t.publishedAt),
    index('content_category_idx').on(t.categoryId),
    index('content_search_idx').using('gin', t.search),
    index('content_title_trgm_idx').using('gin', sql`intelra_unaccent(${t.title}) gin_trgm_ops`),
  ],
)

export const prompt = pgTable('prompt', {
  contentId: uuid()
    .primaryKey()
    .references(() => contentItem.id, { onDelete: 'cascade' }),
  /** Texto do prompt. Variáveis no formato {{chave}}. */
  body: text().notNull(),
  negativePrompt: text(),
  mediaType: mediaTypeEnum().notNull().default('IMAGE'),
  aspectRatio: text(),
  parameters: jsonb().$type<KeyValue[]>().notNull().default([]),
  recommendedSettings: jsonb().$type<KeyValue[]>().notNull().default([]),
  expectedResult: text(),
  tips: jsonb().$type<string[]>().notNull().default([]),
  currentVersion: integer().notNull().default(1),
})

export const promptVersion = pgTable(
  'prompt_version',
  {
    id: uuid().primaryKey().defaultRandom(),
    promptId: uuid()
      .notNull()
      .references(() => prompt.contentId, { onDelete: 'cascade' }),
    version: integer().notNull(),
    body: text().notNull(),
    negativePrompt: text(),
    parameters: jsonb().$type<KeyValue[]>().notNull().default([]),
    changelog: text(),
    createdById: text().references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('prompt_version_uq').on(t.promptId, t.version)],
)

export const promptVariable = pgTable(
  'prompt_variable',
  {
    id: uuid().primaryKey().defaultRandom(),
    promptId: uuid()
      .notNull()
      .references(() => prompt.contentId, { onDelete: 'cascade' }),
    key: text().notNull(),
    label: text().notNull(),
    placeholder: text(),
    defaultValue: text(),
    description: text(),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [uniqueIndex('prompt_variable_uq').on(t.promptId, t.key)],
)

export const workflow = pgTable('workflow', {
  contentId: uuid()
    .primaryKey()
    .references(() => contentItem.id, { onDelete: 'cascade' }),
  objective: text().notNull().default(''),
  estimatedMinutes: integer(),
  inputs: jsonb().$type<string[]>().notNull().default([]),
  expectedOutput: text(),
  alternatives: jsonb().$type<string[]>().notNull().default([]),
  troubleshooting: jsonb().$type<Troubleshooting[]>().notNull().default([]),
})

export const workflowStep = pgTable(
  'workflow_step',
  {
    id: uuid().primaryKey().defaultRandom(),
    workflowId: uuid()
      .notNull()
      .references(() => workflow.contentId, { onDelete: 'cascade' }),
    position: integer().notNull(),
    title: text().notNull(),
    description: text().notNull().default(''),
    toolId: uuid().references(() => contentItem.id, { onDelete: 'set null' }),
    promptId: uuid().references(() => contentItem.id, { onDelete: 'set null' }),
    settings: text(),
    tip: text(),
  },
  (t) => [uniqueIndex('workflow_step_position_uq').on(t.workflowId, t.position)],
)

export const tool = pgTable('tool', {
  contentId: uuid()
    .primaryKey()
    .references(() => contentItem.id, { onDelete: 'cascade' }),
  websiteUrl: text(),
  logoUrl: text(),
  pricingStatus: pricingStatusEnum().notNull().default('UNKNOWN'),
  pricingNote: text(),
  primaryUse: text(),
  capabilities: jsonb().$type<string[]>().notNull().default([]),
  supportedMedia: mediaTypeEnum().array().notNull().default(sql`'{}'::media_type[]`),
  strengths: jsonb().$type<string[]>().notNull().default([]),
  limitations: jsonb().$type<string[]>().notNull().default([]),
  /** Informações de ferramentas mudam — sempre registrar quando foram verificadas. */
  verifiedAt: timestamp({ withTimezone: true }),
  verificationStatus: verificationStatusEnum().notNull().default('NEEDS_REVIEW'),
})

export const reference = pgTable('reference', {
  contentId: uuid()
    .primaryKey()
    .references(() => contentItem.id, { onDelete: 'cascade' }),
  sourceName: text(),
  sourceUrl: text(),
  style: text(),
  notes: text(),
  /** Paleta de cores (hex) da direção visual. */
  palette: jsonb().$type<string[]>().notNull().default([]),
  /** Proporção da peça (ex.: 4:5) — usada no layout em masonry. */
  aspectRatio: text(),
})

export const tutorial = pgTable('tutorial', {
  contentId: uuid()
    .primaryKey()
    .references(() => contentItem.id, { onDelete: 'cascade' }),
  objective: text().notNull().default(''),
  estimatedMinutes: integer(),
  prerequisites: jsonb().$type<string[]>().notNull().default([]),
  mistakes: jsonb().$type<string[]>().notNull().default([]),
  proTips: jsonb().$type<string[]>().notNull().default([]),
})

export const tutorialStep = pgTable(
  'tutorial_step',
  {
    id: uuid().primaryKey().defaultRandom(),
    tutorialId: uuid()
      .notNull()
      .references(() => tutorial.contentId, { onDelete: 'cascade' }),
    position: integer().notNull(),
    title: text().notNull(),
    body: text().notNull().default(''),
    promptId: uuid().references(() => contentItem.id, { onDelete: 'set null' }),
  },
  (t) => [uniqueIndex('tutorial_step_position_uq').on(t.tutorialId, t.position)],
)

export const contentTag = pgTable(
  'content_tag',
  {
    contentId: uuid()
      .notNull()
      .references(() => contentItem.id, { onDelete: 'cascade' }),
    tagId: uuid()
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.contentId, t.tagId] }), index('content_tag_tag_idx').on(t.tagId)],
)

/**
 * Grafo de conhecimento (relacional): Prompt ↔ Ferramenta ↔ Workflow ↔ Referência ↔ Tutorial.
 * RELATED é tratado como bidirecional nas consultas; os demais são direcionais (origem → ferramenta).
 */
export const contentRelation = pgTable(
  'content_relation',
  {
    fromId: uuid()
      .notNull()
      .references(() => contentItem.id, { onDelete: 'cascade' }),
    toId: uuid()
      .notNull()
      .references(() => contentItem.id, { onDelete: 'cascade' }),
    kind: relationKindEnum().notNull().default('RELATED'),
    sortOrder: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.fromId, t.toId, t.kind] }),
    index('content_relation_to_idx').on(t.toId, t.kind),
    check('content_relation_no_self', sql`${t.fromId} <> ${t.toId}`),
  ],
)

/* -------------------------------------------------------------------------- */
/* 5. Espaço do usuário                                                       */
/* -------------------------------------------------------------------------- */

/** Favorito unificado para qualquer tipo de conteúdo. PK composta impede duplicidade. */
export const favorite = pgTable(
  'favorite',
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    contentId: uuid()
      .notNull()
      .references(() => contentItem.id, { onDelete: 'cascade' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.contentId] }), index('favorite_user_idx').on(t.userId, t.createdAt)],
)

/** Prompts do próprio usuário: remixes, duplicatas e criações do Prompt Builder. Sempre privados. */
export const userPrompt = pgTable(
  'user_prompt',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    body: text().notNull(),
    negativePrompt: text(),
    notes: text(),
    sourceContentId: uuid().references(() => contentItem.id, { onDelete: 'set null' }),
    /** Campos do Prompt Builder, quando criado por ele. */
    builderState: jsonb().$type<Record<string, string>>(),
    isFavorite: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [index('user_prompt_user_idx').on(t.userId, t.updatedAt)],
)

export const collection = pgTable(
  'collection',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    description: text(),
    ...timestamps,
  },
  (t) => [uniqueIndex('collection_user_name_uq').on(t.userId, t.name)],
)

export const collectionItem = pgTable(
  'collection_item',
  {
    id: uuid().primaryKey().defaultRandom(),
    collectionId: uuid()
      .notNull()
      .references(() => collection.id, { onDelete: 'cascade' }),
    contentId: uuid().references(() => contentItem.id, { onDelete: 'cascade' }),
    userPromptId: uuid().references(() => userPrompt.id, { onDelete: 'cascade' }),
    addedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('collection_item_content_uq')
      .on(t.collectionId, t.contentId)
      .where(sql`${t.contentId} is not null`),
    uniqueIndex('collection_item_user_prompt_uq')
      .on(t.collectionId, t.userPromptId)
      .where(sql`${t.userPromptId} is not null`),
    check('collection_item_one_target', sql`num_nonnulls(${t.contentId}, ${t.userPromptId}) = 1`),
  ],
)

/** Histórico mínimo de uso — sem dados pessoais além do vínculo com o usuário. */
export const historyEvent = pgTable(
  'history_event',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    contentId: uuid()
      .notNull()
      .references(() => contentItem.id, { onDelete: 'cascade' }),
    action: historyActionEnum().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('history_user_idx').on(t.userId, t.createdAt), index('history_content_idx').on(t.contentId)],
)

export const experiment = pgTable(
  'experiment',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    objective: text().notNull().default(''),
    toolId: uuid().references(() => contentItem.id, { onDelete: 'set null' }),
    sourcePromptId: uuid().references(() => contentItem.id, { onDelete: 'set null' }),
    notes: text(),
    ...timestamps,
  },
  (t) => [index('experiment_user_idx').on(t.userId, t.updatedAt)],
)

/** Cada variante (A, B, C…) é uma tentativa comparável dentro do experimento. */
export const experimentVariant = pgTable(
  'experiment_variant',
  {
    id: uuid().primaryKey().defaultRandom(),
    experimentId: uuid()
      .notNull()
      .references(() => experiment.id, { onDelete: 'cascade' }),
    position: integer().notNull(),
    label: text().notNull(),
    prompt: text().notNull(),
    parameters: text(),
    observations: text(),
    result: text(),
    resultUrl: text(),
    score: integer(),
  },
  (t) => [
    uniqueIndex('experiment_variant_position_uq').on(t.experimentId, t.position),
    check('experiment_variant_score_range', sql`${t.score} is null or (${t.score} between 0 and 10)`),
  ],
)

/* -------------------------------------------------------------------------- */
/* 6. Operação                                                                */
/* -------------------------------------------------------------------------- */

export const labUpdate = pgTable(
  'lab_update',
  {
    id: uuid().primaryKey().defaultRandom(),
    title: text().notNull(),
    body: text().notNull().default(''),
    kind: updateKindEnum().notNull().default('ANNOUNCEMENT'),
    contentId: uuid().references(() => contentItem.id, { onDelete: 'set null' }),
    state: publishStateEnum().notNull().default('DRAFT'),
    publishedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('lab_update_published_idx').on(t.state, t.publishedAt)],
)

/** Rate limit das ações da aplicação (fora do Better Auth). Janela fixa, persistida no banco. */
export const appRateLimit = pgTable('app_rate_limit', {
  key: text().primaryKey(),
  count: integer().notNull().default(0),
  windowStart: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export type RelationKind = (typeof relationKindEnum.enumValues)[number]
