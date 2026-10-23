# v5.1.2 balance calibration

The objective is a readable challenge for both a lightly equipped character and a heavily upgraded merchant build at the **same character level**. Permanent upgrades are retained. Ordinary swarm pressure has limits; final-guardian vitality follows damage output beyond those limits.

## Model

- Offensive strength estimates learned spell damage, cast intervals, projectile count, crit expectation, mastery, evolution relics, pierce, projectile speed, relevant talents and the selected ritual. Boss estimates discount projectile spread and area coverage; they do not assume every projectile always lands.
- Combined build pressure uses logarithmic weights: 60% offense, 28% defense, 12% mobility, with an allowance for ordinary level progression. This avoids multiplying raw stats into an unstable difficulty spike.
- Swarm pressure is bounded from 0 to 3.5. Enemy levels, spawn intervals, population budget, tier mix and invasion chance derive from it. Refresh steps are limited to 0.25 every six simulation seconds. Existing enemy health never changes.
- A wave's timer and single invasion decision are saved. The displayed chronological wave does not skip forward. Threat wave is the separate spawn-pacing value. Retrying does not reroll an invasion.
- The guardian snapshots the live build on encounter entry. Its vitality is estimated single-target DPS × `(32 + min(8, wave × 0.5) + 2 × pressure)`, with a small 300-health minimum. Unlike swarm pressure, the offensive health budget has no low multiplier ceiling. A numerical representation guard of 1e150 prevents overflow.
- Guardian attack budgeting uses vitality and sublinear armor scaling. Each attack also has a separate effective-health ceiling; armor and player shields still apply. Temporary Demon bonuses and stored essence do not inflate permanent difficulty.

## Reproduce the throughput fixture

Run `node balance-probe.mjs` with Node.js 18+. It uses the actual game combat and collision code, fixed seed 271828, 60 fixed steps per second, and 35 seconds of attacks against an immortal target held 120 units away. Enemy AI, wards, minions and movement are disabled. Automatic spells and uncharged Ult Slash fire whenever ready. All four fixtures use Ash, **level 25, wave 5**, base crits, no extra talents/mastery/relics, and the default bolt unless listed.

| Fixture | Damage | Cast interval | Projectiles | Max vitality | Armor rating | Additional spell ranks |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Starter | 18 | 0.56s | 1 | 110 | 0 | None |
| Merchant | 60 | 0.30s | 4 | 220 | 0.4 | Rapid 2 |
| Veteran | 600 | 0.10s | 16 | 500 | 2 | Rapid 4, Cannon 3, Lightning 4 |
| Extreme | 200,000 | 0.035s | 100 | 2,500 | 10 | Rapid 8, Cannon 8, Lightning 8, Glacier 8 |

| Fixture | Build power | Effective enemy level | Invasion chance | Guardian vitality | Measured fixture DPS | Vitality / fixture DPS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Starter | 100 | 25 | 7.40% | 1,540 | 44.4 | 34.7s |
| Merchant | 365 | 38 | 20.78% | 74,310 | 2,271 | 32.7s |
| Veteran | 735 | 54 | 37.15% | 13,635,826 | 245,306 | 55.6s |
| Extreme | 1,378 | 54 | 37.15% | 142,209,200,465 | 2,968,465,457 | 47.9s |

The last column is a **calibration ratio**, not an observed encounter duration or win rate. Dodging, range, charging, wards, damage immunity, minions, Demon timing and player skill change real fights. Finite projectile pools and spread also make theoretical DPS diverge from actual damage at large builds. These fixtures check that a weak build avoids the old health floor and that extreme shop scaling cannot outrun a small fixed boss-health ceiling. They do not prove balance for every possible endless build.

## Verification boundaries

`tests.mjs` checks adaptive pressure, tier distribution, spawn caps, invasion persistence, legacy saves, guardian migration, all seven powers, per-hit ceilings, Aegis and death recovery. `test_assets.py` checks actual frame pixels and deterministic regeneration. Native Canvas additionally decodes all 48 assets and renders guardian powers, low-quality/reduced motion and a narrow viewport. Native Canvas does not verify browser DOM/CSS layout, physical controls, speaker output or real-device performance. `browser-tests.html` is provided for those browser checks; they were not executed for this package.
