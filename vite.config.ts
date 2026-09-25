import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { FAQ } from './src/data/faq.ts'

/** Injeta os dados estruturados (schema.org) no index.html, usando os mesmos dados da página. */
function structuredData(siteUrl: string, instagram: string): Plugin {
  return {
    name: 'intelra-structured-data',
    transformIndexHtml() {
      const organization = {
        '@context': 'https://schema.org',
        '@type': 'ProfessionalService',
        name: 'INTELRA',
        alternateName: 'INTELRA Digital',
        url: `${siteUrl}/`,
        logo: `${siteUrl}/apple-touch-icon.png`,
        image: `${siteUrl}/og-image.png`,
        description:
          'A INTELRA cria soluções digitais para empresas: marketing, inteligência artificial, desenvolvimento, automação e presença digital.',
        slogan: 'Estratégia • Conteúdo • Tráfego • Resultados',
        areaServed: 'BR',
        knowsAbout: ['Marketing digital', 'Inteligência artificial', 'Automação', 'Desenvolvimento web', 'Branding', 'Presença digital'],
        sameAs: [instagram],
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const siteUrl = (env.VITE_SITE_URL ?? 'https://intelra.com.br').replace(/\/$/, '')
  const instagram = env.VITE_INSTAGRAM_URL ?? 'https://instagram.com/intelra'

  return {
    plugins: [react(), tailwindcss(), structuredData(siteUrl, instagram)],
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
