# v0.8.1 — Ascension Power & WebP

For the current camera-shake fix and Cinder Halo upgrade, see [v0.8.2 patch verification](PATCH_v082.md). The measurements below describe v0.8.1.

Prepared 5 November 2026. This release addresses shallow non-wave Ascension gates, cosmetic-only rank differences and the size of PNG assets. [The previous v0.8.0 foundation report](IMPLEMENTATION_REPORT_v080.md) remains historical evidence.

## Player-facing changes

Wave floors are reduced and promotion now requires deliberate school depth, total mastery investment, distinct mastered/evolved schools, elite victories and verified guardians. A high-level, high-wave character with shallow rank-VIII schools and one mastery in each school cannot bypass these gates. The [full requirement table](ASCENSION.md) records every value. Real spell/talent progression remains unlimited.

All fifteen promotions now have playable nonlethal ordeals, using progressively tighter aimed warnings, crossing seals and shock rings. Duration, movement and dash objectives scale per stage. Each ordeal checks actual results and current requirements before awarding once. Interrupted trials do not auto-complete; preparation's saved clock and resources remain intact.

Earned ranks now grant cumulative damage, damage reduction, movement and recovery benefits. Examples: +E ×1.18 spell damage; -D ×1.38 plus a damaging dash pulse; +C ×2.25 plus evolved/mastered-school resonance; -S ×5.25 plus boss/elite damage; National Power ×13.7 plus a ritual pulse. Intermediate stages add control, cooldown refunds, Demon/Aegis strength, elite/boss kill renewal, casting-seal cleansing and wider reach. The panel displays exact total bonuses, the preceding-rank difference and cumulative abilities.

Powers are derived when used rather than written into base stats. Loading cannot multiply damage or maximum vitality repeatedly. Action pulses add no new enemy/projectile population or persistent area timers and cannot farm preparation/trials. Boss adaptation includes only 35% of the logarithmic base Ascension gain, retaining a net benefit for the earned rank. Existing active guardians retain their snapshot health and attack clocks.

Already-earned tiers remain earned. Frozen v0.8.0 historical requirements still classify old v2/v3 records through +C; stricter live balance does not revoke recognized milestones. Storage container/checkpoint/Ascension schemas remain 4/3/1 with an extended validated set of registered ordeal IDs. Older software may not read new advanced completions; export a backup before rolling back. Half-gold death recovery remains unchanged. See [migration details](MIGRATION.md).

## Assets and architecture

All 64 runtime PNGs became exact lossless WebP: **18,810,779 → 11,973,448 bytes**, a **36.35% reduction**. Dimensions and all decoded RGBA hashes match, including transparency. Active raw image area remains **105,222,144 bytes**; this is not a total-memory or GPU-memory measurement. WebP does not by itself promise faster decoding.

Static preview stills are also converted with hash verification. The manifest, loader, generators, tests, browser server MIME types and gallery tooling use the new format. No runtime framework, external asset request or base64 bundle was introduced. All AGPL text and attribution are preserved. [ASSETS.md](ASSETS.md) documents generation, native-tool requirements and format choices.

`src/data/tiers.js` owns live requirements, frozen historical requirements and power descriptors. `ascension.js` evaluates evidence and awards monotonic state. `ascension-trials.js` executes the shared ordeal framework and stage-specific warning parameters. New `ascension-powers.js` derives stats and handles existing dash/ritual/shield/kill events. Existing combat, ability, entity, storage and UI modules call these boundaries. [ARCHITECTURE.md](ARCHITECTURE.md) contains the full source tree.

## Verification

Executed counts and codec measurements follow. Reproduction commands from the repository root:

```bash
python scripts/sync_version.py --check
python scripts/check_license.py
node JSCanvasEdition/tests/run.mjs
python -m unittest discover -s JSCanvasEdition/tests -p test_assets.py
node JSCanvasEdition/tools/compare_gameplay.mjs /absolute/path/to/v0.8.0/JSCanvasEdition
node JSCanvasEdition/tools/verify_foundations.cjs
node JSCanvasEdition/tools/asset_codec_bench.cjs /absolute/path/to/v0.8.0/JSCanvasEdition
```

New tests cover every promotion through National Power, once-only rewards, advanced interruption/reload, actual offense/defense/recovery differences, conditional damage, dash control, Aegis/Demon effects, kill renewal, preparation isolation, origin-rebase distance integrity and the net benefit against adapted guardians. Existing format assertions were changed to validate actual lossless WebP signatures/dimensions; gameplay assertions were retained.

| Executed check | Result |
| --- | --- |
| Logic regression and new mechanics | 264 existing groups and 52 tests passed; zero failures/skips |
| Pillow pixels and generation | 34 tests passed in 709.785 seconds, including 64 original RGBA hashes and two complete temporary generations |
| Exact v0.8.0 baseline gameplay comparison | Seven scenarios, 5,970 fixed updates, all passed; new powers are tested separately |
| Real Chromium Canvas/DOM suite | 86 passed, zero failed |
| Additional browser acceptance | 27 passed, no unexpected page errors |
| Launch and layouts | HTTP, direct file, missing-WebP handling, desktop and emulated touch; five viewport sizes |
| Native gallery codec spot check | Ground and packed Overlord WebP decode through @napi-rs/canvas |
| Version/license/source syntax/local links | Consistent version, official license hashes, source identifiers and 289 local links/resources passed |

The browser was Chromium 156.0.8078.80. `rank-browser-v081.json` contains all browser results and three real screenshots. `logic-v081.txt`, `parity-v081.txt`, the pixel-baseline fixture and codec conversion reports preserve the executed evidence. The existing gameplay comparison intentionally uses unascended builds; tests separately verify that earned powers change damage, defense and actions.

### Encoded size and decode trade-off

In addition to the runtime images' 36.35% reduction, 27 existing static PNG previews were converted without RGBA changes: 8,958,272 → 5,027,834 bytes. Three new browser captures use WebP as well. GIF animation previews remain in their existing format.

| Image-only run | PNG min / median / max (ms) | WebP min / median / max (ms) |
| --- | ---: | ---: |
| During background art generation | 360.5 / 458.5 / 532.8 | 457.0 / 550.7 / 627.0 |
| After art generation finished | 326.8 / 339.8 / 442.4 | 419.5 / 428.3 / 479.6 |

Each run uses five fresh Chromium contexts per codec and alternates order. Measurements wait for `Image.decode()` on the 55 active images, excluding game logic. The second observation is about **88.5 ms / 26.0% slower** for WebP at the median. WebP is therefore a verified download/disk-size improvement here, with an observed decode-time cost. No FPS, total-memory or universally faster-startup claim is made. Cached decoded images are reused during play. Shared-host variation and the small sample count limit generalization. Both full reports retain every sample: [first run](../validation-logs/codec-benchmark-v081.json), [after generation](../validation-logs/codec-benchmark-v081-idle.json).


## Limits and follow-up

The requirement curve is intentionally a stronger development gate, but is not measured human completion time. All ordeals are deterministic variants of one warning-based framework; this release does not implement bespoke narrative bosses, summons or selectable spell-aspect loadouts. Those systems remain future work rather than being implied by rank labels.

Chromium and emulated touch are the browser coverage. Firefox, Safari, physical mobile hardware and audible speaker output were not tested. Encoded-size and image-decode observations do not establish complete frame-time or memory improvements. The former v0.8.0 noisy rendering measurements remain in the historical report and are not reused as evidence for this release.

Next balancing work should use actual early/mid-game play observations, tune depth/mastery prices and stage requirements against those observations, and extend the shared ordeal framework with distinct objectives. Preserve earned ranks and the frozen historical policy while adjusting future live gates.
