# Hidden Worlds

A daily seek-and-find web game. Code places every sprite in a large illustrated world, so each puzzle is generated from a seed and the game always knows where each object is. v1 is a static, installable web app with no server.

## Read first

- `docs/SPEC.md`: what to build. Every requirement has an ID.
- `docs/BUILD_PLAN.md`: the order, the checks per milestone, the report format.
- `docs/CONTENT_PACK.md`: the sprite pack format.
- `docs/BUSINESS_CONTEXT.md`: why this exists and what v1 has to prove. Short.
- `prototype/`: a working, tested prototype of the engine. Reference only. Never import from it.
- `PROGRESS.md`: where the build stands. Read it at the start of every session and continue from there.

## Commands

```
npm run dev              start the dev server
npm run typecheck        tsc --noEmit
npm run lint             eslint
npm run test             unit tests (Vitest)
npm run e2e              end-to-end tests (Playwright)
npm run build            production build to dist/
npm run preview          serve dist/ (add -- --host to reach it from a phone)
npm run verify           everything, in order; this is the definition of done
npm run pack:build       build masks for the vector pack, or for a PNG pack folder
npm run pack:validate    validate a pack folder
npm run world:audit      generate many puzzles and report on them
npm run calendar         list the coming daily puzzles
```

Run a single test file while iterating. Run `npm run verify` before every milestone commit.

## Rules that are easy to break

1. **Engine logic is pure.** Nothing under `src/engine/logic` touches the DOM, a canvas, React, `Date`, or `Math.random`. It must produce bit-identical output in Node, Chromium, Firefox and WebKit. Only `+ - * /`, `Math.floor/round/min/max/abs/imul` and bit operations. Sprite masks are precomputed data. See `SPEC.md` section 3.
2. **Golden files are a contract.** If a golden hash changes and you did not intend to change puzzle output, you broke determinism: find the cause. If you did intend it, bump `ENGINE_VERSION` and regenerate goldens in the same commit, and say why in `DECISIONS.md`.
3. **Never weaken a test to make it pass.** No skipping, no loosened thresholds, no deleted assertions, no test-only code paths in the app beyond the documented E2E hook. If something cannot run on this machine, mark it BLOCKED in `REPORT.md` with the exact error.
4. **No third-party requests by default.** Fonts are self-hosted. Analytics, waitlist and anything else off-origin run only when their env var is set.
5. **The app must load when the network misbehaves.** Nothing render-blocking from another origin, ever. A stalled font request once stopped the prototype from starting.
6. **All tunable numbers in `src/config.ts`. All user-facing text in `src/strings.ts`.** The app name appears in exactly one place.
7. **Storage goes through `src/state/storage.ts`.** Always try/catch, always validated, always versioned.
8. **No `alert`, `confirm` or `prompt`.** Use in-app UI.
9. **Premium is not real yet.** The screen must say so. Never imply a charge.
10. **Keep runtime dependencies minimal** and log each addition in `DECISIONS.md`.

## How to work

- Go milestone by milestone, in order. Finish and commit each before starting the next.
- Do not stop to ask questions. When the spec is silent or ambiguous, choose the option that best serves a first-time player on a phone, write one line in `DECISIONS.md` (what, why, what you rejected), and continue.
- If the spec is wrong or contradicts itself, follow its intent, log it, and continue.
- Before using a library API you are unsure of, read its current docs. Do not guess version-specific details.
- Look at what you build. Render puzzles to PNG and take screenshots of screens, then inspect them. A passing test does not mean it looks right.
- Keep `PROGRESS.md` current so a fresh session can resume without this conversation.
- Commit after every milestone with its ID in the message. Small commits inside a milestone are welcome.
- Use subagents for wide searches and for the independent review in M8, to keep this context clean.
- Stretch items only after M0–M8 are green.

## Code style

- TypeScript strict, no `any` (use `unknown` and narrow). Named exports. ES modules.
- Pure functions for game rules (`src/game`) with unit tests beside the rule they cover.
- React function components and hooks. The world is drawn on a canvas owned by one component; React does not re-render per frame.
- Pointer Events for input. `requestAnimationFrame` for animation. Respect `prefers-reduced-motion`.
- CSS custom properties for every colour, space and radius. No inline hex values in components.
- Comments explain why, not what.

## Design

The owner cares about how this looks. Direction: a naturalist's field guide. Spruce, paper and ink with gold accents; condensed heavy uppercase titles; tray chips as specimen tags. Tokens and things to avoid are in `SPEC.md` section 9. If a screen looks like a default template, it is not done.

## Done

`npm run verify` exits 0 on a clean clone, and `REPORT.md` lists every requirement ID with status and evidence. Details in `SPEC.md` section 13.
