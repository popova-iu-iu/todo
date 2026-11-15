import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '../../src/store/memoryStore';
import { openIdbStore } from '../../src/store/idbStore';
import {
  backlinks, createDraft, deleteNote, getNote, listNotes, listTrash, purgeTrash, related,
  restoreTrash, saveNote, search, trashBlock,
} from '../../src/model/notes';
import { allTemplates, nameTaken, saveCustomTemplate } from '../../src/model/templates';
import { BUILTIN, todayTitle } from '../../src/templates/builtin';

const tpl = (id: string) => BUILTIN.find((t) => t.id === id)!;

describe('заметки', () => {
  it('нетронутый черновик не сохраняется, написанное — сохраняется', async () => {
    const store = createMemoryStore();
    const d = createDraft(tpl('book'));
    expect(await saveNote(store, d, d.html)).toBe(false);
    expect(await listNotes(store)).toHaveLength(0);
    expect(await getNote(store, d.id)).toBeDefined(); // черновик в памяти
    const html = d.html.replace('<h1 data-ph="Название книги"></h1>', '<h1 data-ph="Название книги">Мастер и Маргарита</h1>');
    expect(await saveNote(store, d, html)).toBe(true);
    const all = await listNotes(store);
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('Мастер и Маргарита');
  });

  it('дневник получает сегодняшнюю дату в названии', () => {
    const d = createDraft(tpl('diary'));
    expect(d.html).toContain(`<h1>${todayTitle()}</h1>`);
  });

  it('двусторонние ссылки, поиск и полки', async () => {
    const store = createMemoryStore();
    const a = createDraft(tpl('travel'));
    await saveNote(store, a, '<h1>Поездка на Крит</h1><p>Море</p>');
    const b = createDraft(tpl('lecture'));
    await saveNote(store, b, `<h1>Греческие слова</h1><p>Для <a class="wl" data-note="${a.id}">поездки</a>, ёлки</p>`);
    expect(b.links).toEqual([a.id]);
    expect((await backlinks(store, a.id)).map((n) => n.title)).toEqual(['Греческие слова']);
    expect((await related(store, a)).map((n) => n.title)).toEqual(['Греческие слова']);
    expect((await related(store, b)).map((n) => n.title)).toEqual(['Поездка на Крит']);
    expect((await search(store, 'крит')).map((n) => n.title)).toEqual(['Поездка на Крит']);
    expect((await search(store, 'елки')).map((n) => n.title)).toEqual(['Греческие слова']);
  });

  it('удаление заметки и блока → «Недавно удалённое» → вернуть', async () => {
    const store = createMemoryStore();
    const n = createDraft(tpl('blank'));
    await saveNote(store, n, '<h1>Список</h1><p>раз</p><div class="callout peach" data-block="Выноска"><span class="ci">!</span><div class="e">важно</div></div><p>два</p>');
    // блок
    const item = await trashBlock(store, n, 'Выноска', '<div class="callout peach" data-block="Выноска"><span class="ci">!</span><div class="e">важно</div></div>', 2);
    await saveNote(store, n, '<h1>Список</h1><p>раз</p><p>два</p>');
    expect(await restoreTrash(store, item)).toBe(true);
    const restored = (await getNote(store, n.id))!;
    expect(restored.html).toMatch(/<p>раз<\/p><div class="callout peach" data-block="Выноска">.*<\/div><p>два<\/p>/);
    // заметка
    const t = await deleteNote(store, restored);
    expect(await listNotes(store)).toHaveLength(0);
    expect((await listTrash(store))[0].label).toBe('Заметка');
    await restoreTrash(store, t);
    expect(await listNotes(store)).toHaveLength(1);
    expect(await listTrash(store)).toHaveLength(0);
  });

  it('корзина чистится через 30 дней', async () => {
    const store = createMemoryStore();
    const n = createDraft(tpl('blank'));
    await saveNote(store, n, '<h1>Старое</h1><p>текст</p>');
    await deleteNote(store, (await getNote(store, n.id))!);
    await purgeTrash(store, Date.now() + 31 * 86400000);
    expect(await listTrash(store)).toHaveLength(0);
    const tomb = await store.notes.get(n.id);
    expect(tomb?.deleted).toBe(true);
    expect(tomb?.html).toBe('');
  });

  it('свои шаблоны: порядок плиток и проверка имени', async () => {
    const store = createMemoryStore();
    await saveCustomTemplate(store, { id: 'c1', name: 'Сад', bg: '#DCEBE3', html: '<h1 data-ph="Название"></h1><p data-ph="Что посадила" onclick="x"></p>' });
    const names = (await allTemplates(store)).map((t) => t.shelf);
    expect(names).toEqual(['Путешествия', 'Книги', 'Рецепты', 'Люди', 'Фильмы', 'Идеи', 'Проекты', 'Конспекты', 'Дневник', 'Сад', 'Разное']);
    expect((await allTemplates(store)).find((t) => t.id === 'c1')!.html).not.toContain('onclick');
    expect(await nameTaken(store, 'сад')).toBe(true);
    expect(await nameTaken(store, 'Книги')).toBe(true);
    expect(await nameTaken(store, 'Тренировка')).toBe(false);
  });
});

describe('IndexedDB-хранилище', () => {
  it('сохраняет, читает, сообщает об изменениях, очищается', async () => {
    const store = await openIdbStore('test-' + Math.random());
    const seen: string[] = [];
    store.onChange((c) => seen.push(c));
    const d = createDraft(tpl('idea'));
    await saveNote(store, d, '<h1>Идея</h1>');
    await store.kv.set('auto', false);
    expect((await store.notes.all())[0].title).toBe('Идея');
    expect(await store.kv.get('auto')).toBe(false);
    expect(seen).toEqual(['notes']);
    await store.clear();
    expect(await store.notes.all()).toHaveLength(0);
  });
});
