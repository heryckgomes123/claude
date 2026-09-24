/**
 * Mapa de módulos do futuro painel administrativo (/admin).
 * Cada módulo terá rota própria e endpoints protegidos por papel "admin"/"coach"
 * verificado NO SERVIDOR.
 */
export const ADMIN_MODULES = [
  { id: 'dashboard', label: 'Dashboard', tables: ['*'] },
  { id: 'alunos', label: 'Alunos', tables: ['users', 'profiles'] },
  { id: 'treinos', label: 'Treinos', tables: ['workouts', 'workout_exercises'] },
  { id: 'exercicios', label: 'Exercícios', tables: ['exercises'] },
  { id: 'aulas', label: 'Aulas', tables: ['classes', 'class_bookings'] },
  { id: 'professores', label: 'Professores', tables: ['users (role=coach)'] },
  { id: 'checkins', label: 'Check-ins', tables: ['checkins'] },
  { id: 'desafios', label: 'Desafios', tables: ['challenges', 'challenge_participants'] },
  { id: 'ranking', label: 'Ranking', tables: ['xp_events'] },
  { id: 'planos', label: 'Planos', tables: ['plans', 'subscriptions'] },
  { id: 'financeiro', label: 'Financeiro', tables: ['payments (futuro)'] },
  { id: 'conteudo', label: 'Conteúdo', tables: ['exercises.media_url', 'feed_items'] },
  { id: 'notificacoes', label: 'Notificações', tables: ['notifications'] },
  { id: 'configuracoes', label: 'Configurações', tables: ['settings'] },
] as const
