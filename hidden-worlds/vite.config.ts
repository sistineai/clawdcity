import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME, BACKGROUND_COLOR, THEME_COLOR } from './src/config.ts';

/** index.html takes the name, description and share tags from config (the name lives in one place). */
function htmlFromConfig(siteUrl: string): Plugin {
  const abs = (p: string) => (siteUrl ? siteUrl.replace(/\/?$/, '/') + p : p);
  const vars: Record<string, string> = {
    APP_NAME,
    APP_DESCRIPTION,
    THEME_COLOR,
    BACKGROUND_COLOR,
    OG_IMAGE: abs('og.png'),
    OG_URL: siteUrl || '',
  };
  return {
    name: 'html-from-config',
    transformIndexHtml: (html) =>
      html.replace(/%(\w+)%/g, (m, k: string) => (k in vars ? vars[k]!.replace(/"/g, '&quot;') : m)),
  };
}

// `--mode e2e` builds a separate bundle with the test hook compiled in; the
// production bundle never contains it (checked by tools/budget.ts).
export default defineConfig(({ mode }) => {
  const e2e = mode === 'e2e';
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: './',
    plugins: [
      react(),
      htmlFromConfig(env.VITE_SITE_URL ?? ''),
      // SHELL-8: manifest generated from config; offline play after the first load.
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        manifest: {
          name: APP_NAME,
          short_name: APP_SHORT_NAME,
          description: APP_DESCRIPTION,
          theme_color: THEME_COLOR,
          background_color: BACKGROUND_COLOR,
          display: 'standalone',
          orientation: 'any',
          start_url: './',
          scope: './',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,woff2,png,svg,bin,webmanifest}'],
          // the sample PNG pack and the link-preview image are fetched on demand, never precached
          globIgnores: ['packs/sample-png/**', 'og.png'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.includes('/packs/'),
              handler: 'CacheFirst',
              options: { cacheName: 'packs', expiration: { maxEntries: 800 } },
            },
          ],
        },
      }),
    ],
    define: { __E2E__: JSON.stringify(e2e) },
    build: {
      outDir: e2e ? 'dist-e2e' : 'dist',
      assetsInlineLimit: 0,
      sourcemap: false,
      target: 'es2022',
    },
    server: { host: true },
    preview: { host: true },
  };
});
