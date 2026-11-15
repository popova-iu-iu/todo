import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Tone.js из npm — отдаётся как ./vendor/Tone.js (и в разработке, и в сборке). */
function toneVendor(): Plugin {
  const file = () => readFileSync(require.resolve('tone/build/Tone.js'));
  return {
    name: 'tone-vendor',
    configureServer(server) {
      server.middlewares.use('/vendor/Tone.js', (_req, res) => {
        res.setHeader('Content-Type', 'text/javascript');
        res.end(file());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'vendor/Tone.js', source: file() });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [
    toneVendor(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'Электронная музыка с нуля',
        short_name: 'Музыка',
        description: 'Интерактивный курс: Ableton Live, MiniLab 3, Zoom H1essential',
        lang: 'ru',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#eceef1',
        theme_color: '#eceef1',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
