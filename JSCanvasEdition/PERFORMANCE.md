# Rendering measurements — v0.7.6

> Historical evidence from 26 October 2026. Prose uses canonical version numbers; recorded logs, image labels and byte-identity claims refer to the original packages before the 30 October documentation/versioning update. See [version mapping](../VERSIONING.md).

Measured on **26 October 2026**, headless Chromium 153, `--disable-gpu`, 1280×800, device scale 1. Each scene uses 20 warmups and 80 samples, timing `g.draw()` plus a 1×1 Canvas readback to flush rendering. Simulation is frozen while world-time art advances. These are **software draw costs**, excluding AI/collision updates, physical input, audio, presentation and thermal limits. They are not device FPS guarantees.

## Final implementation versus completed v0.7.5

| Scene | Quality | v0.7.5 median / P95 | v0.7.6 median / P95 |
| --- | --- | --- | --- |
| swarm | high | 33.2 / 41.3 ms | 57.9 / 68.3 ms |
| projectiles | high | 25.2 / 32.9 ms | 25.1 / 27.8 ms |
| fields | high | 17.2 / 22.2 ms | 19.8 / 24.1 ms |
| boss | high | 59.3 / 63.6 ms | 78.9 / 94.3 ms |
| army | high | 100.8 / 137.7 ms | 108.4 / 136.9 ms |
| swarm | low | 31.7 / 75.1 ms | 25.4 / 32.2 ms |
| projectiles | low | 17.1 / 18.3 ms | 11.4 / 15.0 ms |
| fields | low | 10.5 / 15.1 ms | 7.8 / 9.4 ms |
| boss | low | 51.1 / 53.7 ms | 39.0 / 54.5 ms |
| army | low | 89.8 / 96.5 ms | 75.3 / 95.3 ms |

The high-quality enemy swarm and boss scenes are slower in this run; the high-quality mixed army median also increases. Extra family detail and overlays therefore have a measurable cost. Low-quality medians are lower in this final run, but controls without enemies also vary materially between runs. **Do not interpret that as a guaranteed speedup.** Earlier old-first and reversed-order measurements showed host/order variability even in unchanged projectile/field rendering. The final table includes every scene and its tails rather than selecting only favourable measurements. The high-quality swarm regression remains a limitation; low quality is the lower-cost fallback.

The final patch shares identical humanoid attachment surfaces across enemy families, retaining separate Slime/Hound/Wraith geometry. This reduces duplicate cache entries and crowd churn without changing artwork or spawn counts. Baked models, bounded surfaces and visual prioritization keep live work finite, but do not establish real low-end hardware performance. A physical low-end device profile remains unmeasured.

## Scene definitions

All scenes give the player all twelve schools at rank VIII. Swarms use mixed ordinary families, five traits, eight facings, level 80, elites and veterans.

| Scene | Actual contents |
| --- | --- |
| swarm | 120 enemies + player |
| projectiles | 240 live projectiles + player |
| fields | 2,000 live allied fields + player |
| boss | 120 enemies + principal guardian + player, 200 allied fields, 24 hostile hazards |
| army | 317 enemies including principal guardian, two actual summoned Overlord commanders and their reinforcements + player; 120 projectiles, 300 fields, 24 hazards |

The `army` hierarchy uses the existing summon functions and limits. Every real hostile hazard is retained, including ring gaps and seal footprints. Allied fields continue their full simulation; only the existing visual grouping is bounded. [benchmark-results.json](benchmark-results.json) contains the final raw scene summaries and counts.

## Asset area and encoded size

| Metric | v0.7.5 | v0.7.6 |
| --- | --- | --- |
| Active decoded image RGBA area | 97.79 MiB | 100.35 MiB |
| Embedded PNG payload | 25,833,619 bytes | 18,810,779 bytes |
| PNG records / active decodes | 64 / 55 | 64 / 55 |
| Largest texture side | 2,304 px | 2,304 px |

Active area sums `width × height × 4`, skipping the nine unused legacy walk strips. It is **not total browser RAM** and excludes decoded copies, encoded source strings, driver overhead, surfaces and caches. Enemy model replacement increases decoded area by about 2.55 MiB while compressing more efficiently. Transparent cell packing remains lossless, with logical offsets; player atlas pixels and cloth metadata remain identical to v0.7.5. PNG size and decoded area are different metrics.

## Hard bounds

- Hostile regalia: **96 × 112×144 surfaces**, approximately **5.91 MiB** raw RGBA at capacity; identical humanoid plate shapes share entries. Slime/Hound/spectral and role geometry remain separate.
- In crowds over 100: ordinary low-quality or distant units use cheap trait outlines, near ordinary surface admissions cap at six per world-time frame. Bosses, elites and veterans retain detailed structures. Family sprites remain visible. Distant ordinary labels/bars are reduced.
- Existing hull cache: 160 × 64×64 surfaces, 2.5 MiB raw.
- Existing player cloth cache: 24 × four 96×128 surfaces, 4.5 MiB raw. Intact sprite fallback on low/reduced motion.
- Friendly fields: 32 nearest candidates per kind, 128 total; 12/8/6/4 drawn groups depending on quality/boss state. O(n log 32) reads. No field effect is removed.
- Hostile hazards: unchanged pool of 24; every visible exact danger boundary is drawn.
- Existing environment budgets and projectile, particle, remnant and number pools are unchanged. New defeat fragments use the existing corpse lifetime and no particle allocations.

Reduced motion disables procedural hostile deformation/lean/lift and defeat fragments. No runtime mesh solver, WebGL or new gameplay RNG is introduced. Cosmetic caches and WeakMaps are excluded from saves.

## Reproduce

Authoring-only requirements: Playwright and local Chromium.

```bash
NOCTURNE_CHROMIUM=/path/to/chromium node scripts/browser_bench.cjs /path/to/v0.7.5/JSCanvasEdition
```

The script serves both editions, runs old then new and writes `nocturne-benchmark.json`. Set `NOCTURNE_BENCH_REVERSE=1` to reverse that order, or `NOCTURNE_BENCH_RESULT` for the output path. Browser version, host load, GPU mode, scene order, warm caches, readback and resolution affect results. Hardware GPU, physical phone and Firefox/LibreWolf measurements have not been performed.
