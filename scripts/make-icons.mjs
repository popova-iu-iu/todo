// Растрировать public/icons/icon.svg в PNG нужных размеров (один раз, результат коммитится).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/icons/icon.svg', import.meta.url), 'utf8');
const out = (n) => new URL(`../public/icons/${n}`, import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage();
async function shot(size, name, { pad = 0, bg = 'transparent', radius = true } = {}) {
  const inner = radius ? svg : svg.replace('rx="112"', 'rx="0"');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:${bg}"><div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${bg}"><div style="width:${size - pad * 2}px;height:${size - pad * 2}px">${inner.replace('<svg ', '<svg width="100%" height="100%" ')}</div></div></body></html>`);
  await page.screenshot({ path: out(name), omitBackground: bg === 'transparent' });
}
await shot(180, 'apple-touch-icon.png', { radius: false });
await shot(192, 'icon-192.png');
await shot(512, 'icon-512.png');
await shot(512, 'icon-maskable-512.png', { radius: false });
await browser.close();
