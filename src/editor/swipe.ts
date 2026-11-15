import { html } from '../ui/dom';
import { icons } from '../ui/icons';

/**
 * Свайп влево по элементу → он отъезжает, справа появляется красная кнопка «Удалить».
 * На iPhone — touch-события (pointer-события в Safari ненадёжны), на компьютере — мышь.
 * Кнопка кладётся в контейнер прокрутки, а не внутрь contenteditable.
 * Вертикальный жест — это прокрутка, а не свайп.
 */
export interface SwipeOpts {
  /** какой элемент двигать (или null — этот жест не наш) */
  pick: (target: HTMLElement) => HTMLElement | null;
  /**
   * Удалить элемент. Вызывается синхронно сразу после анимации, пока элемент ещё в DOM:
   * обработчик должен убрать его из DOM до первого await.
   */
  onDelete: (el: HTMLElement) => void | Promise<void>;
  /** жест начался как свайп (спрятать меню, клавиатуру) */
  onSwipeStart?: () => void;
}

const OPEN = 88;
const BTN_W = 78;
const isTouch = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

export function attachSwipe(host: HTMLElement, opts: SwipeOpts): () => void {
  let sw: { el: HTMLElement; x0: number; y0: number; dx: number; mode: null | 'swipe' | 'scroll'; base: number; id: number } | null = null;
  let opened: { el: HTMLElement; btn: HTMLButtonElement } | null = null;

  function closeOpened(anim = true) {
    if (!opened) return;
    const { el, btn } = opened;
    opened = null;
    el.style.transition = anim ? 'transform .2s ease' : '';
    el.style.transform = '';
    btn.style.opacity = '0';
    setTimeout(() => { btn.remove(); el.style.transition = ''; }, 200);
  }

  function makeBtn(el: HTMLElement) {
    const b = html<HTMLButtonElement>(`<button class="swdel" type="button" contenteditable="false" aria-label="Удалить">${icons.trash}<span>Удалить</span></button>`);
    const r = el.getBoundingClientRect(), hr = host.getBoundingClientRect();
    const h = Math.max(56, r.height);
    b.style.top = `${r.top - hr.top + host.scrollTop - (h - r.height) / 2}px`;
    b.style.left = `${r.right - hr.left - BTN_W + 6}px`;
    b.style.height = `${h}px`;
    host.appendChild(b);
    let done = false;
    const go = (ev: Event) => {
      ev.stopPropagation();
      if (ev.cancelable) ev.preventDefault();
      if (done) return;
      done = true;
      remove(el, b);
    };
    b.addEventListener('click', go);
    b.addEventListener('touchend', go);
    return b;
  }

  function remove(el: HTMLElement, btn: HTMLButtonElement) {
    opened = null;
    btn.remove();
    const h = el.offsetHeight;
    el.style.transition = 'transform .18s ease, opacity .18s ease';
    el.style.transform = 'translateX(-110%)';
    el.style.opacity = '0';
    setTimeout(() => {
      el.style.transition = 'height .18s ease, margin .18s ease';
      el.style.height = `${h}px`;
      el.style.overflow = 'hidden';
      requestAnimationFrame(() => { el.style.height = '0px'; el.style.marginTop = '-18px'; });
      setTimeout(() => { el.removeAttribute('style'); opts.onDelete(el); }, 190);
    }, 170);
  }

  function start(target: HTMLElement, x: number, y: number, id: number) {
    if (target.closest('.swdel')) return;
    const el = opts.pick(target);
    if (opened && opened.el !== el) closeOpened();
    if (!el) return;
    sw = { el, x0: x, y0: y, dx: 0, mode: null, base: opened && opened.el === el ? -OPEN : 0, id };
  }

  function move(x: number, y: number, id: number, ev: Event) {
    if (!sw || id !== sw.id) return;
    const dx = x - sw.x0, dy = y - sw.y0;
    if (!sw.mode) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      sw.mode = Math.abs(dx) > Math.abs(dy) ? 'swipe' : 'scroll';
      if (sw.mode === 'swipe') {
        getSelection()?.removeAllRanges();
        (document.activeElement as HTMLElement | null)?.blur?.();
        opts.onSwipeStart?.();
        sw.el.style.transition = '';
        if (!opened || opened.el !== sw.el) opened = { el: sw.el, btn: makeBtn(sw.el) };
      }
    }
    if (sw.mode !== 'swipe') return;
    if (ev.cancelable) ev.preventDefault();
    let v = sw.base + dx;
    v = v > 0 ? 0 : v < -OPEN ? -OPEN + (v + OPEN) * 0.25 : v;
    sw.dx = v;
    sw.el.style.transform = `translateX(${v}px)`;
    if (opened) opened.btn.style.opacity = String(Math.min(1, -v / OPEN));
  }

  function end() {
    if (!sw) return;
    const s = sw;
    sw = null;
    if (s.mode !== 'swipe') return;
    s.el.style.transition = 'transform .2s ease';
    if (s.dx < -OPEN * 0.45) {
      s.el.style.transform = `translateX(${-OPEN}px)`;
      if (opened) opened.btn.style.opacity = '1';
    } else closeOpened();
    s.el.dataset.justSwiped = '1';
    setTimeout(() => delete s.el.dataset.justSwiped, 400);
  }

  // после свайпа не открывать клавиатуру
  const onFocus = (e: FocusEvent) => {
    const b = opts.pick(e.target as HTMLElement);
    if (b && (b.dataset.justSwiped || (opened && opened.el === b))) (e.target as HTMLElement).blur();
  };
  // нажатие мимо открытого блока закрывает его
  const onClickOutside = (e: Event) => {
    if (opened && !(e.target as HTMLElement).closest('.swdel') && !opened.el.contains(e.target as Node)) closeOpened();
  };

  const off: (() => void)[] = [];
  const on = (t: EventTarget, type: string, fn: any, o?: AddEventListenerOptions | boolean) => {
    t.addEventListener(type, fn, o);
    off.push(() => t.removeEventListener(type, fn, o));
  };

  if (isTouch()) {
    on(host, 'touchstart', (e: TouchEvent) => { const t = e.changedTouches[0]; start(e.target as HTMLElement, t.clientX, t.clientY, t.identifier); }, { passive: true, capture: true });
    on(host, 'touchmove', (e: TouchEvent) => { if (!sw) return; for (const t of e.changedTouches) if (t.identifier === sw.id) move(t.clientX, t.clientY, t.identifier, e); }, { passive: false, capture: true });
    on(host, 'touchend', end, { capture: true });
    on(host, 'touchcancel', end, { capture: true });
  } else {
    on(host, 'pointerdown', (e: PointerEvent) => start(e.target as HTMLElement, e.clientX, e.clientY, e.pointerId), true);
    on(window, 'pointermove', (e: PointerEvent) => move(e.clientX, e.clientY, e.pointerId, e), { passive: false });
    on(window, 'pointerup', end);
    on(window, 'pointercancel', end);
  }
  on(host, 'focusin', onFocus);
  on(document, 'click', onClickOutside, true);

  return () => { off.forEach((f) => f()); closeOpened(false); };
}
