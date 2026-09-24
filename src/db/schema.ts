import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Shared column helpers                                               */
/* ------------------------------------------------------------------ */

const id = () => text("id").primaryKey();
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () => ts("updated_at").notNull().defaultNow();
const workspaceId = () =>
  text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" });

export type ChecklistItem = { id: string; text: string; done: boolean };

export type WorkspaceSettings = {
  displayName?: string;
  role?: string;
  focus?: string[];
  creatorMode?: boolean;
  platforms?: string[];
  niche?: string;
  postsPerWeek?: number;
  peakTime?: "morning" | "afternoon" | "night" | "late";
  dayStart?: number; // hour 0-23
  dayEnd?: number;
  mainFocus?: string;
  timezone?: string;
  calibratedAt?: string;
};

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  avatarColor: text("avatar_color"),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256 of the cookie token — raw token never stored
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const workspaces = pgTable("workspaces", {
  id: id(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  settings: jsonb("settings").$type<WorkspaceSettings>().notNull().default({}),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ */
/* Second brain                                                        */
/* ------------------------------------------------------------------ */

export const projects = pgTable(
  "projects",
  {
    id: id(),
    workspaceId: workspaceId(),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull().default("active"), // active | paused | done | archived
    color: text("color"),
    emoji: text("emoji"),
    area: text("area"), // personal | work | content | ...
    dueAt: ts("due_at"),
    clientId: text("client_id"),
    goalId: text("goal_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("projects_ws_idx").on(t.workspaceId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: id(),
    workspaceId: workspaceId(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("todo"), // inbox | todo | doing | waiting | done
    priority: text("priority").notNull().default("none"), // none | low | medium | high | urgent
    dueAt: ts("due_at"),
    hasTime: boolean("has_time").notNull().default(false),
    category: text("category"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    checklist: jsonb("checklist").$type<ChecklistItem[]>().notNull().default([]),
    recurrence: text("recurrence"), // daily | weekly | monthly | null
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    clientId: text("client_id"),
    contentId: text("content_id"),
    campaignId: text("campaign_id"),
    goalId: text("goal_id"),
    dependsOn: jsonb("depends_on").$type<string[]>().notNull().default([]),
    position: doublePrecision("position").notNull().default(0),
    completedAt: ts("completed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("tasks_ws_idx").on(t.workspaceId),
    index("tasks_ws_status_idx").on(t.workspaceId, t.status),
    index("tasks_project_idx").on(t.projectId),
  ],
);

export const events = pgTable(
  "events",
  {
    id: id(),
    workspaceId: workspaceId(),
    title: text("title").notNull(),
    description: text("description"),
    startAt: ts("start_at").notNull(),
    endAt: ts("end_at"),
    allDay: boolean("all_day").notNull().default(false),
    kind: text("kind").notNull().default("appointment"), // meeting | appointment | recording | live | publish | deadline | personal
    location: text("location"),
    reminderMinutes: integer("reminder_minutes"),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    clientId: text("client_id"),
    contentId: text("content_id"),
    campaignId: text("campaign_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("events_ws_start_idx").on(t.workspaceId, t.startAt)],
);

export const goals = pgTable(
  "goals",
  {
    id: id(),
    workspaceId: workspaceId(),
    title: text("title").notNull(),
    horizon: text("horizon").notNull().default("month"), // day | week | month | quarter | year
    category: text("category").notNull().default("personal"), // personal | work | content | finance | health | learning | projects
    target: doublePrecision("target"),
    current: doublePrecision("current").notNull().default(0),
    unit: text("unit"),
    dueAt: ts("due_at"),
    status: text("status").notNull().default("active"), // active | done | dropped
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("goals_ws_idx").on(t.workspaceId)],
);

export const habits = pgTable(
  "habits",
  {
    id: id(),
    workspaceId: workspaceId(),
    title: text("title").notNull(),
    emoji: text("emoji"),
    timeOfDay: text("time_of_day"), // morning | afternoon | night | any
    daysOfWeek: jsonb("days_of_week").$type<number[]>().notNull().default([0, 1, 2, 3, 4, 5, 6]),
    log: jsonb("log").$type<string[]>().notNull().default([]), // yyyy-mm-dd
    archived: boolean("archived").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("habits_ws_idx").on(t.workspaceId)],
);

export const notes = pgTable(
  "notes",
  {
    id: id(),
    workspaceId: workspaceId(),
    title: text("title").notNull(),
    body: text("body"),
    kind: text("kind").notNull().default("note"), // note | link | reference | list | message
    url: text("url"),
    pinned: boolean("pinned").notNull().default(false),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    clientId: text("client_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("notes_ws_idx").on(t.workspaceId)],
);

export const captures = pgTable(
  "captures",
  {
    id: id(),
    workspaceId: workspaceId(),
    text: text("text").notNull(),
    source: text("source").notNull().default("text"), // text | voice | share
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    status: text("status").notNull().default("pending"), // pending | organized
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("captures_ws_idx").on(t.workspaceId, t.status)],
);

/* ------------------------------------------------------------------ */
/* Creator                                                             */
/* ------------------------------------------------------------------ */

export type ContentMetrics = {
  views?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  followers?: number;
};

export const ideas = pgTable(
  "ideas",
  {
    id: id(),
    workspaceId: workspaceId(),
    title: text("title").notNull(),
    hook: text("hook"),
    description: text("description"),
    platform: text("platform"),
    format: text("format"),
    category: text("category"),
    reference: text("reference"),
    potential: integer("potential").notNull().default(3), // 1-5
    status: text("status").notNull().default("raw"), // raw | developing | approved | used | discarded
    contentId: text("content_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("ideas_ws_idx").on(t.workspaceId)],
);

export const contents = pgTable(
  "contents",
  {
    id: id(),
    workspaceId: workspaceId(),
    title: text("title").notNull(),
    platform: text("platform"), // instagram | tiktok | youtube | shorts | reels | twitch | linkedin | other
    format: text("format"), // reel | short | video | post | carousel | story | live | thread
    stage: text("stage").notNull().default("idea"), // idea | script | recording | editing | review | scheduled | published | analyzed
    hook: text("hook"),
    script: text("script"),
    caption: text("caption"),
    scheduledAt: ts("scheduled_at"),
    publishedAt: ts("published_at"),
    url: text("url"),
    metrics: jsonb("metrics").$type<ContentMetrics>().notNull().default({}),
    ideaId: text("idea_id"),
    campaignId: text("campaign_id"),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    position: doublePrecision("position").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("contents_ws_idx").on(t.workspaceId)],
);

export type LiveMetrics = {
  peakViewers?: number;
  avgViewers?: number;
  newFollowers?: number;
  revenue?: number;
  durationMin?: number;
};

export const lives = pgTable(
  "lives",
  {
    id: id(),
    workspaceId: workspaceId(),
    title: text("title").notNull(),
    platform: text("platform"),
    startAt: ts("start_at"),
    durationMin: integer("duration_min").notNull().default(60),
    topic: text("topic"),
    agenda: text("agenda"),
    guests: text("guests"),
    goals: text("goals"),
    checklist: jsonb("checklist").$type<ChecklistItem[]>().notNull().default([]),
    metrics: jsonb("metrics").$type<LiveMetrics>().notNull().default({}),
    highlights: text("highlights"),
    status: text("status").notNull().default("planned"), // planned | live | done
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("lives_ws_idx").on(t.workspaceId)],
);

export const brands = pgTable(
  "brands",
  {
    id: id(),
    workspaceId: workspaceId(),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    website: text("website"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("brands_ws_idx").on(t.workspaceId)],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: id(),
    workspaceId: workspaceId(),
    title: text("title").notNull(),
    brandId: text("brand_id").references(() => brands.id, { onDelete: "set null" }),
    stage: text("stage").notNull().default("contact"), // contact | interested | proposal | negotiation | approved | production | delivery | payment | done | lost
    briefing: text("briefing"),
    deliverables: jsonb("deliverables").$type<ChecklistItem[]>().notNull().default([]),
    dueAt: ts("due_at"),
    value: doublePrecision("value"),
    contractUrl: text("contract_url"),
    approved: boolean("approved").notNull().default(false),
    paid: boolean("paid").notNull().default(false),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("campaigns_ws_idx").on(t.workspaceId)],
);

/* ------------------------------------------------------------------ */
/* Business                                                            */
/* ------------------------------------------------------------------ */

export const clients = pgTable(
  "clients",
  {
    id: id(),
    workspaceId: workspaceId(),
    name: text("name").notNull(),
    company: text("company"),
    email: text("email"),
    phone: text("phone"),
    kind: text("kind").notNull().default("lead"), // lead | client | brand | contact
    stage: text("stage").notNull().default("new"), // new | contacted | proposal | negotiation | won | lost
    value: doublePrecision("value"),
    nextFollowUpAt: ts("next_follow_up_at"),
    notes: text("notes"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("clients_ws_idx").on(t.workspaceId)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: id(),
    workspaceId: workspaceId(),
    kind: text("kind").notNull(), // income | expense
    title: text("title").notNull(),
    category: text("category").notNull().default("other"), // campaign | publi | product | service | affiliate | tools | team | taxes | other
    amount: doublePrecision("amount").notNull(),
    status: text("status").notNull().default("pending"), // pending | done
    dueAt: ts("due_at"),
    paidAt: ts("paid_at"),
    campaignId: text("campaign_id"),
    clientId: text("client_id"),
    projectId: text("project_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("transactions_ws_idx").on(t.workspaceId)],
);

/* ------------------------------------------------------------------ */
/* System                                                              */
/* ------------------------------------------------------------------ */

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    workspaceId: workspaceId(),
    title: text("title").notNull(),
    body: text("body"),
    kind: text("kind").notNull().default("info"),
    href: text("href"),
    dedupeKey: text("dedupe_key").notNull(),
    readAt: ts("read_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("notifications_dedupe_idx").on(t.workspaceId, t.dedupeKey)],
);

export const files = pgTable(
  "files",
  {
    id: id(),
    workspaceId: workspaceId(),
    name: text("name").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    storageKey: text("storage_key").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    createdAt: createdAt(),
  },
  (t) => [index("files_ws_idx").on(t.workspaceId)],
);

export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: id(),
    workspaceId: workspaceId(),
    title: text("title").notNull().default("Conversa"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("ai_conv_ws_idx").on(t.workspaceId)],
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: id(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // user | assistant
    content: text("content").notNull(),
    actions: jsonb("actions").$type<unknown[]>().notNull().default([]),
    createdAt: createdAt(),
  },
  (t) => [index("ai_msg_conv_idx").on(t.conversationId)],
);

export const aiActions = pgTable(
  "ai_actions",
  {
    id: id(),
    workspaceId: workspaceId(),
    conversationId: text("conversation_id"),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").notNull().default("executed"), // proposed | executed | cancelled | failed
    result: jsonb("result").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("ai_actions_ws_idx").on(t.workspaceId)],
);

export const activityLog = pgTable(
  "activity_log",
  {
    id: id(),
    workspaceId: workspaceId(),
    userId: text("user_id"),
    action: text("action").notNull(), // create | update | delete | complete | ai
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    summary: text("summary"),
    createdAt: createdAt(),
  },
  (t) => [index("activity_ws_idx").on(t.workspaceId, t.createdAt)],
);
