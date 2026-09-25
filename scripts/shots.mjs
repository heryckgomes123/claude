/** Tour visual: tira screenshots das telas principais (mobile/desktop). */
import { chromium } from 'playwright';
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const exe = process.env.CHROMIUM_PATH || undefined;
const vp = process.argv[2] === 'desktop' ? { width: 1440, height: 900 } : process.argv[2] === 'tablet' ? { width: 820, height: 1180 } : { width: 390, height: 844 };
const tag = process.argv[2] || 'mobile';
const only = process.argv[3];
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: tag === 'mobile', hasTouch: tag !== 'desktop' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const shot = (n) => page.screenshot({ path: `screenshots/${tag}-${n}.png` });
const wait = (ms) => page.waitForTimeout(ms);

async function login(role) {
  const r = await (await fetch(`${BASE.replace('5173', '8787')}/api/auth/demo`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role }) })).json();
  await page.evaluate((t) => { localStorage.setItem('miuda.token', t); sessionStorage.setItem('miuda.skipIntro', '1'); localStorage.setItem('miuda.prefs', JSON.stringify({ sound: false })); }, r.token);
  return r;
}

if (!only || only === 'splash') {
  await page.goto(BASE);
  await wait(900); await shot('01-splash-a');
  await wait(2800); await shot('02-splash-b');
  await page.getByRole('button', { name: /Entrar na Toca/i }).click();
  await wait(1600); await shot('03-entrance');
}
await page.goto(BASE + '/?skipIntro');
const me = await login('PLAYER');
const routes = [
  ['04-tutorial', '/tutorial'], ['05-home', '/'], ['06-play', '/jogar'], ['07-clubs', '/clubes'], ['09-profile', '/perfil'],
  ['10-chars', '/perfil?aba=personagens'], ['11-extrato', '/perfil?aba=extrato'], ['12-ranking', '/ranking'], ['13-achievements', '/conquistas'],
  ['14-notifications', '/notificacoes'], ['15-settings', '/configuracoes'],
];
for (const [n, r] of routes) {
  if (only && !n.includes(only)) continue;
  await page.goto(BASE + r); await wait(1800); await shot(n);
  if (n === '04-tutorial') await page.evaluate(async () => { await fetch('/api/me', { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + localStorage.getItem('miuda.token') }, body: JSON.stringify({ tutorialDone: true }) }); });
}
if (!only || only === 'game') {
  const token = await page.evaluate(() => localStorage.getItem('miuda.token'));
  const g = await (await fetch(`${BASE.replace('5173', '8787')}/api/games/bot`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ difficulty: 'medio', rounds: 3, opponents: 3 }) })).json();
  await page.goto(`${BASE}/partida/${g.gameId}`); await wait(2000); await shot('16-game-a');
  const roll = page.getByRole('button', { name: /Rolar \d dados/ });
  if (await roll.count()) { await roll.click(); await wait(1500); await shot('17-game-roll'); }
}
if (!only || only === 'admin') {
  await login('CLUB_ADMIN');
  const clubs = await (await fetch(`${BASE.replace('5173', '8787')}/api/clubs`, { headers: { authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('miuda.token'))}` } })).json();
  const javali = clubs.items.find((c) => c.name === 'Clube do Javali');
  for (const [n, r] of [['20-club', `/clubes/${javali.id}`], ['21-cadmin', `/clubes/${javali.id}/admin`], ['22-cmembers', `/clubes/${javali.id}/admin/membros`], ['23-ccaixa', `/clubes/${javali.id}/admin/caixa`], ['24-cdados', `/clubes/${javali.id}/admin/dados`]]) {
    await page.goto(BASE + r); await wait(1800); await shot(n);
  }
  await login('AGENT'); await page.goto(BASE + '/agente'); await wait(1800); await shot('25-agent');
  await login('SUPER_ADMIN');
  for (const [n, r] of [['26-command', '/admin'], ['27-economy', '/admin/economia'], ['28-players', '/admin/jogadores']]) { await page.goto(BASE + r); await wait(2000); await shot(n); }
}
console.log('erros:', errors.length ? errors.slice(0, 15) : 'nenhum');
await browser.close();
