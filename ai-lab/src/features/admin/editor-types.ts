import type { CONTENT_STATUSES, ContentType, MediaType, PRICING_STATUSES, VERIFICATION_STATUSES } from '@/lib/labels'

/* -------------------------------------------------------------------------- */
/* Tipos do estado do editor                                                  */
/* -------------------------------------------------------------------------- */

export type KV = { label: string; value: string }
export type Variable = { key: string; label: string; placeholder: string; defaultValue: string; description: string }
export type WorkflowStepState = { title: string; description: string; toolId: string; promptId: string; settings: string; tip: string }
export type TutorialStepState = { title: string; body: string; promptId: string }

export type EditorState = {
  id?: string
  type: ContentType
  title: string
  slug: string
  summary: string
  description: string
  coverImageUrl: string
  categoryId: string
  difficulty: string
  status: (typeof CONTENT_STATUSES)[number]
  featured: boolean
  tags: string
  relatedIds: string[]
  toolIds: string[]
  changelog: string
  // PROMPT
  body: string
  negativePrompt: string
  mediaType: MediaType
  aspectRatio: string
  parameters: KV[]
  recommendedSettings: KV[]
  expectedResult: string
  tips: string[]
  variables: Variable[]
  // WORKFLOW / TUTORIAL
  objective: string
  estimatedMinutes: string
  inputs: string[]
  expectedOutput: string
  alternatives: string[]
  troubleshooting: { problem: string; solution: string }[]
  requiredToolIds: string[]
  optionalToolIds: string[]
  workflowSteps: WorkflowStepState[]
  prerequisites: string[]
  mistakes: string[]
  proTips: string[]
  tutorialSteps: TutorialStepState[]
  // TOOL
  websiteUrl: string
  logoUrl: string
  pricingStatus: (typeof PRICING_STATUSES)[number]
  pricingNote: string
  primaryUse: string
  capabilities: string[]
  supportedMedia: MediaType[]
  strengths: string[]
  limitations: string[]
  verificationStatus: (typeof VERIFICATION_STATUSES)[number]
  verifiedAt: string
  // REFERENCE
  sourceName: string
  sourceUrl: string
  style: string
  notes: string
  palette: string[]
}

export function emptyEditorState(type: ContentType): EditorState {
  return {
    type,
    title: '',
    slug: '',
    summary: '',
    description: '',
    coverImageUrl: '',
    categoryId: '',
    difficulty: '',
    status: 'DRAFT',
    featured: false,
    tags: '',
    relatedIds: [],
    toolIds: [],
    changelog: '',
    body: '',
    negativePrompt: '',
    mediaType: 'IMAGE',
    aspectRatio: '',
    parameters: [],
    recommendedSettings: [],
    expectedResult: '',
    tips: [],
    variables: [],
    objective: '',
    estimatedMinutes: '',
    inputs: [],
    expectedOutput: '',
    alternatives: [],
    troubleshooting: [],
    requiredToolIds: [],
    optionalToolIds: [],
    workflowSteps: [{ title: '', description: '', toolId: '', promptId: '', settings: '', tip: '' }],
    prerequisites: [],
    mistakes: [],
    proTips: [],
    tutorialSteps: [{ title: '', body: '', promptId: '' }],
    websiteUrl: '',
    logoUrl: '',
    pricingStatus: 'UNKNOWN',
    pricingNote: '',
    primaryUse: '',
    capabilities: [],
    supportedMedia: [],
    strengths: [],
    limitations: [],
    verificationStatus: 'NEEDS_REVIEW',
    verifiedAt: '',
    sourceName: '',
    sourceUrl: '',
    style: '',
    notes: '',
    palette: [],
  }
}

