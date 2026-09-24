/**
 * Provedor de DEMONSTRAÇÃO da LIFT AI.
 *
 * ⚠️ NÃO É UMA IA. Gera respostas por regras simples a partir dos dados do
 * aluno, para que a experiência possa ser testada antes da integração real.
 * A interface informa isso ao aluno. Substituído pelo ApiProvider quando
 * VITE_AI_MODE="api" e o backend estiver configurado.
 *
 * Regras de segurança (mantidas também no prompt do provedor real):
 * - Não diagnostica, não prescreve tratamento, não substitui profissionais.
 * - Não inventa dados: se faltar informação, diz isso.
 */
import type { AIMessage } from '@/types/models'
import type { AIProvider, AIReply, StudentAIContext } from '../types'

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const has = (text: string, words: string[]) => words.some((w) => text.includes(w))

/** Palavras curtas exigem fronteira de palavra ("dor" ≠ "adoro"). */
const HEALTH_RE = /\b(dor|dores|doi|doeu|doendo)\b/
const HEALTH_WORDS = [
  'lesao', 'lesion', 'machuc', 'tendin', 'hernia', 'doenca', 'diagnost',
  'remedio', 'medicament', 'pressao alta', 'coracao', 'tontura', 'desmai', 'sintoma', 'febre',
  'gravid', 'gestante', 'cirurgia', 'fisioterap', 'inflama', 'anti-inflamat', 'suplement', 'anabol',
]
const NUTRITION_WORDS = ['dieta', 'caloria', 'emagrec', 'proteina', 'comer', 'aliment', 'nutri']

function answerHealth(): string {
  return [
    'Não posso avaliar dores, sintomas, lesões ou indicar medicamentos — isso precisa de um profissional de saúde.',
    '',
    '• Se algo dói durante o treino, pare o exercício.',
    '• Procure um médico ou fisioterapeuta para uma avaliação.',
    '• Avise o coach da LIFT antes do próximo treino, para ajustarem juntos o que for necessário.',
  ].join('\n')
}

function answerNutrition(): string {
  return 'Alimentação e suplementação devem ser orientadas por um nutricionista, que considera seu histórico e objetivos. Posso ajudar com organização dos treinos e leitura da sua consistência.'
}

function findExercise(text: string, ctx: StudentAIContext) {
  return ctx.exerciseCatalog.find((e) => {
    const n = norm(e.name)
    const main = n.split(/[ (]/)[0]
    return text.includes(n) || (main.length > 4 && text.includes(main))
  })
}

function answerExercise(text: string, ctx: StudentAIContext): string | null {
  const ex = findExercise(text, ctx)
  if (ex) {
    return [
      `**${ex.name}**`,
      ex.description,
      '',
      'Pontos de atenção:',
      ...ex.cues.map((c) => `• ${c}`),
      '',
      'Na dúvida sobre carga ou execução, peça ao coach para acompanhar uma série.',
    ].join('\n')
  }
  if (has(text, ['explica', 'como faz', 'como fazer', 'execucao', 'exercicio'])) {
    const names = ctx.exerciseCatalog.slice(0, 8).map((e) => e.name).join(', ')
    return `Posso explicar os exercícios do seu catálogo de treino. Por exemplo: ${names}. Qual deles?`
  }
  return null
}

function answerPlanning(ctx: StudentAIContext): string {
  const w = ctx.workoutsThisWeek
  const lines: string[] = [`Você registrou ${w} ${w === 1 ? 'treino' : 'treinos'} nesta semana.`]
  if (w >= 5) {
    lines.push('É um volume alto. Amanhã pode ser interessante priorizar recuperação: mobilidade, Yoga ou um descanso completo, dependendo de como seu corpo está respondendo.')
  } else if (w >= 3) {
    lines.push('Amanhã pode ser interessante focar em mobilidade ou recuperação ativa (como o Treino C · Flow & Mobilidade), dependendo do seu planejamento com o coach.')
  } else {
    lines.push(
      ctx.todaysWorkout
        ? `Seguir o plano é um bom caminho: o treino programado para hoje é o ${ctx.todaysWorkout.code} · ${ctx.todaysWorkout.title} (${ctx.todaysWorkout.focus.toLowerCase()}).`
        : 'Seguir o planejamento da semana com o coach é o melhor caminho para manter regularidade.',
    )
  }
  lines.push('', 'Uma organização equilibrada costuma alternar dias de força, condicionamento e mobilidade. Seu coach pode ajustar isso aos seus objetivos.')
  return lines.join('\n')
}

function answerConsistency(ctx: StudentAIContext): string {
  const rate = ctx.elapsedDaysThisMonth > 0 ? Math.round((ctx.activeDaysThisMonth / ctx.elapsedDaysThisMonth) * 100) : 0
  return [
    `Sua sequência atual é de ${ctx.streak} ${ctx.streak === 1 ? 'dia' : 'dias'} (seu recorde é ${ctx.bestStreak}).`,
    `Neste mês você esteve ativo em ${ctx.activeDaysThisMonth} de ${ctx.elapsedDaysThisMonth} dias — ${rate}% dos dias.`,
    '',
    ctx.streak >= 7
      ? 'Você está mantendo sua consistência. Lembre que dias de mobilidade e recuperação também contam — sequência não significa treinar pesado todos os dias.'
      : 'Consistência se constrói com metas pequenas e repetíveis. Um check-in hoje já mantém a sequência viva.',
  ].join('\n')
}

function answerData(ctx: StudentAIContext): string {
  const avg = ctx.workoutsThisMonth > 0 ? Math.round(ctx.minutesThisMonth / ctx.workoutsThisMonth) : 0
  const lines = [
    'Com base nos dados registrados no app:',
    `• ${ctx.workoutsThisMonth} treinos no mês, somando ${ctx.minutesThisMonth} minutos (média de ${avg} min por treino).`,
    `• ${ctx.workoutsThisWeek} treinos nesta semana.`,
    `• Nível ${ctx.level}, com ${ctx.totalXp.toLocaleString('pt-BR')} XP.`,
  ]
  const g = ctx.goals.find((x) => x.progress < x.target)
  if (g) lines.push(`• Meta em andamento: ${g.title} — ${g.progress}/${g.target}.`)
  lines.push('', 'Ainda não tenho dados de carga por série ou avaliações físicas, então não consigo afirmar ganho de força ou mudança corporal. Esses dados poderão ser integrados futuramente.')
  return lines.join('\n')
}

function answerGoals(ctx: StudentAIContext): string {
  const open = ctx.goals.filter((g) => g.progress < g.target)
  const ch = ctx.challenges.filter((c) => c.progress < c.target)
  if (!open.length && !ch.length) return 'Você não tem metas ou desafios em aberto no momento. Que tal definir uma nova meta com seu coach?'
  return [
    ...open.map((g) => `🎯 ${g.title}: ${g.progress}/${g.target} — faltam ${g.target - g.progress}.`),
    ...ch.map((c) => `⚡ ${c.title}: ${c.progress}/${c.target}.`),
  ].join('\n')
}

function answerMotivation(ctx: StudentAIContext): string {
  if (ctx.trainedToday) return `Você já se movimentou hoje, ${ctx.firstName}. Isso é estrutura. Agora é recuperar bem para evoluir amanhã.`
  if (ctx.streak >= 3)
    return `${ctx.streak} dias seguidos não aparecem por acaso, ${ctx.firstName}. Não precisa ser o melhor treino da vida — só precisa acontecer. Um check-in hoje mantém a sequência.`
  return `Todo recomeço conta, ${ctx.firstName}. Escolha algo possível para hoje: 20 minutos de mobilidade ou o treino do dia. Consistência vence intensidade.`
}

export const demoRulesProvider: AIProvider = {
  id: 'demo-rules',
  isRealAI: false,
  async reply(history: AIMessage[], ctx: StudentAIContext): Promise<AIReply> {
    const last = [...history].reverse().find((m) => m.role === 'user')
    const text = norm(last?.content ?? '')
    let content: string

    if (HEALTH_RE.test(text) || has(text, HEALTH_WORDS)) content = answerHealth()
    else if (has(text, NUTRITION_WORDS)) content = answerNutrition()
    else {
      const ex = answerExercise(text, ctx)
      if (ex) content = ex
      else if (has(text, ['amanha', 'semana', 'organiz', 'planej', 'proximo treino', 'o que treino', 'o que fazer', 'o que posso fazer', 'descans']))
        content = answerPlanning(ctx)
      else if (has(text, ['consist', 'sequencia', 'frequencia', 'streak', 'regular'])) content = answerConsistency(ctx)
      else if (has(text, ['meus dados', 'evolu', 'progresso', 'como estou', 'resultado', 'resumo', 'mes', 'xp', 'nivel']))
        content = answerData(ctx)
      else if (has(text, ['meta', 'desafio', 'objetivo'])) content = answerGoals(ctx)
      else if (has(text, ['motiv', 'preguica', 'desanim', 'cansad', 'sem vontade', 'forca']))
        content = answerMotivation(ctx)
      else if (/^(oi|ola|e ai|bom dia|boa tarde|boa noite|hey)\b/.test(text))
        content = `Olá, ${ctx.firstName}! Posso comentar sua consistência, explicar exercícios, sugerir como organizar a semana ou resumir seus dados. Por onde começamos?`
      else
        content =
          'Não consegui entender essa pergunta. Nesta versão de demonstração eu respondo sobre: organização da semana, consistência, explicação de exercícios, metas/desafios e resumo dos seus dados.'
    }
    // Pequeno atraso para a interface de "digitando" — não simula processamento de IA.
    await new Promise((r) => setTimeout(r, 450))
    return { content, source: 'demo-rules' }
  },
}
