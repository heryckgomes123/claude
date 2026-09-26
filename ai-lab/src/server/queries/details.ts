import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '../db'
import {
  contentItem,
  prompt,
  promptVariable,
  reference,
  tool,
  tutorial,
  tutorialStep,
  workflow,
  workflowStep,
} from '../db/schema'

export async function getPromptDetail(contentId: string) {
  const [row] = await db.select().from(prompt).where(eq(prompt.contentId, contentId)).limit(1)
  if (!row) return null
  const variables = await db
    .select({
      key: promptVariable.key,
      label: promptVariable.label,
      placeholder: promptVariable.placeholder,
      defaultValue: promptVariable.defaultValue,
      description: promptVariable.description,
    })
    .from(promptVariable)
    .where(eq(promptVariable.promptId, contentId))
    .orderBy(asc(promptVariable.sortOrder), asc(promptVariable.key))
  return { ...row, variables }
}

export async function getWorkflowDetail(contentId: string) {
  const [row] = await db.select().from(workflow).where(eq(workflow.contentId, contentId)).limit(1)
  if (!row) return null
  const stepTool = alias(contentItem, 'step_tool')
  const stepPrompt = alias(contentItem, 'step_prompt')
  const steps = await db
    .select({
      id: workflowStep.id,
      position: workflowStep.position,
      title: workflowStep.title,
      description: workflowStep.description,
      settings: workflowStep.settings,
      tip: workflowStep.tip,
      toolTitle: stepTool.title,
      toolSlug: stepTool.slug,
      toolStatus: stepTool.status,
      promptTitle: stepPrompt.title,
      promptSlug: stepPrompt.slug,
      promptStatus: stepPrompt.status,
    })
    .from(workflowStep)
    .leftJoin(stepTool, eq(stepTool.id, workflowStep.toolId))
    .leftJoin(stepPrompt, eq(stepPrompt.id, workflowStep.promptId))
    .where(eq(workflowStep.workflowId, contentId))
    .orderBy(asc(workflowStep.position))
  return {
    ...row,
    steps: steps.map((s) => ({
      ...s,
      tool: s.toolSlug && s.toolStatus === 'PUBLISHED' ? { title: s.toolTitle!, slug: s.toolSlug } : null,
      prompt: s.promptSlug && s.promptStatus === 'PUBLISHED' ? { title: s.promptTitle!, slug: s.promptSlug } : null,
    })),
  }
}

export async function getToolDetail(contentId: string) {
  const [row] = await db.select().from(tool).where(eq(tool.contentId, contentId)).limit(1)
  return row ?? null
}

export async function getReferenceDetail(contentId: string) {
  const [row] = await db.select().from(reference).where(eq(reference.contentId, contentId)).limit(1)
  return row ?? null
}

export async function getTutorialDetail(contentId: string) {
  const [row] = await db.select().from(tutorial).where(eq(tutorial.contentId, contentId)).limit(1)
  if (!row) return null
  const stepPrompt = alias(contentItem, 'step_prompt')
  const steps = await db
    .select({
      id: tutorialStep.id,
      position: tutorialStep.position,
      title: tutorialStep.title,
      body: tutorialStep.body,
      promptTitle: stepPrompt.title,
      promptSlug: stepPrompt.slug,
      promptStatus: stepPrompt.status,
    })
    .from(tutorialStep)
    .leftJoin(stepPrompt, eq(stepPrompt.id, tutorialStep.promptId))
    .where(eq(tutorialStep.tutorialId, contentId))
    .orderBy(asc(tutorialStep.position))
  return {
    ...row,
    steps: steps.map((s) => ({
      ...s,
      prompt: s.promptSlug && s.promptStatus === 'PUBLISHED' ? { title: s.promptTitle!, slug: s.promptSlug } : null,
    })),
  }
}
