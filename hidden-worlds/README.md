# Hidden Worlds

A daily seek-and-find web game. Every puzzle is generated from a seed: code places each sprite
in a large illustrated world, so the game always knows where every object is and how much of
it shows. v1 is a static, installable web app (PWA) with no server, no accounts and no payments.

"Hidden Worlds" is a working title. Change it in one place: `APP_NAME` in `src/config.ts`.

## Run

Needs Node 22 or later.

```
npm ci
npx playwright install --with-deps chromium firefox webkit   # once, for the end-to-end tests
npm run dev               # http://localhost:5173
```

Useful pages: `/#/` home, `/#/play/daily/YYYY-MM-DD`, `/#/explore`, and `/#/dev`, an engine
bench that renders any seed with the answers drawn on (not linked from the app).

## Test

```
npm run verify            # everything, in order; exit code 0 means done
```

`verify` runs: typecheck, lint (ESLint + Prettier check), unit tests (Vitest), production build,
budget check, pack validation, world audit (30 days), end-to-end tests (Playwright, five
projects: desktop Chromium, Firefox and WebKit, phone Chromium and WebKit).

Individually: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`,
`npm run budget`, `npm run e2e`. One file while iterating: `npx vitest run tests/unit/dates.test.ts`
or `npx playwright test tests/e2e/play.spec.ts --project=desktop-chromium` (after `npm run build:e2e`).

The end-to-end tests run against a separate build (`npm run build:e2e`, output `dist-e2e/`) that
includes a small test hook exposing target positions, so tests tap real screen pixels. The
production build in `dist/` never contains it; the budget check fails if it does.

## Deploy

```
npm run build             # writes dist/
npm run preview -- --host # try the production build from a phone on the same Wi-Fi
```

`dist/` is plain static files with relative URLs: upload it to any static host (Netlify,
Cloudflare Pages, GitHub Pages, S3, a plain web server), at the root or in a sub-folder. No
rewrites are needed (routing uses the URL hash). Serve over HTTPS so the service worker can
install. Set `VITE_SITE_URL` when building so link previews get an absolute image URL.

## Environment variables

Copy `.env.example` to `.env`. Everything is optional; with no `.env` the app makes no request
to any other origin.

| Variable | Effect |
| --- | --- |
| `VITE_POSTHOG_KEY` | Sends anonymous usage events to PostHog after the first tap. |
| `VITE_POSTHOG_HOST` | PostHog host (default `https://us.i.posthog.com`). |
| `VITE_WAITLIST_URL` | The Premium screen shows an optional email field and POSTs `{ email, source }` here. |
| `VITE_SITE_URL` | Public URL, used for absolute Open Graph / Twitter image URLs. |

## Add a sprite pack

Commissioned art arrives as a PNG pack (format in `docs/CONTENT_PACK.md`). No code changes:

1. Put the images and a hand-written `pack.json` (without `mask` entries) in `public/packs/<id>/`.
2. `npm run pack:build -- public/packs/<id>` writes `masks.bin` and fills in the masks.
3. `npm run pack:validate -- public/packs/<id>` until it reports no problems.
4. `npm run world:audit -- --pack <id> --days 60` and look at `out/audit/*.png`.
5. Try it in the game with `?pack=<id>`. Make it the default with `DEFAULT_PACK` in `src/config.ts`
   (at a day boundary: it changes every future puzzle).

`public/packs/sample-png/` is a complete example, exported from the built-in vector art by
`npm run pack:export-sample`.

## Content tools

| Command | What it does |
| --- | --- |
| `npm run pack:build` | Rebuild the vector pack's masks (`src/packs/vector/`), or a PNG pack's with a folder argument. |
| `npm run pack:export-sample` | Rasterise the vector pack into `public/packs/sample-png/`. |
| `npm run pack:validate -- <dir\|vector>` | Check a pack against the rules; non-zero exit on any problem. |
| `npm run world:audit -- --pack <id> --days 60` | Generate upcoming dailies and all Explore levels; report and draw contact sheets. |
| `npm run calendar -- --days 30` | List the coming daily puzzles. |
| `npm run render:samples` | PNGs of each world and difficulty in `out/samples/`. |
| `npm run golden` | Regenerate the golden hashes (only with an `ENGINE_VERSION` bump). |

## Where things live

```
src/config.ts         every tunable number, the app name
src/strings.ts        every user-facing sentence (owner-editable placeholders are marked)
src/engine/logic      pure, deterministic engine (no DOM, no canvas, no Date, no Math.random)
src/engine/render     canvas drawing and world background painters
src/engine/pack       pack schema, loaders
src/packs/vector      built-in placeholder art (painters, generated masks)
src/game              rules: dates, puzzles, streak, scoring, sharing, challenge links
src/state             saved document (schema, storage, migrations) and app store
src/adapters          analytics, ads, purchases, sync, waitlist (all no-op by default)
src/ui                screens and components
tools/                pack, audit, calendar, budget, verify scripts
tests/unit tests/e2e tests/golden
```

Project rules for contributors (human or AI) are in `CLAUDE.md`; the spec is `docs/SPEC.md`;
decisions taken during the build are in `DECISIONS.md`; the build report is `REPORT.md`.
