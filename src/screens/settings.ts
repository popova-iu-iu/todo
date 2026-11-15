import { ctx } from '../app';
import type { BackupStatus } from '../backup/service';
import { listTrash, restoreTrash } from '../model/notes';
import { back, navigate, type Screen } from '../router';
import { $, esc, html } from '../ui/dom';
import { icons } from '../ui/icons';
import { openSheet, toast } from '../ui/overlay';
import { whenFull } from '../ui/plural';

export async function settingsScreen(): Promise<Screen> {
  const el = html(`<section class="screen" aria-label="Настройки">
    <div class="top"><button class="pill light" data-back style="align-self:flex-start">${icons.back}Мои заметки</button><h1 class="h1">Настройки</h1></div>
    <div class="scroll"><div class="settings">
      <div class="label" style="padding:0 4px">Бэкап</div>
      <div class="status"></div>
      <div class="set rows"></div>
      <button class="set setrow" data-go="graph"><div class="ic">${icons.graph}</div><div class="tx">Карта связей<small>как заметки связаны между собой</small></div><span class="go" aria-hidden="true">›</span></button>
      <div class="label" style="padding:6px 4px 0">Недавно удалённое</div>
      <div class="set trash"></div>
      <button class="btn sec" data-restore>${icons.restore}Восстановить из копии</button>
    </div></div>
  </section>`);
  const statusBox = $('.status', el)!;
  const rows = $('.rows', el)!;

  const drawStatus = (s: BackupStatus) => {
    const busy = s.state === 'syncing';
    let icon = icons.check, cls = '', title = 'Всё сохранено', sub = s.lastAt ? `Последняя копия: ${whenFull(s.lastAt)}` : 'Копий пока не было';
    if (s.state === 'off') { icon = icons.lock; cls = 'off'; title = 'Копия не настроена'; sub = 'Заметки хранятся только на этом устройстве. Настройте зашифрованную копию в GitHub — так их можно будет вернуть и открыть на Mac.'; }
    else if (busy) { title = 'Копирую…'; sub = 'Шифрую и отправляю'; }
    else if (s.state === 'offline') { icon = icons.cloudOff; cls = 'warn'; title = 'Нет интернета'; sub = 'Скопирую, когда появится связь.' + (s.lastAt ? ` Последняя копия: ${whenFull(s.lastAt)}` : ''); }
    else if (s.state === 'error') { icon = icons.warn; cls = 'warn'; title = 'Не получилось сделать копию'; sub = s.error || ''; }
    else if (s.dirty) { title = 'Есть несохранённые изменения'; sub = s.auto ? 'Скопирую через несколько секунд.' : (s.lastAt ? `Последняя копия: ${whenFull(s.lastAt)}` : ''); }
    statusBox.innerHTML = `<div class="okicon ${cls}">${icon}</div>
      <div><div class="t-title" style="font-size:22px">${title}</div><div class="t-sub">${esc(sub)}</div></div>
      ${s.state === 'off'
        ? '<button class="btn primary" data-go="setup">Настроить копию</button>'
        : `<button class="btn primary" data-now ${busy ? 'disabled' : ''}>${busy ? 'Шифрую и отправляю…' : 'Сделать копию сейчас'}</button>`}`;

    const devs = Object.entries(s.devices).sort((a, b) => b[1].at - a[1].at)
      .map(([id, d]) => `${esc(d.name)}${id === s.device?.id ? ' (это)' : ''} — ${whenFull(d.at)}`).join(' · ');
    rows.innerHTML = `
      <div class="setrow"><div class="ic">${icons.sync}</div><div class="tx">Копировать автоматически<small>после каждого изменения</small></div><button class="switch" role="switch" aria-checked="${s.auto}" aria-label="Копировать автоматически" data-auto ${s.state === 'off' ? 'disabled' : ''}></button></div>
      <div class="setrow"><div class="ic">${icons.lock}</div><div class="tx">${s.state === 'off' ? 'Шифрование' : 'Зашифровано'}<small>${s.state === 'off' ? 'включится при настройке копии' : 'открыть можно только вашим паролем'}</small></div></div>
      <button class="setrow" data-remote><div class="ic">${icons.box}</div><div class="tx">GitHub<small>${s.project ? 'приватное хранилище · ' + esc(s.project) : 'не подключено'}</small></div><span class="go" aria-hidden="true">›</span></button>
      <div class="setrow"><div class="ic">${icons.devices}</div><div class="tx">Устройства<small>${devs || 'Mac и iPhone — заметки одинаковые'}</small></div></div>`;
  };
  const unsub = ctx.backup.subscribe(drawStatus);

  const drawTrash = async () => {
    const box = $('.trash', el)!;
    const items = await listTrash(ctx.store);
    if (!items.length) {
      box.innerHTML = '<div class="setrow"><div class="tx"><small>Здесь пусто. Удалённое хранится 30 дней, потом исчезает само.</small></div></div>';
      return;
    }
    box.innerHTML = items.map((t) => `<div class="setrow"><div class="tx">${esc(t.kind === 'note' ? `Заметка «${t.noteTitle}»` : t.label)}<small>${t.kind === 'note' ? '' : `из заметки «${esc(t.noteTitle)}» · `}${whenFull(t.deletedAt)}</small></div><button class="restorebtn" data-untrash="${t.id}">Вернуть</button></div>`).join('');
  };
  await drawTrash();

  el.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-back]')) return back();
    const go = t.closest<HTMLElement>('[data-go]');
    if (go) return navigate(go.dataset.go!);
    if (t.closest('[data-now]')) {
      try {
        const r = await ctx.backup.runNow();
        if (r) toast(r.downloaded ? `Готово. Пришло с других устройств: ${r.downloaded}` : 'Копия сделана');
      } catch { /* статус уже показывает ошибку */ }
      return;
    }
    const sw = t.closest<HTMLButtonElement>('[data-auto]');
    if (sw) {
      const on = sw.getAttribute('aria-checked') !== 'true';
      await ctx.backup.setAuto(on);
      return toast(on ? 'Автокопирование включено' : 'Автокопирование выключено');
    }
    if (t.closest('[data-remote]')) return ctx.backup.configured ? remoteSheet() : navigate('setup');
    const un = t.closest<HTMLElement>('[data-untrash]');
    if (un) {
      const item = (await listTrash(ctx.store)).find((x) => x.id === un.dataset.untrash);
      if (item && (await restoreTrash(ctx.store, item))) toast(`Вернула в заметку «${item.noteTitle}»`);
      else toast('Заметки, из которой это удалено, больше нет');
      return drawTrash();
    }
    if (t.closest('[data-restore]')) return navigate(ctx.backup.configured ? 'restore' : 'setup');
  });

  return { el, leave: () => { unsub(); } };
}

function remoteSheet() {
  const s = ctx.backup.status;
  const box = html(`<div style="display:flex;flex-direction:column;gap:14px">
    <h3>GitHub</h3>
    <div class="t-sub">Копии хранятся в приватном репозитории <b>${esc(s.project || '')}</b>. Файлы зашифрованы на этом устройстве — в GitHub видны только непонятные имена и байты.</div>
    <button class="btn danger" data-off>Отключить на этом устройстве</button>
    <div class="hint">Заметки на устройстве и копии в GitHub останутся. Подключиться снова можно в любой момент — понадобится пароль.</div>
  </div>`);
  const close = openSheet(box, { label: 'GitHub' });
  box.addEventListener('click', async (e) => {
    if (!(e.target as HTMLElement).closest('[data-off]')) return;
    await ctx.backup.disconnect();
    close();
    toast('Копирование отключено');
  });
}
