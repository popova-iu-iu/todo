import { $, html } from '../ui/dom';
import { icons } from '../ui/icons';
import { anySheetOpen } from '../ui/overlay';

/**
 * Маленькое меню при выделении текста: Жирный · Заголовок · Связать.
 * Других панелей инструментов нет.
 */
export interface SelTarget {
  doc: HTMLElement;
  bold(): void;
  heading(): void;
  link(range: Range): void;
  /** можно ли сделать заголовок из выделенного места */
  canHeading(range: Range): boolean;
}

let menu: HTMLElement | null = null;
let target: SelTarget | null = null;
let saved: Range | null = null;

export function setSelectionTarget(t: SelTarget | null) {
  target = t;
  hideMenu();
}

export function hideMenu() {
  menu?.setAttribute('hidden', '');
}

export function restoreSelection(): Range | null {
  if (!saved) return null;
  const s = getSelection()!;
  s.removeAllRanges();
  s.addRange(saved);
  return saved;
}

export function initSelectionMenu() {
  if (menu) return;
  menu = html(`<div class="selmenu" role="toolbar" aria-label="Оформление" hidden>
    <button type="button" data-act="bold" class="b">Жирный</button>
    <button type="button" data-act="h2" class="hd">Заголовок</button>
    <button type="button" data-act="link" class="go">${icons.link}Связать</button>
  </div>`);
  $('#app')!.append(menu);

  document.addEventListener('selectionchange', () => {
    if (!target || !menu) return;
    const s = getSelection();
    const node = s?.anchorNode;
    if (!s || !s.rangeCount || s.isCollapsed || !node || !target.doc.contains(node) || !s.toString().trim()) {
      if (!anySheetOpen()) hideMenu();
      return;
    }
    saved = s.getRangeAt(0).cloneRange();
    show(saved);
  });

  const act = (b: HTMLElement | null) => {
    if (!b || !target) return;
    const r = restoreSelection();
    if (!r) return;
    const a = b.dataset.act;
    if (a === 'bold') target.bold();
    else if (a === 'h2') target.heading();
    else if (a === 'link') { target.link(r.cloneRange()); return; }
    hideMenu();
  };
  // не терять выделение при нажатии на кнопки меню
  menu.addEventListener('mousedown', (e) => e.preventDefault());
  let touched = false;
  menu.addEventListener('touchstart', (e) => { e.preventDefault(); touched = true; }, { passive: false });
  menu.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!touched) return;
    touched = false;
    act((e.target as HTMLElement).closest<HTMLElement>('[data-act]'));
  });
  menu.addEventListener('click', (e) => act((e.target as HTMLElement).closest<HTMLElement>('[data-act]')));
}

function show(r: Range) {
  if (!menu || !target) return;
  const hd = $('[data-act="h2"]', menu)!;
  hd.hidden = !target.canHeading(r);
  const rect = r.getBoundingClientRect();
  const app = $('#app')!.getBoundingClientRect();
  menu.removeAttribute('hidden');
  const mw = menu.offsetWidth;
  let x = rect.left - app.left + rect.width / 2 - mw / 2;
  x = Math.max(10, Math.min(app.width - mw - 10, x));
  let y = rect.bottom - app.top + 14;
  if (y > app.height - 120) y = rect.top - app.top - 60;
  menu.style.left = `${x}px`;
  menu.style.top = `${Math.max(10, y)}px`;
}
