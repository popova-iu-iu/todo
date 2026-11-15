// Что делает из курса приложение для iPhone: звук и работа без интернета.

type Tone = { start(): Promise<void>; getContext(): { state: string } };
const tone = () => (window as unknown as { Tone?: Tone }).Tone;

// 1. Переключатель «Бесшумно». На iOS 16.4+ тип сессии «playback» включает звук, как у плеера.
const nav = navigator as Navigator & { audioSession?: { type: string } };
let silentEl: HTMLAudioElement | null = null;
if (nav.audioSession) {
  try { nav.audioSession.type = 'playback'; } catch { /* старый Safari */ }
} else if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
  // Старые iOS: тихий <audio> переключает звук страницы в режим «медиа», и он слышен даже в беззвучном режиме.
  silentEl = document.createElement('audio');
  silentEl.setAttribute('playsinline', '');
  silentEl.setAttribute('x-webkit-airplay', 'deny');
  silentEl.preload = 'auto';
  silentEl.loop = true;
  silentEl.src = silentWav();
}

// 2. iPhone «будит» звук только на настоящем касании (палец отпущен) и усыпляет его, когда приложение свёрнуто.
// Поэтому на каждом касании проверяем: если звук спит — будим.
function wake() {
  const T = tone();
  if (T && T.getContext().state !== 'running') T.start().catch(() => {});
  if (silentEl && silentEl.paused) silentEl.play().catch(() => {});
}
for (const ev of ['touchend', 'click', 'keydown']) document.addEventListener(ev, wake, { capture: true, passive: true });

// 3. Работа без интернета.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}

/** Полсекунды тишины в формате WAV (8 кГц, 8 бит). */
function silentWav() {
  const n = 4000, buf = new Uint8Array(44 + n), v = new DataView(buf.buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => (buf[o + i] = c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
  v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, 'data'); v.setUint32(40, n, true);
  buf.fill(128, 44);
  let s = ''; buf.forEach((b) => (s += String.fromCharCode(b)));
  return 'data:audio/wav;base64,' + btoa(s);
}

export {};
