import { ctx } from '../app';
import { restoreVersion, versions } from '../backup/engine';
import { back, navigate, type Screen } from '../router';
import { $, esc, html } from '../ui/dom';
import { icons } from '../ui/icons';
import { openSheet, toast } from '../ui/overlay';
import { whenFull } from '../ui/plural';

/** «Восстановить из копии»: выбрать дату и вернуть все заметки целиком. */
export async function restoreScreen(): Promise<Screen | null> {
  if (!ctx.backup.configured) return null;
  const el = html(`<section class="screen" aria-label="Восстановить из копии">
    <div class="top"><button class="pill light" data-back style="align-self:flex-start">${icons.back}Настройки</button>
      <h1 class="h1" style="font-size:28px">Восстановить из копии</h1>
      <div class="t-sub">Выберите, на какой момент вернуть все заметки. Текущее состояние тоже останется в истории — передумать можно в любой момент.</div></div>
    <div class="scroll"><div class="settings"><div class="set list"><div class="setrow"><div class="tx"><small>Загружаю историю…</small></div></div></div></div></div>
  </section>`);
  const list = $('.list', el)!;
  versions(ctx.backup.remote()).then((vs) => {
    list.innerHTML = vs.length
      ? vs.map((v, i) => `<button class="setrow" data-ref="${esc(v.id)}" data-when="${esc(whenFull(Date.parse(v.created_at)))}"><div class="tx">${whenFull(Date.parse(v.created_at))}${i === 0 ? ' · последняя' : ''}<small>${esc(v.message.split('\n')[0])}</small></div><span class="go" aria-hidden="true">›</span></button>`).join('')
      : '<div class="setrow"><div class="tx"><small>Копий пока нет</small></div></div>';
  }).catch((e) => {
    list.innerHTML = `<div class="setrow"><div class="tx"><small class="err">${esc(e?.message || String(e))}</small></div></div>`;
  });

  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-back]')) return back();
    const v = t.closest<HTMLElement>('[data-ref]');
    if (v) confirm(v.dataset.ref!, v.dataset.when!);
  });
  return { el };
}

function confirm(ref: string, when: string) {
  const box = html(`<div style="display:flex;flex-direction:column;gap:14px">
    <h3>Вернуть заметки на ${esc(when)}?</h3>
    <div class="t-sub">Все заметки и свои шаблоны станут такими, какими были в этой копии. Нынешнее состояние сохранится в истории GitHub.</div>
    <div class="err" role="alert"></div>
    <button class="btn primary" data-go>Вернуть</button>
    <button class="btn sec" data-cancel>Отмена</button>
  </div>`);
  const close = openSheet(box, { label: 'Подтверждение' });
  box.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-cancel]')) return close();
    const b = t.closest<HTMLButtonElement>('[data-go]');
    if (!b) return;
    b.disabled = true;
    b.textContent = 'Восстанавливаю…';
    try {
      // сначала отправить несохранённое — чтобы оно осталось в истории
      await ctx.backup.runNow();
      const n = await restoreVersion(ctx.store, ctx.backup.remote(), ctx.backup.getKeys()!, ref);
      await ctx.backup.runNow();
      close();
      await navigate('', true);
      toast(`Восстановлено: ${n}`);
    } catch (err: any) {
      b.disabled = false;
      b.textContent = 'Вернуть';
      $('.err', box)!.textContent = err?.message || String(err);
    }
  });
}
