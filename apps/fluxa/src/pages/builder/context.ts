import { createContext, useContext } from 'react'
import type { Automation } from '../../lib/types'
import type { FlowIssue } from '../../lib/flow'

export interface BuilderContextValue {
  automation: Automation
  automations: Automation[]
  issues: FlowIssue[]
  tracedNodes: Set<string>
  activeNodeId?: string
  showVisits: boolean
}

export const BuilderContext = createContext<BuilderContextValue | null>(null)

export function useBuilder(): BuilderContextValue {
  const value = useContext(BuilderContext)
  if (!value) throw new Error('useBuilder fora do construtor')
  return value
}
