# LIFT 2.0 — Digital Fitness Experience

App web progressivo (PWA), mobile-first, da **LIFT FITNESS**.
**Estrutura • Consistência • Evolução.**

> Fase 1: experiência completa navegável com **dados de demonstração**.
> Autenticação, pagamentos, agenda real e IA real dependem de integração com backend (ver abaixo).

## Stack

| Camada | Tecnologia |
|---|---|
| Build | Vite 8 + TypeScript 5.9 |
| UI | React 19, React Router 7, Tailwind CSS 4 |
| Animação | Motion (Framer Motion) |
| 3D | Three.js (carregado sob demanda, com fallback SVG) |
| Estado | Zustand (persistido no dispositivo) |
| PWA | vite-plugin-pwa (Workbox) |
| API (mínima) | Node `http` + `@anthropic-ai/sdk` (LIFT AI) |
| Banco (planejado) | PostgreSQL — `database/schema.sql` |

## Como executar

```bash
npm install
npm run dev          # app em http://localhost:5173 (acessível na rede local p/ testar no celular)
npm run build        # typecheck + build de produção em dist/
npm run preview      # serve o build (PWA/Service Worker ativos)

# opcional — backend da LIFT AI
cp .env.example .env # preencha AI_API_KEY e VITE_AI_MODE="api"
npm run server       # API em http://localhost:8787 (o Vite faz proxy de /api)
```

Na tela de login, use **Explorar demonstração** para entrar com dados fictícios.

## Estrutura

```
src/
  config/          configuração central (LIFT_CONFIG, AI_CONFIG, XP/níveis, planos)
  types/models.ts  modelos de domínio (espelham database/schema.sql)
  data/demo/       ⚠️ dados de demonstração (aluno, treinos, exercícios, ranking, aulas…)
  services/
    api/           liftApi (camada de dados — hoje demo, amanhã HTTP) + cliente HTTP
    ai/            AIService, provedores (demo por regras | API real), contexto do aluno
    auth/          AuthService (contrato; ainda sem provedor real)
    sound/         SoundService (desligado por padrão)
    device/        detecção de capacidade para o 3D
    progress.ts    motor de sequência, XP, metas, desafios e conquistas
    ranking.ts
  store/           estado local persistido (check-ins, treinos, reservas, preferências)
  components/
    ui/            design system: Button, Card, Badge, ProgressBar, Avatar, Modal, Header,
                   StatCard, Timer, EmptyState, LoadingState…
    charts/        BarChart, AreaChart, RingProgress, ConsistencyMap (SVG)
    domain/        WorkoutCard, ChallengeCard, AchievementCard, RankingCard, AIChat, Celebration
    three/         ThreeCanvas + cenas (Núcleo de Evolução, Medalha 3D)
    layout/        AppShell, BottomNavigation
  pages/           Splash, Onboarding, Login, Home, Treino, ModoTreino, Progresso, Ranking,
                   Desafios, Conquistas, Metas, Agenda, CheckIn, AI, Perfil, Plano,
                   Notificacoes, Comunidade, admin/
server/            API mínima (health + /api/ai/chat)
database/          schema.sql (PostgreSQL / Supabase)
docs/              ARCHITECTURE.md
```

Mais detalhes em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
