# Validation — v5.2.5

Executed on 26 October 2026. The baseline is the unpacked complete v5.2.4 source, not a reconstructed gameplay approximation.

## Automated checks

- **254 Node logic/integration groups**: existing game, save, collision, spawning, difficulty, audio, ability and rendering regressions; new visible cloth masks, bounded cloth state/fallbacks, packed frame offsets, nearest-field selection, visual hazard stages, all school grades/evolution/mastery, deterministic environments, finite coordinates, balanced Canvas state, read-only rendering and no gameplay RNG consumption.
- **26 Pillow visual tests**: all eight directions, both forms, all animation clips, unclipped bodies/boots/staff/horns, eleven distinct boss clips, deterministic regeneration, reconstructed packed cells matching their original rendered alpha/visible pixels, isolated cloth masks and distinct biome/architecture assets.
- **74 real Chromium checks**: actual image decode, DOM buttons, keyboard controls, existing audio checks, context-menu suppression, original gameplay flows, module origins, packed pixel offsets, bounded real cloth surfaces, every module/grade, live Grimoire references, a field at an adversarial pool index and actual empty safe-gap pixels.
- **Four exact baseline comparisons**, 720 fixed updates each: initiate, full arsenal, Sovereign encounter and dense allied fields. Existing movement, dash, Aegis, transformation, specials and automatic firing are exercised. Serialized player, progression, stats, difficulty and world states match at 30-step intervals while rendering is interleaved. The comparison runs scenarios in separate child processes to bound retained VM memory.
- **Five browser layouts**: 1440×900, 1240×660, touch 390×844, touch 390×640 and touch 844×390. Vital HUD, boss/ward, power actions, minimap, zoom, dash, touch stick and active danger status were checked for rectangle overlaps; Grimoire content was checked for horizontal overflow. These are emulated viewports, not physical phones.
- Local **file://** launch decoded the 55 active images with the packed/mask metadata present. Index/gallery relative references and JavaScript syntax were checked.

## Source-level preservation

`systems/progression.js`, `difficulty.js`, `abilities.js`, `warfare.js`, `guardian.js`, `vitality.js`, `director.js`, `balance.js`, `snapshots.js`, `storage.js`, `audio.js`, `BALANCE.md`, `balance-probe.mjs` and `LICENSE` are byte-identical to 5.2.4. Combat code before `drawGround`, core/input/Game simulation before `drawGround` (version string excluded), Player/Enemy simulation, Loot and authoritative orbital `origin/emit/flash` also match. New animation state is cosmetic/private and absent from saves.

## Reproduce

```bash
node tests.mjs
python3 -m unittest test_assets.py
node scripts/compare_gameplay.mjs /path/to/v5.2.4/JSCanvasEdition
```

For real browser checks, either serve this folder and open `browser-tests.html`, or install optional Playwright/Chromium and run:

```bash
NOCTURNE_CHROMIUM=/path/to/chromium node scripts/browser_verify.cjs
```

The optional verifier includes layouts and offline launch and writes `nocturne-browser-verification.json`. Tests use the separate `#verification` save namespace. The packaged `validation-results.json` contains the executed browser suite and layout results, with no browser screenshots.

## Visual review and limitations

The actual generated models, player/direction/boss galleries, seven field types, twelve mechanisms, all five grades, live Grimoire and five HUD layouts were inspected. Native Canvas art tools generated the included PNG/GIF gallery. Page screenshots were used only for internal inspection. [PERFORMANCE.md](PERFORMANCE.md) describes measured draw costs and memory estimates.

These checks do not establish physical touch feel, real speaker output, low-end phone FPS, thermal behaviour, Firefox/LibreWolf compatibility or exhaustive gameplay equivalence for every future build. Friendly group outlines are intentionally approximate; exact hostile danger geometry and the real field simulation remain authoritative. No GitHub commit, push, tag or release was performed.
