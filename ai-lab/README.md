# INTELRA AI LAB

Área de membros premium da INTELRA: **prompts + ferramentas + workflows + referências + tutoriais**, conectados
num laboratório criativo com IA. Idioma principal: português (Brasil). Deploy: **Netlify**.

> A landing page institucional da INTELRA (Vite) continua na raiz do repositório e não foi alterada.
> Este app vive em `ai-lab/` e é publicado separadamente.

## Stack

| Camada | Escolha |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions) + React 19 + TypeScript |
| UI | Tailwind CSS v4, componentes no padrão shadcn/ui sobre Radix, ícones Lucide, Sonner (toasts) |
| Banco | PostgreSQL + Drizzle ORM (driver `postgres`, compatível com poolers) |
| Autenticação | Better Auth — e-mail/senha, sessões no banco, rate limit persistente |
| Busca | Full-text do Postgres (português, sem acento, prefixo) + fallback por similaridade (pg_trgm) |
| Testes | Vitest (unitários + integração com Postgres real) e Playwright (E2E, mobile, acessibilidade com axe) |

## Arquitetura

```
src/
├── app/                      # rotas
│   ├── (auth)/               # /entrar, /criar-conta, /acesso (ativar código)
│   ├── lab/                  # área de membros (home, explore, prompts, workflows, tools,
│   │                         # references, tutorials, search, prompt-builder, my-lab, experiments)
│   ├── admin/                # Command Center (conteúdo, taxonomia, membros, códigos, novidades)
│   └── api/                  # auth, busca e health check
├── components/{ui,lab,admin} # design system e componentes de produto
├── features/                 # blocos de tela (bancada de prompt, builder, editor do admin…)
├── lib/                      # lógica pura e compartilhada (rótulos, validação, busca, builder)
└── server/
    ├── db/                   # schema Drizzle, conexão, manutenção de índices de busca
    ├── auth/                 # Better Auth + guards (requireMember, requirePermission…)
    ├── access/               # papéis, entitlements, memberships, códigos de acesso
    ├── queries/              # leitura (sempre escopada ao usuário quando é dado privado)
    ├── actions/              # server actions (validação zod + checagem de acesso em cada uma)
    ├── services/             # SearchProvider (ativo) · AIProvider, EmbeddingProvider, StorageProvider (contratos)
    └── content-ingest.ts     # motor idempotente de seed/importação
content/                      # conteúdo inicial (seed) — edite aqui, sem mexer em UI
drizzle/                      # migrações SQL versionadas
scripts/                      # migrate, seed, import-content, set-role
tests/                        # unit, integration, e2e
```

**Decisões principais**

- **Supertipo de conteúdo.** `content_item` guarda o que todo conteúdo tem (título, slug, status, categoria, busca,
  popularidade); `prompt`, `workflow`, `tool`, `reference` e `tutorial` guardam o específico (1:1). Assim favoritos,
  histórico, tags, coleções, busca global e o **grafo de conhecimento** (`content_relation`) usam FKs reais, sem
  tabelas duplicadas por tipo.
- **Acesso por entitlements.** Usuário → Membership → Plano → Entitlements (`lab.access`, `lab.prompt-builder`,
  `lab.collections`, `lab.experiments`, `content.premium`). A venda acontece fora do Lab; o acesso chega por
  **código de acesso** (gerado no admin, guardado só como hash) ou concessão manual. Integrações de pagamento
  futuras só precisam criar/encerrar memberships.
- **Segurança em camadas.** Não usamos `proxy.ts` (middleware): cada página chama um guard e **cada server action e
  route handler revalida sessão e permissão**. Dados privados (coleções, prompts próprios, experimentos) são sempre
  consultados com `user_id` do usuário logado. O admin responde 404 para quem não tem permissão.
- **Sem estado local.** Nada depende do sistema de arquivos; tudo persiste no Postgres (inclusive rate limit),
  compatível com funções serverless.
- **IA como contrato, não como demo.** `AIProvider`, `EmbeddingProvider` e `StorageProvider` definem as fronteiras
  para recursos futuros e retornam `null` hoje. Nenhuma tela finge ter IA.

## Rodando localmente

Requisitos: Node 20.9+ e um PostgreSQL 14+ (com as extensões `unaccent` e `pg_trgm`, disponíveis no Neon, Supabase e
na maioria dos provedores).

```bash
cd ai-lab
npm install
cp .env.example .env.local        # preencha DATABASE_URL e AUTH_SECRET
npm run db:migrate                # cria as tabelas
SEED_ADMIN_EMAIL=voce@intelra.com.br SEED_ADMIN_PASSWORD='uma-senha-longa' npm run db:seed
npm run dev                       # http://localhost:3000
```

O seed cria planos (FREE, PRO, LAB, ENTERPRISE — PRO e ENTERPRISE inativos, reservados), categorias, 12 ferramentas,
15 prompts, 6 workflows, 8 referências, 6 tutoriais e as primeiras novidades. Ele é idempotente: rodar de novo não
duplica nada e **não sobrescreve** edições feitas no admin (use `--update` para sobrescrever).

### Dando acesso a membros

1. Entre como admin → **Command Center → Códigos de acesso** → gere códigos (lote de até 500, CSV).
2. Entregue o código ao comprador (e-mail pós-compra, área do produto na plataforma de pagamento).
3. O comprador cria a conta em `/criar-conta` informando o código (ou ativa depois em `/acesso`).

Também é possível conceder/revogar acesso manualmente em **Membros**. Para promover alguém a admin num ambiente sem
admin ainda: `npm run user:role -- email@exemplo.com ADMIN` (com o `DATABASE_URL` daquele ambiente).

### Adicionando conteúdo em volume

- **Admin:** crie e edite qualquer tipo em **Conteúdo** (rascunho → revisão → publicado → arquivado). Mudanças no
  texto de um prompt geram uma nova versão.
- **Arquivos:** edite `content/*.ts` e rode `npm run db:seed`.
- **JSON em lote:** `npm run content:import -- arquivo.json [--dry-run] [--update]`. O formato é validado por
  `src/lib/content-bundle.ts` (mesmo formato do seed; relações por slug, ex.: `"WORKFLOW:foto-de-produto-para-video-comercial"`).

## Variáveis de ambiente

| Variável | Obrigatória | Onde | Uso |
| --- | --- | --- | --- |
| `DATABASE_URL` | sim (secreta) | build + runtime | Postgres persistente. Em serverless use a URL com pooler e `sslmode=require`. |
| `AUTH_SECRET` | sim (secreta) | runtime | Assina as sessões. Mín. 32 caracteres (`openssl rand -base64 48`). |
| `APP_URL` | recomendada | runtime | URL canônica (ex.: `https://lab.intelra.com.br`). Na Netlify, use escopo *Production*. |
| `SIGNUP_DEFAULT_PLAN` | não | runtime | Código de plano concedido a toda conta nova. Deixe vazio em produção. |
| `DATABASE_POOL_MAX` | não | runtime | Conexões por instância (padrão 5). |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | não | só no seed | Cria/promove o primeiro admin. |

Nenhuma variável `NEXT_PUBLIC_*` é usada: o navegador não precisa de configuração, e valores `NEXT_PUBLIC_*` seriam
fixados no build. Não há chaves de IA ou de storage porque esses recursos ainda não estão implementados.

## Deploy na Netlify

O `netlify.toml` na raiz do repositório já define `base = "ai-lab"`, o comando `npm run build:netlify` (aplica as
migrações e faz o build) e o Node 22. Deploy previews e branch deploys rodam só `npm run build` — **não** aplicam
migrações, para que um branch em teste nunca altere o banco de produção (use um banco separado para previews se
precisar testar migrações). A Netlify detecta o Next.js e usa o adaptador oficial automaticamente
(páginas dinâmicas, server actions e route handlers viram Netlify Functions).

1. Crie um Postgres persistente (Netlify DB/Neon, Supabase…) e copie a URL **com pooler**.
2. Na Netlify: *Add new site → Import from Git* e selecione este repositório (as configurações vêm do `netlify.toml`).
3. Em *Site configuration → Environment variables*, crie `DATABASE_URL` e `AUTH_SECRET` (escopos Builds + Functions)
   e `APP_URL` (escopo Production, com o domínio final).
4. Faça o deploy. O build aplica as migrações; em seguida, rode o seed uma vez apontando para o banco de produção:
   `DATABASE_URL='…' SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… npm run db:seed`.
5. Verifique `https://seu-dominio/api/health` → `{"status":"ok","database":"ok"}`.

Se preferir configurar pela interface em vez do `netlify.toml`: *Base directory* `ai-lab`, *Build command*
`npm run build:netlify`, *Publish directory* `ai-lab/.next`.

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` / `build` / `start` | Desenvolvimento, build de produção e servidor de produção |
| `npm run build:netlify` | Migrações + build (usado pela Netlify) |
| `npm run lint` / `typecheck` | ESLint e TypeScript (gera os tipos de rota antes) |
| `npm run db:generate` | Gera uma nova migração a partir do schema (`src/server/db/schema.ts`) |
| `npm run db:migrate` / `db:seed` | Aplica migrações / carrega o conteúdo inicial |
| `npm run content:import -- arquivo.json` | Importação em massa |
| `npm run user:role -- email ADMIN` | Define o papel de um usuário |
| `npm test` | Vitest (unitários; integração com `TEST_DATABASE_URL` apontando para um banco de teste) |
| `npm run test:e2e` | Playwright contra `next start` e um banco E2E dedicado (`E2E_DATABASE_URL`, precisa de `npm run build` antes) |

## Limitações conhecidas

- Sem envio de e-mail: não há verificação de e-mail nem redefinição de senha ("esqueci minha senha") ainda. O Better
  Auth suporta ambos; falta configurar um provedor de e-mail e as telas.
- Sem integração de pagamento/webhook: o acesso vem de códigos ou concessão manual.
- Imagens são URLs externas informadas no admin (sem upload); sem imagem, o Lab gera uma capa abstrata.
- Busca semântica, recomendações personalizadas avançadas e recursos de IA estão apenas arquitetados.
- Informações de ferramentas do seed estão marcadas como "verificação pendente" até alguém da equipe confirmar.
- Os seletores de relações do editor carregam até 5.000 itens; para catálogos maiores, trocar por busca no servidor.
- Páginas inexistentes dentro do Lab exibem a tela de "não encontrado" com status HTTP 200 (efeito do streaming com
  skeletons); o conteúdo protegido nunca é enviado.
