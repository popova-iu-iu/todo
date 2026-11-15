import { openDB, type IDBPDatabase } from 'idb';
import type { Collection, KV, Listener, Store } from './Store';
import type { Base, CollectionName } from './types';

const STORES: CollectionName[] = ['notes', 'templates', 'media', 'trash'];

export async function openIdbStore(name = 'baza-znaniy'): Promise<Store> {
  const db = await openDB(name, 1, {
    upgrade(d) {
      for (const s of STORES) d.createObjectStore(s, { keyPath: 'id' });
      d.createObjectStore('kv');
    },
  });
  const listeners = new Set<Listener>();
  const emit = (c: CollectionName) => listeners.forEach((l) => l(c));

  const col = <T extends Base>(s: CollectionName): Collection<T> => ({
    get: (id) => db.get(s, id) as Promise<T | undefined>,
    all: () => db.getAll(s) as Promise<T[]>,
    put: async (v) => { await db.put(s, v); emit(s); },
    remove: async (id) => { await db.delete(s, id); emit(s); },
  });

  const kv: KV = {
    get: (k) => db.get('kv', k),
    set: async (k, v) => { await db.put('kv', v, k); },
    del: async (k) => { await db.delete('kv', k); },
  };

  return {
    notes: col('notes'),
    templates: col('templates'),
    media: col('media'),
    trash: col('trash'),
    kv,
    onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    async clear() { await clearDb(db); STORES.forEach(emit); },
  };
}

async function clearDb(db: IDBPDatabase) {
  const tx = db.transaction([...STORES], 'readwrite');
  await Promise.all([...STORES.map((s) => tx.objectStore(s).clear()), tx.done]);
}
