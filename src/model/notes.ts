import type { Store } from '../store/Store';
import type { Note, Template, TrashItem } from '../store/types';
import { htmlToText, sanitize } from '../sanitize';
import { TODAY, todayTitle } from '../templates/builtin';
import { uid } from '../ui/dom';

/**
 * Черновики: новая заметка живёт в памяти, пока в ней ничего не написали.
 * Если уйти, ничего не написав, — она не сохранится.
 */
const drafts = new Map<string, { note: Note; initial: string }>();

export function createDraft(tpl: Template, title?: string): Note {
  let html = tpl.html.split(TODAY).join(todayTitle());
  if (title) html = html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/, `<h1>${escapeText(title)}</h1>`);
  const now = Date.now();
  const note: Note = { id: uid(), templateId: tpl.id, title: '', html, text: '', createdAt: now, updatedAt: now, links: [] };
  drafts.set(note.id, { note, initial: html });
  return note;
}

export const isDraft = (id: string) => drafts.has(id);
export const discardDraft = (id: string) => drafts.delete(id);

export async function getNote(store: Store, id: string): Promise<Note | undefined> {
  const d = drafts.get(id);
  if (d) return d.note;
  const n = await store.notes.get(id);
  return n && !n.deleted ? n : undefined;
}

export async function listNotes(store: Store): Promise<Note[]> {
  return (await store.notes.all()).filter((n) => !n.deleted).sort((a, b) => b.createdAt - a.createdAt);
}

export function extractLinks(html: string): string[] {
  const ids = new Set<string>();
  for (const m of html.matchAll(/data-note="([A-Za-z0-9_-]+)"/g)) ids.add(m[1]);
  return [...ids];
}

export function titleFromHtml(html: string): string {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  return m ? htmlToText(m[1]) : '';
}

/** Сохранить содержимое заметки. Возвращает false, если это нетронутый черновик. */
export async function saveNote(store: Store, note: Note, rawHtml: string): Promise<boolean> {
  const html = sanitize(rawHtml);
  const d = drafts.get(note.id);
  if (d && sanitize(d.initial) === html) return false;
  if (!d && note.html === html) return true;
  note.html = html;
  note.title = titleFromHtml(html);
  note.text = htmlToText(html);
  note.links = extractLinks(html).filter((x) => x !== note.id);
  note.updatedAt = Date.now();
  await store.notes.put({ ...note });
  drafts.delete(note.id);
  return true;
}

/** Создать заметку сразу (для «Связать → Создать новую заметку»). */
export async function createNoteNow(store: Store, tpl: Template, title: string): Promise<Note> {
  const n = createDraft(tpl, title);
  drafts.delete(n.id);
  n.title = title;
  n.html = sanitize(n.html);
  n.text = htmlToText(n.html);
  await store.notes.put({ ...n });
  return n;
}

export async function backlinks(store: Store, id: string): Promise<Note[]> {
  return (await listNotes(store)).filter((n) => n.links.includes(id));
}

/** «Связано»: исходящие и входящие ссылки вместе, без повторов. */
export async function related(store: Store, note: Note): Promise<Note[]> {
  const all = await listNotes(store);
  const ids = new Set(note.links);
  all.forEach((n) => n.links.includes(note.id) && ids.add(n.id));
  ids.delete(note.id);
  return all.filter((n) => ids.has(n.id));
}

// ---------- удаление и «Недавно удалённое» ----------

export const TRASH_DAYS = 30;

export async function deleteNote(store: Store, note: Note): Promise<TrashItem> {
  const item: TrashItem = {
    id: uid(), kind: 'note', noteId: note.id, noteTitle: note.title || 'Без названия', label: 'Заметка',
    html: '', index: 0, deletedAt: Date.now(), updatedAt: Date.now(),
  };
  await store.trash.put(item);
  await store.notes.put({ ...note, deleted: true, updatedAt: Date.now() });
  return item;
}

export async function trashBlock(store: Store, note: Note, label: string, html: string, index: number): Promise<TrashItem> {
  const item: TrashItem = {
    id: uid(), kind: 'block', noteId: note.id, noteTitle: titleFromHtml(note.html) || note.title || 'Без названия', label,
    html: sanitize(html), index, deletedAt: Date.now(), updatedAt: Date.now(),
  };
  await store.trash.put(item);
  return item;
}

export async function listTrash(store: Store) {
  return (await store.trash.all()).sort((a, b) => b.deletedAt - a.deletedAt);
}

/** Вернуть из корзины. Для блока — вставить на прежнее место в сохранённую заметку. */
export async function restoreTrash(store: Store, item: TrashItem): Promise<boolean> {
  const note = await store.notes.get(item.noteId);
  if (!note) { await store.trash.remove(item.id); return false; }
  if (item.kind === 'note') {
    await store.notes.put({ ...note, deleted: false, updatedAt: Date.now() });
  } else {
    if (note.deleted) await store.notes.put({ ...note, deleted: false });
    const d = document.createElement('div');
    d.innerHTML = note.html;
    const tmp = document.createElement('div');
    tmp.innerHTML = item.html;
    const el = tmp.firstElementChild;
    if (el) d.insertBefore(el, d.children[item.index] || null);
    await saveNote(store, { ...note, deleted: false }, d.innerHTML);
  }
  await store.trash.remove(item.id);
  return true;
}

/** Удалить из корзины всё старше 30 дней; удалённые заметки остаются только «надгробием» для синхронизации. */
export async function purgeTrash(store: Store, now = Date.now()) {
  const limit = now - TRASH_DAYS * 86400000;
  for (const t of await store.trash.all()) {
    if (t.deletedAt >= limit) continue;
    await store.trash.remove(t.id);
    if (t.kind === 'note') {
      const n = await store.notes.get(t.noteId);
      if (n && n.deleted) await store.notes.put({ ...n, html: '', text: '', links: [], updatedAt: now });
    }
  }
}

// ---------- поиск ----------

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е');
export async function search(store: Store, q: string): Promise<Note[]> {
  const nq = norm(q.trim());
  if (!nq) return [];
  const all = await listNotes(store);
  const inTitle = all.filter((n) => norm(n.title).includes(nq));
  const inText = all.filter((n) => !inTitle.includes(n) && norm(n.text).includes(nq));
  return [...inTitle, ...inText];
}

function escapeText(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
