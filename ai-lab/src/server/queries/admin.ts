import 'server-only'
import { and, asc, count, desc, eq, ilike, inArray, isNull, lt, or, sql, type SQL } from 'drizzle-orm'
import type { ContentStatus, ContentType } from '@/lib/labels'
import { db } from '../db'
import {
  accessCode,
  category,
  contentItem,
  contentRelation,
  contentTag,
  labUpdate,
  membership,
  plan,
  planEntitlement,
  prompt,
  promptVariable,
  promptVersion,
  reference,
  tag,
  tool,
  tutorial,
  tutorialStep,
  user,
  workflow,
  workflowStep,
} from '../db/schema'
import { activeMembershipWhere } from '../access/memberships'

export const ADMIN_PAGE_SIZE = 30

export async function getAdminOverview() {
  const [byTypeStatus, tools, members, recent] = await Promise.all([
    db
      .select({ type: contentItem.type, status: contentItem.status, count: count() })
      .from(contentItem)
      .groupBy(contentItem.type, contentItem.status),
    db
      .select({ id: contentItem.id, title: contentItem.title, status: tool.verificationStatus, verifiedAt: tool.verifiedAt })
      .from(tool)
      .innerJoin(contentItem, eq(contentItem.id, tool.contentId))
      .where(
        and(
          inArray(contentItem.status, ['PUBLISHED', 'REVIEW']),
          or(
            inArray(tool.verificationStatus, ['NEEDS_REVIEW', 'OUTDATED']),
            isNull(tool.verifiedAt),
            lt(tool.verifiedAt, sql`now() - interval '90 days'`),
          ),
        ),
      )
      .orderBy(asc(contentItem.title))
      .limit(20),
    db
      .select({
        users: sql<number>`(select count(*)::int from "user")`,
        active: sql<number>`(select count(distinct m.user_id)::int from membership m where m.status in ('ACTIVE','TRIALING') and m.starts_at <= now() and (m.ends_at is null or m.ends_at > now()))`,
      })
      .from(sql`(select 1) as one`),
    db
      .select({ id: contentItem.id, type: contentItem.type, title: contentItem.title, status: contentItem.status, updatedAt: contentItem.updatedAt })
      .from(contentItem)
      .orderBy(desc(contentItem.updatedAt))
      .limit(8),
  ])
  const review = await db
    .select({ id: contentItem.id, type: contentItem.type, title: contentItem.title, updatedAt: contentItem.updatedAt })
    .from(contentItem)
    .where(eq(contentItem.status, 'REVIEW'))
    .orderBy(desc(contentItem.updatedAt))
    .limit(10)
  return { byTypeStatus, toolsToVerify: tools, members: members[0], recent, review }
}

export async function listAdminContent(params: {
  type?: ContentType
  status?: ContentStatus
  q?: string
  page?: number
}) {
  const page = Math.max(1, params.page ?? 1)
  const conditions: (SQL | undefined)[] = []
  if (params.type) conditions.push(eq(contentItem.type, params.type))
  if (params.status) conditions.push(eq(contentItem.status, params.status))
  if (params.q) {
    const like = `%${params.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`
    conditions.push(or(ilike(contentItem.title, like), ilike(contentItem.slug, like)))
  }
  const where = and(...conditions)
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: contentItem.id,
        type: contentItem.type,
        slug: contentItem.slug,
        title: contentItem.title,
        status: contentItem.status,
        featured: contentItem.featured,
        updatedAt: contentItem.updatedAt,
        publishedAt: contentItem.publishedAt,
        viewCount: contentItem.viewCount,
        useCount: contentItem.useCount,
        favoriteCount: contentItem.favoriteCount,
        categoryName: category.name,
      })
      .from(contentItem)
      .leftJoin(category, eq(category.id, contentItem.categoryId))
      .where(where)
      .orderBy(desc(contentItem.updatedAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ total: sql<number>`count(*)::int` }).from(contentItem).where(where),
  ])
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) }
}

/** Opções para os seletores do editor (categorias e conteúdos para relações). */
export async function getEditorOptions() {
  const [categories, items] = await Promise.all([
    db
      .select({ id: category.id, kind: category.kind, name: category.name })
      .from(category)
      .orderBy(asc(category.kind), asc(category.sortOrder), asc(category.name)),
    db
      .select({ id: contentItem.id, type: contentItem.type, title: contentItem.title, status: contentItem.status })
      .from(contentItem)
      .where(sql`${contentItem.status} <> 'ARCHIVED'`)
      .orderBy(asc(contentItem.type), asc(contentItem.title))
      .limit(5000),
  ])
  return { categories, items }
}

/** Conteúdo completo para edição (qualquer status). */
export async function getContentForEdit(id: string) {
  const [item] = await db.select().from(contentItem).where(eq(contentItem.id, id)).limit(1)
  if (!item) return null
  const [tags, relations] = await Promise.all([
    db
      .select({ name: tag.name })
      .from(contentTag)
      .innerJoin(tag, eq(tag.id, contentTag.tagId))
      .where(eq(contentTag.contentId, id))
      .orderBy(asc(tag.name)),
    db
      .select({ toId: contentRelation.toId, kind: contentRelation.kind })
      .from(contentRelation)
      .where(eq(contentRelation.fromId, id))
      .orderBy(asc(contentRelation.sortOrder)),
  ])
  const base = {
    ...item,
    tags: tags.map((t) => t.name),
    relatedIds: relations.filter((r) => r.kind === 'RELATED').map((r) => r.toId),
    toolIds: relations.filter((r) => r.kind === 'COMPATIBLE_TOOL').map((r) => r.toId),
    requiredToolIds: relations.filter((r) => r.kind === 'REQUIRED_TOOL').map((r) => r.toId),
    optionalToolIds: relations.filter((r) => r.kind === 'OPTIONAL_TOOL').map((r) => r.toId),
  }

  switch (item.type) {
    case 'PROMPT': {
      const [p] = await db.select().from(prompt).where(eq(prompt.contentId, id))
      const variables = await db
        .select()
        .from(promptVariable)
        .where(eq(promptVariable.promptId, id))
        .orderBy(asc(promptVariable.sortOrder))
      const versions = await db
        .select({ version: promptVersion.version, changelog: promptVersion.changelog, createdAt: promptVersion.createdAt })
        .from(promptVersion)
        .where(eq(promptVersion.promptId, id))
        .orderBy(desc(promptVersion.version))
        .limit(10)
      return { ...base, prompt: p ?? null, variables, versions }
    }
    case 'WORKFLOW': {
      const [w] = await db.select().from(workflow).where(eq(workflow.contentId, id))
      const steps = await db.select().from(workflowStep).where(eq(workflowStep.workflowId, id)).orderBy(asc(workflowStep.position))
      return { ...base, workflow: w ?? null, steps }
    }
    case 'TOOL': {
      const [t] = await db.select().from(tool).where(eq(tool.contentId, id))
      return { ...base, tool: t ?? null }
    }
    case 'REFERENCE': {
      const [r] = await db.select().from(reference).where(eq(reference.contentId, id))
      return { ...base, reference: r ?? null }
    }
    case 'TUTORIAL': {
      const [t] = await db.select().from(tutorial).where(eq(tutorial.contentId, id))
      const steps = await db.select().from(tutorialStep).where(eq(tutorialStep.tutorialId, id)).orderBy(asc(tutorialStep.position))
      return { ...base, tutorial: t ?? null, tutorialSteps: steps }
    }
  }
}

export type ContentForEdit = NonNullable<Awaited<ReturnType<typeof getContentForEdit>>>

export async function listTaxonomy() {
  const [categories, tags] = await Promise.all([
    db
      .select({
        id: category.id,
        kind: category.kind,
        slug: category.slug,
        name: category.name,
        description: category.description,
        icon: category.icon,
        sortOrder: category.sortOrder,
        usage: sql<number>`(select count(*)::int from content_item ci where ci.category_id = ${category.id})`,
      })
      .from(category)
      .orderBy(asc(category.kind), asc(category.sortOrder), asc(category.name)),
    db
      .select({ id: tag.id, slug: tag.slug, name: tag.name, usage: sql<number>`count(${contentTag.contentId})::int` })
      .from(tag)
      .leftJoin(contentTag, eq(contentTag.tagId, tag.id))
      .groupBy(tag.id)
      .orderBy(asc(tag.name)),
  ])
  return { categories, tags }
}

export async function listMembers(params: { q?: string; page?: number }) {
  const page = Math.max(1, params.page ?? 1)
  const like = params.q ? `%${params.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%` : null
  const where = like ? or(ilike(user.email, like), ilike(user.name, like)) : undefined
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ total: sql<number>`count(*)::int` }).from(user).where(where),
  ])
  const ids = rows.map((r) => r.id)
  const memberships = ids.length
    ? await db
        .select({
          id: membership.id,
          userId: membership.userId,
          status: membership.status,
          source: membership.source,
          endsAt: membership.endsAt,
          planName: plan.name,
          planCode: plan.code,
          active: sql<boolean>`(${activeMembershipWhere()})`,
        })
        .from(membership)
        .innerJoin(plan, eq(plan.id, membership.planId))
        .where(inArray(membership.userId, ids))
        .orderBy(desc(membership.createdAt))
    : []
  return {
    rows: rows.map((r) => ({ ...r, memberships: memberships.filter((m) => m.userId === r.id) })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  }
}

export async function listPlans() {
  const plans = await db.select().from(plan).orderBy(asc(plan.sortOrder))
  const ents = await db.select().from(planEntitlement)
  return plans.map((p) => ({ ...p, entitlements: ents.filter((e) => e.planId === p.id).map((e) => e.key) }))
}

export async function listAccessCodes(limit = 200) {
  return db
    .select({
      id: accessCode.id,
      codeHint: accessCode.codeHint,
      planName: plan.name,
      durationDays: accessCode.durationDays,
      maxRedemptions: accessCode.maxRedemptions,
      redemptionCount: accessCode.redemptionCount,
      expiresAt: accessCode.expiresAt,
      disabledAt: accessCode.disabledAt,
      note: accessCode.note,
      createdAt: accessCode.createdAt,
    })
    .from(accessCode)
    .innerJoin(plan, eq(plan.id, accessCode.planId))
    .orderBy(desc(accessCode.createdAt))
    .limit(limit)
}

export async function listUpdatesForAdmin() {
  return db
    .select({
      id: labUpdate.id,
      title: labUpdate.title,
      body: labUpdate.body,
      kind: labUpdate.kind,
      state: labUpdate.state,
      contentId: labUpdate.contentId,
      publishedAt: labUpdate.publishedAt,
      updatedAt: labUpdate.updatedAt,
    })
    .from(labUpdate)
    .orderBy(desc(labUpdate.updatedAt))
    .limit(100)
}
