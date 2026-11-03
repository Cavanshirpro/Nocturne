# Architecture — v0.8.0

Nocturne remains a dependency-free Canvas 2D game. Scripts use the existing `window.Nocturne` namespace and ordered classic `defer` scripts. This keeps both HTTP and tested Chromium `file://` launch working without ES-module CORS rules, a bundler, runtime packages or a JSON fetch.

```text
JSCanvasEdition/
├── index.html, NOTICE.html, LICENSE, NOTICE
├── assets/
│   ├── manifest.js
│   ├── metadata/{atlas,packing,cloth,animations}.js
│   └── images/{characters,environments,effects}/
├── src/
│   ├── bootstrap.js
│   ├── core/{game-state,spatial-hash,input,asset-loader,game}.js
│   ├── data/{configuration,tiers}.js
│   ├── entities/entities.js
│   ├── combat/combat.js
│   ├── systems/                  # Progression, encounters, saves, Ascension, wave cycle
│   ├── rendering/                # Existing Canvas systems, plus earned tier identity
│   ├── ui/{ui,ascension-ui,wave-ui}.js
│   └── styles/{base,ascension}.css
├── tools/                       # Python art generators, native galleries, browser checks
├── tests/                       # Existing regression suite, new tests, synthetic fixtures
├── docs/                        # Current architecture and foundation guides
├── previews/                    # Real renderer screenshots and animation galleries
└── validation-logs/              # Executed reports; older evidence is historical
```

## Load order and ownership

`index.html` is the authoritative executable manifest. Asset paths and four metadata files load first. `core/game-state.js` creates the namespace, numerical utilities and the display version. Spatial indexing, input and asset loading have their own files; `core/game.js` owns the existing single fixed-step loop and orchestration. Existing gameplay/rendering systems retain their proven relative order. Configuration, all tier descriptors, Ascension, the wave cycle, trials and migration are defined before storage and before any player is instantiated. Entity, combat and UI classes are then installed. `bootstrap.js` runs after DOM readiness, validates and decodes the startup images, and only then constructs `Game` and opens storage.

Definitions can refer to other namespace services inside functions; they do not construct a second engine during script evaluation. There are no module import cycles or duplicate old implementations. Native verification tools read the same script order from `index.html` rather than maintaining a divergent engine list.

| Responsibility | Owner |
| --- | --- |
| Simulation/input/camera and world snapshots | `src/core/game.js`, `input.js`, `src/systems/snapshots.js` |
| Character growth, spells and adaptive combat | Existing progression, abilities, difficulty, guardian and warfare systems |
| All 16 tiers and future capability descriptors | `src/data/tiers.js` |
| Requirement evaluation, monotonic state and explicit awards | `src/systems/ascension.js` |
| Retrospective evaluation and old checkpoint conversion | `src/systems/migration.js` |
| Storage validation, separate keys, per-slot recovery and import/export | `src/systems/storage.js` |
| Authoritative preparation timing and guarded next-wave action | `src/systems/wave-cycle.js` |
| Actual trial execution, outcome and interruption semantics | `src/systems/ascension-trials.js` |
| Tier UI and compact preparation controls | `src/ui/ascension-ui.js`, `wave-ui.js` |
| Sprite/cloth/orbitals/environment/field rendering | `src/rendering/` |
| Offline PNG/manifest/metadata generation | `tools/generate_assets.py`, `asset_pipeline.py` |

## Integration boundaries for later releases

Future refuge interactions belong to preparation, entered through `WaveCycle.begin/resume` and updated through `tickPreparation`; they must not run ordinary wave spawning. Future persistent world data must have its own versioned capture/validation/migration contract before joining checkpoints. `Migration.checkpoint` and per-slot conversion are the place to introduce that version, preserving source data. New real tier capabilities belong in their gameplay systems and centralized unlock descriptors, not in tier-number branches throughout combat. The Ascension UI can already inspect unavailable stages without advertising usable powers.

Character level, BUILD POWER, boss combat tier (0–4), and Ascension order (0–15) are separate values. No Ascension value modifies the existing damage, enemy health, spawn, collision or unlimited-rank formulas. The only earned initial unlock is cosmetic identity and the verified +E milestone.

Run `node tests/run.mjs` and `python -m unittest discover -s tests -p test_assets.py` from this edition. Optional browser and baseline comparisons are documented in [ASSETS.md](ASSETS.md) and [IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md).
