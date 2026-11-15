import { expect, test } from '@playwright/test';

test('приложение открывается без интернета после первой загрузки', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.locator('.tpl').first()).toBeVisible();
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
    return reg.active?.state;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('h1')).toHaveText('Мои заметки');
  await expect(page.locator('.tpl')).toHaveCount(11);
  const manifest = await page.evaluate(() => document.querySelector('link[rel=manifest]')?.getAttribute('href'));
  expect(manifest).toBeTruthy();
});
