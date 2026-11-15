import type { Base, CollectionName, Media, Note, Template, TrashItem } from './types';

/**
 * Слой хранения. Сейчас — IndexedDB (idbStore), в версии для Mac (Tauri)
 * будет реализация поверх файлов на диске. Остальной код знает только этот интерфейс.
 */
export interface Collection<T extends Base> {
  get(id: string): Promise<T | undefined>;
  all(): Promise<T[]>;
  put(value: T): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface KV {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
}

export interface Store {
  notes: Collection<Note>;
  templates: Collection<Template>;
  media: Collection<Media>;
  trash: Collection<TrashItem>;
  kv: KV;
  /** вызывается после любого изменения коллекций (не kv) */
  onChange(cb: (c: CollectionName) => void): () => void;
  /** удалить вообще всё (для восстановления из копии) */
  clear(): Promise<void>;
}

export type Listener = (c: CollectionName) => void;
