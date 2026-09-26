# INTELRA — Landing page

> **INTELRA AI LAB** (área de membros: prompts, workflows, ferramentas, referências e tutoriais) é um app Next.js
> separado em [`ai-lab/`](ai-lab/README.md), publicado na Netlify pelo `netlify.toml` da raiz. Esta landing page
> não depende dele.

Landing page institucional e de captação da **INTELRA** — soluções digitais para empresas e negócios.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Framer Motion

**Identidade:** preto + dourado metálico do logotipo + verde neon como acento de “resultado”, tipografia de pôster (Anton) inspirada nos posts da marca.

## Rodando

```bash
npm install
npm run dev       # desenvolvimento
npm run build     # typecheck + build de produção em dist/
npm run preview   # serve o build localmente
```

## Configuração (WhatsApp, URL, Instagram)

Tudo fica centralizado no arquivo **`.env`**:

| Variável               | Uso                                                         |
| ---------------------- | ----------------------------------------------------------- |
| `VITE_WHATSAPP_NUMBER` | Número comercial com DDI + DDD, só dígitos (ex.: `5511999999999`) |
| `VITE_SITE_URL`        | URL pública (canonical, Open Graph, schema.org)             |
| `VITE_INSTAGRAM_URL`   | Perfil do Instagram (rodapé e schema.org)                   |

> ⚠️ O número atual (`5500000000000`) é um placeholder — troque antes de publicar.

Todos os CTAs comerciais usam `whatsappLink()` de `src/config/site.ts`. As mensagens
pré-preenchidas ficam em `WHATSAPP_MESSAGES` (uma por seção), em `src/data/ecosystem.ts` (uma por frente)
e no configurador **Monte seu plano** (`src/data/builder.ts`), que monta a mensagem com o objetivo,
as frentes e o momento escolhidos pelo visitante.

## Estrutura

```text
src/
├── App.tsx                 # composição das seções
├── config/site.ts          # WhatsApp, URL, redes, mensagens
├── data/                   # todo o conteúdo (textos, serviços, FAQ, projetos…)
├── assets/brand/           # emblema e wordmark (recortados do logo, fundo transparente)
├── assets/work/            # imagens de projetos reais
├── sections/               # Navbar, Hero, Tapes, Problem, Ecosystem, Systems, Builder (Monte seu plano),
│                           # Process, Projects, Statement (Sobre), Audience, FAQ, FinalCTA, Footer
├── components/             # CtaButton (magnético), Emblem, EmberCanvas, Reveal, SectionHeader, StickyCTA…
├── hooks/                  # useScrolled, useSpotlight
└── styles/index.css        # tokens da marca (@theme) e utilitários
```

## Editando conteúdo

- **Textos e serviços:** arquivos em `src/data/`.
- **Projetos / cases:** `src/data/projects.ts`. O post de Social Media já é real; os demais são placeholders
  ("Case em breve"). Para publicar um case, coloque a imagem em `src/assets/work/`, importe no arquivo e preencha
  `image`, `client`, `description` e, se quiser, `href`. Não use métricas que não possam ser comprovadas.
- **FAQ:** `src/data/faq.ts` — o schema `FAQPage` (JSON-LD) é gerado a partir desse mesmo arquivo no build.

## Performance

- O emblema do Hero é 3D em CSS (perspectiva, anéis orbitais, brilho) — sem WebGL, sem bibliotecas pesadas.
- As faíscas douradas e as partículas são Canvas 2D leves, pausam fora da tela e com a aba oculta.
- Framer Motion via `LazyMotion` + `m`; `prefers-reduced-motion` é respeitado em toda a página.
- Fontes self-hosted (Anton, Geist, Geist Mono) com `unicode-range`.

## SEO

`index.html` traz title, description, canonical, Open Graph/Twitter (`public/og-image.png`), favicon,
manifest e dados estruturados (`ProfessionalService` + `FAQPage`) injetados no build.
