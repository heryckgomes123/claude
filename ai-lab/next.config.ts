import path from 'node:path'
import type { NextConfig } from 'next'

// O repositório também contém a landing page (Vite) na raiz. Fixar a raiz deste app evita que o
// Next infira o diretório errado — essencial para o file tracing das funções na Netlify.
const projectRoot = path.resolve(__dirname)

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Área de membros e admin nunca devem ser cacheadas por CDN.
      { source: '/(lab|admin|api)/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
    ]
  },
}

export default nextConfig
