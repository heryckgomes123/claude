# INTELRA — Landing page

Landing page institucional e de captação da **INTELRA** — soluções digitais para empresas e negócios.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Framer Motion · Three.js (carregado sob demanda)

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
pré-preenchidas ficam em `WHATSAPP_MESSAGES` (geral) e em `src/data/objectives.ts` (uma por objetivo).

## Estrutura

```text
src/
├── App.tsx                 # composição das seções
├── config/site.ts          # WhatsApp, URL, redes, mensagens
├── data/                   # todo o conteúdo (textos, serviços, FAQ, projetos…)
├── sections/               # Navbar, Hero, Problem, Ecosystem, Systems, Objectives,
│                           # Process, Projects, Statement (Sobre), Audience, FAQ, FinalCTA, Footer
├── components/             # CtaButton, Reveal, SectionHeader, StickyCTA, ScrollText, Logo, Icons…
│   └── hero/               # HeroVisual (fallback CSS + lazy 3D) e coreScene (Three.js)
├── hooks/                  # useScrolled, useSpotlight
└── styles/index.css        # tokens da marca (@theme) e utilitários
```

## Editando conteúdo

- **Textos e serviços:** arquivos em `src/data/`.
- **Projetos / cases:** `src/data/projects.ts`. Hoje são placeholders visuais honestos ("Case em breve").
  Para publicar um case, preencha `client`, `description`, `image` (coloque o arquivo em `public/projects/`)
  e, se quiser, `href`. Não use métricas que não possam ser comprovadas.
- **FAQ:** `src/data/faq.ts` — o schema `FAQPage` (JSON-LD) é gerado a partir desse mesmo arquivo no build.

## Performance

- O núcleo 3D do Hero é um chunk separado (`three`), carregado em `requestIdleCallback`
  **depois** da primeira pintura. Até lá (e em navegadores sem WebGL ou com *Save-Data*) aparece um
  fallback leve em CSS.
- A cena pausa fora da viewport e com a aba oculta, limita o *pixel ratio*, usa menos geometria no
  mobile e se degrada sozinha (resolução → taxa de quadros) se o dispositivo não sustentar a animação.
- Framer Motion via `LazyMotion` + `m`; `prefers-reduced-motion` é respeitado em toda a página.
- Fontes self-hosted (Geist, Geist Mono, Instrument Serif) com `unicode-range`.

## SEO

`index.html` traz title, description, canonical, Open Graph/Twitter (`public/og-image.png`), favicon,
manifest e dados estruturados (`ProfessionalService` + `FAQPage`) injetados no build.
