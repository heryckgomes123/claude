import { z } from "zod";

/**
 * Entity registry shared by client and server.
 * Every write that reaches the database is validated by these schemas —
 * whether it comes from the UI, quick capture, voice or the AI action system.
 */

const str = (max = 500) => z.string().trim().max(max);
const optStr = (max = 500) => str(max).nullish();
const date = z.coerce.date().nullish();
const idRef = z.string().uuid().nullish();
const checklist = z
  .array(z.object({ id: z.string().max(64), text: str(300), done: z.boolean() }))
  .max(100);
const tags = z.array(str(40)).max(30);

export const TASK_STATUS = ["inbox", "todo", "doing", "waiting", "done"] as const;
export const PRIORITY = ["none", "low", "medium", "high", "urgent"] as const;
export const EVENT_KIND = ["meeting", "appointment", "recording", "live", "publish", "deadline", "personal"] as const;
export const GOAL_HORIZON = ["day", "week", "month", "quarter", "year"] as const;
export const GOAL_CATEGORY = ["personal", "work", "content", "finance", "health", "learning", "projects"] as const;
export const PROJECT_STATUS = ["active", "paused", "done", "archived"] as const;
export const IDEA_STATUS = ["raw", "developing", "approved", "used", "discarded"] as const;
export const CONTENT_STAGE = [
  "idea",
  "script",
  "recording",
  "editing",
  "review",
  "scheduled",
  "published",
  "analyzed",
] as const;
export const PLATFORMS = ["instagram", "tiktok", "youtube", "shorts", "reels", "twitch", "linkedin", "kwai", "x", "other"] as const;
export const FORMATS = ["reel", "short", "video", "post", "carousel", "story", "live", "thread"] as const;
export const CAMPAIGN_STAGE = [
  "contact",
  "interested",
  "proposal",
  "negotiation",
  "approved",
  "production",
  "delivery",
  "payment",
  "done",
  "lost",
] as const;
export const CLIENT_KIND = ["lead", "client", "brand", "contact"] as const;
export const CLIENT_STAGE = ["new", "contacted", "proposal", "negotiation", "won", "lost"] as const;
export const TX_KIND = ["income", "expense"] as const;
export const TX_CATEGORY = [
  "campaign",
  "publi",
  "product",
  "service",
  "affiliate",
  "tools",
  "team",
  "taxes",
  "personal",
  "other",
] as const;
export const LIVE_STATUS = ["planned", "live", "done"] as const;

const metrics = z
  .object({
    views: z.number().min(0).optional(),
    reach: z.number().min(0).optional(),
    likes: z.number().min(0).optional(),
    comments: z.number().min(0).optional(),
    shares: z.number().min(0).optional(),
    saves: z.number().min(0).optional(),
    followers: z.number().optional(),
  })
  .strict();

const liveMetrics = z
  .object({
    peakViewers: z.number().min(0).optional(),
    avgViewers: z.number().min(0).optional(),
    newFollowers: z.number().optional(),
    revenue: z.number().min(0).optional(),
    durationMin: z.number().min(0).optional(),
  })
  .strict();

export const entitySchemas = {
  tasks: z.object({
    title: str(300).min(1),
    description: optStr(5000),
    status: z.enum(TASK_STATUS).optional(),
    priority: z.enum(PRIORITY).optional(),
    dueAt: date,
    hasTime: z.boolean().optional(),
    category: optStr(60),
    tags: tags.optional(),
    checklist: checklist.optional(),
    recurrence: z.enum(["daily", "weekly", "monthly"]).nullish(),
    projectId: idRef,
    clientId: idRef,
    contentId: idRef,
    campaignId: idRef,
    goalId: idRef,
    dependsOn: z.array(z.string().uuid()).max(20).optional(),
    position: z.number().optional(),
    completedAt: date,
  }),
  projects: z.object({
    name: str(200).min(1),
    description: optStr(5000),
    status: z.enum(PROJECT_STATUS).optional(),
    color: optStr(20),
    emoji: optStr(8),
    area: optStr(40),
    dueAt: date,
    clientId: idRef,
    goalId: idRef,
  }),
  events: z.object({
    title: str(300).min(1),
    description: optStr(5000),
    startAt: z.coerce.date(),
    endAt: date,
    allDay: z.boolean().optional(),
    kind: z.enum(EVENT_KIND).optional(),
    location: optStr(300),
    reminderMinutes: z.number().int().min(0).max(10080).nullish(),
    projectId: idRef,
    clientId: idRef,
    contentId: idRef,
    campaignId: idRef,
  }),
  goals: z.object({
    title: str(300).min(1),
    horizon: z.enum(GOAL_HORIZON).optional(),
    category: z.enum(GOAL_CATEGORY).optional(),
    target: z.number().nullish(),
    current: z.number().optional(),
    unit: optStr(30),
    dueAt: date,
    status: z.enum(["active", "done", "dropped"]).optional(),
  }),
  habits: z.object({
    title: str(200).min(1),
    emoji: optStr(8),
    timeOfDay: z.enum(["morning", "afternoon", "night", "any"]).nullish(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    log: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(3660).optional(),
    archived: z.boolean().optional(),
  }),
  notes: z.object({
    title: str(300).min(1),
    body: optStr(50_000),
    kind: z.enum(["note", "link", "reference", "list", "message"]).optional(),
    url: z.string().trim().url().max(2000).nullish().or(z.literal("")),
    pinned: z.boolean().optional(),
    tags: tags.optional(),
    projectId: idRef,
    clientId: idRef,
  }),
  captures: z.object({
    text: str(2000).min(1),
    source: z.enum(["text", "voice", "share"]).optional(),
    entityType: optStr(30),
    entityId: idRef,
    status: z.enum(["pending", "organized"]).optional(),
  }),
  ideas: z.object({
    title: str(300).min(1),
    hook: optStr(500),
    description: optStr(5000),
    platform: optStr(30),
    format: optStr(30),
    category: optStr(60),
    reference: optStr(2000),
    potential: z.number().int().min(1).max(5).optional(),
    status: z.enum(IDEA_STATUS).optional(),
    contentId: idRef,
  }),
  contents: z.object({
    title: str(300).min(1),
    platform: optStr(30),
    format: optStr(30),
    stage: z.enum(CONTENT_STAGE).optional(),
    hook: optStr(500),
    script: optStr(30_000),
    caption: optStr(5000),
    scheduledAt: date,
    publishedAt: date,
    url: optStr(2000),
    metrics: metrics.optional(),
    ideaId: idRef,
    campaignId: idRef,
    projectId: idRef,
    position: z.number().optional(),
  }),
  lives: z.object({
    title: str(300).min(1),
    platform: optStr(30),
    startAt: date,
    durationMin: z.number().int().min(5).max(1440).optional(),
    topic: optStr(500),
    agenda: optStr(10_000),
    guests: optStr(1000),
    goals: optStr(2000),
    checklist: checklist.optional(),
    metrics: liveMetrics.optional(),
    highlights: optStr(10_000),
    status: z.enum(LIVE_STATUS).optional(),
  }),
  brands: z.object({
    name: str(200).min(1),
    contactName: optStr(200),
    contactEmail: z.string().trim().email().max(200).nullish().or(z.literal("")),
    website: optStr(500),
    notes: optStr(5000),
  }),
  campaigns: z.object({
    title: str(300).min(1),
    brandId: idRef,
    stage: z.enum(CAMPAIGN_STAGE).optional(),
    briefing: optStr(20_000),
    deliverables: checklist.optional(),
    dueAt: date,
    value: z.number().min(0).nullish(),
    contractUrl: optStr(2000),
    approved: z.boolean().optional(),
    paid: z.boolean().optional(),
    notes: optStr(5000),
  }),
  clients: z.object({
    name: str(200).min(1),
    company: optStr(200),
    email: z.string().trim().email().max(200).nullish().or(z.literal("")),
    phone: optStr(40),
    kind: z.enum(CLIENT_KIND).optional(),
    stage: z.enum(CLIENT_STAGE).optional(),
    value: z.number().min(0).nullish(),
    nextFollowUpAt: date,
    notes: optStr(10_000),
    tags: tags.optional(),
  }),
  transactions: z.object({
    kind: z.enum(TX_KIND),
    title: str(300).min(1),
    category: z.enum(TX_CATEGORY).optional(),
    amount: z.number().min(0).max(1e10),
    status: z.enum(["pending", "done"]).optional(),
    dueAt: date,
    paidAt: date,
    campaignId: idRef,
    clientId: idRef,
    projectId: idRef,
  }),
} as const;

export type EntityName = keyof typeof entitySchemas;
export const ENTITY_NAMES = Object.keys(entitySchemas) as EntityName[];
export const isEntityName = (v: string): v is EntityName => v in entitySchemas;

/** Which foreign-key columns point to which entity (used for workspace-ownership checks). */
export const REFERENCES: Record<string, EntityName> = {
  projectId: "projects",
  clientId: "clients",
  contentId: "contents",
  campaignId: "campaigns",
  goalId: "goals",
  ideaId: "ideas",
  brandId: "brands",
};

/** Human labels (pt-BR). */
export const ENTITY_LABEL: Record<EntityName, string> = {
  tasks: "Tarefa",
  projects: "Projeto",
  events: "Evento",
  goals: "Meta",
  habits: "Hábito",
  notes: "Nota",
  captures: "Captura",
  ideas: "Ideia",
  contents: "Conteúdo",
  lives: "Live",
  brands: "Marca",
  campaigns: "Campanha",
  clients: "Cliente",
  transactions: "Lançamento",
};

export const LIVE_CHECKLIST_DEFAULT = [
  "Internet",
  "Câmera",
  "Microfone",
  "Iluminação",
  "Bateria",
  "Cenário",
  "Título",
  "Pauta",
  "CTA",
];
