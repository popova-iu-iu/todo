import { expect, test, type BrowserContext } from '@playwright/test';
import { mockGitlab } from '../unit/mockGitlab';
import { newNote, waitSaved } from './helpers';

/** Направить запросы к GitLab в имитацию (репозиторий в памяти). */
async function routeGitlab(context: BrowserContext, gl: ReturnType<typeof mockGitlab>) {
  await context.route('https://gitlab.example/**', async (route) => {
    const r = route.request();
    const res = await gl.fetchFn(r.url(), { method: r.method(), headers: await r.allHeaders().then((h) => ({ Authorization: h.authorization })), body: r.postData() || undefined });
    await route.fulfill({ status: res.status, body: Buffer.from(await res.arrayBuffer()), headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' } });
  });
}

async function fillGitlab(page: import('@playwright/test').Page, token = 'good-token') {
  await page.locator('[name=url]').fill('https://gitlab.example');
  await page.locator('[name=project]').fill('https://gitlab.example/me/backup.git');
  await page.locator('[name=token]').fill(token);
  await page.locator('[data-check]').click();
}

test('первая настройка копии и восстановление на новом устройстве', async ({ browser }) => {
  test.setTimeout(60_000);
  const gl = mockGitlab();

  // --- iPhone: есть заметка, настраиваем копию ---
  const phone = await browser.newContext({ ...test.info().project.use });
  await routeGitlab(phone, gl);
  const page = await phone.newPage();
  await newNote(page, 'recipe', 'Сырники как у бабушки', 'творог, яйцо, мука');
  await waitSaved(page);
  await page.goto('./#/settings');
  await page.locator('[data-go="setup"]').click();

  await fillGitlab(page, 'bad');
  await expect(page.locator('.err')).toContainText('токен');
  await fillGitlab(page);

  await page.locator('[name=p1]').fill('короткий');
  await page.locator('[name=p2]').fill('другой');
  await page.locator('[data-create]').click();
  await expect(page.locator('.err')).toContainText('Пароли не совпадают');
  await page.locator('[name=p1]').fill('сырники и чай');
  await page.locator('[name=p2]').fill('сырники и чай');
  await page.locator('[data-create]').click();

  await expect(page.locator('.warnbox')).toContainText('Без пароля копию открыть нельзя');
  const rk = (await page.locator('.rkey').textContent())!;
  expect(rk).toMatch(/^([A-Z2-9]{4}-){6}[A-Z2-9]{2}$/);
  await expect(page.locator('[data-finish]')).toBeDisabled();
  await page.locator('[data-agree]').check();
  await page.locator('[data-finish]').click();
  await expect(page.locator('.status')).toContainText('Всё сохранено');
  await expect(page.locator('.status')).toContainText('Последняя копия: сегодня');
  await expect(page.locator('.rows')).toContainText('me/backup');

  // в репозитории ничего читаемого
  const dump = [...gl.files().values()].map((v) => new TextDecoder().decode(v)).join('');
  expect(dump).not.toContain('Сырники');
  expect(dump).not.toContain('творог');

  // ещё изменение → «Сделать копию сейчас»
  await newNote(page, 'idea', 'Кафе с сырниками');
  await waitSaved(page);
  await page.goto('./#/settings');
  await page.locator('[data-now]').click();
  await expect(page.locator('.toast')).toContainText('Копия сделана');
  await phone.close();

  // --- Mac: новое устройство, вход ключом восстановления ---
  const mac = await browser.newContext({ ...test.info().project.use });
  await routeGitlab(mac, gl);
  const p2 = await mac.newPage();
  await p2.goto('./#/settings');
  await p2.locator('[data-restore]').click();
  await fillGitlab(p2);
  await expect(p2.locator('.form')).toContainText('уже есть копия');
  await p2.locator('[name=secret]').fill('неверный');
  await p2.locator('[data-unlock]').click();
  await expect(p2.locator('.err')).toHaveText('Неверный пароль');
  await p2.locator('[data-switch]').click();
  await p2.locator('[name=secret]').fill(rk.toLowerCase());
  await p2.locator('[data-unlock]').click();
  await expect(p2.locator('.toast')).toContainText('Загружено: 2');
  await expect(p2.locator('[data-shelf="recipe"] small')).toHaveText('1 заметка');
  await expect(p2.locator('[data-shelf="idea"] small')).toHaveText('1 заметка');

  // история версий
  await p2.goto('./#/restore');
  await expect(p2.locator('[data-ref]')).toHaveCount(2);
  await mac.close();
});
