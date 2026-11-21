# Decisions

One line each: what, why, what was rejected.

- The handoff was built inside the existing `clawdcity` repository, in `hidden-worlds/`, on the session branch. The repo already held unrelated files; a subfolder keeps them untouched. CI runs from `.github/workflows/hidden-worlds.yml` at the repo root with `working-directory: hidden-worlds`.
- TypeScript pinned to 6.0.x, not 7.0: `typescript-eslint` 8.73 supports `typescript <6.1`. Rejected TS 7 because lint would be unsupported.
- `@playwright/test` pinned to 1.63.0 to match the Chromium build preinstalled on the build machine. Firefox and WebKit were blocked at first (`403 request blocked: no rule or allowlist entry allows host "playwright.download.prss.microsoft.com"`). After the Playwright CDN hosts were allowed in the environment, both installed and run.
- E2E runs against a separate `--mode e2e` build in `dist-e2e/`, which compiles in the test hook behind `__E2E__`. The production `dist/` never contains it; `tools/budget.ts` checks for the hook marker and fails if it is present.
- Fonts are the latin subsets of Bricolage Grotesque (variable, wght + wdth axes) and Figtree (variable wght), copied from `@fontsource-variable` (dev dependency) into `src/ui/fonts/` and declared in our own `fonts.css` with `font-display: swap`. Rejected importing the packages' CSS because they pull every subset.
- `verify` stops at the first failing stage, because later stages (budget, e2e) depend on earlier ones (build); the summary still lists every stage.
- `lint` runs ESLint and `prettier --check`, so formatting is part of the definition of done.
- Logic may import `src/config.ts` (pure data, itself import-free; a test asserts that) besides its own folder. ENG-9 asks for difficulty tuning in config, and logic must read it. Rejected passing config through `generate()` input because the spec fixes that input's shape.
- `size` in a `PuzzleSpec` is world pixels of the sprite box's longer side, snapped to multiples of 2 (one ID-map pixel), which is the scale quantisation for ENG-3. `x`, `y` are the box centre, rounded to integers.
- Rotation is quantised to 9 steps of 0.1 rad (-0.4..0.4, the prototype's range); residents use -0.1..0.1. Sin/cos are literal constants in `mask.ts`.
- Sky-layer sprites carry `z > 0` (integer from the RNG); ground sprites `z = 0`. This replaces the prototype's separate `sky` flag in the output.
- Targets are drawn from the world's small-sprite weights by weighted sampling without replacement (repeated `rng.weighted`); clutter by weighted pick from the remaining types. Rejected exponent-keyed weighted shuffle because it needs `Math.pow`.
- The RNG seed is `<seed>#<difficulty>#<worldId>`, extending the prototype's `<seed>#<difficulty>`.
- Transformed masks are cached per (pack, sprite, size, rotStep, flip) and placed at `floor(centre * 0.5)`, so a mask can sit up to half an ID pixel (one world pixel) off the drawn art. Deterministic, and far below tap tolerance.
- Vector sprites are drawn in a 112-unit box (the prototype's 100 units plus margin) so no shape touches the image edge (validator rule 4). `baseSize` is scaled by 1.12 so on-screen sizes match the prototype. Source images are 192 px (objects, residents) and 512 px (occluders, sky).
- Masks: a half-resolution mask pixel is solid when at least 2 of its 4 source pixels have alpha >= 128. The vector pack renders masks with play-size outline weight (`lineRefSize`) so silhouettes match what players see.
- PNG packs carry one image per colour; occluder `tints` exist only in the vector pack (the sample-png export draws each occluder in its first tint). Manifests gain optional fields `art` (png|vector), `skyOk`, `tints`, `weight` and, vector only, `color`. Rejected a separate vector manifest format: one schema serves both.
- Validator rule 9 ("120 solid pixels at 40 px tall") is measured in world pixels: the mask is resampled so the sprite box is 40 px tall. Rule "unknown world reference" is read as a world naming a sprite (or painter) that does not exist.
- World rosters: Meadow (Mossy, Bram, Tuck uncommon, Wren rare), Harbour (Odo, Fen, Marlo uncommon, Sol rare), Night Market (Juno, Pip, Quill uncommon, Nell rare). New residents: Marlo, Pip, Quill, Nell.
- The golden check in browsers runs on `/#/dev`, which prints its hashes; the Playwright test compares them with `tests/golden/golden.json`, so no test data ships in the app. The dev page is lazy-loaded and not linked from navigation.
- `@napi-rs/canvas` `Path2D` is injected into the vector painters (`setPath2D`) so the same shape data draws in Node and in browsers.
- PostHog adapter sends to the public `/batch/` HTTP endpoint with `$process_person_profile: false`, with no SDK, so there is no autocapture or session recording at all and no dependency. The current PostHog docs could not be read from the build machine (`getaddrinfo ENOTFOUND posthog.com`); the owner should check the endpoint and body against PostHog's docs before setting `VITE_POSTHOG_KEY`.
- State: Zustand (STACK-2). One store holds the saved document and transient UI state; every change writes through `storage.ts`.
- Zoom range: from "whole world visible" (contain) up to 3 screen px per world px (`PLAY.maxZoom`). Play opens at "cover" (the world fills the screen's height or width), where objects are already tappable on a phone.
- A missed tap waits 320 ms before it counts, in case it is the first half of a double-tap (which zooms instead). A tap that finds something is never treated as half of a double-tap. A new miss elsewhere settles any waiting miss immediately, so rapid misses are never lost (a bug the lockout E2E test caught).
- Off-screen world canvas is painted once at 1 world px per pixel; when zoomed past 1:1, visible sprites are redrawn as vectors after the camera settles (140 ms), so zoomed art stays sharp without a huge backing store (SHELL-11).
- The E2E hook (`window.__hwTest`, e2e build only) exposes target positions, a `reveal(x, y)` that moves the camera to a point (zoom >= 2.2 so edge sprites clear the corner buttons), an empty-point finder, the analytics events and the saved document. Tests then tap real screen pixels.
- In the wide (landscape/desktop) layout the side tray shows each tag's name, since there is room; in portrait the name shows on tap, hover or long-press.
