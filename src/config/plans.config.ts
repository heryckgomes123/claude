import type { Plan } from '@/types/models'

/**
 * Catálogo de planos — ESTRUTURA DE CONFIGURAÇÃO.
 * Nomes e benefícios são ilustrativos; preços NÃO são definidos aqui
 * (priceCents = null) e devem vir do módulo financeiro/backend.
 */
export const PLANS: Plan[] = [
  {
    id: 'plan-performance',
    name: 'Plano Performance',
    description: 'Acesso às modalidades da LIFT com acompanhamento de evolução no app.',
    benefits: [
      'Acesso a CrossFit, Calistenia, Animal Flow e Yoga',
      'Reserva de aulas pelo app',
      'Treinos personalizados pela equipe LIFT',
      'Desafios, ranking e conquistas',
      'LIFT AI (quando conectada)',
    ],
    priceCents: null,
    billingCycle: 'mensal',
  },
]
