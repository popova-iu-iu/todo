import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '../../src/store/memoryStore';
import { createDraft, deleteNote, getNote, listNotes, saveNote } from '../../src/model/notes';
import { saveCustomTemplate } from '../../src/model/templates';
import { BUILTIN } from '../../src/templates/builtin';
import { createKeys, unlockWithPassword, unlockWithRecovery } from '../../src/crypto/keys';
import { GitLab } from '../../src/backup/gitlab';
import { readKeyFile, restoreVersion, sync, versions, writeKeyFile } from '../../src/backup/engine';
import { BackupService } from '../../src/backup/service';
import { mockGitlab } from './mockGitlab';

const cfg = { url: 'https://gitlab.example', project: 'me/backup', token: 'good-token' };
const tpl = (id: string) => BUILTIN.find((t) => t.id === id)!;
const phone = { id: 'p', name: 'iPhone' };
const mac = { id: 'm', name: 'Mac' };

async function note(store: ReturnType<typeof createMemoryStore>, title: string, body = 'текст', t = 'blank') {
  const n = createDraft(tpl(t));
  await saveNote(store, n, `<h1>${title}</h1><p>${body}</p>`);
  return n;
}

async function setup() {
  const gl = mockGitlab();
  const api = new GitLab(cfg, gl.fetchFn);
  const { keyFile, keys, recoveryKey } = await createKeys('мой пароль', 2000);
  await writeKeyFile(api, keyFile, false);
  return { gl, api, keys, recoveryKey };
}

describe('бэкап в GitLab', () => {
  it('в репозитории только зашифрованное: ни названий, ни текста, ни id', async () => {
    const { gl, api, keys } = await setup();
    const store = createMemoryStore();
    const n = await note(store, 'Поездка на Крит', 'паром Пирей — Ханья');
    await sync(store, api, keys, phone);
    const dump = [...gl.files().entries()].map(([k, v]) => k + new TextDecoder().decode(v)).join('\n');
    expect(dump).not.toMatch(/Крит|Пирей|паром/);
    expect(dump).not.toContain(n.id);
    expect([...gl.files().keys()].sort()).toEqual(expect.arrayContaining(['index.bin', 'keys.json', 'README.md']));
  });

  it('восстановление на новом устройстве паролем и ключом восстановления', async () => {
    const { api, keys, recoveryKey } = await setup();
    const phoneStore = createMemoryStore();
    await note(phoneStore, 'Хлеб на закваске', 'мука, вода', 'recipe');
    await saveCustomTemplate(phoneStore, { id: 'c1', name: 'Сад', bg: '#DCEBE3', html: '<h1 data-ph="Название"></h1>' });
    await phoneStore.media.put({ id: 'img1', blob: new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/jpeg' }), type: 'image/jpeg', updatedAt: Date.now() });
    await sync(phoneStore, api, keys, phone);

    for (const unlock of [
      async () => unlockWithPassword((await readKeyFile(api))!, 'мой пароль'),
      async () => unlockWithRecovery((await readKeyFile(api))!, recoveryKey),
    ]) {
      const fresh = createMemoryStore();
      const r = await sync(fresh, api, await unlock(), mac);
      expect(r.downloaded).toBe(3);
      expect((await listNotes(fresh)).map((n) => n.title)).toEqual(['Хлеб на закваске']);
      expect((await fresh.templates.get('c1'))!.name).toBe('Сад');
      const img = (await fresh.media.get('img1'))!;
      expect([...new Uint8Array(await new Promise<ArrayBuffer>((r) => { const f = new FileReader(); f.onload = () => r(f.result as ArrayBuffer); f.readAsArrayBuffer(img.blob); }))]).toEqual([1, 2, 3, 250]);
    }
  });

  it('синхронизация двух устройств: новое побеждает, удаления доходят', async () => {
    const { api, keys } = await setup();
    const A = createMemoryStore(), B = createMemoryStore();
    const shared = await note(A, 'Общая');
    await sync(A, api, keys, phone);
    await sync(B, api, keys, mac);
    // B правит, A добавляет своё
    const bn = (await getNote(B, shared.id))!;
    await new Promise((r) => setTimeout(r, 5));
    await saveNote(B, bn, '<h1>Общая</h1><p>правка с Mac</p>');
    await note(A, 'Только на iPhone');
    await sync(B, api, keys, mac);
    const r = await sync(A, api, keys, phone);
    expect(r.downloaded).toBe(1);
    expect((await getNote(A, shared.id))!.text).toContain('правка с Mac');
    await sync(B, api, keys, mac);
    expect((await listNotes(B)).map((n) => n.title).sort()).toEqual(['Общая', 'Только на iPhone']);
    // удаление на A доходит до B
    await deleteNote(A, (await getNote(A, shared.id))!);
    await sync(A, api, keys, phone);
    await sync(B, api, keys, mac);
    expect((await listNotes(B)).map((n) => n.title)).toEqual(['Только на iPhone']);
  });

  it('если ничего не изменилось — коммита нет', async () => {
    const { gl, api, keys } = await setup();
    const store = createMemoryStore();
    await note(store, 'Раз');
    await sync(store, api, keys, phone);
    const before = gl.commits.length;
    const r = await sync(store, api, keys, phone);
    expect(r.uploaded).toBe(0);
    expect(gl.commits.length).toBe(before);
  });

  it('восстановление на дату из истории', async () => {
    const { api, keys } = await setup();
    const store = createMemoryStore();
    const n = await note(store, 'Версия 1');
    await sync(store, api, keys, phone);
    await new Promise((r) => setTimeout(r, 5));
    await saveNote(store, (await getNote(store, n.id))!, '<h1>Версия 2</h1>');
    await note(store, 'Лишняя');
    await sync(store, api, keys, phone);
    const vs = await versions(api);
    expect(vs.length).toBe(2);
    await restoreVersion(store, api, keys, vs[1].id); // старая
    expect((await listNotes(store)).map((x) => x.title)).toEqual(['Версия 1']);
    await sync(store, api, keys, phone);
    // и это состояние стало текущим в репозитории
    const other = createMemoryStore();
    await sync(other, api, keys, mac);
    expect((await listNotes(other)).map((x) => x.title)).toEqual(['Версия 1']);
  });

  it('понятные ошибки доступа', async () => {
    const gl = mockGitlab();
    await expect(new GitLab({ ...cfg, token: 'bad' }, gl.fetchFn).project()).rejects.toThrow(/токен/);
    await expect(new GitLab({ ...cfg, project: 'me/other' }, gl.fetchFn).project()).rejects.toThrow(/не найден/);
  });

  it('служба: изменения помечают «есть несохранённое», копия снимает пометку', async () => {
    const { gl, keys } = await setup();
    const store = createMemoryStore();
    const svc = new BackupService(store, gl.fetchFn);
    await svc.init();
    expect(svc.status.state).toBe('off');
    await svc.connect(cfg, keys);
    await svc.setAuto(false);
    await note(store, 'Новая');
    expect(svc.status.dirty).toBe(true);
    const r = await svc.runNow();
    expect(r!.uploaded).toBe(1);
    expect(svc.status.dirty).toBe(false);
    expect(svc.status.lastAt).toBeTruthy();
    expect(Object.values(svc.status.devices)[0].name).toBeTruthy();
  });
});
