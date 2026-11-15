export const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T | null;
export const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll(s)] as T[];

/** Создать элемент из HTML-строки (первый элемент). */
export function html<T extends HTMLElement = HTMLElement>(s: string): T {
  const t = document.createElement('template');
  t.innerHTML = s.trim();
  return t.content.firstElementChild as T;
}

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const uid = () => {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return [...b].map((x) => x.toString(36).padStart(2, '0')).join('').slice(0, 16);
};
