/** Кирпичики, из которых собраны шаблоны и блоки кнопки «+». Только классы, без инлайн-стилей. */
export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const ph = (tag: string, hint: string) => `<${tag} data-ph="${esc(hint)}"></${tag}>`;
export const h2 = (t: string) => `<h2>${esc(t)}</h2>`;

export const checklist = (items: string[]) =>
  `<div class="checklist" data-block="Список дел">${items.map(checkItem).join('')}</div>`;
export const checkItem = (hint: string) =>
  `<div class="check"><input type="checkbox"><span class="e" data-ph="${esc(hint)}"></span></div>`;

export type Tone = 'peach' | 'lav' | 'sage';
export const callout = (icon: string, tone: Tone, hint: string) =>
  `<div class="callout ${tone}" data-block="Выноска"><span class="ci">${esc(icon)}</span><div class="e" data-ph="${esc(hint)}"></div></div>`;

export type CardColor = 'lav' | 'sand' | 'peach' | 'sage' | 'gold';
export const cards = (list: [CardColor, string, string][]) =>
  `<div class="cards" data-block="Карточки">${list
    .map(([c, t, d]) => `<div class="card"><div class="pic c-${c}"></div><div class="cb"><div class="e ct" data-ph="${esc(t)}"></div><div class="e cd" data-ph="${esc(d)}"></div></div></div>`)
    .join('')}</div>`;

export const quote = (hint: string) =>
  `<blockquote class="quote" data-block="Цитата"><div class="e" data-ph="${esc(hint)}"></div></blockquote>`;

export const photo = (hint: string) =>
  `<div class="photo" data-block="Фото"><button type="button" class="ph-photo" data-pick>${esc(hint)}</button></div>`;

export const gallery = () =>
  `<div class="gallery" data-block="Галерея">${[0, 1, 2].map(() => '<button type="button" class="ph-photo" data-pick>Фото</button>').join('')}</div>`;

export const divider = () => `<div class="divider" data-block="Разделитель"><i></i><i></i><i></i></div>`;

export const MOODS = ['😊', '🙂', '😐', '😔', '😣'];
export const moods = () =>
  `<div class="moods" data-block="Настроение">${MOODS.map((m, i) => `<button type="button" class="mood" aria-label="Настроение ${5 - i} из 5">${m}</button>`).join('')}</div>`;
