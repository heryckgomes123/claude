/**
 * Entitlements: o que um plano libera. Usuário → Membership → Plano → Entitlements.
 * Integrações de pagamento futuras só precisam criar/encerrar memberships.
 */
export const ENTITLEMENTS = {
  LAB_ACCESS: 'lab.access',
  PROMPT_BUILDER: 'lab.prompt-builder',
  COLLECTIONS: 'lab.collections',
  EXPERIMENTS: 'lab.experiments',
  PREMIUM_CONTENT: 'content.premium',
} as const

export type Entitlement = (typeof ENTITLEMENTS)[keyof typeof ENTITLEMENTS]

export const ALL_ENTITLEMENTS = Object.values(ENTITLEMENTS) as Entitlement[]

export const ENTITLEMENT_LABELS: Record<Entitlement, string> = {
  'lab.access': 'Acesso à área de membros',
  'lab.prompt-builder': 'Prompt Builder',
  'lab.collections': 'Coleções',
  'lab.experiments': 'Laboratório de experimentos',
  'content.premium': 'Conteúdo premium',
}

export const ACTIVE_MEMBERSHIP_STATUSES = ['ACTIVE', 'TRIALING'] as const
