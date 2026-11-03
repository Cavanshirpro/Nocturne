# Ascension Foundations — v0.8.0

Ascension is persistent, rare progression. It is neither character level nor adaptive BUILD POWER; the existing boss combat-tier value remains entirely separate. The registry in `src/data/tiers.js` owns every identifier, order, era, palette, crest, theme, requirement, trial reference, unlock implementation flag, achievement, notification, accessibility label and historical-recognition eligibility flag.

| Tier | Era | Earliest target wave | Minimum level | Normalized developed ranks |
| --- | --- | ---: | ---: | ---: |
| -E | Awakening | 1 | 1 | 0 |
| +E | Awakening | 4 | 4 | 7 |
| -D | Awakening | 8 | 8 | 11 |
| +D | Awakening | 14 | 12 | 15 |
| -C | Awakening | 22 | 18 | 19 |
| +C | Awakening | 32 | 26 | 23 |
| -B | Ascendance | 45 | 35 | 27 |
| +B | Ascendance | 60 | 45 | 31 |
| -A | Ascendance | 78 | 60 | 35 |
| +A | Ascendance | 99 | 75 | 39 |
| -S | Sovereignty | 124 | 95 | 43 |
| +S | Sovereignty | 151 | 115 | 47 |
| Local Power | Dominion | 187 | 140 | 51 |
| Areal Power | Dominion | 225 | 170 | 55 |
| Big Power | Dominion | 275 | 210 | 59 |
| National Power | Dominion | 335 | 260 | 63 |

The target wave is the first wave *following* the required completed progress: +E needs three completed waves. Each noninitial stage also requires at least two learned schools (more at later stages), normalized ranks, verified guardian victories, elite victories from -D onward, and evolution/mastery evidence from +C onward. The registry contains the exact independent conditions. One school's contribution saturates at 8 for evaluation; its actual spell rank and combat effect remain unlimited. BUILD POWER is reported as context, never substituted for a missing requirement.

## Implemented versus future content

All 16 stages can be inspected with **T** or the HUD/Grimoire Ascension button. The four-era ladder distinguishes earned, legacy-recognized, unmet, trial-available and future-trial states with text as well as color. Next-stage details show actual/required values and historical credit. Earned identity adds one restrained crest below the existing player label; it adds no new sprite atlases, particles or statistical multipliers.

New characters start at -E. The **First Ember** trial can newly award +E. The other unique trials are registered explicitly as unavailable. Latent aspects, specializations, advanced interactions, enhanced Coven identities, summoning and Dominion powers are descriptors only; none is equipped, multiplied into combat or presented as a working ability. Qualified historical characters can receive meaningful early recognition through +C without a false claim that any unique future trial was passed. See [MIGRATION.md](MIGRATION.md).

## First Ember

During preparation, meet the +E requirements, open Ascension and choose **BEGIN FIRST EMBER**. Survive 20 simulation seconds, move at least 250 units and use Veilstep once. Existing impact-warning geometry is placed at the player's position at deterministic four-second intervals, with the existing 1.2-second warning. Move out, dash or use Aegis. A caught warning fails the demonstration without damaging the character, deleting a wave or issuing loot. There are no trial enemies, bosses, XP or gold to farm.

The preparation countdown suspends during the trial and all blocking menus. Victory explicitly records `first-ember` and advances once to +E. Repeating a completed trial or calling advancement without a verified trial cannot award another milestone. Failed trials clear only trial effects and can be retried. Reloading an unfinished trial interrupts it, returns to the saved preparation time and grants nothing; the result is explained in the panel. Later ordinary death/retry preserves the awarded tier and trial record.

`Ascension.evaluate(player, game, tierId)` is pure: it returns detailed requirements, missing conditions, eligibility, implementation status and trial/advancement availability. `advance` is a separate guarded operation. State schema 1 stores monotonic current/highest tier, the unlocked prefix, completed wave/guardian evidence, verified trials, recognition metadata and bounded history. Import validates these records rather than deriving a new tier on every frame.

## Calibration and limits

Run `node tools/progression_probe.mjs` for the actual XP formula, guaranteed completion bonuses and six synthetic legacy examples. The +E level floor requires 42 total XP; three nonflawless completion bonuses total 42 gold, before enemy/boss drops. A spell tome starts at 24 gold and an oath at 14, increasing with wave. Requirements intentionally combine gifts, learned schools and combat evidence; minimum level alone is insufficient.

The existing five-wave stability fixture still reaches level 52 with 1,734 kills, but it uses a deliberately strong, protected bot and is **not** an average-player model. Late wave targets remain provisional, and no live balancing claim is made for wave 335 or the unavailable advanced trials. New trials must be playtested before enabling their descriptor flags. Next work for v0.8.1 is a real -D trial and the first implemented latent aspect, with gameplay, migration and UI verification before activation.
