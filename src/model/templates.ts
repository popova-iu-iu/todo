import type { Store } from '../store/Store';
import type { Template } from '../store/types';
import { BLANK_ID, BUILTIN, customThumb } from '../templates/builtin';
import { sanitize } from '../sanitize';

/** Встроенные шаблоны (из кода) + свои (из хранилища). «Чистый лист / Разное» — последним. */
export async function allTemplates(store: Store): Promise<Template[]> {
  const custom = (await store.templates.all()).filter((t) => !t.deleted).sort((a, b) => a.order - b.order);
  const builtins = BUILTIN.filter((t) => t.id !== BLANK_ID);
  const blank = BUILTIN.find((t) => t.id === BLANK_ID)!;
  return [...builtins, ...custom.map(hydrateCustom), blank];
}

export async function getTemplate(store: Store, id: string): Promise<Template> {
  const b = BUILTIN.find((t) => t.id === id);
  if (b) return b;
  const c = await store.templates.get(id);
  if (c && !c.deleted) return hydrateCustom(c);
  return BUILTIN.find((t) => t.id === BLANK_ID)!;
}

/** Свои шаблоны: миниатюра и обложка — из кода, HTML — очищенный. */
export function hydrateCustom(t: Template): Template {
  return { ...t, builtin: false, cover: '', thumb: customThumb(), thumbBg: t.bg, html: sanitize(t.html), shelf: t.name, newLabel: 'Новая заметка' };
}

export async function nameTaken(store: Store, name: string) {
  const n = name.trim().toLowerCase();
  return (await allTemplates(store)).some((t) => t.name.toLowerCase() === n || t.shelf.toLowerCase() === n);
}

export async function saveCustomTemplate(store: Store, t: { id: string; name: string; bg: string; html: string }) {
  const custom = await store.templates.all();
  const tpl: Template = {
    id: t.id, name: t.name, shelf: t.name, newLabel: 'Новая заметка', bg: t.bg, thumbBg: t.bg,
    cover: '', thumb: '', html: sanitize(t.html), builtin: false,
    order: custom.length ? Math.max(...custom.map((c) => c.order)) + 1 : 100,
    updatedAt: Date.now(),
  };
  await store.templates.put(tpl);
  return tpl;
}
