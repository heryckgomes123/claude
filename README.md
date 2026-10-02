# INTELRA — A Máquina de Possibilidades

Landing page da **INTELRA**, agência de criação e tecnologia com IA. Um robô anfitrião conduz o visitante por
três mundos de criações (imagens, movimento, experiências), um teste de direção de arte e um orçamento guiado
em 4 etapas, com envio real para o Supabase.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Framer Motion · função serverless da Vercel (`api/`) · Supabase (Postgres)

## Rodando

```bash
npm install
npm run dev        # http://localhost:5173 — inclui a API /api/quote (mesmo código da Vercel)
npm run build      # typecheck (app, vite.config e api) + build em dist/
npm run preview    # serve dist/ (sem a API)
```

Sem as variáveis do Supabase, o orçamento funciona até a revisão e o envio responde
**“O envio pelo site ainda não foi configurado”** — a página nunca simula sucesso.

## Configuração

Copie `.env.example` para `.env.local` (local) ou cadastre as variáveis no painel da Vercel.

| Variável                    | Onde     | Uso                                                                 |
| --------------------------- | -------- | ------------------------------------------------------------------- |
| `VITE_WHATSAPP_NUMBER`      | público  | WhatsApp comercial (só dígitos, com DDI). Vazio = botões ocultos.   |
| `VITE_CONTACT_EMAIL`        | público  | E-mail no rodapé (opcional).                                        |
| `VITE_SITE_URL`             | público  | Canonical, Open Graph e schema.org.                                 |
| `VITE_INSTAGRAM_URL`        | público  | Link social (opcional).                                             |
| `SUPABASE_URL`              | servidor | URL do projeto Supabase.                                            |
| `SUPABASE_SERVICE_ROLE_KEY` | servidor | Chave service_role / secret key. **Nunca** com prefixo `VITE_`.     |
| `QUOTE_IP_SALT`             | servidor | Texto aleatório para anonimizar o IP no limite de envios.           |

### Supabase

1. Crie um projeto em supabase.com.
2. Rode a migração `supabase/migrations/20261002000000_create_quote_requests.sql`
   (SQL Editor do painel ou `supabase db push`).
3. Cadastre `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `QUOTE_IP_SALT` na Vercel (Production e Preview).
4. Faça um envio de teste e confira a linha em **Table Editor → quote_requests**.

A tabela tem RLS ligado, sem políticas, e privilégios revogados de `anon`/`authenticated`: **nenhum lead é
legível publicamente**. Só a função de servidor (com a service key) grava, e a equipe lê pelo painel.

### Proteções do envio

- Validação no cliente (por etapa) e no servidor (mesmo módulo: `src/lib/quote/validation.ts`).
- Campo-isca invisível e tempo mínimo de preenchimento (4 s).
- Chave de idempotência por solicitação: duplo clique ou nova tentativa não duplicam o lead.
- Limite de 5 envios por hora por IP (o IP é guardado só como hash SHA-256 com sal).
- “Solicitação enviada” só aparece depois que o banco confirma a gravação.
- Logs do servidor registram apenas o motivo técnico de falhas, nunca dados do formulário.

## Onde editar

```text
src/config/
├── site.ts        # contatos, WhatsApp, links sociais, endpoint
├── content.ts     # textos comerciais de todas as seções
├── quote.ts       # serviços, perguntas condicionais, faixas de investimento (compartilhado com a API)
├── portfolio.ts   # peças, filme, pares de antes/depois
├── mascot.ts      # falas do robô por cena e por ação
└── faq.ts         # FAQ (também gera o JSON-LD)
```

- **Faixas de investimento:** preencha `BUDGET_RANGES` em `src/config/quote.ts`. Vazio = só “Quero orientação”.
- **Antes/depois:** adicione pares reais em `BEFORE_AFTER` (`src/config/portfolio.ts`); o comparador
  aparece automaticamente no Mundo 1. Não use um “antes” fabricado.
- **Novas peças:** coloque a imagem em `src/assets/work/`, importe em `portfolio.ts` e marque o `kind`
  honestamente (`work`, `own`, `capability` ou `concept`).

## Analytics

`src/lib/analytics.ts` envia para `window.dataLayer` (GTM), `gtag` ou `plausible` quando existirem:
`hero_cta_click`, `service_selected`, `reference_added`, `quote_started`, `quote_step_completed`,
`quote_submitted` (só após sucesso real) e `whatsapp_clicked`. Nenhum evento carrega dados pessoais.

## Estrutura

```text
api/quote.ts            # POST /api/quote → Supabase (serverless Vercel)
supabase/migrations/    # tabela quote_requests + RLS
src/sections/           # Header, Hero (portal), WorldsIntro, WorldImages, WorldMotion, WorldExperiences,
                        # DirectionLab, Solutions, Process (+ FAQ), Closing, Footer
src/mascot/             # Mascot (arte oficial animada), MascotDock, useMascotLine (estados/falas)
src/project/            # ProjectSummary (“Meu projeto”)
src/quote/              # QuoteDialog (4 etapas), steps, fields
src/state/              # projeto (sessionStorage), UI, ações
src/assets/             # logos, mascote, portal, peças
public/media/           # filme do mascote (MP4 H.264 + WebM VP9)
```

## Acessibilidade e movimento

HTML semântico, foco visível, modais em `<dialog>` nativo (foco contido, Esc, retorno ao elemento de origem),
inputs nativos em todas as escolhas, `prefers-reduced-motion` respeitado. Vídeo só carrega ao dar play
(`preload="none"`), nunca toca com som automático e dois vídeos nunca tocam juntos.
