/**
 * E2E de ponta a ponta pela interface (Playwright).
 * Requer o app rodando (npm run dev) — BASE_URL padrão http://localhost:5173.
 *   npm run test:e2e
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const exe = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await (await browser.newContext({ viewport: { width: 400, height: 860 }, hasTouch: true })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const step = (m) => console.log('✓', m);
const fail = (m) => {
  console.error('✗', m);
  process.exitCode = 1;
};

await page.goto(BASE);
await page.evaluate(() => localStorage.setItem('miuda.prefs', JSON.stringify({ sound: false, autoFullscreen: false })));
await page.getByRole('button', { name: /Entrar na Toca/i }).click({ timeout: 8000 });
step('splash → entrar');

await page.getByRole('button', { name: 'Convidado' }).click();
await page.getByLabel('Como a Toca vai te chamar?').fill('Testador E2E');
await page.getByRole('button', { name: /Entrar como convidado/ }).click();
await page.getByText('Bem-vindo à Toca do Javali').waitFor({ timeout: 10000 });
step('convidado criado → tutorial de primeiro acesso');
for (let i = 0; i < 8; i++) await page.getByRole('button', { name: /Próximo/ }).click();
await page.getByRole('button', { name: /^Entrar na Toca$/ }).click();
await page.locator('.h2-name', { hasText: 'Testador E2E' }).waitFor();
step('tutorial concluído → Home');

// Bot
await page.getByRole('button', { name: /Jogar\s*com bot/i }).first().click();
await page.getByRole('button', { name: 'Fácil' }).click();
await page.getByRole('button', { name: '3', exact: true }).first().click();
await page.getByRole('button', { name: /Começar partida/ }).click();
await page.waitForURL(/\/partida\//);
step('partida contra bot iniciada');
const deadline = Date.now() + 150_000;
let actions = 0;
while (Date.now() < deadline) {
  if (await page.locator('.results').count()) break;
  const roll = page.getByRole('button', { name: /^Rolar \d dados$/ });
  const best = page.getByRole('button', { name: /melhor/ });
  if (await roll.count()) {
    await roll.click();
    actions++;
  } else if (await best.count()) {
    await best.click();
    await page.getByRole('button', { name: /^Guardar/ }).click();
    actions++;
  }
  await page.waitForTimeout(700);
}
if (await page.locator('.results').count()) step(`partida finalizada pela interface (${actions} ações) → tela de resultado`);
else fail('partida não terminou no tempo');
await page.screenshot({ path: 'screenshots/e2e-result.png' });

// Sala privada
await page.goto(BASE + '/jogar');
await page.getByRole('button', { name: /Sala Privada/ }).click();
await page.getByText('Bots da casa: 0').waitFor();
await page.getByRole('slider', { name: 'Bots' }).fill('2');
await page.getByRole('button', { name: /Criar sala e gerar código/ }).click();
await page.waitForURL(/\/sala\//);
const code = (await page.locator('.room-code').innerText()).trim().slice(0, 6);
step(`sala privada criada com código ${code}`);
await page.getByRole('button', { name: /Iniciar partida/ }).click();
await page.waitForURL(/\/partida\//);
step('partida da sala iniciada');

// Código inválido
await page.goto(BASE + '/jogar');
await page.getByRole('button', { name: /Código/ }).first().click();
await page.getByLabel('Código da sala').fill('ABCDEF');
await page.getByRole('dialog').getByRole('button', { name: /^Entrar$/ }).click();
await page.locator('.callout--danger').waitFor();
step('código inválido mostra erro');
await page.keyboard.press('Escape');

// Criar clube
await page.goto(BASE + '/clubes/novo');
await page.getByPlaceholder(/Guardiões da Lareira/).fill(`E2E ${Date.now() % 10000}`);
for (let i = 0; i < 5; i++) await page.getByRole('button', { name: /Avançar/ }).click();
await page.getByRole('button', { name: /Criar clube/ }).click();
await page.getByRole('link', { name: /Administração/ }).waitFor({ timeout: 10000 });
step('clube criado pelo assistente → página do clube com administração');

// Notificações
await page.goto(BASE + '/notificacoes');
await page.getByRole('button', { name: /Marcar todas como lidas/ }).click();
step('notificações marcadas como lidas');

if (errors.length) fail(`erros de página: ${errors.join(' | ')}`);
else step('nenhum erro de JavaScript');
await browser.close();
