# Progress

## Status
- [x] M0 Scaffold and verify pipeline
- [x] M1 Engine logic (synthetic masks: 300 puzzles, 0 forced, p95 ~60 ms)
- [x] M2 Packs and rendering (vector pack 67 sprites, sample-png, validator, golden in 3 engines)
- [x] M3 Play (pan/zoom/tap, tray, hint, lockout, resident card, result, save/resume, E2E-1..4, PACK-A2)
- [x] M4 Daily, archive, Explore (home with countdown, archive window, ladders, route guards)
- [ ] M5 Progress and collection
- [ ] M6 Sharing
- [ ] M7 Shell, Premium, adapters, PWA
- [ ] M8 Content tools and hardening

## Notes
- Project lives in `hidden-worlds/` inside the `clawdcity` repo.
- Browsers: Chromium preinstalled at /opt/pw-browsers; Firefox and WebKit installed with `npx playwright install firefox webkit` plus `install-deps`.
- Look at output: `npm run render:samples` writes PNGs to out/samples/<pack>/. `/#/dev` is the engine bench.
- Golden: `npm run golden` regenerates tests/golden/golden.json (only with an ENGINE_VERSION bump).
