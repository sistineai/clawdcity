import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `--mode e2e` builds a separate bundle with the test hook compiled in; the
// production bundle never contains it (checked by tools/budget.ts).
export default defineConfig(({ mode }) => {
  const e2e = mode === 'e2e';
  return {
    base: './',
    plugins: [react()],
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
