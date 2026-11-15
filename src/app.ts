import type { Store } from './store/Store';
import type { BackupService } from './backup/service';

/** Общие для всего приложения объекты. */
export const ctx = {
  store: null as unknown as Store,
  backup: null as unknown as BackupService,
};
