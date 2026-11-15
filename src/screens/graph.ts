import { ctx } from '../app';
import { listNotes } from '../model/notes';
import { back, navigate, type Screen } from '../router';
import { $, esc, html } from '../ui/dom';
import { icons } from '../ui/icons';

/** Карта связей: заметки, у которых есть ссылки, и линии между ними. Нажатие открывает заметку. */
export async function graphScreen(): Promise<Screen> {
  const el = html(`<section class="screen" aria-label="Связи">
    <div class="top"><button class="pill light" data-back style="align-self:flex-start">${icons.back}Назад</button><h1 class="h1">Связи</h1><div class="t-sub">Как ваши заметки связаны между собой. Нажмите на любую.</div></div>
    <div class="graph"></div>
  </section>`);
  const box = $('.graph', el)!;
  const notes = await listNotes(ctx.store);
  const ids = new Set(notes.map((n) => n.id));
  const edges: [string, string][] = [];
  const seen = new Set<string>();
  for (const n of notes) for (const to of n.links) {
    if (!ids.has(to)) continue;
    const k = [n.id, to].sort().join('|');
    if (!seen.has(k)) { seen.add(k); edges.push([n.id, to]); }
  }
  let onResize = () => {};
  const linked = notes.filter((n) => edges.some(([a, b]) => a === n.id || b === n.id));

  if (!linked.length) {
    box.innerHTML = '<div class="empty" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:30px">Пока нет связей. Выделите слово в заметке и нажмите «Связать».</div>';
  } else {
    const pos = layout(linked.map((n) => n.id), edges);
    const deg = (id: string) => edges.filter(([a, b]) => a === id || b === id).length;
    const maxDeg = Math.max(...linked.map((n) => deg(n.id)));
    const draw = () => {
      const W = box.clientWidth || 360, H = box.clientHeight || 520;
      const P = (id: string) => [pos.get(id)![0] * W, pos.get(id)![1] * H];
      box.innerHTML = `<svg aria-hidden="true" viewBox="0 0 ${W} ${H}">${edges.map(([a, b]) => { const [x1, y1] = P(a), [x2, y2] = P(b); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#C9D9D0" stroke-width="2"/>`; }).join('')}</svg>` +
        linked.map((n) => { const [x, y] = pos.get(n.id)!; return `<button class="node${deg(n.id) === maxDeg ? ' big' : ''}" style="left:${x * 100}%;top:${y * 100}%" data-open="${n.id}">${esc(n.title || 'Без названия')}</button>`; }).join('');
    };
    requestAnimationFrame(draw);
    onResize = draw;
    window.addEventListener('resize', onResize);
  }

  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-back]')) return back();
    const o = t.closest<HTMLElement>('[data-open]');
    if (o) navigate('n/' + o.dataset.open);
  });
  return { el, leave: () => window.removeEventListener('resize', onResize) };
}

/** Простая силовая раскладка; координаты 0..1 с отступами от краёв. */
export function layout(ids: string[], edges: [string, string][]) {
  const p = new Map<string, [number, number]>();
  ids.forEach((id, i) => {
    const a = (i / ids.length) * Math.PI * 2;
    p.set(id, [0.5 + 0.3 * Math.cos(a), 0.5 + 0.3 * Math.sin(a)]);
  });
  for (let it = 0; it < 300; it++) {
    const f = new Map(ids.map((id) => [id, [0, 0]]));
    for (const a of ids) for (const b of ids) {
      if (a === b) continue;
      const [ax, ay] = p.get(a)!, [bx, by] = p.get(b)!;
      const dx = ax - bx, dy = ay - by, d2 = Math.max(dx * dx + dy * dy, 1e-4);
      const k = 0.0016 / d2;
      f.get(a)![0] += dx * k; f.get(a)![1] += dy * k;
    }
    for (const [a, b] of edges) {
      const [ax, ay] = p.get(a)!, [bx, by] = p.get(b)!;
      const dx = bx - ax, dy = by - ay;
      f.get(a)![0] += dx * 0.05; f.get(a)![1] += dy * 0.05;
      f.get(b)![0] -= dx * 0.05; f.get(b)![1] -= dy * 0.05;
    }
    for (const id of ids) {
      const [x, y] = p.get(id)!, [fx, fy] = f.get(id)!;
      const c = 0.01; // тянуть к центру
      p.set(id, [x + Math.max(-0.05, Math.min(0.05, fx + (0.5 - x) * c)), y + Math.max(-0.05, Math.min(0.05, fy + (0.5 - y) * c))]);
    }
  }
  // вписать в рамку 0.14..0.86 по x, 0.08..0.92 по y
  const xs = ids.map((id) => p.get(id)![0]), ys = ids.map((id) => p.get(id)![1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  ids.forEach((id) => {
    const [x, y] = p.get(id)!;
    p.set(id, [x1 > x0 ? 0.18 + ((x - x0) / (x1 - x0)) * 0.64 : 0.5, y1 > y0 ? 0.08 + ((y - y0) / (y1 - y0)) * 0.84 : 0.5]);
  });
  return p;
}
