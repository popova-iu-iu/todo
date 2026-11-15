import { ctx } from '../app';
import { allTemplates } from '../model/templates';
import { listNotes, search } from '../model/notes';
import { navigate, type Screen } from '../router';
import { $, esc, html } from '../ui/dom';
import { icons } from '../ui/icons';
import { notesCount } from '../ui/plural';
import { openNewTemplateSheet } from './newTemplate';

let lastQuery = '';

export async function homeScreen(): Promise<Screen> {
  const el = html(`<section class="screen" aria-label="Мои заметки">
    <div class="top">
      <div class="row">
        <h1 class="h1">Мои заметки</h1>
        <button class="round" aria-label="Настройки" data-go="settings">${icons.gear}</button>
      </div>
      <label class="search">${icons.search}<span class="sr">Поиск</span><input type="search" placeholder="Найти заметку" autocomplete="off" enterkeyhint="search"></label>
    </div>
    <div class="scroll"><div class="home"></div></div>
  </section>`);
  const box = $('.home', el)!;
  const input = $<HTMLInputElement>('input', el)!;
  input.value = lastQuery;

  const draw = async () => {
    const q = input.value.trim();
    lastQuery = q;
    const tpls = await allTemplates(ctx.store);
    if (q) {
      const found = await search(ctx.store, q);
      const byId = new Map(tpls.map((t) => [t.id, t]));
      box.innerHTML = `<div class="results"><div class="label">Найдено: ${found.length}</div>${
        found.map((n) => {
          const t = byId.get(n.templateId) || tpls[tpls.length - 1];
          const title = n.title || 'Без названия';
          return `<button class="item" data-note="${n.id}"><div class="sw" style="background:${t.thumbBg};color:${t.dark ? '#F3D9A4' : 'var(--ink)'}">${esc(title[0].toUpperCase())}</div><div class="mid"><div class="ti">${esc(title)}</div><div class="sn">${esc(t.shelf)}</div></div></button>`;
        }).join('') || '<div class="empty">Ничего не нашлось</div>'}</div>`;
      return;
    }
    const notes = await listNotes(ctx.store);
    const count = (id: string) => notes.filter((n) => n.templateId === id).length;
    box.innerHTML = `<div class="grid2 tiles">${tpls.map((t) => `
      <button class="tpl" data-shelf="${t.id}">
        <div class="thumb${t.thumbBg.toUpperCase() === '#FFFFFF' ? ' bordered' : ''}" style="background:${t.thumbBg}">${t.thumb}</div>
        <b>${esc(t.shelf)}</b><small>${notesCount(count(t.id))}</small>
      </button>`).join('')}
      <button class="tpl addtpl" data-newtpl>
        <div class="thumb">${icons.plus(30, 2)}</div><b>Новый шаблон</b><small>Соберите свой из блоков</small>
      </button></div>`;
  };

  input.addEventListener('input', draw);
  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const shelf = t.closest<HTMLElement>('[data-shelf]');
    if (shelf) return navigate('t/' + shelf.dataset.shelf);
    const n = t.closest<HTMLElement>('[data-note]');
    if (n) return navigate('n/' + n.dataset.note);
    if (t.closest('[data-go="settings"]')) return navigate('settings');
    if (t.closest('[data-newtpl]')) return openNewTemplateSheet();
  });
  await draw();
  return { el };
}
