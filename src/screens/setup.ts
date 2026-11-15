import { ctx } from '../app';
import { readKeyFile, writeKeyFile } from '../backup/engine';
import { GitLab, type GitLabConfig } from '../backup/gitlab';
import { createKeys, unlockWithPassword, unlockWithRecovery, WrongSecret, type KeyFile, type Keys } from '../crypto/keys';
import { back, navigate, type Screen } from '../router';
import { $, esc, html } from '../ui/dom';
import { icons } from '../ui/icons';
import { toast } from '../ui/overlay';

/**
 * Настройка копии (и подключение второго устройства):
 * 1) GitLab: адрес, проект, токен → проверка доступа;
 * 2а) копии ещё нет → придумать пароль → ключ восстановления → первая копия;
 * 2б) копия уже есть → ввести пароль (или ключ восстановления) → заметки скачиваются.
 */
export async function setupScreen(): Promise<Screen> {
  const el = html(`<section class="screen" aria-label="Настройка копии">
    <div class="top"><button class="pill light" data-back style="align-self:flex-start">${icons.back}Назад</button><h1 class="h1" style="font-size:28px">Копия в GitLab</h1></div>
    <div class="scroll"><div class="form"></div></div>
  </section>`);
  const form = $('.form', el)!;
  const saved = (await ctx.store.kv.get<GitLabConfig>('gitlab')) || null;
  let cfg: GitLabConfig = saved || { url: 'https://gitlab.com', project: '', token: '' };
  let gl: GitLab;
  let keyFile: KeyFile | null = null;

  const busy = (b: HTMLButtonElement, text: string) => { const old = b.innerHTML; b.disabled = true; b.textContent = text; return () => { b.disabled = false; b.innerHTML = old; }; };
  const showErr = (msg: string) => { const e = $('.err', form); if (e) e.textContent = msg; };

  // ---------- шаг 1: GitLab ----------
  const stepGitlab = () => {
    form.innerHTML = `
      <div class="t-sub">Заметки шифруются здесь, на телефоне, и отправляются в ваш <b>приватный</b> репозиторий. Он же нужен, чтобы те же заметки были на Mac.</div>
      <div class="card-w">
        <label class="field"><span>Адрес GitLab</span><input class="input" name="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" value="${esc(cfg.url)}"></label>
        <label class="field"><span>Репозиторий</span><input class="input" name="project" placeholder="имя/zametki-backup" autocapitalize="off" autocorrect="off" spellcheck="false" value="${esc(cfg.project)}"></label>
        <label class="field"><span>Токен доступа</span><input class="input" name="token" type="password" placeholder="glpat-…" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" value="${esc(cfg.token)}"></label>
        <div class="hint">Как получить: в GitLab создайте <b>приватный</b> проект → Settings → Access tokens → новый токен с ролью Maintainer и правом <b>api</b>. Токен хранится только на этом устройстве.</div>
        <div class="err" role="alert"></div>
        <button class="btn primary" data-check>Проверить и продолжить</button>
      </div>`;
  };

  const check = async (b: HTMLButtonElement) => {
    const v = (n: string) => ($<HTMLInputElement>(`[name=${n}]`, form)!.value || '').trim();
    cfg = { url: v('url') || 'https://gitlab.com', project: v('project').replace(/^https?:\/\/[^/]+\//, '').replace(/\.git$/, ''), token: v('token') };
    if (!/^https?:\/\//.test(cfg.url)) return showErr('Адрес должен начинаться с https://');
    if (!cfg.project || !cfg.token) return showErr('Заполните репозиторий и токен');
    const done = busy(b, 'Проверяю…');
    try {
      gl = ctx.backup.gitlab(cfg);
      const p = await gl.project();
      if (p.visibility === 'public') { done(); return showErr('Этот репозиторий открыт всем. Сделайте его приватным (Settings → General → Visibility) и попробуйте снова.'); }
      keyFile = await readKeyFile(gl);
      done();
      keyFile ? stepUnlock(false) : stepPassword();
    } catch (e: any) {
      done();
      showErr(e?.message || String(e));
    }
  };

  // ---------- шаг 2а: новый пароль ----------
  const stepPassword = () => {
    form.innerHTML = `
      <div class="t-sub">Придумайте пароль для копий. Он нужен, чтобы открыть копию на другом устройстве. Пароль никуда не отправляется.</div>
      <div class="card-w">
        <label class="field"><span>Пароль</span><input class="input" name="p1" type="password" autocomplete="new-password"></label>
        <label class="field"><span>Ещё раз</span><input class="input" name="p2" type="password" autocomplete="new-password"></label>
        <div class="hint">Не короче 8 символов. Лучше — несколько слов.</div>
        <div class="err" role="alert"></div>
        <button class="btn primary" data-create>Дальше</button>
      </div>`;
  };

  let pending: { keyFile: KeyFile; keys: Keys; recoveryKey: string } | null = null;
  const create = async (b: HTMLButtonElement) => {
    const p1 = $<HTMLInputElement>('[name=p1]', form)!.value, p2 = $<HTMLInputElement>('[name=p2]', form)!.value;
    if (p1.length < 8) return showErr('Пароль слишком короткий — нужно хотя бы 8 символов');
    if (p1 !== p2) return showErr('Пароли не совпадают');
    const done = busy(b, 'Создаю ключи…');
    pending = await createKeys(p1);
    done();
    stepRecovery();
  };

  // ---------- ключ восстановления ----------
  const stepRecovery = () => {
    form.innerHTML = `
      <div class="warnbox">${icons.warn}<div><b>Без пароля копию открыть нельзя.</b> Даже мы не сможем помочь. Сохраните ключ восстановления — им можно открыть копию, если пароль забудется.</div></div>
      <div class="card-w">
        <div class="label">Ключ восстановления</div>
        <div class="rkey">${esc(pending!.recoveryKey)}</div>
        <button class="btn sec" data-copy>${icons.copy}Скопировать</button>
        <div class="hint">Запишите его на бумаге или сохраните в «Пароли» на iPhone. Не храните его в самих заметках.</div>
        <label class="agree"><input type="checkbox" data-agree>Я сохранила ключ в надёжном месте</label>
        <div class="err" role="alert"></div>
        <button class="btn primary" data-finish disabled>Включить копирование</button>
      </div>`;
  };

  const finish = async (b: HTMLButtonElement) => {
    const done = busy(b, 'Шифрую и отправляю…');
    try {
      await writeKeyFile(gl, pending!.keyFile, false);
      await ctx.backup.connect(cfg, pending!.keys);
      await ctx.backup.runNow();
      pending = null;
      await navigate('settings', true);
      toast('Готово! Копия сделана');
    } catch (e: any) {
      done();
      showErr(e?.message || String(e));
    }
  };

  // ---------- шаг 2б: копия уже есть ----------
  const stepUnlock = (recovery: boolean) => {
    form.innerHTML = `
      <div class="t-sub">В этом репозитории уже есть копия. ${recovery ? 'Введите ключ восстановления.' : 'Введите пароль от неё — заметки появятся на этом устройстве.'}</div>
      <div class="card-w">
        ${recovery
          ? '<label class="field"><span>Ключ восстановления</span><input class="input" name="secret" placeholder="ABCD-EFGH-…" autocapitalize="characters" autocorrect="off" spellcheck="false" autocomplete="off"></label>'
          : '<label class="field"><span>Пароль</span><input class="input" name="secret" type="password" autocomplete="current-password"></label>'}
        <div class="err" role="alert"></div>
        <button class="btn primary" data-unlock="${recovery ? 'rk' : 'pw'}">Открыть копию</button>
        <button class="btn sec" data-switch="${recovery ? 'pw' : 'rk'}">${recovery ? 'Ввести пароль' : 'Не помню пароль — ввести ключ восстановления'}</button>
      </div>`;
  };

  const unlock = async (b: HTMLButtonElement, mode: string) => {
    const secret = $<HTMLInputElement>('[name=secret]', form)!.value;
    if (!secret) return;
    const done = busy(b, 'Открываю…');
    try {
      const keys = mode === 'rk' ? await unlockWithRecovery(keyFile!, secret) : await unlockWithPassword(keyFile!, secret);
      b.textContent = 'Загружаю заметки…';
      await ctx.backup.connect(cfg, keys);
      const r = await ctx.backup.runNow();
      await navigate('', true);
      toast(r && r.downloaded ? `Готово! Загружено: ${r.downloaded}` : 'Готово! Копирование включено');
    } catch (e: any) {
      done();
      showErr(e instanceof WrongSecret ? (mode === 'rk' ? 'Ключ не подходит' : 'Неверный пароль') : e?.message || String(e));
    }
  };

  stepGitlab();
  el.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const b = t.closest<HTMLButtonElement>('button');
    if (t.closest('[data-back]')) return back();
    if (!b) return;
    if (b.hasAttribute('data-check')) return check(b);
    if (b.hasAttribute('data-create')) return create(b);
    if (b.hasAttribute('data-finish')) return finish(b);
    if (b.dataset.unlock) return unlock(b, b.dataset.unlock);
    if (b.dataset.switch) return stepUnlock(b.dataset.switch === 'rk');
    if (b.hasAttribute('data-copy')) {
      try { await navigator.clipboard.writeText(pending!.recoveryKey); toast('Ключ скопирован'); } catch { toast('Не получилось скопировать — перепишите ключ вручную'); }
    }
  });
  el.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.hasAttribute('data-agree')) $<HTMLButtonElement>('[data-finish]', form)!.disabled = !t.checked;
  });
  return { el, leave: () => { pending = null; } };
}
