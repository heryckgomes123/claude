/**
 * Servidor local.
 *   npm run dev   → API em :8787 (o Vite em :5173 faz proxy de /api)
 *   npm start     → API + frontend compilado (dist/) em :8787
 */
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createApp } from './app';
import { ensureReady } from './bootstrap';

const port = Number(process.env.PORT ?? 8787);
const serveStatic = process.argv.includes('--serve-static');
const root = new Hono();
root.route('/', createApp());

if (serveStatic) {
  const dist = join(process.cwd(), 'dist');
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png',
    '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon',
  };
  root.get('*', async (c) => {
    const rel = normalize(decodeURIComponent(new URL(c.req.url).pathname)).replace(/^([/\\])+/, '');
    let file = join(dist, rel);
    if (!file.startsWith(dist) || !existsSync(file) || !extname(file)) file = join(dist, 'index.html');
    const data = await readFile(file);
    const cache = file.includes(`${join('dist', 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache';
    return c.body(data, 200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': cache });
  });
}

ensureReady()
  .then((db) => {
    serve({ fetch: root.fetch, port }, () => {
      console.log(`\n  🐗 MIÚDA — Da Toca do Javali`);
      console.log(`  API ${serveStatic ? '+ app ' : ''}em http://localhost:${port}  (banco: ${db.driver}${db.persistent ? ', persistente' : ', memória'})\n`);
    });
  })
  .catch((e) => {
    console.error('Falha ao iniciar o banco:', e);
    process.exit(1);
  });
