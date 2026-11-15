import type { Collection, KV, Listener, Store } from './Store';
import type { Base, CollectionName } from './types';

/** Хранилище в памяти — для тестов и как образец для других реализаций. */
export function createMemoryStore(): Store {
  const listeners = new Set<Listener>();
  const data: Record<CollectionName, Map<string, any>> = {
    notes: new Map(), templates: new Map(), media: new Map(), trash: new Map(),
  };
  const kvMap = new Map<string, unknown>();
  const clone = <T>(v: T): T => shallow(v);
  const col = <T extends Base>(s: CollectionName): Collection<T> => ({
    get: async (id) => (data[s].has(id) ? clone(data[s].get(id)) : undefined),
    all: async () => [...data[s].values()].map(clone),
    put: async (v) => { data[s].set(v.id, clone(v)); listeners.forEach((l) => l(s)); },
    remove: async (id) => { data[s].delete(id); listeners.forEach((l) => l(s)); },
  });
  const kv: KV = {
    get: async (k) => kvMap.get(k) as any,
    set: async (k, v) => { kvMap.set(k, v); },
    del: async (k) => { kvMap.delete(k); },
  };
  return {
    notes: col('notes'), templates: col('templates'), media: col('media'), trash: col('trash'), kv,
    onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    async clear() { Object.values(data).forEach((m) => m.clear()); },
  };
}

/** Копия записи: массивы копируются, Blob передаётся как есть. */
function shallow<T>(v: T): T {
  const o: any = { ...(v as any) };
  for (const k of Object.keys(o)) if (Array.isArray(o[k])) o[k] = [...o[k]];
  return o;
}
