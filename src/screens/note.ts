import { ctx } from '../app';
import { BLOCKS } from '../editor/blocks';
import { mountEditor, toTemplateHtml, type Editor } from '../editor/editor';
import { createNoteNow, discardDraft, getNote, isDraft, related, saveNote, trashBlock } from '../model/notes';
import { getTemplate, nameTaken, saveCustomTemplate } from '../model/templates';
import { BLANK_ID } from '../templates/builtin';
import { back, navigate, type Screen } from '../router';
import type { Note, Template } from '../store/types';
import { $, esc, html } from '../ui/dom';
import { icons } from '../ui/icons';
import { openSheet, toast, undoToast } from '../ui/overlay';

/** Свой шаблон в процессе сборки (живёт в памяти до «Сохранить шаблон»). */
export const buildDrafts = new Map<string, { name: string; bg: string }>();

export async function noteScreen([id]: string[]): Promise<Screen | null> {
  const note = await getNote(ctx.store, id);
  if (!note) return null;
  const tpl = await getTemplate(ctx.store, note.templateId);
  return page(tpl, note, null);
}

export async function buildScreen([id]: string[]): Promise<Screen | null> {
  const b = buildDrafts.get(id);
  if (!b) return null;
  const tpl: Template = {
    id, name: b.name, shelf: b.name, newLabel: 'Новая заметка', bg: b.bg, thumbBg: b.bg, cover: '', thumb: '',
    html: '<h1 data-ph="Название заметки"></h1><p data-ph="Подсказка: что здесь писать…"></p>', builtin: false, order: 0, updatedAt: 0,
  };
  const note: Note = { id, templateId: id, title: '', html: tpl.html, text: '', createdAt: 0, updatedAt: 0, links: [] };
  return page(tpl, note, b);
}

function page(tpl: Template, note: Note, build: { name: string; bg: string } | null): Screen {
  const el = html(`<section class="screen white" aria-label="${build ? 'Новый шаблон' : 'Заметка'}">
    <div class="overbar">
      <button class="pill light" data-back>${icons.back}Назад</button>
      ${build ? '<button class="pill dark" data-savetpl>Сохранить шаблон</button>' : ''}
    </div>
    <div class="scroll">
      <div class="cover${tpl.cover ? '' : ' plain'}" style="background:${tpl.bg}"><div class="art">${tpl.cover}</div></div>
      ${build ? `<div class="tplbanner">Собираете шаблон <b>«${esc(build.name)}»</b>. Добавьте блоки кнопкой «+» и впишите подсказки. Лишнее смахните влево. Потом нажмите «Сохранить шаблон».</div>` : ''}
      <div class="doc" role="textbox" aria-multiline="true" aria-label="Текст заметки"></div>
      <div class="notefoot"><div class="related" hidden></div></div>
    </div>
    <button class="plus" aria-label="Добавить фото, список или блок">${icons.plus(26, 2.2)}</button>
  </section>`);
  const doc = $('.doc', el)!;
  const host = $('.scroll', el)!;
  doc.innerHTML = note.html;

  let timer = 0;
  let dirty = false;
  let saving: Promise<void> = Promise.resolve();
  const save = async () => {
    clearTimeout(timer);
    if (build || !dirty) return saving;
    dirty = false;
    const linksBefore = note.links.join();
    saving = saving.then(() => saveNote(ctx.store, note, editor.html())).then(() => {
      if (note.links.join() !== linksBefore) void drawRelated();
    }, (e) => console.error(e));
    return saving;
  };
  const onChange = () => {
    dirty = true;
    clearTimeout(timer);
    timer = window.setTimeout(save, 600);
  };

  const editor: Editor = mountEditor({
    doc, host, noteId: note.id, onChange,
    openNote: async (id) => { await save(); navigate('n/' + id); },
    createLinkedNote: async (word) => {
      const n = await createNoteNow(ctx.store, await getTemplate(ctx.store, BLANK_ID), word);
      return n.id;
    },
    onBlockDeleted: async (label, blockHtml, index, undo) => {
      if (build) { undoToast('Блок удалён', undo); return; }
      const item = await trashBlock(ctx.store, note, label, blockHtml, index);
      undoToast('Блок удалён', () => { undo(); void ctx.store.trash.remove(item.id); });
    },
  });

  const rel = $('.related', el)!;
  async function drawRelated() {
    if (build) return;
    const list = await related(ctx.store, note);
    rel.hidden = !list.length;
    rel.innerHTML = `<span class="label" style="font-size:12px">Связано</span>` +
      list.map((n) => `<button class="rchip" data-open="${n.id}">${esc(n.title || 'Без названия')}</button>`).join('');
  }
  drawRelated();

  el.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-back]')) return back();
    const open = t.closest<HTMLElement>('[data-open]');
    if (open) { await save(); return navigate('n/' + open.dataset.open); }
    if (t.closest('.plus')) return openBlocks(editor);
    if (t.closest('[data-savetpl]') && build) {
      if (await nameTaken(ctx.store, build.name)) return toast('Шаблон с таким названием уже есть');
      await saveCustomTemplate(ctx.store, { id: tpl.id, name: build.name, bg: build.bg, html: toTemplateHtml(doc) });
      buildDrafts.delete(tpl.id);
      await navigate('', true);
      toast(`Шаблон «${build.name}» готов`);
    }
  });

  // подсказка при первом открытии заметки
  if (!build) {
    ctx.store.kv.get('hinted').then((h) => {
      if (h) return;
      ctx.store.kv.set('hinted', true);
      setTimeout(() => toast('Нажмите на текст и пишите. Чтобы удалить блок — смахните его влево', 4000), 400);
    });
  }

  return {
    el,
    save,
    leave: async () => {
      await save();
      editor.destroy();
      if (isDraft(note.id)) discardDraft(note.id);
    },
  };
}

function openBlocks(editor: Editor) {
  const box = html(`<div style="display:flex;flex-direction:column;gap:14px"><h3>Добавить</h3><div class="blocks">${BLOCKS.map((b, i) => `<button class="blk" style="background:${b.bg}" data-b="${i}"><i style="background:${b.mark}"></i>${b.name}</button>`).join('')}</div></div>`);
  const close = openSheet(box, { label: 'Добавить блок' });
  box.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-b]');
    if (!b) return;
    close();
    editor.insertBlock(+b.dataset.b!);
  });
}
