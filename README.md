<p align="center">
  <img src="public/icons/icon-192.png" width="96" alt="AIVA" />
</p>

<h1 align="center">AIVA — Second Brain OS</h1>
<p align="center"><b>Seu segundo cérebro.</b> Vida, trabalho e conteúdo num único sistema inteligente — com IA e voz.</p>

---

AIVA é um app web/PWA **mobile-first** que centraliza tarefas, agenda, projetos, notas, metas, hábitos, clientes, finanças e — com o **Creator Mode** — ideias, roteiros, pipeline de conteúdo, calendário editorial, lives, marcas e campanhas. A IA não é decorativa: ela lê os dados reais do workspace e **age** nele por meio de um sistema de ações validado.

## O que já funciona

| Área | Destaques |
|---|---|
| **Calibração (1º acesso)** | Sequência de boot, 6 perguntas (nome, como trabalha, o que organizar, plataformas/nicho/frequência, ritmo e horário de pico, foco atual + hábitos) e configuração automática do workspace — só com o que o usuário disse, sem dados falsos. Recalibrável em Configurações. |
| **Hoje (Command Center)** | Saudação, briefing do dia, **👉 Próxima ação** única, Agora / Hoje / Atrasado / Próximo, sugestões proativas, rotina, "para publicar", projetos em movimento, "quem precisa de você" e **Daily Review** à noite. |
| **Captura universal** | Botão `+`, atalho `N`, ditado por voz. Entende datas/horas em pt-BR ("sexta às 14h", "amanhã às três", "dia 30"), pessoas, empresas, valores e o tipo do item, com prévia ao vivo. Tudo cai na **Inbox**. |
| **AIVA AI** | Chat com contexto do workspace, planos do dia aplicáveis, respostas com itens clicáveis, propostas com Confirmar/Cancelar (exclusões sempre pedem confirmação). Claude (tool use) quando há `ANTHROPIC_API_KEY`; motor local caso contrário. |
| **Voz** | "Falar com AIVA" (segure o orb da barra inferior, `⌘J`, ou o card na Home): escuta com transcrição ao vivo → interpreta → "Entendi. Criar … ?" → Confirmar / Editar / Cancelar, resposta falada opcional. |
| **Tarefas** | Lista agrupada por prazo e **Kanban com arrastar** (mouse e toque longo), prioridade, recorrência, checklist, dependências, projeto, cliente, campanha. |
| **Projetos** | Visão geral, quadro, timeline, notas, agenda, financeiro e conexões. |
| **Calendário universal** | Dia / semana / mês com eventos, tarefas, publicações, lives e prazos de campanha. |
| **Creator** | Pipeline (Ideia → … → Analisado), Idea Vault, calendário editorial, Live Center (checklist, pauta, métricas, momentos → cortes), Marcas & Campanhas (funil + entregáveis + receita automática), AI Content Studio e Creator Analytics. |
| **CRM & Financeiro** | Leads/clientes/marcas com follow-ups; receitas, despesas, a receber, resultado do mês. |
| **Metas & Rotina** | Metas por horizonte com progresso, hábitos com grade semanal e streak. |
| **Busca global** | `⌘K`: tudo, em linguagem natural, + "Perguntar à AIVA". |
| **Notificações** | Live em 30 min, lembretes de eventos/tarefas, atrasos, gravações de amanhã, campanha sem entrega — deduplicadas, sem spam. |
| **PWA** | Manifest, ícones (incl. maskable), splash iOS, service worker com offline básico, safe areas, sem zoom acidental, sem scroll horizontal. |

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** com design system próprio (tokens, gradientes, glass, microinterações)
- **PostgreSQL** via **Drizzle ORM** (com **PGlite** embutido para desenvolvimento sem setup)
- **Zustand** (store por sessão, atualizações otimistas com desfazer)
- **Anthropic SDK** (Claude, tool use) — opcional
- **Web Speech API** (pt-BR) para voz
- **Vitest** para os testes do motor de linguagem

## Rodando

```bash
npm install
cp .env.example .env.local   # opcional
npm run dev                  # http://localhost:3000
```

Sem `DATABASE_URL`, o app usa um Postgres embutido (PGlite) em `.data/pglite`. As migrações rodam sozinhas na primeira requisição.

Produção:

```bash
DATABASE_URL=postgres://user:pass@host:5432/aiva npm run build && npm start
```

Scripts: `npm run lint`, `npm run typecheck`, `npm test`, `npm run db:generate` (após mudar `src/db/schema.ts`), `npm run icons` (regera ícones/splash a partir do SVG do logo).

## Arquitetura

```
src/
  app/
    (auth)/            login e cadastro
    onboarding/        calibração do primeiro acesso
    (app)/             telas autenticadas (today, inbox, tasks, projects, calendar,
                       notes, creator, clients, finance, goals, analytics, aiva, settings, more)
    api/               auth, data/[entity] (CRUD genérico), capture, sync, ai/*, workspace, export
  db/                  schema Drizzle + cliente (Postgres ou PGlite) + migrações automáticas
  lib/
    entities.ts        registro de entidades + validação zod (fonte única para UI, captura e IA)
    nlp/               entendimento de linguagem natural pt-BR (datas, horas, intenção, entidades)
    intelligence.ts    Hoje, próxima ação, briefing, sugestões, plano do dia, review, busca
    ai/                protocolo de ações da IA, geradores do Studio
    server/            auth (scrypt + sessões), repo (CRUD com isolamento), notificações, motores de IA
  components/          shell (sidebar, barra inferior, captura, voz, busca), detalhes, quadro kanban, gráficos
drizzle/               migrações SQL
```

### Context engine

Tudo é ligado por referências (`projectId`, `clientId`, `contentId`, `campaignId`, `goalId`, `ideaId`, `brandId`). Exemplos de regras automáticas:

- Campanha com valor chega em **Aprovada** → receita prevista aparece no Financeiro; marcar como paga → receita recebida.
- Concluir tarefa recorrente → próxima ocorrência criada.
- Ideia → conteúdo mantém o vínculo; live → melhores momentos → cortes no pipeline.
- Excluir algo limpa as referências nos itens conectados (sem órfãos).

### AI Action System

A IA só altera dados por ações (`create` / `update` / `delete`, com códigos como `CREATE_TASK`, `COMPLETE_TASK`, `SET_PRIORITY`, `SET_DEADLINE`, `CREATE_SCRIPT`), validadas pelo mesmo schema zod da UI e registradas em `ai_actions`. Lotes podem referenciar itens criados no mesmo lote (`$ref:`). Exclusões e planos em lote viram **propostas** que o usuário confirma.

## Segurança

- Senhas com **scrypt** + sal; sessões com token aleatório em cookie `httpOnly`/`SameSite=Lax`/`Secure`, armazenado apenas como hash SHA-256; expiração deslizante.
- Toda query filtra pelo workspace da sessão; referências entre entidades são verificadas (não dá para ligar itens de outra conta); ids de outro usuário retornam 404.
- Checagem de `Origin` em requisições que alteram dados, rate limit em login/cadastro/IA, validação zod em todas as entradas, erros internos nunca expostos, cabeçalhos de segurança, API sem cache.
- A store do cliente é criada por sessão (nunca global no servidor) e a chave da Anthropic fica só no servidor.

## Próximos passos sugeridos

- Upload de arquivos/imagens (tabela `files` já existe; falta o adaptador de object storage).
- Web Push com servidor (hoje as notificações do sistema aparecem com o app aberto/em segundo plano).
- Transcrição de voz no servidor para navegadores sem Web Speech API (hoje há fallback para texto).
- Integrações oficiais com Instagram/TikTok/YouTube para importar métricas automaticamente.
- Comentários e histórico detalhado por tarefa (o `activity_log` já registra as mudanças).

## Versão HTML única (sem servidor)

`npm run build:html` gera `artifact/dist/aiva.html`: o mesmo app (mesmas telas, motor de IA local e regras) num único arquivo, com a "API" respondida no próprio navegador (`artifact/backend/`). Publicado como Artifact no claude.ai, ele guarda os dados num banco privado do usuário e sincroniza entre desktop e celular; fora do viewer, usa o armazenamento do dispositivo. Nessa versão o microfone não está disponível (o viewer bloqueia), então a voz vira digitação.
