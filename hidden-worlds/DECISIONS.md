# Decisions

One line each: what, why, what was rejected.

- The handoff was built inside the existing `clawdcity` repository, in `hidden-worlds/`, on the session branch. The repo already held unrelated files; a subfolder keeps them untouched. CI runs from `.github/workflows/hidden-worlds.yml` at the repo root with `working-directory: hidden-worlds`.
- TypeScript pinned to 6.0.x, not 7.0: `typescript-eslint` 8.73 supports `typescript <6.1`. Rejected TS 7 because lint would be unsupported.
- `@playwright/test` pinned to 1.63.0 to match the Chromium build preinstalled on the build machine. Firefox and WebKit were blocked at first (`403 request blocked: no rule or allowlist entry allows host "playwright.download.prss.microsoft.com"`). After the Playwright CDN hosts were allowed in the environment, both installed and run.
- E2E runs against a separate `--mode e2e` build in `dist-e2e/`, which compiles in the test hook behind `__E2E__`. The production `dist/` never contains it; `tools/budget.ts` checks for the hook marker and fails if it is present.
- Fonts are the latin subsets of Bricolage Grotesque (variable, wght + wdth axes) and Figtree (variable wght), copied from `@fontsource-variable` (dev dependency) into `src/ui/fonts/` and declared in our own `fonts.css` with `font-display: swap`. Rejected importing the packages' CSS because they pull every subset.
- `verify` stops at the first failing stage, because later stages (budget, e2e) depend on earlier ones (build); the summary still lists every stage.
- `lint` runs ESLint and `prettier --check`, so formatting is part of the definition of done.
