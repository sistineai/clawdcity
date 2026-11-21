# Build report

Date 2026-11-21 · commit on branch `claude/new-session-cs06j0` (see `git log`; report written at 51fe084 + report commit) · Node v22.23.5 · Linux 6.18 (cloud container) · Playwright 1.63.0 with Chromium 153, Firefox 155, WebKit 26.6.

## Result

Hidden Worlds v1 is built and `npm run verify` exits 0, both in the working copy and on a fresh clone after `npm ci`. Everything the spec lists as must-have works:

- **Engine.** Deterministic and pure. Golden hashes are identical in Node, Chromium, Firefox and WebKit.
- **Content.** Three visibly different worlds, 12 residents, the vector placeholder pack and a sample PNG pack. Tools: pack build, export, validate, world audit, calendar.
- **Modes.** Daily, a 7-day archive and Explore ladders.
- **Play and progress.** Hints, lockout, stars, streak, stats, collection and world unlocks.
- **Sharing.** Text, picture and challenge links.
- **Shell.** Onboarding, settings (relaxed, colour-blind, motion, sound, haptics), About, and an honest Premium intent screen.
- **Adapters.** Analytics, ads, purchases, sync and waitlist, all no-op by default.
- **PWA.** Installs, works offline, shows an update prompt and an install nudge.

A fresh agent that had not seen the build audited the repo against the spec. It found 16 of 127 IDs with gaps, including a real streak bug; all are fixed or recorded below.

**Blocked:** one item. Playwright's WebKit cannot simulate offline with a service worker, so the WebKit part of E2E-10 is checked by cache contents, not by an offline reload.

**For the owner to check by hand:**
- Play on a real iPhone (Safari was never available to a real device here) and on an Android phone.
- Decide whether it is fun.
- Replace the placeholder art text.
- Set the env vars and deploy.

## Verify

Final `npm run verify` (working copy, after the review fixes):

```
=== verify summary ===
stage           result   duration
typecheck       PASS     3.5s
lint            PASS     6.0s
unit            PASS     21.1s      (14 files, 83 tests)
build           PASS     2.0s
budget          PASS     0.3s
pack-validate   PASS     1.9s
world-audit     PASS     9.7s       (30 days + 90 Explore levels, all invariants hold)
e2e             PASS     117.4s     (175 tests across 5 projects)

verify PASSED
```

Clean clone (`git clone` → `npm ci` → `npm run verify`) also exited 0. That run was at d1d59e9; it is repeated after this report's commit, and its output is in the final message of the build session.

## Requirements

| ID | Status | Evidence |
| --- | --- | --- |
| STACK-1 | PASS | Vite 8.3, React 19.3, TypeScript 6.0 strict (`tsconfig.json`); TS 7 rejected, see DECISIONS |
| STACK-2 | PASS | Zustand 5 (`src/state/store.ts`, `src/ui/pwa.ts`) |
| STACK-3 | PASS | Plain CSS with custom properties (`src/ui/styles/*.css`), no framework |
| STACK-4 | PASS | Canvas 2D (`src/engine/render/draw.ts`, `src/ui/play/WorldController.ts`) |
| STACK-5 | PASS | Vitest + Playwright; `@napi-rs/canvas` dev dep; `world:audit` runs with `--expose-gc` |
| STACK-6 | PASS | `vite-plugin-pwa` generateSW (`vite.config.ts`) |
| STACK-7 | PASS | Zod schemas: `src/engine/pack/schema.ts`, `src/state/schema.ts` |
| STACK-8 | PASS | ESLint (typescript-eslint, react-hooks) + `prettier --check` in `npm run lint` |
| STACK-9 | PASS | Runtime deps: react, react-dom, zustand, zod, plus workbox-window (via the PWA register module), logged in DECISIONS |
| STACK-10 | PASS | Self-hosted Bricolage Grotesque + Figtree, `font-display: swap` (`src/ui/styles/fonts.css`); E2E-13 fixture asserts zero cross-origin requests in every test |
| STACK-11 | PASS | `base: './'`; built HTML uses `./assets/...`; manifest `start_url`/`scope` `./` |
| ENG-1 | PASS | `tests/unit/purity.test.ts` (walks all of `src/engine/logic`); ESLint restriction block in `eslint.config.js` |
| ENG-2 | PASS | Masks in `src/packs/vector/masks.bin` (built by `pack:build`); `tests/unit/vector-pack-current.test.ts` proves they match the painters |
| ENG-3 | PASS | `src/engine/logic/mask.ts`: literal sin/cos table, 9 rotation steps, size snapped to 2 px, transform cache |
| ENG-4 | PASS | Purity test bans sin/cos/tan/pow/sqrt/exp/log/random/hypot and `**`; integer `x, y, size, z` asserted in `engine.synthetic.test.ts` |
| ENG-5 | PASS | `src/engine/logic/rng.ts` (xmur3, mulberry32 unchanged) |
| ENG-6 | PASS | `generate()` returns plain JSON `PuzzleSpec` (`types.ts`); JSON round-trip test |
| ENG-7 | PASS | `buildIdMap`, `hitAt`, `findNear` (literal 12-direction ring) in `generate.ts`; used by invariants and play |
| ENG-8 | PASS | `WORLD_W/H` 3200×2000, ID map at 1/2 (`src/config.ts`) |
| ENG-9 | PASS | `DIFFICULTY` in `src/config.ts`, interpolated in `difficultyConfig()` |
| ENG-10 | PASS | Twin check in `tools/lib/invariants.ts` over 300 + 150 puzzles; decoys share type, differ in colour (`generate.ts`) |
| ENG-11 | PASS | `placeTucked` accepts visibility in [minVis+0.04, 0.90] (`generate.ts`) |
| ENG-12 | PASS | Repair loop ≤ 10 passes then `front`; `stats.forced` = 0 in all 300 test puzzles and all 150 audit puzzles |
| ENG-13 | PASS | `drawOrder()`: sky by z, ground by baseline, front last |
| ENG-14 | PASS | `worldId` selects painter, horizon, occluders, smalls weights, sky, residents (`src/packs/vector/worlds.ts`) |
| ENG-15 | PASS | One resident by rarity weight; held to the target visibility floor (invariants check residents too) |
| ENG-16 | PASS | `ENGINE_VERSION` in config; golden file records it and the test checks it |
| ENG-A1 | PASS | `engine.vector.test.ts`: 300 puzzles, 5 difficulties × 3 worlds; 0 failures, 0 forced; every target also tappable at its visible part |
| ENG-A2 | PASS | `engine.vector.test.ts`, `engine.synthetic.test.ts` deep-equal checks |
| ENG-A3 | PASS | 12 golden inputs (`src/engine/golden.ts`, `tests/golden/golden.json`); Node test + `tests/e2e/golden.spec.ts` in Chromium, Firefox, WebKit (desktop and phone) |
| ENG-A4 | PASS | Mean visibility d1 1.000 (≥ 0.95), d5 0.833 (≤ 0.88), strictly falling |
| ENG-A5 | PASS | p95 58.7 ms for generate + buildIdMap (limit 250) |
| ENG-A6 | PASS | `tests/unit/purity.test.ts` + ESLint rules. Note: logic imports `src/config.ts` (pure, import-free) by design; see Decisions |
| PACK-1 | PASS | `SpritePack = { logic, art }` (`src/engine/pack/types.ts`); renderer calls `art.draw` |
| PACK-2 | PASS | 33 smalls, 9 + 11 new occluders, cloud, 8 colours, painters in `src/packs/vector/defs.ts`; masks committed |
| PACK-3 | PASS | `src/engine/pack/load.ts`: lazy images, `decode()` before draw |
| PACK-4 | PASS | `npm run pack:export-sample` → `public/packs/sample-png/`; `?pack=sample-png` works (PACK-A2) |
| PACK-5 | PASS | `npm run pack:validate` prints code, file, field, message; exit 1 on any problem (`tools/lib/validate.ts`) |
| PACK-6 | PASS | Harbour: 6 new occluders; Market: 5 new; 12 residents (`out/samples/vector/sprites.png` reviewed) |
| PACK-A1 | PASS | `tests/unit/pack-validate.test.ts` "shipped packs are valid" |
| PACK-A2 | PASS | `tests/e2e/play.spec.ts` "PACK-A2" (5 projects) |
| PACK-A3 | PASS | `pack-validate.test.ts`: missing file, wrong dimensions, missing colour, empty mask, duplicate id, unknown reference (+ fill/edge/mismatch, composition) |
| WORLD-1 | PASS | Three painters (`backgrounds.ts`), own occluders/weights; contact sheets `out/audit/` reviewed |
| WORLD-2 | PASS | 12 residents, 4 per world: 2 common, 1 uncommon, 1 rare (validator rule 8 + `vector-pack-current.test.ts`) |
| WORLD-3 | PASS | `engine.vector.test.ts` "residents only appear in their own world" |
| WORLD-4 | PASS | `worldComplete()`; badge in Explore and Collection; `progress.spec.ts` WORLD-4 |
| DAILY-1 | PASS | `src/game/dates.ts`; `dates.test.ts` (local date in New York TZ) |
| DAILY-2 | PASS | `puzzleNumber()`, Preview before 2026-12-01; `dates.test.ts` |
| DAILY-3 | PASS | `WEEKDAY_DIFFICULTY`; `dates.test.ts` |
| DAILY-4 | PASS | `dailyWorld()` rotation by puzzle number; `dates.test.ts` |
| DAILY-5 | PASS | One tap from Home; first visit lands in today's puzzle (`play.spec.ts` E2E-1) |
| DAILY-6 | PASS | Continuous save; `play.spec.ts` E2E-4 (resume) and DAILY-6 (timer pauses while hidden) |
| DAILY-7 | PASS | Open puzzles can be finished after midnight; result counts for its date; streak joins runs from either end (`progress.test.ts`) |
| DAILY-8 | PASS | `modes.spec.ts` DAILY-8 (result + countdown) |
| ARCH-1 | PASS | `modes.spec.ts` E2E-6 and ARCH-1 (late, streak untouched) |
| ARCH-2 | PASS | Locked rows and URLs open Premium `source: archive` (`modes.spec.ts`) |
| EXP-1 | PASS | Seeds `explore-<world>-<n>`, difficulty bands (`dates.test.ts` "Explore ladders") |
| EXP-2 | PASS | `modes.spec.ts` E2E-7 (levels, Harbour at 3, Market at 6) |
| EXP-3 | PASS | `progress.test.ts` "Explore keeps the best stars and never touches the streak" |
| PLAY-1 | PASS | Drag, pinch, wheel, double-tap, +/− buttons, clamped camera (`WorldController.ts`); drag test in E2E-2; keyboard pan test |
| PLAY-2 | PASS | 8 px / 300 ms tap rule (`WorldController.onUp`); E2E-2 drag-is-not-a-tap |
| PLAY-3 | PASS | `findNear` with radius 22 screen px, clamped 10–90 world px |
| PLAY-4 | PASS | Found ring + tick, chip check, sound, haptic; fading miss cross and counter (E2E-1, E2E-2) |
| PLAY-5 | PASS | E2E-2 lockout test |
| PLAY-6 | PASS | Tray bottom in portrait, side in landscape/desktop (incl. phone landscape); names on hover (`title`), long-press, tap; resident slot |
| PLAY-7 | PASS | Ring 12% of width, contains target, off-centre (`play-rules.test.ts`); 4 s; E2E-3 (camera moves, button changes, Premium link) |
| PLAY-8 | PASS | `play-rules.test.ts` stars |
| PLAY-9 | PASS | `ResultSheet.tsx`; E2E-1 asserts time and stars |
| PLAY-10 | PASS | `ResidentCard.tsx`; E2E-1 taps the resident and continues |
| PLAY-11 | PASS | E2E-2 relaxed mode (no timer, no misses shown, no lockout, misses still recorded) |
| META-1 | PASS | `progress.test.ts` streak tests; `progress.spec.ts` E2E-5 |
| META-2 | PASS | `Stats.tsx`; E2E-5 checks best streak and completed |
| META-3 | PASS | `progress.spec.ts` META-3 |
| META-4 | PASS | `Explore.tsx` worlds with lock, progress, badge (E2E-7, WORLD-4 tests) |
| META-5 | PASS | `src/state/storage.ts`; `progress.test.ts` (round trip, corruption backup, v0 migration, memory fallback); E2E-11 |
| META-6 | PASS | `pruneDoc()`; `progress.test.ts` "prunes daily history to the last 60 days" |
| META-7 | PASS | `shell.spec.ts` META-7 (in-app confirmation; native dialogs throw) |
| SHARE-1 | PASS | `src/game/share.ts`; `share.test.ts` (matches the spec example) |
| SHARE-2 | PASS | `src/ui/share/image.ts` 1080×1350, scenery-only blurred crop; pre-rendered so Web Share stays in the user gesture; download fallback tested in E2E-8 |
| SHARE-3 | PASS | Web Share or clipboard (in handler) + toast; `share.spec.ts` E2E-8 |
| SHARE-4 | PASS | `src/game/challenge.ts`; codec tests in `share.test.ts`; banner, comparison and bad-link tests in `share.spec.ts` |
| SHARE-5 | PASS | OG + Twitter tags in `index.html` from config; `public/og.png` (`tools/og-image.ts`) |
| SHELL-1 | PASS | All screens routed by hash (`src/ui/App.tsx`, `router.ts`); E2E-14 visits each |
| SHELL-2 | PASS | `Coach.tsx`; E2E-1 (three marks, never shown again) |
| SHELL-3 | PASS | `Settings.tsx`; `shell.spec.ts` SHELL-3/4 |
| SHELL-4 | PASS | `colorblind.test.ts` (≥ 5 L* apart under protanopia and deuteranopia); colour names on chips (E2E) |
| SHELL-5 | PASS | `src/ui/feedback.ts`: Web Audio synth, muted until first gesture and when off |
| SHELL-6 | PASS | Real buttons with labels; keyboard + focus-ring test; every visible control ≥ 44×44 on every screen at 320 and 360 px (E2E-14); `contrast.test.ts` ≥ 4.5:1; reduced motion honoured |
| SHELL-7 | PASS | `About.tsx`; `shell.spec.ts` SHELL-7 (art text is a marked placeholder in `strings.ts`) |
| SHELL-8 | PASS | Manifest from config, icons, offline (E2E-10), update prompt (`UpdatePrompt.tsx`), install nudge once after 2 completions (`InstallNudge.tsx`) |
| SHELL-9 | PASS | No hover-only controls, safe-area insets, SW optional (lazy, errors swallowed), no `window.open` |
| SHELL-10 | PASS | Error boundary with Reload (`App.tsx`); loading state painted ≤ 100 ms after HTML in all 5 projects (`shell.spec.ts` SHELL-10); E2E-12 |
| SHELL-11 | PASS | E2E-14 at 320×568 and 360×640; DPR capped at 2; world canvases released on leave (`WorldController.dispose`) |
| PREM-1 | PASS | Benefits and `$4.99 a month` from config (E2E-9) |
| PREM-2 | PASS | "not available yet … nothing will be charged" above the button (E2E-9) |
| PREM-3 | PASS | `premium_interest` once per device with source; email field only with `VITE_WAITLIST_URL` (E2E-9, `adapters.test.ts`) |
| PREM-4 | PASS | Thank-you state repeats nothing was charged (E2E-9) |
| PREM-5 | PASS | `purchases` adapter with all five methods; archive, worlds, levels and hints read `entitlements()` (`src/game/gates.ts`, `PlayScreen.tsx`) |
| ADPT-1 | PASS | noop / console / memory / posthog; PostHog via its HTTP batch API, module imported only after first interaction (`analytics.ts`, `posthog.ts`); docs could not be fetched from the build machine, see Blocked |
| ADPT-2 | PASS | All 14 event names and properties as specified (grep of `track(` calls; E2E checks several) |
| ADPT-3 | PASS | `track()` adds device_id, app_version, engine_version, pack_id (`adapters.test.ts`); email never in analytics (E2E-9) |
| ADPT-4 | PASS | `noAds()` unavailable; hint flow asks `isRewardedAvailable()` |
| ADPT-5 | PASS | `noSync()`; `saveDoc()` calls `push()` |
| ADPT-6 | PASS | `noWaitlist()` / `httpWaitlist()` |
| ADPT-7 | PASS | `.env.example`; E2E fixture fails any test with a cross-origin request |
| TOOL-1 | PASS | `npm run pack:build` (vector) and `-- <folder>` (used by export-sample) |
| TOOL-2 | PASS | `npm run pack:export-sample` |
| TOOL-3 | PASS | `npm run pack:validate` (verify stage) |
| TOOL-4 | PASS | `npm run world:audit` (verify stage, 30 days); report and `out/audit/*.png` |
| TOOL-5 | PASS | `npm run calendar -- --days 30` |
| BUD-1 | PASS | Initial JS 132.3 KB gz (≤ 250); precache 0.86 MB (≤ 3 MB); `tools/budget.ts` |
| E2E-1 | PASS | `play.spec.ts`, 5 projects |
| E2E-2 | PASS | `play.spec.ts` (two tests), 5 projects |
| E2E-3 | PASS | `play.spec.ts`, 5 projects |
| E2E-4 | PASS | `play.spec.ts`, 5 projects |
| E2E-5 | PASS | `progress.spec.ts`, 5 projects |
| E2E-6 | PASS | `modes.spec.ts`, 5 projects |
| E2E-7 | PASS | `modes.spec.ts` (three tests), 5 projects |
| E2E-8 | PASS | `share.spec.ts` (three tests), 5 projects |
| E2E-9 | PASS | `shell.spec.ts`, 5 projects |
| E2E-10 | PASS (Chromium, Firefox) / BLOCKED (WebKit) | `offline.spec.ts`: offline reload + full play-through in desktop/phone Chromium and Firefox; in WebKit the worker controls the page and the precache holds every needed file, but Playwright's WebKit cannot reload offline with a worker active (see Blocked) |
| E2E-11 | PASS | `progress.spec.ts`, 5 projects |
| E2E-12 | PASS | `shell.spec.ts`: all fonts and cross-origin requests stalled, full play-through, 5 projects |
| E2E-13 | PASS | Auto fixture in `tests/e2e/fixtures.ts` fails any test with a console error or cross-origin request (all specs use it) |
| E2E-14 | PASS | `shell.spec.ts` at 320×568 and 360×640, all screens, 5 projects |
| E2E-15 | PASS | `golden.spec.ts`, 5 projects |
| E2E-16 | PASS | `perf.spec.ts`: 1.27 s desktop / 1.49 s phone Chromium at 4× CPU (limit 5 s) |

## Measured numbers

- **Engine.**
  - `generate` + `buildIdMap`: p95 58.7 ms over 300 puzzles (unit test).
  - World audit, 30 days + 90 Explore levels: `generate` mean 29.3 ms, p95 47.3 ms, max 73.6 ms.
  - Invariants: 0 failures and 0 forced-to-front over 300 test puzzles; the same over 150 audit puzzles at 60 days.
  - Mean target visibility by difficulty: 1.000, 0.989, 0.946, 0.902, 0.833.
- **Time to playable.**
  - At 4× CPU (Chromium): desktop 1266 ms, phone 1493 ms.
  - Unthrottled: Firefox 650 ms, WebKit desktop 1834 ms, WebKit phone 1664 ms. These ran under parallel test load.
- **Loading state paint, after the HTML arrives (best of 3).** 4–54 ms across the 5 projects.
- **Bundles.**
  - Initial JS: 132.3 KB gzipped.
  - Service worker precache: 0.86 MB.
  - Vector pack masks: 232 KB.
  - Sample PNG pack: 2.6 MB, fetched on demand and not precached.
- **Content audit (60 days).**
  - 5 to 15 same-target repeats on consecutive days (type and colour), depending on the window.
  - Rare residents appear about 6% of the time each, as their weight implies.

## Blocked or failed

1. **E2E-10 offline reload in WebKit.**
   - **What:** Playwright's WebKit cannot reload the page offline while a service worker is active. `context.setOffline(true)` gives `page.reload: WebKit encountered an internal error`. Routing every request intercepts navigation before the worker: `page.reload: Blocked by Web Inspector`.
   - **What still runs in WebKit:** the test checks that the worker controls the page and that the cache holds `index.html`, the JS, the CSS, the fonts, the masks and the manifest. The full offline reload and play-through passes in Chromium and Firefox.
   - **Owner:** on a real iPhone, open the game once, switch to airplane mode, reopen it from the home screen, and play a puzzle.
2. **ADPT-1: PostHog docs could not be read.**
   - **What:** from the build machine, `getaddrinfo ENOTFOUND posthog.com`. The adapter uses PostHog's public `/batch/` HTTP endpoint with `$process_person_profile: false`, written from knowledge rather than from the current docs.
   - **Owner:** before setting `VITE_POSTHOG_KEY`, check the endpoint and body against PostHog's capture API docs. Then confirm events arrive, with no person profiles and no autocapture.
3. **Real devices.** Nothing here ran on real iPhone Safari or an Android phone. Only Playwright's WebKit and Chromium device emulation were used.

No must-have requirement is FAIL.

## Decisions

The five most consequential, from DECISIONS.md:

1. **Pure engine on precomputed masks.** Masks are 1 bit per pixel at half resolution, built in Node from the painters and committed. Rotation uses a literal sin/cos table (9 steps of 0.1 rad) and sizes snap to 2 px. Result: golden hashes are identical in Node, Chromium, Firefox and WebKit.
2. **One manifest schema for both packs.** The vector and PNG packs share one schema, with optional `art`, `skyOk`, `tints`, `weight` and `color` fields. The sample PNG pack is exported from the vector art, which proves new art is a data-only change.
3. **Logic may import `src/config.ts`.** It is a pure, import-free module, checked by a test. ENG-9 wants the tuning there, and ENG-A6 wants logic to import nothing but types; this is the smallest deviation that satisfies both.
4. **Out-of-order dailies.** A puzzle started on a date can be finished after midnight and counts for its date. The streak joins runs from either end, a bug the independent review caught. A solved daily reopens as a finished world, never as a replay.
5. **Fast first paint.** The loading state paints before any script: the entry script is `async`, the stylesheet is non-blocking, and an image in the boot screen gets WebKit to paint. Measuring this found real 1.6 s (WebKit) and 0.2 s (Firefox) delays, now fixed.

## Owner checklist

- [ ] Play full puzzles on a real iPhone (Safari) and a real Android phone, on Wi-Fi: `npm run build && npm run preview -- --host`, open the printed address. Is it fun? Is the tap forgiveness right?
- [ ] iPhone offline check: load once, airplane mode, reopen, play (E2E-10 WebKit gap).
- [ ] Choose and clear the name; change `APP_NAME` in `src/config.ts`.
- [ ] Rewrite the placeholder About / art-disclosure text (`aboutArt` in `src/strings.ts`, marked OWNER).
- [ ] Create a PostHog project; check its capture docs against `src/adapters/posthog.ts`; set `VITE_POSTHOG_KEY` (and `VITE_POSTHOG_HOST` for EU).
- [ ] Optional: set `VITE_WAITLIST_URL` for Premium emails.
- [ ] Deploy `dist/` to a static host over HTTPS and point a domain at it; set `VITE_SITE_URL` before building so link previews get an absolute image URL.
- [ ] Commission the style guide and residents; deliver as a PNG pack (`docs/CONTENT_PACK.md`, README "Add a sprite pack").
- [ ] Optional tuning: harbour sometimes gets more than one lighthouse; consecutive days occasionally repeat a target (see `npm run world:audit`). Content changes that alter puzzles need an `ENGINE_VERSION` bump and new goldens.
