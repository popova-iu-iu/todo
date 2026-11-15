import type { Store } from '../store/Store';
import type { Keys } from '../crypto/keys';
import { uid } from '../ui/dom';
import { sync, syncState, type DeviceInfo, type RemoteIndex, type SyncResult } from './engine';
import { GitHub, type GitHubConfig } from './github';

/**
 * Автокопирование: после изменений (через ~20 секунд тишины), при появлении интернета
 * и когда приложение сворачивают. Плюс кнопка «Сделать копию сейчас».
 */
export type BackupState = 'off' | 'idle' | 'syncing' | 'offline' | 'error';
export interface BackupStatus {
  state: BackupState;
  lastAt: number | null;
  error: string | null;
  dirty: boolean;
  auto: boolean;
  devices: RemoteIndex['devices'];
  device: DeviceInfo | null;
  project: string | null;
}

const DELAY = 20_000;

export class BackupService {
  status: BackupStatus = { state: 'off', lastAt: null, error: null, dirty: false, auto: true, devices: {}, device: null, project: null };
  private listeners = new Set<(s: BackupStatus) => void>();
  private timer: any = 0;
  private running: Promise<SyncResult | null> | null = null;
  private keys: Keys | null = null;
  private cfg: GitHubConfig | null = null;

  constructor(private store: Store, private fetchFn?: typeof fetch) {}

  async init() {
    const kv = this.store.kv;
    this.cfg = (await kv.get<GitHubConfig>('github')) || null;
    this.keys = (await kv.get<Keys>('keys')) || null;
    let device = await kv.get<DeviceInfo>('device');
    if (!device) { device = { id: uid(), name: guessDevice() }; await kv.set('device', device); }
    this.set({
      device,
      lastAt: (await kv.get<number>('lastBackupAt')) || null,
      dirty: !!(await kv.get('dirty')),
      auto: (await kv.get<boolean>('auto')) ?? true,
      devices: (await kv.get<RemoteIndex['devices']>('devices')) || {},
      project: this.cfg?.repo || null,
      state: this.configured ? 'idle' : 'off',
    });
    this.store.onChange(() => { if (!syncState.applying) this.markDirty(); });
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.status.dirty && this.schedule(1000));
      window.addEventListener('offline', () => this.configured && this.set({ state: 'offline' }));
    }
    if (this.configured && this.status.dirty && this.status.auto) this.schedule(3000);
  }

  get configured() { return !!(this.cfg && this.keys); }
  remote(cfg = this.cfg) { return new GitHub(cfg!, this.fetchFn); }

  subscribe(fn: (s: BackupStatus) => void) {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }
  private set(p: Partial<BackupStatus>) {
    this.status = { ...this.status, ...p };
    this.listeners.forEach((l) => l(this.status));
  }

  /** Сохранить подключение после первой настройки или восстановления. */
  async connect(cfg: GitHubConfig, keys: Keys) {
    this.cfg = cfg;
    this.keys = keys;
    await this.store.kv.set('github', cfg);
    await this.store.kv.set('keys', keys);
    this.set({ state: 'idle', error: null, project: cfg.repo });
  }

  async disconnect() {
    clearTimeout(this.timer);
    this.cfg = null;
    this.keys = null;
    for (const k of ['github', 'keys', 'lastBackupAt', 'devices']) await this.store.kv.del(k);
    this.set({ state: 'off', lastAt: null, error: null, devices: {}, project: null });
  }

  getKeys() { return this.keys; }

  async setAuto(on: boolean) {
    await this.store.kv.set('auto', on);
    this.set({ auto: on });
    if (on && this.status.dirty) this.schedule(DELAY);
  }

  private markDirty() {
    if (!this.status.dirty) { this.set({ dirty: true }); void this.store.kv.set('dirty', true); }
    if (this.configured && this.status.auto) this.schedule(DELAY);
  }

  private schedule(ms: number) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.runNow().catch(() => {}), ms);
  }

  /** Приложение сворачивают — отправить сразу, если есть что. */
  flushSoon() {
    if (this.configured && this.status.auto && this.status.dirty) void this.runNow().catch(() => {});
  }

  async runNow(): Promise<SyncResult | null> {
    if (!this.configured) return null;
    if (this.running) return this.running;
    clearTimeout(this.timer);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { this.set({ state: 'offline' }); return null; }
    this.set({ state: 'syncing', error: null });
    this.running = (async () => {
      try {
        // всё, что изменится во время копирования, попадёт в следующую копию
        await this.store.kv.set('dirty', false);
        this.set({ dirty: false });
        const r = await sync(this.store, this.remote(), this.keys!, this.status.device!);
        const now = Date.now();
        await this.store.kv.set('lastBackupAt', now);
        await this.store.kv.set('devices', r.devices);
        this.set({ state: 'idle', lastAt: now, devices: r.devices });
        return r;
      } catch (e: any) {
        await this.store.kv.set('dirty', true);
        this.set({ state: e?.status === 0 ? 'offline' : 'error', error: e?.message || String(e), dirty: true });
        throw e;
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }
}

function guessDevice() {
  if (typeof navigator === 'undefined') return 'Устройство';
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Android/.test(ua)) return 'Android';
  return 'Компьютер';
}
