// Приложение для iPhone: звук даже при включённом беззвучном режиме и работа без интернета.

// На iPhone Web Audio по умолчанию молчит, если включён переключатель «Бесшумно».
// Тип сессии «playback» делает звук как у плеера (Safari 16.4+).
const nav = navigator as Navigator & { audioSession?: { type: string } };
if (nav.audioSession) {
  try { nav.audioSession.type = 'playback'; } catch { /* старый Safari */ }
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}

export {};
