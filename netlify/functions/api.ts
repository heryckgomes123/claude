/**
 * Netlify Function (runtime v2, Web Request/Response) que atende /api/*.
 * Toda a API vive em server/app.ts.
 */
import type { Config } from '@netlify/functions';
import { createApp } from '../../server/app';

const app = createApp();

export default async (req: Request) => app.fetch(req);

export const config: Config = {
  path: '/api/*',
};
