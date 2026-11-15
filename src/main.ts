import '@fontsource/manrope/cyrillic-700.css';
import '@fontsource/manrope/cyrillic-800.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import '@fontsource/inter/cyrillic-400.css';
import '@fontsource/inter/cyrillic-500.css';
import '@fontsource/inter/cyrillic-600.css';
import '@fontsource/inter/cyrillic-700.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import './styles/app.css';
import './styles/editor.css';

import { ctx } from './app';
import { BackupService } from './backup/service';
import { initSelectionMenu } from './editor/selectionMenu';
import { purgeTrash } from './model/notes';
import { flushCurrent, route, startRouter } from './router';
import { graphScreen } from './screens/graph';
import { homeScreen } from './screens/home';
import { buildScreen, noteScreen } from './screens/note';
import { restoreScreen } from './screens/restore';
import { settingsScreen } from './screens/settings';
import { setupScreen } from './screens/setup';
import { shelfScreen } from './screens/shelf';
import { openIdbStore } from './store/idbStore';

async function start() {
  ctx.store = await openIdbStore();
  // попросить браузер не удалять данные при нехватке места
  navigator.storage?.persist?.().catch(() => {});
  await purgeTrash(ctx.store);
  ctx.backup = new BackupService(ctx.store);
  await ctx.backup.init();

  route(/^$/, homeScreen);
  route(/^t\/([\w-]+)$/, shelfScreen);
  route(/^n\/([\w-]+)$/, noteScreen);
  route(/^build\/([\w-]+)$/, buildScreen);
  route(/^settings$/, settingsScreen);
  route(/^setup$/, setupScreen);
  route(/^restore$/, restoreScreen);
  route(/^graph$/, graphScreen);

  initSelectionMenu();
  await startRouter();

  // свернули приложение — сохранить заметку и отправить копию
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'hidden') return;
    await flushCurrent();
    ctx.backup.flushSoon();
  });
  window.addEventListener('pagehide', () => { void flushCurrent(); });

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    const { registerSW } = await import('virtual:pwa-register');
    registerSW({ immediate: true });
  }
}

start().catch((e) => {
  console.error(e);
  document.getElementById('screens')!.innerHTML = `<div class="empty" style="padding-top:120px">Не удалось открыть заметки.<br>${String(e?.message || e)}</div>`;
});
