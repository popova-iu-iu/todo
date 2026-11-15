import { ctx } from '../app';
import { allTemplates } from '../model/templates';
import { listNotes } from '../model/notes';
import type { Note } from '../store/types';
import { $, esc, html } from '../ui/dom';
import { icons } from '../ui/icons';
import { openSheet } from '../ui/overlay';

/**
 * Шторка «Связать с заметкой»: поиск по заметкам + «Создать новую заметку».
 * Возвращает выбранную заметку, 'new' или null (закрыли).
 */
export function chooseNote(word: string, excludeId: string): Promise<Note | 'new' | null> {
  return new Promise(async (resolve) => {
    const notes = (await listNotes(ctx.store)).filter((n) => n.id !== excludeId);
    const tpls = new Map((await allTemplates(ctx.store)).map((t) => [t.id, t]));
    const box = html(`<div style="display:flex;flex-direction:column;gap:14px">
      <h3>Связать «${esc(word.slice(0, 24))}» с заметкой</h3>
      <label class="search light">${icons.search}<span class="sr">Найти</span><input type="search" placeholder="Найти заметку" autocomplete="off"></label>
      <div class="optlist"></div>
    </div>`);
    const list = $('.optlist', box)!;
    const input = $<HTMLInputElement>('input', box)!;
    let result: Note | 'new' | null = null;
    const draw = () => {
      const q = input.value.trim().toLowerCase().replace(/ё/g, 'е');
      const found = notes.filter((n) => !q || n.title.toLowerCase().replace(/ё/g, 'е').includes(q)).slice(0, 30);
      list.innerHTML = found.map((n) => {
        const t = tpls.get(n.templateId);
        const title = n.title || 'Без названия';
        return `<button class="opt" data-id="${n.id}"><span class="sw" style="background:${t?.thumbBg || 'var(--bg)'};color:${t?.dark ? '#F3D9A4' : 'var(--ink)'}">${esc(title[0].toUpperCase())}</span><span>${esc(title)}</span></button>`;
      }).join('') + `<button class="opt dash" data-new>${icons.plus(22, 2)}<span>Создать новую заметку «${esc(word.slice(0, 30))}»</span></button>`;
    };
    draw();
    input.addEventListener('input', draw);
    const close = openSheet(box, { label: 'Связать с заметкой', onClose: () => resolve(result) });
    list.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('button');
      if (!b) return;
      result = b.hasAttribute('data-new') ? 'new' : notes.find((n) => n.id === b.dataset.id) || null;
      close();
    });
  });
}
