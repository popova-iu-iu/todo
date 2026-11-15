import { ctx } from '../app';
import { getTemplate } from '../model/templates';
import { createDraft, deleteNote, listNotes, restoreTrash } from '../model/notes';
import { back, navigate, type Screen } from '../router';
import { $, esc, html } from '../ui/dom';
import { icons } from '../ui/icons';
import { undoToast } from '../ui/overlay';
import { notesCount, shortDate } from '../ui/plural';
import { attachSwipe } from '../editor/swipe';

/** Экран шаблона: обложка, большая кнопка «+ Новая …», список заметок вниз. */
export async function shelfScreen([id]: string[]): Promise<Screen> {
  const tpl = await getTemplate(ctx.store, id);
  const el = html(`<section class="screen" aria-label="${esc(tpl.shelf)}">
    <div class="scroll">
      <div class="shelfcover" style="background:${tpl.bg}">
        <div class="art">${tpl.cover}</div>
        <button class="pill light abs" data-back>${icons.back}Мои заметки</button>
      </div>
      <div class="shelfbody">
        <div><h1 class="h1">${esc(tpl.shelf)}</h1><div class="t-sub count"></div></div>
        <button class="btn primary" data-new>${icons.plus(20, 2.2)}${esc(tpl.newLabel)}</button>
        <div class="list"></div>
      </div>
    </div>
  </section>`);
  const list = $('.list', el)!;
  const scroll = $('.scroll', el)!;

  const draw = async () => {
    const notes = (await listNotes(ctx.store)).filter((n) => n.templateId === tpl.id);
    $('.count', el)!.textContent = notesCount(notes.length);
    list.innerHTML = notes.length
      ? `<div class="set notelist">${notes.map((n) => `<button class="lrow" data-note="${n.id}"><span class="ltx"><b>${esc(n.title || 'Без названия')}</b><small>${shortDate(n.createdAt)}</small></span>${icons.chevron}</button>`).join('')}</div>`
      : '<div class="empty">Здесь появятся ваши заметки</div>';
  };
  await draw();

  // свайп влево по строке — удалить заметку
  const detach = attachSwipe(scroll, {
    pick: (t) => t.closest<HTMLElement>('.lrow'),
    onDelete: async (row) => {
      const note = (await listNotes(ctx.store)).find((n) => n.id === row.dataset.note);
      if (!note) return;
      const item = await deleteNote(ctx.store, note);
      await draw();
      undoToast('Заметка удалена', async () => { await restoreTrash(ctx.store, item); await draw(); });
    },
  });

  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-back]')) return back();
    if (t.closest('[data-new]')) {
      const d = createDraft(tpl);
      return navigate('n/' + d.id);
    }
    const row = t.closest<HTMLElement>('[data-note]');
    if (row && !row.dataset.justSwiped) navigate('n/' + row.dataset.note);
  });
  return { el, leave: detach };
}
