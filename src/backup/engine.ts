import type { Store } from '../store/Store';
import type { Base, Media, Note, Template } from '../store/types';
import { decryptBytes, decryptJson, encryptBytes, encryptJson, fileName, type KeyFile, type Keys } from '../crypto/keys';
import { sanitize } from '../sanitize';
import type { CommitAction, GitLab } from './gitlab';

/**
 * Зашифрованный бэкап и синхронизация через репозиторий GitLab.
 *
 * В репозитории:
 *   keys.json    — соль и «завёрнутый» ключ (секретов нет);
 *   index.bin    — зашифрованный список файлов: что это и когда изменено;
 *   n/…, t/…, m/… — зашифрованные заметки, свои шаблоны, фото. Имена — HMAC, ничего не раскрывают.
 *
 * Слияние: у каждой записи побеждает более новая версия (updatedAt), удаления — «надгробия».
 */
export type Kind = 'n' | 't' | 'm';
export interface IndexEntry { k: Kind; id: string; u: number; d?: 1 }
export interface RemoteIndex {
  v: 1;
  items: Record<string, IndexEntry>;
  devices: Record<string, { name: string; at: number }>;
}

export const KEYS_PATH = 'keys.json';
export const INDEX_PATH = 'index.bin';
const CHUNK = 6 * 1024 * 1024;

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Пока применяются изменения с сервера, автокопирование не должно срабатывать. */
export const syncState = { applying: false };

export interface DeviceInfo { id: string; name: string }
export interface SyncResult { uploaded: number; downloaded: number; devices: RemoteIndex['devices'] }

const emptyIndex = (): RemoteIndex => ({ v: 1, items: {}, devices: {} });

export async function readKeyFile(gl: GitLab): Promise<KeyFile | null> {
  const b = await gl.read(KEYS_PATH);
  return b ? JSON.parse(dec.decode(b)) : null;
}

export async function writeKeyFile(gl: GitLab, kf: KeyFile, exists: boolean) {
  const actions: CommitAction[] = [{ action: exists ? 'update' : 'create', file_path: KEYS_PATH, content: enc.encode(JSON.stringify(kf, null, 2)) }];
  if (!exists && !(await gl.read('README.md'))) {
    actions.push({ action: 'create', file_path: 'README.md', content: enc.encode('# Зашифрованная копия заметок\n\nЭти файлы зашифрованы на устройстве (AES-256-GCM). Открыть их можно только в приложении «Мои заметки» вашим паролем или ключом восстановления.\n') });
  }
  await gl.commit(exists ? 'Новый пароль' : 'Шифрование включено', actions);
}

async function readIndex(gl: GitLab, keys: Keys, ref?: string): Promise<{ idx: RemoteIndex; exists: boolean }> {
  const b = await gl.read(INDEX_PATH, ref);
  if (!b) return { idx: emptyIndex(), exists: false };
  return { idx: await decryptJson<RemoteIndex>(keys, b), exists: true };
}

// ---------- упаковка записей ----------
async function pack(keys: Keys, k: Kind, item: Base): Promise<Uint8Array> {
  if (k !== 'm') return encryptJson(keys, item);
  const m = item as Media;
  const meta = enc.encode(JSON.stringify({ id: m.id, type: m.type, updatedAt: m.updatedAt, deleted: m.deleted }));
  const bytes = await blobBytes(m.blob);
  const out = new Uint8Array(4 + meta.length + bytes.length);
  new DataView(out.buffer).setUint32(0, meta.length);
  out.set(meta, 4);
  out.set(bytes, 4 + meta.length);
  return encryptBytes(keys, out);
}

function blobBytes(b: Blob): Promise<Uint8Array> {
  if (typeof b.arrayBuffer === 'function') return b.arrayBuffer().then((x) => new Uint8Array(x));
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(new Uint8Array(r.result as ArrayBuffer));
    r.onerror = () => rej(r.error);
    r.readAsArrayBuffer(b);
  });
}

async function unpack(keys: Keys, k: Kind, data: Uint8Array): Promise<Base> {
  if (k !== 'm') return decryptJson<Base>(keys, data);
  const raw = await decryptBytes(keys, data);
  const len = new DataView(raw.buffer, raw.byteOffset).getUint32(0);
  const meta = JSON.parse(dec.decode(raw.subarray(4, 4 + len)));
  return { ...meta, blob: new Blob([raw.slice(4 + len)], { type: meta.type }) } as Media;
}

function collection(store: Store, k: Kind) {
  return k === 'n' ? store.notes : k === 't' ? store.templates : store.media;
}

/** Применить запись с сервера к хранилищу (очищая HTML на всякий случай). */
async function apply(store: Store, k: Kind, item: Base) {
  if (k === 'n') {
    const n = item as Note;
    await store.notes.put({ ...n, html: sanitize(n.html || ''), links: Array.isArray(n.links) ? n.links.filter((x) => typeof x === 'string') : [] });
  } else if (k === 't') {
    await store.templates.put({ ...(item as Template), html: sanitize((item as Template).html || ''), builtin: false });
  } else await store.media.put(item as Media);
}

async function applyTombstone(store: Store, k: Kind, id: string, u: number) {
  const c = collection(store, k) as any;
  const cur = await c.get(id);
  if (k === 'm') await c.put({ id, updatedAt: u, deleted: true, type: '', blob: new Blob([]) });
  else if (cur) await c.put({ ...cur, deleted: true, updatedAt: u, ...(k === 'n' ? { html: '', text: '', links: [] } : {}) });
}

async function localItems(store: Store): Promise<{ k: Kind; item: Base }[]> {
  const out: { k: Kind; item: Base }[] = [];
  (await store.notes.all()).forEach((item) => out.push({ k: 'n', item }));
  (await store.templates.all()).forEach((item) => out.push({ k: 't', item }));
  (await store.media.all()).forEach((item) => out.push({ k: 'm', item }));
  return out;
}

/**
 * Синхронизация: скачать то, что новее на сервере, отправить то, что новее здесь.
 * При конфликте коммита (другое устройство успело раньше) — повторить.
 */
export async function sync(store: Store, gl: GitLab, keys: Keys, device: DeviceInfo, attempt = 0): Promise<SyncResult> {
  const { idx, exists } = await readIndex(gl, keys);
  const local = await localItems(store);
  const localByPath = new Map<string, { k: Kind; item: Base }>();
  for (const l of local) localByPath.set(await fileName(keys, l.k, l.item.id), l);

  // 1. что скачать
  let downloaded = 0;
  syncState.applying = true;
  try {
    for (const [path, e] of Object.entries(idx.items)) {
      const l = localByPath.get(path);
      if (l && l.item.updatedAt >= e.u) continue;
      if (e.d) {
        if (l && !l.item.deleted) { await applyTombstone(store, e.k, e.id, e.u); downloaded++; }
        else if (l) await applyTombstone(store, e.k, e.id, e.u);
        continue;
      }
      const data = await gl.read(path);
      if (!data) continue;
      const item = await unpack(keys, e.k, data);
      await apply(store, e.k, item);
      localByPath.set(path, { k: e.k, item });
      downloaded++;
    }
  } finally {
    syncState.applying = false;
  }

  // 2. что отправить
  const uploads: { path: string; k: Kind; item: Base }[] = [];
  for (const [path, l] of localByPath) {
    const e = idx.items[path];
    if (!e || l.item.updatedAt > e.u) uploads.push({ path, ...l });
  }

  const devices = { ...idx.devices };
  if (!uploads.length && exists) return { uploaded: 0, downloaded, devices };

  // 3. отправка частями: каждый коммит содержит и файлы, и обновлённый индекс
  let indexExists = exists;
  let i = 0;
  try {
    do {
      const actions: CommitAction[] = [];
      let size = 0;
      while (i < uploads.length && (size < CHUNK || !actions.length)) {
        const u = uploads[i++];
        const prev = idx.items[u.path];
        const had = !!prev && !prev.d;
        if (u.item.deleted) {
          if (had) actions.push({ action: 'delete', file_path: u.path });
          idx.items[u.path] = { k: u.k, id: u.item.id, u: u.item.updatedAt, d: 1 };
        } else {
          const content = await pack(keys, u.k, u.item);
          size += content.length;
          actions.push({ action: had ? 'update' : 'create', file_path: u.path, content });
          idx.items[u.path] = { k: u.k, id: u.item.id, u: u.item.updatedAt };
        }
      }
      devices[device.id] = { name: device.name, at: Date.now() };
      idx.devices = devices;
      actions.push({ action: indexExists ? 'update' : 'create', file_path: INDEX_PATH, content: await encryptJson(keys, idx) });
      await gl.commit(commitMessage(device.name, actions.length - 1), actions);
      indexExists = true;
    } while (i < uploads.length);
  } catch (err: any) {
    // кто-то изменил репозиторий одновременно с нами — начать заново
    if (attempt < 3 && err && (err.status === 400 || err.status === 409)) return sync(store, gl, keys, device, attempt + 1);
    throw err;
  }
  return { uploaded: uploads.length, downloaded, devices };
}

function commitMessage(device: string, n: number) {
  return n ? `Копия с устройства «${device}»: изменений — ${n}` : `Копия с устройства «${device}»`;
}

/**
 * Восстановить всё на версию из истории (ref — коммит). Восстановленное становится «новее»,
 * поэтому следующая копия отправит его как текущую версию.
 */
export async function restoreVersion(store: Store, gl: GitLab, keys: Keys, ref: string) {
  const { idx } = await readIndex(gl, keys, ref);
  const now = Date.now();
  const items: { k: Kind; item: Base }[] = [];
  for (const [path, e] of Object.entries(idx.items)) {
    if (e.d) continue;
    const data = await gl.read(path, ref);
    if (!data) continue;
    items.push({ k: e.k, item: await unpack(keys, e.k, data) });
  }
  const keep = new Set(items.map((x) => `${x.k}:${x.item.id}`));
  syncState.applying = true;
  try {
    // всё, чего не было в той версии, — удалить
    for (const l of await localItems(store)) {
      if (!keep.has(`${l.k}:${l.item.id}`) && !l.item.deleted) await applyTombstone(store, l.k, l.item.id, now);
    }
    for (const x of items) await apply(store, x.k, { ...x.item, updatedAt: now });
  } finally {
    syncState.applying = false;
  }
  return items.length;
}

export async function versions(gl: GitLab) {
  return gl.history(INDEX_PATH);
}
