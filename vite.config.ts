import { defineConfig, loadEnv } from 'vite'
import type { Plugin, ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { FAQ } from './src/config/faq.ts'

/** Injeta os dados estruturados (schema.org) no index.html, usando os mesmos dados da página. */
function structuredData(siteUrl: string, sameAs: string[]): Plugin {
  return {
    name: 'intelra-structured-data',
    transformIndexHtml() {
      const organization = {
        '@context': 'https://schema.org',
        '@type': 'ProfessionalService',
        name: 'INTELRA',
        url: `${siteUrl}/`,
        logo: `${siteUrl}/icon-512.png`,
        image: `${siteUrl}/og-image.jpg`,
        description: 'Agência de criação e tecnologia com inteligência artificial: imagens, vídeos e experiências digitais com direção criativa.',
        areaServed: 'BR',
        knowsAbout: ['Direção de arte', 'Inteligência artificial', 'Vídeo e animação', 'Landing pages', 'Experiências digitais'],
        ...(sameAs.length ? { sameAs } : {}),
      }
      const faq = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      }
      return [organization, faq].map((data) => ({
        tag: 'script',
        attrs: { type: 'application/ld+json' },
        children: JSON.stringify(data),
        injectTo: 'head' as const,
      }))
    },
  }
}

/**
 * Em `npm run dev`, executa as funções de `api/` (as mesmas da Vercel) dentro do Vite,
 * para testar o envio do orçamento localmente.
 */
function devApi(): Plugin {
  return {
    name: 'intelra-dev-api',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/quote', async (req, res) => {
        try {
          const mod = (await server.ssrLoadModule('/api/quote.ts')) as Record<string, (r: Request) => Promise<Response>>
          const handler = mod[req.method ?? 'GET']
          if (!handler) {
            res.statusCode = 405
            res.end()
            return
          }
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
          if (!headers.has('x-forwarded-for')) headers.set('x-forwarded-for', req.socket.remoteAddress ?? '')
          const request = new Request(`http://localhost${req.originalUrl ?? req.url}`, {
            method: req.method,
            headers,
            body: chunks.length ? Buffer.concat(chunks) : undefined,
          })
          const response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          server.ssrFixStacktrace(error as Error)
          console.error(error)
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: 'server' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Disponibiliza variáveis de servidor (SUPABASE_*, QUOTE_*) para a API local.
  for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'QUOTE_IP_SALT']) {
    if (env[key] && !process.env[key]) process.env[key] = env[key]
  }
  const siteUrl = (env.VITE_SITE_URL || 'https://intelra.com.br').replace(/\/$/, '')
  const sameAs = [env.VITE_INSTAGRAM_URL].filter((u): u is string => !!u && u.startsWith('https://'))

  return {
    plugins: [react(), tailwindcss(), structuredData(siteUrl, sameAs), devApi()],
    build: {
      target: 'es2020',
      rolldownOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion-')) return 'motion'
            if (id.includes('node_modules/react')) return 'react'
          },
        },
      },
    },
  }
})
