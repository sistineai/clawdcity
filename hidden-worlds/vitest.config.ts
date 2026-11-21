import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __E2E__: 'false' },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // a zone with daylight-saving changes, so date tests cover them
    env: { TZ: 'America/New_York' },
    testTimeout: 120_000,
    hookTimeout: 120_000,
    pool: 'forks',
    execArgv: ['--expose-gc'],
  },
});
