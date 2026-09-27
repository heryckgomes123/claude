/**
 * INTELRA AI LAB — schema do banco (PostgreSQL / Drizzle).
 *
 * Área de membros simples:
 * 1. Autenticação (tabelas exigidas pelo Better Auth)
 * 2. Acesso: liberações por e-mail (compra na Hotmart/Kiwify ou manual) e log de webhooks
 * 3. Conteúdo: prompts, aulas e ferramentas (o professor cadastra pelo painel)
 * 4. Aluno: favoritos e progresso nas aulas
 * 5. Operação: configurações, imagens e rate limit
 */
import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea'
  },
})

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

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
    /** Papel de acesso. Ver src/server/access/roles.ts. */
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

export const GRANT_SOURCES = ['MANUAL', 'HOTMART', 'KIWIFY'] as const
export type GrantSource = (typeof GRANT_SOURCES)[number]

/**
 * Liberação de acesso por e-mail. Quem compra recebe uma liberação com o e-mail da compra;
 * ao criar a conta (ou entrar) com esse e-mail, a área de membros abre automaticamente.
 * Reembolso/chargeback/cancelamento mudam o status para REVOKED.
 */
export const accessGrant = pgTable(
  'access_grant',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Sempre minúsculo e sem espaços (ver normalizeEmail). */
    email: text().notNull(),
    name: text(),
    status: text().notNull().default('ACTIVE'),
    source: text().notNull().default('MANUAL'),
    /** Id da venda/pedido na plataforma — garante idempotência dos webhooks. */
    externalRef: text(),
    product: text(),
    note: text(),
    /** null = acesso sem data de término. */
    expiresAt: timestamp({ withTimezone: true }),
    revokedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('access_grant_email_idx').on(t.email),
    uniqueIndex('access_grant_source_ref_idx').on(t.source, t.externalRef),
    check('access_grant_status_check', sql`${t.status} in ('ACTIVE', 'REVOKED')`),
    check('access_grant_source_check', sql`${t.source} in ('MANUAL', 'HOTMART', 'KIWIFY')`),
  ],
)

/** Registro de cada webhook recebido (sem dados sensíveis do comprador além de nome e e-mail). */
export const webhookEvent = pgTable(
  'webhook_event',
  {
    id: uuid().primaryKey().defaultRandom(),
    provider: text().notNull(),
    /** Id do evento na plataforma, quando existe — evita processar reenvios duas vezes. */
    eventId: text(),
    eventType: text().notNull(),
    email: text(),
    externalRef: text(),
    product: text(),
    /** GRANTED | REVOKED | IGNORED | REJECTED | DUPLICATE | ERROR */
    outcome: text().notNull(),
    detail: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('webhook_event_created_idx').on(t.createdAt),
    uniqueIndex('webhook_event_provider_event_idx').on(t.provider, t.eventId),
  ],
)

/* -------------------------------------------------------------------------- */
/* 3. Conteúdo                                                                */
/* -------------------------------------------------------------------------- */

/** Imagens enviadas pelo painel (exemplos de resultado dos prompts). Guardadas no próprio Postgres. */
export const media = pgTable('media', {
  id: uuid().primaryKey().defaultRandom(),
  contentType: text().notNull(),
  size: integer().notNull(),
  data: bytea().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const prompt = pgTable(
  'prompt',
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    title: text().notNull(),
    category: text().notNull(),
    description: text().notNull().default(''),
    /** Texto do prompt. Campos editáveis: {{chave}} ou {{chave|valor padrão}}. */
    body: text().notNull(),
    negative: text(),
    tips: jsonb().$type<string[]>().notNull().default([]),
    /** Onde usar (texto livre, ex.: "Midjourney · ChatGPT"). */
    tools: text(),
    imageId: uuid().references(() => media.id, { onDelete: 'set null' }),
    published: boolean().notNull().default(true),
    position: integer().notNull().default(0),
    copyCount: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [index('prompt_list_idx').on(t.published, t.category, t.position)],
)

export const lesson = pgTable(
  'lesson',
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    module: text().notNull(),
    title: text().notNull(),
    summary: text().notNull().default(''),
    /** Link do YouTube, Vimeo, Panda ou arquivo de vídeo (https). */
    videoUrl: text(),
    /** Texto da aula. Linhas com "## " viram títulos; linhas com "• " ou "- " viram listas. */
    content: text().notNull().default(''),
    materialUrl: text(),
    durationMin: integer(),
    published: boolean().notNull().default(true),
    position: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [index('lesson_list_idx').on(t.published, t.position)],
)

export const lessonPrompt = pgTable(
  'lesson_prompt',
  {
    lessonId: uuid()
      .notNull()
      .references(() => lesson.id, { onDelete: 'cascade' }),
    promptId: uuid()
      .notNull()
      .references(() => prompt.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.lessonId, t.promptId] }), index('lesson_prompt_prompt_idx').on(t.promptId)],
)

export const tool = pgTable(
  'tool',
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    category: text().notNull(),
    description: text().notNull().default(''),
    url: text().notNull(),
    /** Dica curta de como usar a ferramenta no método. */
    howTo: text(),
    published: boolean().notNull().default(true),
    position: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [index('tool_list_idx').on(t.published, t.position)],
)

/* -------------------------------------------------------------------------- */
/* 4. Aluno                                                                   */
/* -------------------------------------------------------------------------- */

export const favorite = pgTable(
  'favorite',
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    promptId: uuid()
      .notNull()
      .references(() => prompt.id, { onDelete: 'cascade' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.promptId] })],
)

export const lessonProgress = pgTable(
  'lesson_progress',
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    lessonId: uuid()
      .notNull()
      .references(() => lesson.id, { onDelete: 'cascade' }),
    completedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
)

/* -------------------------------------------------------------------------- */
/* 5. Operação                                                                */
/* -------------------------------------------------------------------------- */

/** Configurações editáveis pelo painel (ex.: link de checkout, contato de suporte). */
export const setting = pgTable('setting', {
  key: text().primaryKey(),
  value: text().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

/** Rate limit das ações da aplicação (fora do Better Auth). Janela fixa, persistida no banco. */
export const appRateLimit = pgTable('app_rate_limit', {
  key: text().primaryKey(),
  count: integer().notNull().default(0),
  windowStart: timestamp({ withTimezone: true }).notNull().defaultNow(),
})
