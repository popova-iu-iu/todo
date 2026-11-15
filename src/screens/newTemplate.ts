import { ctx } from '../app';
import { nameTaken } from '../model/templates';
import { PALETTE } from '../templates/builtin';
import { navigate } from '../router';
import { $, $$, html, uid } from '../ui/dom';
import { openSheet, toast } from '../ui/overlay';
import { buildDrafts } from './note';

/** «+ Новый шаблон» → название и цвет обложки → страница в режиме шаблона. */
export function openNewTemplateSheet() {
  let color = 0;
  const box = html(`<div style="display:flex;flex-direction:column;gap:14px">
    <h3>Новый шаблон</h3>
    <div class="t-sub">Как будет называться этот вид заметок?</div>
    <label class="search light"><span class="sr">Название шаблона</span><input type="text" placeholder="Например: Сад, Тренировка, Покупка" autocomplete="off" maxlength="40"></label>
    <div><div class="label" style="margin-bottom:10px">Цвет обложки</div><div class="swatches">${PALETTE.map(([t, k], i) => `<button type="button" class="swatch${i === 0 ? ' on' : ''}" data-c="${i}" style="background:${t};color:${k}" aria-label="Цвет ${i + 1}"></button>`).join('')}</div></div>
    <button class="btn primary" data-next>Дальше — собрать страницу</button>
  </div>`);
  const input = $<HTMLInputElement>('input', box)!;
  const close = openSheet(box, { label: 'Новый шаблон' });
  setTimeout(() => input.focus(), 200);
  box.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const sw = t.closest<HTMLElement>('[data-c]');
    if (sw) {
      color = +sw.dataset.c!;
      $$('.swatch', box).forEach((x) => x.classList.toggle('on', x === sw));
      return;
    }
    if (!t.closest('[data-next]')) return;
    const name = input.value.trim();
    if (!name) return input.focus();
    if (await nameTaken(ctx.store, name)) return toast('Шаблон с таким названием уже есть');
    const id = 'c' + uid();
    buildDrafts.set(id, { name, bg: PALETTE[color][0] });
    close();
    navigate('build/' + id);
  });
}
