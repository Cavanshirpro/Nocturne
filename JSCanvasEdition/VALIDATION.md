# Validation — v5.2.6

Executed on **26 October 2026**. Baseline: the completed, unpacked v5.2.5 full-source package.

## Executed checks

| Check | Result | Scope |
| --- | --- | --- |
| Node logic/integration | **264 passed, 0 failed** | Existing 254 groups plus anatomy, grades/roles, traits, all powers/stages, frozen/reduced motion, locked Hound direction, read-only Canvas state, emitter alignment, private feedback, hierarchy and defeat lifetime |
| Pillow asset suite | **33 passed** | Existing 26 plus solid profiles, all eleven geometric poses, quadruped contacts, boss proportions, translucent interiors, correct face compositing and mesh determinism |
| Real Chromium suite | **81 passed, 0 failed** | Existing 74 plus nine families/eight facings, bounded real regalia surfaces, commander/Sovereign geometry, four-stage timing, locked Hound rows, dense scenes and save/restore |
| Exact baseline gameplay comparison | **7 scenarios passed** | Initiate, full arsenal, Sovereign, dense fields, hostile traits and command hierarchy at 720 fixed updates each; all eleven powers at 1,650 updates |
| Browser layouts | **5 passed** | 1440×900, 1240×660, emulated touch 390×844, 390×640 and 844×390; no checked HUD overlap or Grimoire horizontal overflow |
| Offline launch | **55 active images decoded** | Local file:// launch, packed metadata and player cloth available |

The browser report has no page errors. Dense rendering covers 320 actors, 400 allied fields and 24 hostile hazards in high, low and reduced-motion modes; it asserts retained counts and balanced state. Runtime art tests exercise all nine families with five trait values, all directions and the hierarchy. Save/restore uses a real sanctum and guardian, preserving ownership and actual emitter positions.

Baseline comparisons interleave rendering with simulation, then compare serialized player, world, progression, difficulty and stats every 30 steps. They exercise movement, dash, Aegis, transformation, specials, automatic weapons, elite traits and actual summons. The all-powers scenario selects each existing guardian attack without changing its rule implementation. Separate child processes bound retained VM memory. Exact matching establishes these tested paths, not a mathematical proof of every possible future run.

## Source preservation

The following files are byte-identical to v5.2.5: `systems/progression.js`, `difficulty.js`, `abilities.js`, `warfare.js`, `guardian.js`, `vitality.js`, `director.js`, `balance.js`, `snapshots.js`, `storage.js`, `audio.js`, `motion.js`, `appearance.js`, `environment.js`, `fields.js`, `presentation.js`; also `witch_models.py`, `generate_assets.py`, `ui.js`, `style.css`, `BALANCE.md`, `balance-probe.mjs` and `LICENSE`.

Combat before `drawGround` and Game before `drawGround` match (version excluded). Player code and Loot match. Enemy simulation matches after removing the sole cosmetic `HostileVisuals.noteHit` hook, which writes a private WeakMap. Authoritative orbital `origin/emit/flash` match exactly. All nonenemy PNG records and player/cloth metadata remain identical. No save schema or gameplay RNG call is added. Frame-edge visibility margins change only in the draw loop.

## Reproduce

```bash
node tests.mjs
python3 -m unittest test_assets.py
node scripts/compare_gameplay.mjs /path/to/v5.2.5/JSCanvasEdition
```

The asset suite regenerates the full embedded atlas and checks deterministic output, reconstructed packed pixels, bounds and both player forms. It requires Pillow and can take several minutes.

For real browser checks, serve this folder and open `browser-tests.html`, or use optional Playwright and Chromium:

```bash
NOCTURNE_CHROMIUM=/path/to/chromium node scripts/browser_verify.cjs
```

The optional runner also checks layouts and file launch. Tests use the isolated `#verification` save namespace. [validation-results.json](validation-results.json) contains this run's actual browser/layout output. Gallery images come from the native Canvas renderer; browser screenshots were used only internally and are not included.

## Review and limits

Reviewed the actual nine-family before/after, roles, attack-stage gallery and generated animation/trait sheets. The archive includes native PNG/GIF previews and their reproduction scripts. [HOSTILES.md](HOSTILES.md) documents the drawing path and budgets; [PERFORMANCE.md](PERFORMANCE.md) reports measured costs and memory.

Physical phones, real touch feel, speakers, sustained thermal behaviour, Firefox/LibreWolf and hardware GPU performance were not measured. Eight discrete facings and faceted mesh shading remain intentional stylistic limits. No GitHub push, tag or release was performed.
