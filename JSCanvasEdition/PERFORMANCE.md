# Rendering measurements — v5.2.5

Measured on 26 October 2026 in headless Chromium 153, `--disable-gpu`, 1280×800, device scale 1. Each scene used 20 warmups and 80 samples. Each sample times `g.draw()` **and a 1×1 Canvas readback to flush rendering**. This is a software-rendered, draw-only comparison with 5.2.4; it excludes AI, collision simulation, audio, physical input, compositing/presentation and thermal limits. It is not a real-device FPS guarantee.

| Scenario | Quality | 5.2.4 median / P95 | 5.2.5 median / P95 |
| --- | --- | --- | --- |
| swarm | high | 27.8 / 38.4 ms | 22.2 / 27.8 ms |
| projectiles | high | 18.6 / 23.9 ms | 17.7 / 23.1 ms |
| fields | high | 13.6 / 16.6 ms | 13.8 / 16.2 ms |
| boss | high | 44.9 / 54.4 ms | 40.0 / 54.3 ms |
| swarm | low | 23.4 / 33.9 ms | 16.4 / 21.3 ms |
| projectiles | low | 11.5 / 14.6 ms | 11.8 / 15.2 ms |
| fields | low | 8.1 / 9.9 ms | 7.3 / 9.7 ms |
| boss | low | 35.6 / 42.7 ms | 29.6 / 33.7 ms |

Scenarios: swarm = 120 enemies + player; projectiles = 240 active projectiles + player; fields = 2,000 live allied fields with the player; boss = 120 enemies + boss + player, 200 allied fields and 24 hostile hazards. The player has all twelve schools at rank VIII. The simulation is frozen while time-dependent art advances.

Swarm and boss medians improved in this run. High-quality dense-field and low-quality projectile medians increased slightly. Small differences are within the noise of this single host run; no universal performance claim follows. The near-field heap selection reads all live areas instead of only a sample, trading some CPU work for correct nearby representation. Required threat geometry is kept on low quality.

## Asset memory and file size

Summing `width × height × 4` for decoded active images gives **181.98 MiB** for 5.2.4 and **97.79 MiB** for 5.2.5 (about 46% less). This counts RGBA pixel area, not process/RSS memory, browser texture copies, encoded source strings, mipmaps, internal surfaces or driver overhead. The new cloth cache can add at most 4.5 MiB of raw pixel surfaces; the existing hull cache at most 2.5 MiB. Three small ground-pattern source images are included in the active image estimate.

The reduction comes from lossless transparent trimming of enemy/ritual cells and skipping nine unused legacy walk strips at startup. No nontransparent pixels are dropped, scaled or quantized. Player atlas resolution is unchanged. There are 64 embedded PNG records; 55 decode for play. The PNG payload is roughly 25.8 MB versus 25.3 MB before, so **encoded download/source size did not shrink**. New material masks, art and metadata slightly increase assets.js; decoded image area is the optimization delivered here.

## Hard rendering bounds

- Hull cache: 160 64×64 surfaces.
- Cloth cache: 24 frames × four 96×128 surfaces; intact sprite fallback on low/reduced motion or unsupported OffscreenCanvas.
- Friendly fields: 32 nearest candidates per kind, at most 128 candidates across four kinds, then 12/8/6/4 rendered groups by quality/boss state. O(n log 32) source reads; real field effects remain uncapped.
- Hostile hazard pool: unchanged 24; every visible boundary remains drawn.
- Landmarks: 96 cached records, at most 48 drawn per frame / 24 low.
- Ambient marks: at most ten; none on low/reduced motion.
- Existing projectiles, particles, remnants, numbers and effect pools are unchanged.

## Reproduce

Install Playwright and a local Chromium for authoring. Run:

```bash
NOCTURNE_CHROMIUM=/path/to/chromium node scripts/browser_bench.cjs /path/to/v5.2.4/JSCanvasEdition
```

The script serves both editions locally, closes its browser, and writes `nocturne-benchmark.json` in the current directory. The shipped `benchmark-results.json` retains this run's samples/settings summaries. Browser versions, GPU mode, resolution, frame flushing and device hardware materially affect results. Physical low-end hardware and Firefox/LibreWolf were not profiled.
