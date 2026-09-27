# INTELRA AI LAB

Área de membros da INTELRA: o aluno compra, cria a conta com o e-mail da compra e acessa **prompts, aulas,
ferramentas e favoritos**. O professor cadastra tudo por um painel simples. Idioma: português (Brasil).
Deploy: **Netlify**.

> A landing page institucional da INTELRA (Vite) continua na raiz do repositório e não foi alterada.
> Este app vive em `ai-lab/` e é publicado separadamente.

## Como funciona

```
Compra na Hotmart/Kiwify ──webhook──▶ liberação do e-mail (access_grant)
                                             │
Aluno cria a conta com esse e-mail ──────────┴──▶ /lab abre automaticamente
Reembolso / chargeback / cancelamento ──webhook──▶ acesso removido na hora
```

**Aluno** (`/lab`): Início (busca, próxima aula, novos prompts) · Prompts (busca sem acento, categorias, campos
personalizáveis, copiar, favoritar) · Aulas (módulos, vídeo do YouTube/Vimeo/Panda, texto, material, progresso) ·
Ferramentas · Favoritos. Funciona no celular com menu inferior.

**Professor** (`/admin`, só para papel ADMIN — os demais recebem 404):

| Aba | O que faz |
| --- | --- |
| Visão geral | Números, primeiros passos, prompts mais copiados, últimas vendas |
| Prompts | Criar/editar/excluir, imagem de exemplo (upload até 3 MB), rascunho, **importar planilha CSV** |
| Aulas | Módulo, ordem, link do vídeo, texto, material e prompts usados na aula |
| Ferramentas | Nome, categoria, link e "como usar" |
| Alunos | Todos os e-mails liberados (compra ou manual), se já criaram conta, progresso, bloquear/reativar, **liberar e-mails em lote** |
| Vendas | Link de compra e de suporte, URLs dos webhooks, status das integrações e registro de cada notificação recebida |

### Escrevendo prompts

Partes que o aluno pode trocar ficam entre chaves duplas: `{{produto}}`, ou com exemplo: `{{cor|dourado}}`.
Na tela do prompt, cada campo vira uma caixa de texto; o que ficar em branco usa o exemplo.

### Escrevendo aulas

Texto simples: linhas começando com `## ` viram títulos; com `• `, `- ` ou `1. ` viram listas.

### Importando prompts por planilha

Colunas: `titulo, categoria, descricao, prompt, negativo, dicas, ferramentas` (só título, categoria e prompt são
obrigatórios; várias dicas separadas por `|`). Aceita CSV com vírgula ou ponto e vírgula (Excel em português).
O painel oferece uma planilha modelo para baixar.

## Stack

| Camada | Escolha |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions) + React 19 + TypeScript |
| UI | Tailwind CSS v4, componentes no padrão shadcn/ui sobre Radix, ícones Lucide, Sonner |
| Banco | PostgreSQL + Drizzle ORM (driver `postgres`, compatível com poolers) — imagens também ficam no banco |
| Autenticação | Better Auth — e-mail/senha, sessões no banco, rate limit persistente, confirmação de e-mail e nova senha via Resend |
| Testes | Vitest (unitários + integração com Postgres real) e Playwright (fluxos, segurança, mobile, acessibilidade com axe) |

## Arquitetura

```
src/
├── app/
│   ├── (auth)/          # /entrar, /criar-conta, /acesso, /esqueci-senha, /redefinir-senha
│   ├── lab/             # área do aluno
│   ├── admin/           # painel do professor
│   └── api/             # auth, webhooks (hotmart, kiwify), media (imagens), health
├── components/          # design system (ui/) e peças da área (lab/)
├── features/            # formulários e blocos interativos (auth, bancada do prompt, painel)
├── lib/                 # lógica pura: variáveis de prompt, texto/vídeo das aulas, CSV
└── server/
    ├── db/              # schema Drizzle e conexão
    ├── auth/            # Better Auth + guards (requireMember, requireAdmin, assert*)
    ├── access/          # papéis e liberações de acesso por e-mail
    ├── webhooks/        # parse (puro, testado), verificação de assinatura e processamento
    ├── actions/         # server actions (zod + checagem de acesso em cada uma)
    ├── queries.ts       # leituras da área do aluno
    ├── admin-queries.ts # leituras do painel
    ├── settings.ts      # link de compra / suporte
    └── email.ts         # e-mails transacionais (Resend)
drizzle/                 # migrações SQL versionadas
scripts/                 # migrate, seed (+ seed-data/content.json), set-role
tests/                   # unit, integration, e2e
```

**Decisões**

- **Acesso por e-mail da compra.** A tabela `access_grant` guarda cada liberação (plataforma + id da venda). O acesso é
  verificado a cada requisição: um reembolso processado agora já bloqueia a próxima página. Vendas são idempotentes
  (reenvios não duplicam) e o reembolso de uma venda não derruba outra compra ou uma liberação manual do mesmo e-mail.
  Cancelamento de assinatura mantém o acesso até o fim do período pago, quando a plataforma informa a data.
- **Webhooks autenticados.** Hotmart: cabeçalho `X-HOTMART-HOTTOK` comparado em tempo constante. Kiwify: HMAC-SHA1 do
  corpo bruto (`?signature=`). Requisições recusadas são registradas com limite (não enchem o banco) e nunca guardam
  o id do evento. Corpo limitado a 256 KB. Erro interno responde 500 para a plataforma reenviar.
- **Confirmação de e-mail.** Com a Resend configurada, a conta só entra depois de confirmar o e-mail — é isso que
  prova que quem cria a conta é o dono do e-mail da compra. Sem e-mail configurado o painel mostra o alerta.
- **Segurança em camadas.** Sem `proxy.ts`: cada página chama um guard e **cada server action e route handler
  revalida sessão e papel**. O papel nunca pode ser definido no cadastro. Imagens enviadas são validadas pelo
  conteúdo real (JPG/PNG/WEBP/GIF), servidas só para quem tem acesso e com CSP `sandbox`.
- **Sem estado local.** Tudo persiste no Postgres (inclusive rate limit e imagens), compatível com serverless.

## Rodando localmente

Requisitos: Node 20.9+ e PostgreSQL 14+ (com as extensões `unaccent` e `pg_trgm`, disponíveis no Neon, Supabase e na
maioria dos provedores).

```bash
cd ai-lab
npm install
cp .env.example .env.local        # preencha DATABASE_URL e AUTH_SECRET
npm run db:migrate                # cria as tabelas
SEED_ADMIN_EMAIL=voce@intelra.com.br SEED_ADMIN_PASSWORD='uma-senha-longa' npm run db:seed
npm run dev                       # http://localhost:3000
```

O seed cria 15 prompts, 12 aulas (2 módulos) e 12 ferramentas de exemplo, e o professor. Ele é idempotente e **não
sobrescreve** o que foi editado no painel (use `--update` para sobrescrever os itens do seed). Para criar só o
professor, sem conteúdo de exemplo: `npm run db:seed -- --no-content`.

Para testar a liberação sem uma venda real, entre como professor → **Alunos** → libere seu e-mail de teste.

## Variáveis de ambiente

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `DATABASE_URL` | sim (secreta) | Postgres persistente. Em serverless use a URL com pooler e `sslmode=require`. |
| `AUTH_SECRET` | sim (secreta) | Assina as sessões. Mín. 32 caracteres (`openssl rand -base64 48`). |
| `APP_URL` | recomendada | URL final (ex.: `https://lab.intelra.com.br`). Usada nos links dos webhooks e e-mails. |
| `HOTMART_HOTTOK` | para Hotmart (secreta) | Hottok da conta Hotmart. |
| `HOTMART_PRODUCT_IDS` | não | Ids de produto que liberam o Lab (vírgula). Vazio = qualquer produto da conta. |
| `KIWIFY_WEBHOOK_TOKEN` | para Kiwify (secreta) | Token do webhook da Kiwify. |
| `KIWIFY_PRODUCT_IDS` | não | Ids de produto que liberam o Lab (vírgula). Vazio = qualquer produto da conta. |
| `RESEND_API_KEY` + `EMAIL_FROM` | recomendada (secreta) | Boas-vindas, confirmação de e-mail e "esqueci minha senha". |
| `DATABASE_POOL_MAX` | não | Conexões por instância (padrão 5). |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | só no seed | Cria/promove o professor. |

Nenhuma variável `NEXT_PUBLIC_*` é usada: nenhum segredo chega ao navegador.

## Conectando as vendas

**Hotmart:** Ferramentas → Webhook (API e notificações) → cadastrar. URL `https://SEU-DOMINIO/api/webhooks/hotmart`,
versão 2.0.0, eventos: compra aprovada, completa, reembolsada, chargeback, cancelada, em disputa e cancelamento de
assinatura. Copie o Hottok para `HOTMART_HOTTOK`.

**Kiwify:** Apps → Webhooks → criar. URL `https://SEU-DOMINIO/api/webhooks/kiwify`, eventos: compra aprovada,
reembolso, chargeback e assinatura cancelada. Copie o token para `KIWIFY_WEBHOOK_TOKEN`.

Depois use o botão de teste da plataforma: o resultado aparece em **Painel → Vendas → Notificações recebidas**.
As URLs prontas para copiar também estão nessa tela.

## Deploy na Netlify

O `netlify.toml` na raiz já define `base = "ai-lab"`, o comando `npm run build:netlify` (aplica as migrações e faz o
build) e o Node 22. Deploy previews e branch deploys rodam só `npm run build` — **não** aplicam migrações.

1. Crie um Postgres persistente (Netlify DB/Neon, Supabase…) e copie a URL **com pooler**.
2. Na Netlify: *Add new site → Import from Git* e selecione este repositório.
3. Em *Site configuration → Environment variables*, crie as variáveis da tabela acima.
4. Faça o deploy. Depois rode o seed uma vez apontando para o banco de produção:
   `DATABASE_URL='…' SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… npm run db:seed` (acrescente `-- --no-content` se não
   quiser o conteúdo de exemplo).
5. Verifique `https://seu-dominio/api/health` → `{"status":"ok","database":"ok"}`.

> A migração `0002_member_area` troca o modelo anterior (planos, coleções, workflows, experimentos…) pelo modelo
> simples. Contas e senhas são mantidas; o conteúdo do modelo antigo é removido.

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` / `build` / `start` | Desenvolvimento, build e servidor de produção |
| `npm run build:netlify` | Migrações + build (usado pela Netlify) |
| `npm run lint` / `typecheck` | ESLint e TypeScript |
| `npm run db:generate` | Gera uma nova migração a partir do schema |
| `npm run db:migrate` / `db:seed` | Aplica migrações / carrega o conteúdo inicial e o professor |
| `npm run user:role -- email ADMIN` | Torna um usuário professor (ou `USER` para remover) |
| `npm test` | Vitest (integração com `TEST_DATABASE_URL` apontando para um banco `_test`) |
| `npm run test:e2e` | Playwright contra `next start` e um banco E2E dedicado (rode `npm run build` antes) |

## Limitações conhecidas

- Sem a Resend configurada não há confirmação de e-mail nem "esqueci minha senha" (a tela orienta a falar com o
  suporte). Em produção, configure os e-mails antes de divulgar.
- Assinaturas: cada cobrança recorrente aprovada vira uma linha em **Alunos** (uma por transação).
- Páginas inexistentes dentro da área exibem "não encontrado" com status HTTP 200 (efeito do streaming com
  skeletons); o conteúdo protegido nunca é enviado.
- Outras plataformas (Eduzz, Monetizze, Stripe…) ainda não têm webhook; use a liberação manual ou peça a integração.
