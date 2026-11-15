import { expect, test } from '@playwright/test';

test('открывается главная, оглавление работает', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.menu-btn')).toBeVisible();
  await page.locator('.menu-btn').click();
  await expect(page.locator('#side')).toHaveClass(/open/);
  const links = page.locator('#side a[data-id]');
  expect(await links.count()).toBeGreaterThan(20);
  await links.nth(1).click();
  await expect(page.locator('#side')).not.toHaveClass(/open/);
  await expect(page.locator('.eyebrow').first()).toBeVisible();
});

test('все главы курса рисуются без ошибок', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  const ids: string[] = await page.evaluate(() => (window as any).BOOK.order);
  expect(ids.length).toBeGreaterThan(20);
  for (const id of ids) {
    await page.evaluate((h) => (location.hash = h), '#' + id);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('main'), id).not.toContainText('Не получилось нарисовать');
  }
  expect(errors).toEqual([]);
});

test('звук: кнопка Play запускает и останавливает ритм', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  expect(await page.evaluate(() => typeof (window as any).Tone?.start)).toBe('function');
  // первая страница, где есть кнопка воспроизведения
  const ids: string[] = await page.evaluate(() => (window as any).BOOK.order);
  let found = false;
  for (const id of ids) {
    await page.evaluate((h) => (location.hash = h), '#' + id);
    if (await page.locator('.btn.play').count()) { found = true; break; }
  }
  expect(found).toBe(true);
  const play = page.locator('.btn.play').first();
  await play.click();
  await expect.poll(() => page.evaluate(() => (window as any).AUDIO.current())).not.toBeNull();
  await page.waitForTimeout(500);
  await play.click();
  await expect.poll(() => page.evaluate(() => (window as any).AUDIO.current())).toBeNull();
  expect(errors).toEqual([]);
});

test('работает без интернета и ставится на экран «Домой»', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('main h1')).toBeVisible();
  expect(await page.evaluate(() => typeof (window as any).Tone)).toBe('object');
  const fontsOk = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('16px "IBM Plex Sans"', 'Привет'); });
  expect(fontsOk).toBe(true);
  const manifest = await page.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]')!.getAttribute('href')!)).json());
  expect(manifest.display).toBe('standalone');
  expect(manifest.short_name).toBe('Музыка');
});
