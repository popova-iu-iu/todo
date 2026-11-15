export interface Screen {
  el: HTMLElement;
  /** вызывается перед уходом с экрана — сохранить изменения */
  leave?: () => void | Promise<void>;
  /** сохранить без ухода (приложение свернули) */
  save?: () => void | Promise<void>;
}
type Factory = (params: string[]) => Promise<Screen | null>;

const routes: [RegExp, Factory][] = [];
let current: Screen | null = null;
let rendering = Promise.resolve();

export function route(re: RegExp, f: Factory) { routes.push([re, f]); }

const path = () => decodeURI(location.hash.replace(/^#\/?/, ''));
const depth = () => (history.state && typeof history.state.depth === 'number' ? history.state.depth : 0);

export function navigate(p: string, replace = false) {
  const url = '#/' + p;
  if (replace) history.replaceState({ depth: depth() }, '', url);
  else history.pushState({ depth: depth() + 1 }, '', url);
  return render();
}

/** «Назад» — туда, откуда пришли. Если пришли по прямой ссылке — на главную. */
export function back() {
  if (depth() > 0) history.back();
  else navigate('', true);
}

export function render(): Promise<void> {
  rendering = rendering.then(doRender, doRender);
  return rendering;
}

async function doRender() {
  const p = path();
  if (current?.leave) {
    try { await current.leave(); } catch (e) { console.error(e); }
  }
  for (const [re, f] of routes) {
    const m = p.match(re);
    if (!m) continue;
    const s = await f(m.slice(1));
    if (!s) { history.replaceState({ depth: depth() }, '', '#/'); return doRender(); }
    const host = document.getElementById('screens')!;
    host.replaceChildren(s.el);
    current = s;
    return;
  }
  history.replaceState({ depth: 0 }, '', '#/');
  return doRender();
}

export function startRouter() {
  if (!history.state) history.replaceState({ depth: 0 }, '', location.hash || '#/');
  window.addEventListener('popstate', () => render());
  return render();
}

/** Сохранить текущий экран (при сворачивании приложения). */
export async function flushCurrent() {
  if (current?.save) await current.save();
}
