import { expect, type Locator, type Page } from '@playwright/test';

/** Свайп пальцем (touch-события через CDP — как на iPhone). */
export async function swipe(page: Page, target: Locator, dx: number, dy = 0) {
  await target.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const box = (await target.boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const x = box.x + box.width * 0.6, y = box.y + Math.min(box.height / 2, 20);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dx * i) / 10, y: y + (dy * i) / 10 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

/** Выделить слово в элементе (как долгим нажатием). */
export async function selectWord(page: Page, el: Locator, word: string) {
  await el.evaluate((node, w) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let t: Node | null;
    while ((t = walker.nextNode())) {
      const i = (t.textContent || '').indexOf(w);
      if (i >= 0) {
        const r = document.createRange();
        r.setStart(t, i);
        r.setEnd(t, i + w.length);
        const s = getSelection()!;
        s.removeAllRanges();
        s.addRange(r);
        return;
      }
    }
    throw new Error('нет слова ' + w);
  }, word);
}

/** Новая заметка из шаблона с названием и текстом. */
export async function newNote(page: Page, shelf: string, title: string, text = '') {
  await page.goto('./');
  await page.locator(`[data-shelf="${shelf}"]`).click();
  await page.locator('[data-new]').click();
  await page.locator('.doc h1').click();
  await page.keyboard.type(title);
  if (text) {
    await page.keyboard.press('Enter');
    await page.keyboard.type(text);
  }
  await expect(page.locator('.doc h1')).toHaveText(title);
}

export async function waitSaved(page: Page) {
  await page.waitForTimeout(800);
}
