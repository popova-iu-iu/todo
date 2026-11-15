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

test('на телефоне нигде нет прокрутки вбок', async ({ page }) => {
  await page.goto('./');
  const ids: string[] = await page.evaluate(() => (window as any).BOOK.order);
  const bad: string[] = [];
  for (const id of ['home', ...ids]) {
    await page.evaluate((h) => (location.hash = h), '#' + id);
    await expect(page.locator('main h1')).toBeVisible();
    const over = await page.evaluate(() => {
      const W = document.documentElement.clientWidth;
      const out: string[] = [];
      document.querySelectorAll('main *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width && r.right > W + 1) out.push(`${el.tagName.toLowerCase()}.${(el as HTMLElement).className?.baseVal ?? (el as HTMLElement).className} → ${Math.round(r.right)}px`);
      });
      document.querySelectorAll('main .scroll').forEach((el) => { if (el.scrollWidth > el.clientWidth + 1) out.push('прокрутка в .scroll'); });
      return out.slice(0, 3);
    });
    if (over.length) bad.push(`${id}: ${over.join('; ')}`);
  }
  expect(bad).toEqual([]);
});

test('большая схема открывается крупно и закрывается', async ({ page }) => {
  await page.goto('./');
  const ids: string[] = await page.evaluate(() => (window as any).BOOK.order);
  for (const id of ids) {
    await page.evaluate((h) => (location.hash = h), '#' + id);
    if (await page.locator('.zoom-btn').count()) break;
  }
  const btn = page.locator('.zoom-btn').first();
  await expect(btn).toBeVisible();
  await btn.click();
  await expect(page.locator('.zoomer svg')).toBeVisible();
  const box = await page.locator('.zoomer svg').boundingBox();
  expect(box!.width).toBeLessThanOrEqual(400);
  await page.locator('.zclose').click();
  await expect(page.locator('.zoomer')).toHaveCount(0);
  await expect(btn).toBeVisible();
});

test('кнопки «держи — звучит» не залипают при коротком касании', async ({ page }) => {
  await page.goto('./');
  const ids: string[] = await page.evaluate(() => (window as any).BOOK.order);
  let found = false;
  for (const id of ids) {
    await page.evaluate((h) => (location.hash = h), '#' + id);
    if (await page.locator('main button.btn', { hasText: 'Пила' }).count()) { found = true; break; }
  }
  expect(found).toBe(true);
  await page.evaluate(() => {
    const T = (window as any).Tone; (window as any).__on = 0;
    const P = T.Oscillator.prototype; const s = P.start, st = P.stop;
    P.start = function (...a: any[]) { (window as any).__on++; return s.apply(this, a); };
    P.stop = function (...a: any[]) { (window as any).__on--; return st.apply(this, a); };
  });
  const b = page.locator('main button.btn', { hasText: 'Пила' }).first();
  await b.scrollIntoViewIfNeeded();
  // быстрое касание: палец отпущен раньше, чем звук успел включиться
  await b.dispatchEvent('pointerdown');
  await b.dispatchEvent('pointerup');
  await b.dispatchEvent('pointerleave');
  await expect.poll(() => page.evaluate(() => (window as any).__on), { timeout: 3000 }).toBe(0);
  // долгое нажатие: звучит, пока держишь
  await b.dispatchEvent('pointerdown');
  await expect.poll(() => page.evaluate(() => (window as any).__on)).toBe(1);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => (window as any).__on)).toBe(1);
  await b.dispatchEvent('pointerup');
  await expect.poll(() => page.evaluate(() => (window as any).__on)).toBe(0);
});
