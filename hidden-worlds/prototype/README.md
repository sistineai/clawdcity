# Prototype (reference only)

A single-page prototype of the placement engine with placeholder vector art. It works and it is tested. Use it to understand the algorithm and the tuning. Do not import from it and do not copy its structure.

## Files

- `src/engine.js`: the engine. Exposes `HW = { generate, drawSprite, drawIcon, hitAt, findNear, setCanvasFactory, COLORS, RESIDENTS, defs, INK }`.
- `src/app.js`: the playable page (pan, zoom, taps, tray, hint, share text, an engine drawer with answers and the ID map).
- `src/style.css`, `src/template.html`: the look to start from.
- `build.js`: inlines everything into `dist/index.html`. Open that file in a browser to play.
- `test/run.js`: 120 seeded puzzles checked for the visibility floor, target uniqueness and determinism. Run with `node --expose-gc run.js` after `npm install` in `test/`.
- `test/page.js`: a headless-browser play-through by real clicks.
- `test/sandbox.js`: loads the page in a sandboxed frame with a stalled font request.

## What is proven

- `generate({ seed, difficulty })` is deterministic in one environment and averages about 84 ms.
- Per-sprite 1-bit masks, stacked in draw order into an `Int32Array` ID map at half resolution, give exact hit detection and exact visibility.
- `placeTucked` plus the repair loop produce mean target visibility from 1.00 at difficulty 1 down to 0.81 at difficulty 5, with every target above its floor.

## What the port must change

1. **Masks come from a canvas here.** `buildMask` rasterises each sprite and thresholds alpha at 128. Canvas anti-aliasing differs between browsers, so the same seed can give different puzzles on different devices. In the real build, masks are precomputed pack data and all logic is pure TypeScript. See `docs/SPEC.md` section 3.
2. **Rotation is a free float here** (`rng.range(-0.4, 0.4)`). Quantise it to a fixed table.
3. **`findNear` uses `Math.cos` and `Math.sin`** to sample a ring. Replace with a fixed table of offsets.
4. **Logic and drawing are interleaved.** Split them: logic returns a plain `PuzzleSpec`; the renderer draws it.
5. **One world, eight residents.** The real build has three worlds and twelve residents.

## Bugs already found and fixed here (do not reintroduce)

- Decoding sprite ids from an anti-aliased colour buffer undercounts pixels. Use masks.
- A render-blocking web-font stylesheet that stalls will stop the page from ever starting. Never block on another origin.
- Generating many large canvases in Node without `--expose-gc` and explicit `gc()` runs out of memory.
