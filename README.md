# R BEAUTY OS — Command Center (MVP · Fase 1)

Sistema operacional interno da **R Beauty Salão de Beleza** (cabelo, unhas, cílios e sobrancelhas).
Cobre o ciclo completo de um dia de operação:

```text
LOGIN → CLIENTE → AGENDAMENTO → CONFIRMAÇÃO → CHEGADA → ATENDIMENTO
      → FINALIZAÇÃO → PAGAMENTO → COMISSÃO → CAIXA → DASHBOARD
```

Todos os números da interface vêm do banco (`DATABASE → QUERY → SERVICE → COMPONENT`).
Os dados iniciais de demonstração são criados **apenas** pelo seed e são identificados como **DEMO / SEED**.

---

## Stack

| Camada       | Tecnologia                                                                          |
| ------------ | ----------------------------------------------------------------------------------- |
| Framework    | Next.js 16 (App Router, Server Components, Server Actions) + React 19               |
| Linguagem    | TypeScript (strict)                                                                 |
| UI           | Tailwind CSS 4, componentes no padrão shadcn/ui sobre Radix, Lucide, Sonner, cmdk   |
| Gráficos     | Recharts                                                                            |
| Banco        | PostgreSQL + Drizzle ORM / drizzle-kit (migrations SQL versionadas)                 |
| Validação    | Zod 4 (mesmos schemas no cliente e no servidor)                                     |
| Autenticação | Sessões próprias em banco (token aleatório, hash SHA-256, cookie httpOnly) + bcrypt |
| Deploy       | Netlify (runtime Next.js da Netlify / OpenNext)                                     |

## Estrutura

```text
src/
  app/            rotas (login, /painel/*), layouts, loading/error
  components/     ui/ (primitivos) · shared/ (MetricCard, StatusBadge, EmptyState…) · módulos
  actions/        server actions: autenticação + permissão + Zod → services
  services/       regras de negócio e queries (agenda, disponibilidade, atendimento, caixa…)
  schemas/        schemas Zod
  db/             schema Drizzle e conexão
  lib/            sessão/RBAC, auditoria, erros, wrapper de actions
  config/         permissões, navegação, rótulos de domínio
  utils/ hooks/ types/
drizzle/          migrations SQL (inclui extensões e a exclusion constraint da agenda)
scripts/          migrate, seed, reset, bootstrap, QA de backend
```

---

## Instalação e desenvolvimento local

Pré-requisitos: **Node.js 22+** e **PostgreSQL 14+** (local, Docker ou um banco gerenciado).

```bash
npm install
cp .env.example .env          # ajuste DATABASE_URL
npm run db:migrate            # cria tabelas, extensões e constraints
npm run db:seed               # dados de demonstração (DEMO / SEED)
npm run dev                   # http://localhost:3000
```

Banco local rápido com Docker:

```bash
docker run -d --name rbeauty-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=rbeauty -p 5432:5432 postgres:16
```

### Variáveis de ambiente

| Variável                   | Obrigatória | Descrição                                                                       |
| -------------------------- | ----------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL`             | sim         | URL do PostgreSQL. Em produção use a URL **pooled** (Neon, Supabase, Railway…). |
| `NEXT_PUBLIC_APP_TIMEZONE` | não         | Fuso do salão (padrão `America/Sao_Paulo`). Não é segredo.                      |
| `BOOTSTRAP_OWNER_NAME`     | não         | Nome da primeira proprietária (`db:bootstrap`).                                 |
| `BOOTSTRAP_OWNER_EMAIL`    | bootstrap   | E-mail da primeira proprietária (`db:bootstrap`).                               |
| `BOOTSTRAP_OWNER_PASSWORD` | bootstrap   | Senha inicial (mín. 10 caracteres). Troque após o primeiro acesso.              |
| `ALLOW_DEMO_SEED`          | não         | `true` libera seed/reset com `NODE_ENV=production`. Padrão: bloqueado.          |

Nenhum segredo usa o prefixo `NEXT_PUBLIC_`; o navegador nunca recebe credenciais.

### Scripts de banco

| Comando                | O que faz                                                                    |
| ---------------------- | ---------------------------------------------------------------------------- |
| `npm run db:migrate`   | Aplica as migrations de `drizzle/`.                                          |
| `npm run db:generate`  | Gera nova migration a partir de `src/db/schema.ts`.                          |
| `npm run db:seed`      | Cria os dados DEMO (só roda em banco vazio).                                 |
| `npm run db:reset`     | **Apaga todo o banco**, recria o schema e o seed DEMO (limpar e recriar).    |
| `npm run db:bootstrap` | Produção: cria configurações, categorias e a 1ª conta OWNER, sem dados DEMO. |
| `npm run db:studio`    | Drizzle Studio.                                                              |

O seed é determinístico e relativo à data atual: ~4 profissionais, 20 clientes, 15 serviços,
~40 agendamentos (histórico, hoje e próximos dias), 20 pagamentos com comissões, caixas
fechados + caixa do dia aberto, 12 produtos (3 com estoque baixo) e um bloqueio de agenda.

### Usuários de teste (somente desenvolvimento / DEMO)

Senha de todos: **`RBeauty@2026`**

| Perfil       | E-mail                      | Após o login          |
| ------------ | --------------------------- | --------------------- |
| OWNER        | `proprietaria@rbeauty.demo` | Dashboard completo    |
| MANAGER      | `gerente@rbeauty.demo`      | Dashboard gerencial   |
| RECEPTION    | `recepcao@rbeauty.demo`     | Dashboard operacional |
| PROFESSIONAL | `ana@rbeauty.demo`          | Minha agenda          |

> Essas contas existem apenas no seed DEMO. Em produção use `db:bootstrap` e crie a equipe em
> **Configurações → Equipe**.

### Qualidade

```bash
npm run lint          # ESLint (next/core-web-vitals + typescript)
npm run typecheck     # tsc --noEmit
npm run format        # Prettier
npm run qa:backend    # red team de regras de negócio e RBAC direto nos services (use em banco DEMO)
```

---

## Build e deploy (GitHub → Netlify → Produção)

```bash
npm run build         # build de produção
npm start             # servir o build localmente
```

### Demonstração/testes em 10 minutos (só navegador, sem terminal)

1. **Banco** — em [neon.tech](https://neon.tech) crie um projeto (região São Paulo, se disponível) e copie a
   _connection string_ **pooled** (`postgresql://…-pooler…/neondb?sslmode=require`).
2. **Site** — em [app.netlify.com](https://app.netlify.com): **Add new site → Import an existing project → GitHub**,
   escolha este repositório e, em **Branch to deploy**, a branch com o código.
3. **Variáveis** (na mesma tela, _Add environment variables_):
   - `DATABASE_URL` = connection string do Neon
   - `ALLOW_DEMO_SEED` = `true` (cria os dados DEMO no primeiro build, apenas se o banco estiver vazio)
4. **Deploy site**. O build roda `npm run netlify:build` (migrations → seed DEMO opcional → `next build`).
5. Abra a URL `https://<seu-site>.netlify.app` no computador e no celular e entre com os usuários de teste acima.

### Produção real

1. Mesmo processo, mas **sem** `ALLOW_DEMO_SEED` (ou `false`).
2. Após o primeiro deploy, com a mesma `DATABASE_URL` no terminal, rode uma única vez:
   ```bash
   BOOTSTRAP_OWNER_EMAIL=voce@rbeauty.com.br BOOTSTRAP_OWNER_PASSWORD='senha-forte' npm run db:bootstrap
   ```
3. Acesse `/login`, entre como proprietária e cadastre profissionais, serviços e equipe.

Observações: as extensões `pg_trgm` e `btree_gist` são criadas pela primeira migration (Neon e Supabase suportam);
o `netlify.toml` fixa Node 22 e o runtime Next.js da Netlify é aplicado automaticamente.

---

## Perfis e permissões (RBAC)

A matriz fica em `src/config/permissions.ts` e é aplicada **no servidor** em toda página
(`requirePagePermission`), server action (`createAction`) e service (`assertCan`).
O perfil nunca vem do cliente: o usuário é resolvido pelo cookie de sessão no banco.

| Área                            |   OWNER    |   MANAGER   |     RECEPTION     |            PROFESSIONAL            |
| ------------------------------- | :--------: | :---------: | :---------------: | :--------------------------------: |
| Dashboard                       | ✔ completo | ✔ gerencial |   ✔ operacional   |             ✔ pessoal              |
| Agenda / agendamentos           |     ✔      |      ✔      |         ✔         |    somente a própria (leitura)     |
| Clientes                        |     ✔      |      ✔      | ✔ (sem desativar) | somente clientes atendidas por ela |
| Profissionais                   |  ✔ gerir   |   ✔ gerir   |      leitura      |      somente o próprio perfil      |
| Serviços                        |     ✔      |      ✔      |      leitura      |              leitura               |
| Atendimento (iniciar/finalizar) |     ✔      |      ✔      |         ✔         |        somente os próprios         |
| Desconto / pagamento            |     ✔      |      ✔      |         ✔         |                 —                  |
| Caixa                           |     ✔      |      ✔      |         ✔         |                 —                  |
| Financeiro                      |     ✔      |      ✔      |         —         |                 —                  |
| Comissões                       |  ✔ fechar  |  ✔ fechar   |         —         |   somente as próprias (leitura)    |
| Estoque                         |     ✔      |      ✔      |      leitura      |                 —                  |
| Configurações · empresa         |     ✔      |   leitura   |         —         |                 —                  |
| Configurações · agenda          |     ✔      |      ✔      |         —         |                 —                  |
| Configurações · equipe/usuários |     ✔      |      —      |         —         |                 —                  |

## Regras de negócio principais

- **Disponibilidade**: horário do salão ∩ jornada da profissional − pausas − bloqueios − agendamentos
  ativos, respeitando a duração do serviço e o intervalo de grade (configurável).
- **Conflito de agenda**: validado na interface (só horários livres aparecem), no service (dentro de
  transação com lock da profissional) e no banco por `EXCLUDE USING gist` — à prova de concorrência.
- **Status do agendamento**: Agendado → Confirmado → Chegou → Em atendimento → Finalizado; ou Cancelado
  (com motivo) / Não compareceu (após o horário).
- **Atendimento**: itens com quantidade, desconto único distribuído proporcionalmente entre os itens.
- **Pagamento** (Pix, dinheiro, débito, crédito, crédito parcelado 2–12x): exige caixa aberto; valores
  sempre recalculados no servidor; em uma transação registra pagamento, comissões, entrada no caixa e
  finaliza atendimento/agendamento. Pagamento duplicado é bloqueado.
- **Comissão** = (valor do item − parte do desconto) × percentual. O percentual é gravado no momento do
  lançamento (serviço ou padrão da profissional) e a comissão nunca é recalculada automaticamente;
  “fechar” (marcar como paga) é uma ação explícita de OWNER/MANAGER.
- **Caixa**: abertura com saldo inicial → entradas/saídas/sangrias/suprimentos → fechamento com saldo
  contado. Saldo esperado (gaveta) = inicial + entradas em dinheiro + suprimentos − saídas em dinheiro − sangrias.
- **Auditoria**: `audit_logs` registra login (e falhas), criação/edição/desativação, cancelamentos,
  pagamentos, fechamento de comissões e de caixa, movimentações de estoque.
- **Login**: bloqueio após 5 falhas em 15 minutos por e-mail; “lembrar acesso” = sessão de 30 dias
  (senão 12 h); desativar usuário ou trocar senha/perfil encerra as sessões.

## Preparado para a Fase 2

- A raiz `/` está livre para a futura **experiência pública** (site, portfólio, booking); o Command Center vive em `/painel`.
- O motor de agenda (`services/availability.ts` + `services/appointments.ts`) é independente da UI e pode ser
  exposto a um **booking engine** público; o enum `appointment_source` já prevê `ONLINE`.
- Clientes com telefone/WhatsApp normalizados, aniversário e histórico — base para CRM, WhatsApp e marketing.
- Permissões centralizadas e auditoria prontas para novos módulos (IA, relatórios, multiunidade).

## Limitações conhecidas do MVP

- Upload de fotos/logo ainda por URL (sem armazenamento de arquivos).
- Um pagamento (uma forma) por atendimento; sem estorno.
- Agendamentos só nos horários livres da grade (sem “encaixe fora do expediente” na agenda; o encaixe
  imediato existe em **Atendimento → Novo atendimento**).
- Sem modo escuro; sem testes automatizados de UI no repositório (a validação E2E foi feita com Playwright fora do repo).
