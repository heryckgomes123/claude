/**
 * ⚠️ DADOS DE DEMONSTRAÇÃO
 * Treinos fictícios para navegação da interface — não são prescrições reais.
 * Em produção: GET /api/workouts?student=me (tabelas `workouts`, `exercises`).
 */
import type { Workout } from '@/types/models'

export const DEMO_WORKOUTS: Workout[] = [
  {
    id: 'wk-a',
    code: 'Treino A',
    title: 'Força',
    focus: 'Membros superiores e core',
    modality: 'Calistenia',
    estimatedMinutes: 48,
    level: 'intermediário',
    coachName: 'Coach Demo',
    notes: 'Priorize amplitude completa. Se perder a técnica, reduza as repetições.',
    exercises: [
      { exerciseId: 'ex-pull-up', sets: 4, reps: '6-8', load: 'peso corporal', restSeconds: 90, notes: 'Use elástico se necessário.' },
      { exerciseId: 'ex-dips', sets: 4, reps: '8-10', load: 'peso corporal', restSeconds: 90 },
      { exerciseId: 'ex-row', sets: 3, reps: '12', load: 'peso corporal', restSeconds: 60 },
      { exerciseId: 'ex-press', sets: 3, reps: '10', load: '12 kg', restSeconds: 60 },
      { exerciseId: 'ex-hollow-hold', sets: 3, reps: '30s', load: null, restSeconds: 45 },
    ],
  },
  {
    id: 'wk-b',
    code: 'Treino B',
    title: 'Performance',
    focus: 'Membros inferiores e potência',
    modality: 'Funcional',
    estimatedMinutes: 52,
    level: 'intermediário',
    coachName: 'Coach Demo',
    notes: 'Aqueça bem o quadril antes do agachamento. Descanso completo nos saltos.',
    exercises: [
      { exerciseId: 'ex-back-squat', sets: 4, reps: '10', load: '40 kg', restSeconds: 90 },
      { exerciseId: 'ex-rdl', sets: 3, reps: '10', load: '35 kg', restSeconds: 75 },
      { exerciseId: 'ex-box-jump', sets: 4, reps: '6', load: null, restSeconds: 60, notes: 'Qualidade acima de velocidade.' },
      { exerciseId: 'ex-walking-lunge', sets: 3, reps: '12 por perna', load: '2 × 10 kg', restSeconds: 60 },
      { exerciseId: 'ex-kb-swing', sets: 3, reps: '15', load: '16 kg', restSeconds: 60 },
      { exerciseId: 'ex-plank', sets: 3, reps: '40s', load: null, restSeconds: 30 },
    ],
  },
  {
    id: 'wk-c',
    code: 'Treino C',
    title: 'Flow & Mobilidade',
    focus: 'Mobilidade, controle e recuperação ativa',
    modality: 'Animal Flow',
    estimatedMinutes: 35,
    level: 'iniciante',
    coachName: 'Coach Demo',
    exercises: [
      { exerciseId: 'ex-worlds-greatest', sets: 2, reps: '5 por lado', load: null, restSeconds: 20 },
      { exerciseId: 'ex-beast', sets: 3, reps: '30s', load: null, restSeconds: 30 },
      { exerciseId: 'ex-crab', sets: 3, reps: '6 por lado', load: null, restSeconds: 30 },
      { exerciseId: 'ex-hollow-hold', sets: 2, reps: '25s', load: null, restSeconds: 30 },
    ],
  },
  {
    id: 'wk-d',
    code: 'Treino D',
    title: 'Skills',
    focus: 'Habilidades de calistenia',
    modality: 'Calistenia',
    estimatedMinutes: 45,
    level: 'intermediário',
    coachName: 'Coach Demo',
    exercises: [
      { exerciseId: 'ex-l-sit', sets: 5, reps: '15s', load: null, restSeconds: 60 },
      { exerciseId: 'ex-pull-up', sets: 4, reps: '5', load: 'peso corporal', restSeconds: 90, notes: 'Foco em puxada explosiva.' },
      { exerciseId: 'ex-push-up', sets: 4, reps: '12', load: 'peso corporal', restSeconds: 60 },
      { exerciseId: 'ex-farmer', sets: 3, reps: '30 m', load: '2 × 20 kg', restSeconds: 60 },
    ],
  },
]

/** Planejamento semanal demo: índice = dia da semana (0 = domingo). null = descanso. */
export const DEMO_WEEK_PLAN: (string | null)[] = [null, 'wk-a', 'wk-b', 'wk-c', 'wk-b', 'wk-a', 'wk-d']

export const workoutById = (id: string) => DEMO_WORKOUTS.find((w) => w.id === id)

export function todaysWorkout(d = new Date()) {
  const id = DEMO_WEEK_PLAN[d.getDay()]
  return id ? workoutById(id)! : null
}
