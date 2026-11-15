import { $, html } from './dom';

const root = () => $('#app')!;

let toastEl: HTMLElement | null = null;
let toastTimer = 0;

export function toast(text: string, ms = 2200) {
  showToast(html(`<div class="toast" role="status"></div>`), text, ms);
}

/** Тост с кнопкой «Вернуть» (6 секунд). */
export function undoToast(text: string, onUndo: () => void, ms = 6000) {
  const el = html(`<div class="toast" role="status"></div>`);
  const b = html<HTMLButtonElement>(`<button type="button" class="undo">Вернуть</button>`);
  b.addEventListener('click', (e) => { e.stopPropagation(); hideToast(); onUndo(); });
  showToast(el, text, ms, b);
}

function showToast(el: HTMLElement, text: string, ms: number, extra?: HTMLElement) {
  hideToast();
  el.append(text);
  if (extra) el.append(extra);
  root().append(el);
  toastEl = el;
  toastTimer = window.setTimeout(hideToast, ms);
}

export function hideToast() {
  clearTimeout(toastTimer);
  toastEl?.remove();
  toastEl = null;
}

/** Шторка снизу. Возвращает функцию закрытия. */
export function openSheet(content: HTMLElement, opts: { label: string; onClose?: () => void }) {
  const dim = html(`<div class="dim"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div></div></div>`);
  const sheet = $('.sheet', dim)!;
  sheet.setAttribute('aria-label', opts.label);
  sheet.append(content);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    dim.remove();
    opts.onClose?.();
  };
  dim.addEventListener('click', (e) => { if (e.target === dim) close(); });
  // смахнуть шторку вниз за «ручку»
  let y0 = -1;
  sheet.addEventListener('touchstart', (e) => { y0 = sheet.scrollTop <= 0 ? e.touches[0].clientY : -1; }, { passive: true });
  sheet.addEventListener('touchend', (e) => { if (y0 >= 0 && e.changedTouches[0].clientY - y0 > 90) close(); y0 = -1; });
  root().append(dim);
  return close;
}

export const anySheetOpen = () => !!$('.dim');
