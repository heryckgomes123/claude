# LIFT 2.0 — Arquitetura

## Princípios

1. **Honestidade de dados.** Tudo o que é demonstração está em `src/data/demo/`, marcado no código e sinalizado na interface (selo `DEMO`, avisos de integração). Nada finge ser real.
2. **Troca de implementação sem tocar na UI.** As telas consomem `liftApi`, `AIService`, `AuthService` e `useProgress()`. Conectar o backend = trocar essas implementações.
3. **Servidor é a fonte da verdade.** XP, conquistas, vagas de aula, check-ins e assinaturas devem ser calculados/validados no servidor. O cálculo local atual existe apenas para a demonstração.
4. **Mobile primeiro, leve.** Rotas com code-splitting, 3D sob demanda, animações curtas, `prefers-reduced-motion` respeitado.

## Fluxo de entrada

```
Primeiro acesso:   Splash → Onboarding → Login → Home
Sessão existente:  Splash → Home (ou a rota aberta)
```
`RequireSession` (App.tsx) protege as rotas do aluno. A sessão hoje é explicitamente de **demonstração**.

## Dados

| Camada | Hoje | Integração |
|---|---|---|
| `services/api/liftApi.ts` | retorna dados demo | cada função tem o endpoint REST previsto no comentário |
| `store/useAppStore.ts` | ações do aluno salvas no dispositivo | cada ação vira chamada à API; o store vira cache |
| `services/progress.ts` | calcula sequência/XP/metas localmente | consumir valores calculados pelo servidor |
| `database/schema.sql` | modelo planejado | criar no Postgres/Supabase, habilitar RLS |

## LIFT AI

```
ALUNO → DADOS DO ALUNO (buildStudentContext) → AIService → provedor → RESPOSTA
                                                   ├─ demoRulesProvider  (padrão; regras locais, SEM IA)
                                                   └─ apiProvider → POST /api/ai/chat → server/ai/providers.ts → provedor de IA
```

- A chave (`AI_API_KEY`) existe **somente** no servidor.
- Guardrails no prompt do servidor e no provedor demo: sem diagnóstico, sem medicação/dieta, sem inventar dados, dizer quando faltam dados.
- Hoje o servidor só aceita contexto enviado pelo app com `ALLOW_CLIENT_CONTEXT=true` (dev). Em produção, o servidor identifica o aluno pela sessão e busca o contexto no banco.
- Conversas poderão ser persistidas em `ai_conversations` / `ai_messages`.

Para ativar: `.env` com `AI_API_KEY`, `VITE_AI_MODE="api"`, `npm run server`.

## Gamificação

`src/config/gamification.config.ts` define regras de XP e a curva de níveis (`minXp(n) = 400·(n−1)^1.45`), sem nomes definitivos de nível. Conquistas e desafios são dados (`achievements`, `challenges`) com `metric` + `target`, permitindo criar novos pelo admin sem código.

## 3D

- `components/three/ThreeCanvas.tsx`: renderer com DPR limitado, pausa fora da tela/aba oculta, libera GPU ao desmontar.
- `services/device/capabilities.ts`: `high | low | off` por WebGL, memória, núcleos, economia de dados e movimento reduzido. O aluno pode forçar em Perfil › Gráficos 3D.
- Cenas com propósito: **Núcleo de Evolução** (progresso de nível; gira mais rápido com a sequência) e **Medalha 3D** (conquistas; arraste para girar). Fallback SVG equivalente.

## PWA

Manifesto e Service Worker via `vite-plugin-pwa` (instalável, ícones, tema escuro, precache do app). Rotas `/api/*` nunca são cacheadas.

## Segurança

- Segredos apenas em variáveis de ambiente do servidor; nada sensível em `VITE_*`.
- Servidor valida e limita entradas, aplica rate limit e CORS restrito.
- `/admin` fica bloqueado até existir autenticação real com papel `admin` validado no servidor — não há bypass no cliente.
- Escritas sensíveis (XP, conquistas, reservas, assinaturas) só pelo servidor; RLS no banco.

## Próximas integrações

1. **Autenticação** (ex.: Supabase Auth) → implementar `AuthProvider` em `services/auth`.
2. **API/Banco** → aplicar `database/schema.sql`, implementar endpoints listados em `liftApi.ts`.
3. **Check-in real** → QR Code da recepção, geolocalização ou catraca.
4. **Agenda/Reservas** → transação com limite de vagas + lista de espera no servidor.
5. **IA** → configurar provedor, contexto via banco, persistir conversas.
6. **Push notifications** → Web Push (`push_subscriptions`).
7. **Pagamentos/financeiro** → gateway; o app só exibe status.
8. **Conteúdo** → vídeos/animações/modelos 3D em `exercises.media_url`.
9. **Comunidade** → `feed_items` + moderação.
10. **Admin** → painel web com os módulos de `pages/admin/modules.ts`.
