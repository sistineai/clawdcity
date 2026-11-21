# Build plan

Work through the milestones in order. Each one ends with its checks passing and a commit. Do not start a milestone while an earlier one has a failing check.

After each milestone: run its checks, update `PROGRESS.md` (what is done, what is next, anything surprising), record any decision in `DECISIONS.md`, and commit with the milestone ID in the message.

Requirement IDs refer to `docs/SPEC.md`.

---

## M0. Scaffold and the verify pipeline

Build the empty app and the whole test pipeline first, so every later milestone has something to run.

- Git repo, `.gitignore`, Vite + React + TypeScript strict, ESLint, Prettier.
- Vitest with one passing test. Playwright with the five projects from the spec and one smoke test that loads the page.
- `npm run verify` wired with every stage from the spec (stages that have nothing to check yet pass trivially but exist).
- Budget check script. GitHub Actions workflow that runs `npm run verify`.
- `config.ts`, `strings.ts`, self-hosted fonts, CSS tokens from the visual direction.
- Empty `PROGRESS.md`, `DECISIONS.md`.

**Checks:** `npm run verify` exits 0. If a Playwright browser cannot be installed on this machine, record the exact error in `DECISIONS.md`, keep its project in the config, and mark the affected requirements BLOCKED at the end. Do not delete the project.

Covers: `STACK-1..11`.

## M1. Engine logic

Port the prototype's algorithm into `src/engine/logic` under the purity and determinism rules.

- Read `prototype/src/engine.js` and `prototype/test/run.js` fully before writing anything.
- RNG, difficulty config, placement, `placeTucked`, visibility measurement, repair loop, draw order, ID map, `hitAt`, `findNear`.
- Pure-TypeScript mask transforms with quantised rotation and scale.
- Temporary hand-made masks (rectangles, ellipses) are fine for tests until M2 supplies real ones.
- Purity guard (`ENG-A6`).

**Checks:** `ENG-A1`, `ENG-A2`, `ENG-A5`, `ENG-A6` pass with temporary masks.

Covers: `ENG-1..13`, `ENG-16`.

## M2. Packs and rendering

- `SpritePack` interface, schema, vector pack painters ported from the prototype, `pack:build`, committed masks.
- Canvas renderer for a `PuzzleSpec`: background painter, sprites in draw order, found markers.
- PNG loader, `pack:export-sample`, `pack:validate` with failing fixtures.
- Three worlds: painters, palettes, new occluders, 12 residents.
- Golden files, generated once the real masks exist. Golden check in Node and in the three browsers.
- A bare dev page that renders a puzzle for a seed, difficulty and world, with an "answers" overlay. Keep it as `/#/dev`, excluded from production navigation.

**Checks:** `ENG-A1..A5` with real masks, `E2E-15` (the golden check inside each browser), `PACK-A1`, `PACK-A3`. Look at rendered output: write PNGs of one puzzle per world and difficulty to `out/` and inspect them; fix anything that looks broken (sprites floating in sky, unreadable residents, worlds that look the same).

Covers: `ENG-14..15`, `PACK-1..6`, `WORLD-1..3`.

## M3. Play

- Play screen: pan, zoom, tap resolution, tray, found and miss feedback, lockout, hint, timer, resident slot and card, result sheet.
- Save and resume. Timer pauses when hidden.
- Test hook for E2E, stripped from production builds.

**Checks:** `E2E-1`, `E2E-2`, `E2E-3` (hint part), `E2E-4`, `PACK-A2`.

Covers: `PLAY-1..11`, `DAILY-6`.

## M4. Daily, archive, Explore

- Date keys, puzzle numbers, weekday difficulty, world rotation, injectable clock.
- Home screen with today's puzzle, result state and countdown.
- Archive with the 7-day window and locks. Explore ladders and locks.

**Checks:** unit tests for dates, numbers, rotation; `E2E-6`, `E2E-7` (level part).

Covers: `DAILY-1..8`, `ARCH-1..2`, `EXP-1..3`.

## M5. Progress and collection

- Storage module with schema, migration, corruption recovery, pruning.
- Streak, stats, stars, residents collection, world unlocks and completion badges.
- Stats, Collection and Worlds screens.

**Checks:** unit tests for streak, stars, storage; `E2E-5`, `E2E-7`, `E2E-11`.

Covers: `META-1..7`, `WORLD-4`.

## M6. Sharing

- Share text, share image, Web Share with fallbacks, challenge links, Open Graph tags.

**Checks:** unit tests for share text and challenge codec; `E2E-8`.

Covers: `SHARE-1..5`.

## M7. Shell, Premium, adapters, PWA

- Onboarding, settings, relaxed mode, colour-blind mode, sound, haptics, reduced motion.
- About and privacy, error boundary, loading state.
- Premium screen and all entry points. Adapters with defaults, `posthog` and waitlist behind env vars, `.env.example`.
- PWA: manifest, icons, offline, update prompt, install nudge.
- Accessibility pass and small-screen pass on every screen.

**Checks:** `E2E-3`, `E2E-9`, `E2E-10`, `E2E-12`, `E2E-13`, `E2E-14`, colour-blind unit test.

Covers: `SHELL-1..11`, `PREM-1..5`, `ADPT-1..7`.

## M8. Content tools and hardening

- `world:audit`, `calendar`.
- `E2E-16`, budgets, full `npm run verify` from a clean clone (`git clone` into a temp folder, `npm ci`, verify).
- Design pass: take screenshots of every screen at phone and desktop size, look at them, and fix what looks unfinished or generic against the visual direction.
- Independent review: start a subagent that has seen none of the build, give it only `docs/SPEC.md` and the repo, and have it list every requirement it cannot confirm from code and tests. Fix what it finds.
- `README.md` for the repo (run, test, deploy to a static host, add a pack, set env vars).
- `REPORT.md` (format below).

**Checks:** `npm run verify` exits 0 on the clean clone. Every requirement ID appears in `REPORT.md`.

Covers: `TOOL-1..5`, `BUD-1`, done-means 1–4.

---

## Stretch (only after M8 is green; stop at the first one that would put M0–M8 at risk)

- **S1. Challenge clip generator.** `npm run clip -- --date <d>`: drives the built app in Playwright at 1080 × 1920, records a 12 to 20 second video that zooms across the world and reveals one target, with the puzzle number as a title card. Output to `out/clips/`.
- **S2. Sprite generation scaffold.** `tools/spritegen`: a provider-agnostic interface, prompt templates built from a style guide file, a dry-run mode that needs no API key, automatic checks on returned images (transparent background, mask area, size), and a review sheet. No provider keys, no network calls in tests.
- **S3. Seasonal event hook.** A config entry that overrides the world, palette accents and a featured resident for a date range.

---

## REPORT.md format

```
# Build report
Date, commit, Node version, OS.

## Result
One paragraph: what works, what does not, what the owner must check by hand.

## Verify
The final `npm run verify` summary (stage, result, duration).

## Requirements
| ID | Status | Evidence |
(one row per ID in docs/SPEC.md)

## Measured numbers
Generation p95, time to playable, bundle sizes, engine invariant counts.

## Blocked or failed
For each: what, why, what the owner needs to do.

## Decisions
The five most consequential entries from DECISIONS.md.

## Owner checklist
Things only a person can do: play on a real iPhone and Android phone, set env vars, deploy, replace placeholder text.
```
