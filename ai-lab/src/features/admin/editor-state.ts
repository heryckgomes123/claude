import 'server-only'
import type { ContentForEdit } from '@/server/queries/admin'
import { emptyEditorState, type EditorState } from './editor-types'

/** Converte o registro do banco para o estado do formulário. */
export function toEditorState(c: ContentForEdit): EditorState {
  const s = emptyEditorState(c.type)
  Object.assign(s, {
    id: c.id,
    title: c.title,
    slug: c.slug,
    summary: c.summary,
    description: c.description,
    coverImageUrl: c.coverImageUrl ?? '',
    categoryId: c.categoryId ?? '',
    difficulty: c.difficulty ?? '',
    status: c.status,
    featured: c.featured,
    tags: c.tags.join(', '),
    relatedIds: c.relatedIds,
    toolIds: c.toolIds,
    requiredToolIds: c.requiredToolIds,
    optionalToolIds: c.optionalToolIds,
  })
  if ('prompt' in c && c.prompt) {
    Object.assign(s, {
      body: c.prompt.body,
      negativePrompt: c.prompt.negativePrompt ?? '',
      mediaType: c.prompt.mediaType,
      aspectRatio: c.prompt.aspectRatio ?? '',
      parameters: c.prompt.parameters,
      recommendedSettings: c.prompt.recommendedSettings,
      expectedResult: c.prompt.expectedResult ?? '',
      tips: c.prompt.tips,
      variables: c.variables.map((v) => ({
        key: v.key,
        label: v.label,
        placeholder: v.placeholder ?? '',
        defaultValue: v.defaultValue ?? '',
        description: v.description ?? '',
      })),
    })
  }
  if ('workflow' in c && c.workflow) {
    Object.assign(s, {
      objective: c.workflow.objective,
      estimatedMinutes: c.workflow.estimatedMinutes ? String(c.workflow.estimatedMinutes) : '',
      inputs: c.workflow.inputs,
      expectedOutput: c.workflow.expectedOutput ?? '',
      alternatives: c.workflow.alternatives,
      troubleshooting: c.workflow.troubleshooting,
      workflowSteps: c.steps.map((st) => ({
        title: st.title,
        description: st.description,
        toolId: st.toolId ?? '',
        promptId: st.promptId ?? '',
        settings: st.settings ?? '',
        tip: st.tip ?? '',
      })),
    })
  }
  if ('tool' in c && c.tool) {
    Object.assign(s, {
      websiteUrl: c.tool.websiteUrl ?? '',
      logoUrl: c.tool.logoUrl ?? '',
      pricingStatus: c.tool.pricingStatus,
      pricingNote: c.tool.pricingNote ?? '',
      primaryUse: c.tool.primaryUse ?? '',
      capabilities: c.tool.capabilities,
      supportedMedia: c.tool.supportedMedia,
      strengths: c.tool.strengths,
      limitations: c.tool.limitations,
      verificationStatus: c.tool.verificationStatus,
      verifiedAt: c.tool.verifiedAt ? c.tool.verifiedAt.toISOString().slice(0, 10) : '',
    })
  }
  if ('reference' in c && c.reference) {
    Object.assign(s, {
      sourceName: c.reference.sourceName ?? '',
      sourceUrl: c.reference.sourceUrl ?? '',
      style: c.reference.style ?? '',
      notes: c.reference.notes ?? '',
      palette: c.reference.palette,
      aspectRatio: c.reference.aspectRatio ?? '',
    })
  }
  if ('tutorial' in c && c.tutorial) {
    Object.assign(s, {
      objective: c.tutorial.objective,
      estimatedMinutes: c.tutorial.estimatedMinutes ? String(c.tutorial.estimatedMinutes) : '',
      prerequisites: c.tutorial.prerequisites,
      mistakes: c.tutorial.mistakes,
      proTips: c.tutorial.proTips,
      tutorialSteps: c.tutorialSteps.map((st) => ({ title: st.title, body: st.body, promptId: st.promptId ?? '' })),
    })
  }
  return s
}
