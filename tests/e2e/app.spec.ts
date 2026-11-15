import { expect, test } from '@playwright/test';
import { newNote, selectWord, swipe, waitSaved } from './helpers';

test('главная: плитки шаблонов в нужном порядке и «Новый шаблон» последней', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('h1')).toHaveText('Мои заметки');
  await expect(page.locator('.tpl b')).toHaveText(['Путешествия', 'Книги', 'Рецепты', 'Люди', 'Фильмы', 'Идеи', 'Проекты', 'Конспекты', 'Дневник', 'Разное', 'Новый шаблон']);
  await expect(page.locator('.tpl small').first()).toHaveText('Пока пусто');
  // ничего лишнего: нет нижних вкладок и отдельной кнопки «Новая заметка»
  await expect(page.getByText('Новая заметка')).toHaveCount(0);
});

test('новая заметка сохраняется сама, «Назад» возвращает на полку', async ({ page }) => {
  await newNote(page, 'book', 'Мастер и Маргарита', 'Булгаков, 10 из 10');
  await waitSaved(page);
  await page.reload();
  await expect(page.locator('.doc h1')).toHaveText('Мастер и Маргарита');
  await expect(page.locator('.doc p').first()).toHaveText('Булгаков, 10 из 10');
  await page.locator('[data-back]').click();
  await expect(page.locator('h1.h1')).toHaveText('Книги');
  await expect(page.locator('.lrow')).toHaveCount(1);
  await page.locator('[data-back]').click();
  await expect(page.locator('.tpl').nth(1)).toContainText('1 заметка');
  await page.locator('[data-shelf="book"]').click();
  await page.locator('.lrow').click();
  await page.locator('[data-back]').click();
  await expect(page.locator('h1.h1')).toHaveText('Книги');
  await expect(page.locator('.count')).toHaveText('1 заметка');
});

test('пустую заметку не сохраняем', async ({ page }) => {
  await page.goto('./');
  await page.locator('[data-shelf="idea"]').click();
  await page.locator('[data-new]').click();
  await expect(page.locator('.doc')).toBeVisible();
  await page.locator('[data-back]').click();
  await expect(page.locator('.empty')).toHaveText('Здесь появятся ваши заметки');
});

test('дневник: дата в названии и настроение', async ({ page }) => {
  await page.goto('./');
  await page.locator('[data-shelf="diary"]').click();
  await page.locator('[data-new]').click();
  const today = await page.evaluate(() => new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }));
  await expect(page.locator('.doc h1')).toHaveText(today);
  await expect(page.locator('.mood')).toHaveCount(5);
  await page.locator('.mood').nth(1).click();
  await expect(page.locator('.mood.on')).toHaveCount(1);
  await waitSaved(page);
  await page.reload();
  await expect(page.locator('.mood').nth(1)).toHaveClass(/on/);
});

test('меню выделения: Жирный, Заголовок, Связать + обратные ссылки', async ({ page }) => {
  await newNote(page, 'lecture', 'Греческие слова', 'Калимера значит добрый день');
  await waitSaved(page);
  await newNote(page, 'travel', 'Поездка на Крит', 'Повторить греческие слова перед поездкой');
  const p = page.locator('.doc > p').first();

  await selectWord(page, p, 'Повторить');
  const menu = page.locator('.selmenu');
  await expect(menu).toBeVisible();
  await expect(menu.locator('button:visible')).toHaveText(['Жирный', 'Заголовок', 'Связать']);
  await menu.getByText('Жирный').click();
  await expect(p.locator('b')).toHaveText('Повторить');

  await selectWord(page, p, 'греческие слова');
  await menu.getByText('Связать').click();
  await expect(page.locator('.sheet h3')).toContainText('Связать «греческие слова»');
  await page.locator('.sheet input').fill('грече');
  await page.locator('.sheet .opt[data-id]', { hasText: 'Греческие слова' }).click();
  await expect(p.locator('.wl')).toHaveText('греческие слова');
  await waitSaved(page);
  await expect(page.locator('.related .rchip')).toHaveText(['Греческие слова']);

  // ссылка открывает заметку, а там — обратная ссылка
  await p.locator('.wl').click();
  await expect(page.locator('.doc h1')).toHaveText('Греческие слова');
  await expect(page.locator('.related .rchip')).toHaveText(['Поездка на Крит']);
  await page.locator('[data-back]').click();
  await expect(page.locator('.doc h1')).toHaveText('Поездка на Крит');

  // заголовок
  const p2 = page.locator('.doc > p', { hasText: 'Когда' }).or(page.locator('.doc > p').first());
  await selectWord(page, p2.first(), 'перед');
  await menu.getByText('Заголовок').click();
  await expect(page.locator('.doc > h2', { hasText: 'перед поездкой' })).toHaveCount(1);
});

test('«Связать» → «Создать новую заметку»', async ({ page }) => {
  await newNote(page, 'idea', 'Идея', 'Нужна теплица на даче');
  await selectWord(page, page.locator('.doc > p').first(), 'теплица');
  await page.locator('.selmenu').getByText('Связать').click();
  await page.locator('.sheet [data-new]').click();
  await expect(page.locator('.doc .wl')).toHaveText('теплица');
  await waitSaved(page);
  await page.goto('./');
  await expect(page.locator('[data-shelf="blank"] small')).toHaveText('1 заметка');
});

test('кнопка «+» вставляет все 8 блоков', async ({ page }) => {
  await newNote(page, 'blank', 'Блоки');
  const names = ['Фото', 'Заголовок', 'Список дел', 'Выноска', 'Карточки', 'Галерея', 'Цитата', 'Разделитель'];
  for (let i = 0; i < names.length; i++) {
    await page.locator('.plus').click();
    await expect(page.locator('.blk')).toHaveText(names);
    await page.locator('.blk').nth(i).click();
    await expect(page.locator('.dim')).toHaveCount(0);
  }
  for (const n of ['Фото', 'Список дел', 'Выноска', 'Карточки', 'Галерея', 'Цитата', 'Разделитель']) {
    await expect(page.locator(`.doc > [data-block="${n}"]`)).toHaveCount(1);
  }
  await expect(page.locator('.doc > h2')).toHaveCount(1);
  // в блоке можно писать; Enter в списке — новый пункт
  await page.locator('.doc .checklist .e').first().click();
  await page.keyboard.type('Купить семена');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Полить');
  await expect(page.locator('.doc .checklist .e')).toHaveText(['Купить семена', 'Полить']);
  await page.locator('.doc .checklist input').first().check();
  await waitSaved(page);
  await page.reload();
  await expect(page.locator('.doc .checklist .e')).toHaveText(['Купить семена', 'Полить']);
  await expect(page.locator('.doc .checklist input').first()).toBeChecked();
});

test('свайп влево удаляет блок, «Вернуть» возвращает, корзина помнит', async ({ page }) => {
  await newNote(page, 'travel', 'Крит', 'Две недели на западе');
  await waitSaved(page);
  const callout = page.locator('.doc > [data-block="Выноска"]');
  await expect(callout).toHaveCount(1);

  // вертикальный жест — прокрутка, а не удаление
  await swipe(page, callout, 10, -120);
  await expect(page.locator('.swdel')).toHaveCount(0);
  await page.waitForTimeout(800); // инерция прокрутки

  await swipe(page, callout, -140);
  const del = page.locator('.swdel');
  await expect(del).toBeVisible();
  await expect(del).toContainText('Удалить');
  await del.click();
  await expect(callout).toHaveCount(0);
  const toast = page.locator('.toast');
  await expect(toast).toContainText('Блок удалён');
  await toast.getByText('Вернуть').click();
  await expect(callout).toHaveCount(1);

  // ещё раз удалить — и вернуть из настроек
  await swipe(page, callout, -140);
  await page.locator('.swdel').click();
  await expect(callout).toHaveCount(0);
  await waitSaved(page);
  // название так не удаляется
  await swipe(page, page.locator('.doc h1'), -140);
  await expect(page.locator('.swdel')).toHaveCount(0);

  await page.goto('./#/settings');
  const row = page.locator('.trash .setrow', { hasText: 'Выноска' });
  await expect(row).toContainText('из заметки «Крит»');
  await row.getByText('Вернуть').click();
  await expect(page.locator('.trash')).toContainText('Здесь пусто');
  await page.goto('./');
  await page.locator('[data-shelf="travel"]').click();
  await page.locator('.lrow').click();
  await expect(page.locator('.doc > [data-block="Выноска"]')).toHaveCount(1);
});

test('свайп по заметке в списке удаляет её', async ({ page }) => {
  await newNote(page, 'film', 'Сталкер', 'Тарковский');
  await waitSaved(page);
  await page.locator('[data-back]').click();
  await swipe(page, page.locator('.lrow'), -140);
  await page.locator('.swdel').click();
  await expect(page.locator('.lrow')).toHaveCount(0);
  await page.locator('.toast').getByText('Вернуть').click();
  await expect(page.locator('.lrow')).toHaveCount(1);
});

test('свой шаблон: собрать из блоков → новая плитка → заметка с подсказками', async ({ page }) => {
  await page.goto('./');
  await page.locator('[data-newtpl]').click();
  await page.locator('.sheet input').fill('Сад');
  await page.locator('.sheet [data-c="2"]').click();
  await page.locator('.sheet [data-next]').click();
  await expect(page.locator('.tplbanner')).toContainText('Собираете шаблон «Сад»');
  await page.locator('.doc > p').first().click();
  await page.keyboard.type('Что посадила и когда');
  await page.locator('.plus').click();
  await page.locator('.blk', { hasText: 'Список дел' }).click();
  await page.keyboard.type('Полить');
  await page.locator('[data-savetpl]').click();
  await expect(page.locator('.toast')).toContainText('Шаблон «Сад» готов');
  await expect(page.locator('.tpl b')).toHaveText(['Путешествия', 'Книги', 'Рецепты', 'Люди', 'Фильмы', 'Идеи', 'Проекты', 'Конспекты', 'Дневник', 'Сад', 'Разное', 'Новый шаблон']);

  await page.locator('.tpl', { hasText: 'Сад' }).click();
  await expect(page.locator('[data-new]')).toHaveText('Новая заметка');
  await page.locator('[data-new]').click();
  await expect(page.locator('.doc h1')).toHaveAttribute('data-ph', 'Название');
  await expect(page.locator('.doc > p').first()).toHaveAttribute('data-ph', 'Что посадила и когда');
  await expect(page.locator('.doc .checklist .e').first()).toHaveAttribute('data-ph', 'Полить');
  await expect(page.locator('.doc .checklist .e').first()).toHaveText('');
});

test('поиск по всем заметкам показывает полку', async ({ page }) => {
  await newNote(page, 'recipe', 'Хлеб на закваске', 'мука и вода');
  await waitSaved(page);
  await page.goto('./');
  await page.locator('.search input').fill('закваск');
  await expect(page.locator('.item')).toHaveCount(1);
  await expect(page.locator('.item .sn')).toHaveText('Рецепты');
  await page.locator('.search input').fill('вода');
  await expect(page.locator('.item .ti')).toHaveText('Хлеб на закваске');
  await page.locator('.item').click();
  await expect(page.locator('.doc h1')).toHaveText('Хлеб на закваске');
  await page.locator('[data-back]').click();
  await expect(page.locator('.search input')).toHaveValue('вода');
  await page.locator('.search input').fill('нет такого');
  await expect(page.locator('.empty')).toHaveText('Ничего не нашлось');
});

test('вставка из буфера — только текст, без кода', async ({ page }) => {
  await newNote(page, 'blank', 'Вставка', 'x');
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData('text/html', '<img src=x onerror="window.__pwned=1"><b>жирный</b>');
    dt.setData('text/plain', 'просто текст');
    document.querySelector('.doc > p')!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await expect(page.locator('.doc > p').first()).toContainText('просто текст');
  await expect(page.locator('.doc img')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__pwned)).toBeUndefined();
});

test('настройки: бэкап не настроен, карта связей и «Недавно удалённое»', async ({ page }) => {
  await page.goto('./');
  await page.locator('[aria-label="Настройки"]').click();
  await expect(page.locator('.status')).toContainText('Копия не настроена');
  await expect(page.locator('.trash')).toContainText('Удалённое хранится 30 дней');
  await page.locator('[data-go="graph"]').click();
  await expect(page.locator('.graph')).toContainText('Пока нет связей');
  await page.locator('[data-back]').click();
  await page.locator('[data-go="setup"]').click();
  await expect(page.locator('[name=url]')).toHaveValue('https://gitlab.com');
});
