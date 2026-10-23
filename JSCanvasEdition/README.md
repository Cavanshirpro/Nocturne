# Nocturne — Witch of Ash: JSCanvasEdition

**Version 5.1.2 · Balance of Power**

**JSCanvasEdition** is the HTML5 Canvas and JavaScript implementation of [Nocturne — Witch of Ash](https://github.com/Cavanshirpro/Nocturne), a dark-fantasy, top-down arena survival game. Move through the Hollow, build a spell arsenal, gather loot, and defeat each wave's final guardian.

The game runs locally in a modern browser. No game engine, account, build step, npm package, or internet connection is required for play. Images are embedded in `assets.js`; sound effects are synthesized through Web Audio.

## What's new in 5.1.2

- **Whole-build difficulty:** merchant damage, haste, projectile count, crits, learned spells, mastery, relics, talents, vitality, armor and mobility now influence swarm pressure alongside character level.
- **Stronger high-build guardians:** boss vitality follows estimated sustained damage, without the previous health ceiling. Weak builds get a smaller health budget and bounded per-hit damage. Seven warned powers include Soul Constellation, Rift Step and Triune Lances.
- **Adaptive waves:** spawn density, enemy level bands, a separate threat-wave indicator, timer and Overlord invasion probability account for build strength. Changes during a wave are gradual and affect newly spawned enemies.
- **Livelier enemies:** independently moving wings, robes, arms and tails, clearer windup/strike poses, boss strafing and orbiting motes. Low quality and reduced motion remain available.
- **Retained:** E/Aegis, same-wave retries with half-gold loss, manual banked Demon Essence, vitality cues, red screen edges, final sanctums and the minimap.

See [RELEASES.md](RELEASES.md) for version-specific changes and migration notes.

## Play

Download the JSCanvasEdition release archive and extract it, or clone the repository:

```bash
git clone https://github.com/Cavanshirpro/Nocturne.git
cd Nocturne/JSCanvasEdition
```

Open **`index.html`**. Keep all files and the `systems` directory together.

If your browser restricts local files, optionally serve this folder:

```bash
python -m http.server 8000
```

Then open **http://localhost:8000/**. Python is needed only for this optional server and the asset-development tools.

## Controls

| Input | Action |
| --- | --- |
| `W A S D` / arrow keys | Move; diagonal movement is normalized |
| Automatic targeting | Learned spells attack eligible nearby targets |
| `Space` / `Shift` | Veilstep dash |
| Hold right mouse, then release | Aim and charge the selected special ritual |
| `Q` | Cast the selected special immediately |
| `Z` | Cycle unlocked specials; cooldown is shared |
| **`F` / UNLEASH button** | Activate Demon Witch using banked essence |
| **`E` / AEGIS button** | Raise the temporary player shield |
| Mouse wheel / `+` / `−` | Adjust camera zoom |
| `0` | Reset zoom |
| `I` | Open the grimoire |
| `Esc` / `P` | Pause or resume |
| `1` / `2` / `3` | Choose a level-up gift |
| Touch controls | Move, dash, charge specials, raise Aegis, and activate Demon Witch |

Sound starts after an interaction. Volume, tonal ambience, low-quality rendering, and reduced motion are available in the pause menu. Tonal ambience defaults to off.

## The wave loop

1. Survive the timed swarm and collect XP, gold, healing, and rare Demon Jewels.
2. Choose one of three gifts when leveling up; the world pauses while choosing.
3. At the end of the timer, follow the **crimson diamond** on the minimap or the world-direction arrow to the **Final Sanctum**. Ordinary swarm spawning stops during this final hunt; surviving enemies and hazards remain dangerous.
4. Enter the marked arena to summon its guardian. Every final encounter summons a **Final Sovereign**, a crowned form of Overlord. It stays within its arena and must be defeated before the merchant opens. A surviving invasion boss ascends into the Sovereign and fully heals once; it keeps its identity and never duplicates.
5. Buy upgrades, reroll or refill stock, lock offers, prepare an oath, then start the next wave.

Overlords can also invade from wave 3 onward. Each wave has one saved invasion roll, with a **4–42%** chance based on wave and build pressure, and at least three waves between invasions. Reopening or retrying the same wave does not reroll that decision. Ending the survival timer alone never completes a wave.

## Build-aware wave pressure

The HUD and merchant show **BUILD POWER**. The actual **WAVE** number still counts completed waves; **THREAT W** is the effective wave used for spawn pacing. At maximum build pressure, spawn frequency is multiplied by up to **1.77**, the threat wave increases by up to five, and the living ordinary-enemy budget remains capped at **200**. These limits prevent runaway swarms while preserving the benefit of upgrades.

The survival timer starts at 30 seconds and grows with progression to 60 seconds; extra build pressure can add up to seven seconds. Duration and the invasion roll are fixed at wave start. Every six simulation seconds, ordinary encounter pressure can adjust by at most 0.25 toward your current build. Existing enemies never gain health from this refresh. The final boss assesses your current build separately when its encounter begins.

Gold, missing health, stored essence, active Demon bonuses and Aegis charge do not increase permanent build pressure. Banking and timing temporary abilities remain useful. See [BALANCE.md](BALANCE.md) for the calibration method and its limits.

## Final Sovereign and Aegis

The final boss locks its level, health and damage budgets when the encounter starts, including when an invasion ascends. Level uses the whole-build effective enemy level. Vitality targets roughly **32–47 seconds of estimated sustained damage**, with a small 300-health floor; this is a tuning budget, not a guaranteed real fight duration. Spell coverage, projectile spread, crits, mastery and evolutions contribute. There is no old threefold health ceiling or fivefold vitality floor. Later player upgrades never refill or continually rescale an active boss.

The reference attack stat remains at least five times a same-level Overlord's value, and also grows with player vitality and armor. Actual attacks have separate ceilings based on the player's effective health at encounter start. Armor applies normally; a weak character cannot be killed by one full-health contact hit. Several hits, overlapping hazards and minions still require movement and Aegis.

| Guardian power | Counterplay |
| --- | --- |
| **Hellfire Salvo** | A 0.9s locked-aim warning, then 10 shots (14 enraged), plus up to one extra for high build pressure. Sidestep, dash, or shield. Each shot is capped at 18% of effective health before armor. |
| **Ash Meteors** | Three fixed circles (four enraged) warn for 1.15s. Leave the marked ground. Each impact is capped at 30% of effective health before armor. |
| **Soul Reaping** | A warned, directed 245-unit arc. Leave the arc or raise Aegis; capped at 38% of effective health before armor. |
| **Dread Aegis** | A temporary 3s boss ward absorbs up to 4% of its maximum vitality. The ward has a separate HUD bar; it does not heal the boss. |
| **Soul Constellation** | Ten radial shots (fourteen enraged) leave a gap along the warned aim. Move through a gap; each orb is capped at 14% of effective health before armor. |
| **Rift Step** | A marked destination warns for 1.1s before an impact and teleport. The destination locks inside the arena; leave its circle. Impact is capped at 24% of effective health before armor. |
| **Triune Lances** | Three fixed rays warn for 1.15s before firing. Move between them or use Aegis; each hit is capped at 28% of effective health before armor. |

The Sovereign summons minions, strafes, and shortens recovery windows below **40% health**. After showing all seven powers, it can choose lances against distant players and Rift Step against nearby players. Contact damage is capped at 42% of effective health before armor.

**Your Aegis** is available from the start for all three covens. It lasts **2.5 seconds**, absorbs `0.75 × maximum vitality + 2 × character level` damage after armor, and has **8 seconds of recovery from activation**. Overflow reaches your Stone oath shield, then vitality. It costs no gold or Demon Essence. A depleted or expired barrier disappears; loading and pausing never refill it. Use movement and dash while it recovers.

## Death and retry

Death **does not delete or replace the active save slot**. It immediately stores a fresh retry for the same wave:

- Retain `floor(current gold / 2)`; lose the remainder. **101 gold → 50 retained, 51 lost.** The loss happens once per death, not again when pressing Retry or loading.
- Keep levels, collected XP, pending level-up gifts, spells, ranks, talents, relics, upgrades, unspent essence, records, and locked merchant offers.
- Restart the current wave at time zero and the starting position, with full vitality. Enemies, boss progress, hazards and uncollected loot reset. Active Demon form ends; spent essence is not refunded.
- Special/Aegis/dash recovery resets for the new attempt. The current wave oath remains in effect; a prepared next-wave oath is not consumed.

Choose **RESTART WAVE** on the death screen or **CONTINUE** from the title after reopening the game. No new save slot is created by retrying. The chronicle counts fallen attempts. If browser storage is unavailable, the death screen says so; retry still works within the current session.

## Demon Essence

Essence has no gameplay storage ceiling. **100 essence = one charge**. Activation spends all complete charges and preserves the remainder. For example, activating with **425 essence** spends 400 and leaves 25 banked.

| Charges spent | Duration | Damage multiplier | Movement multiplier |
| --- | --- | --- | --- |
| 1 | 12 seconds | ×1.8 | ×1.45 |
| 2 | 20 seconds | ×2.1 | ×1.55 |
| 4 | 36 seconds | ×2.4 | ×1.65 |

For `c` complete charges, duration is `12 + 8 × (c − 1)` seconds, damage is `1.8 + 0.3 × log₂(c)`, and speed is `1.45 + 0.1 × log₂(c)`. The HUD previews the result before activation.

Jewels grant their full essence value during a transformation and bank it for a later activation. An active form cannot be restarted, and expiration never spends the bank automatically. Nearby ordinary enemies flee in fear; bosses resist it. The minimum activation cost and finite rendering pools are intentional; player progression has no added gameplay rank ceiling.

## Existing gameplay

- **Three covens:** Ashkeeper, Moonweaver, and Stormcaller have distinct starting stats and spells.
- **Twelve automatic spells:** Arcane Bolt, Moon Wisps, Chain Lightning, Frost Nova, Ember Meteor, Soul Lance, Thorn Sigil, Abyss Rift, Rapid Fire, Heavy Cannon, Burst Heavy, and Glacial Seed; each has an evolution path.
- **Directed specials:** Ult Slash, Winter Dominion, and Soulstorm unlock through character levels.
- **Endless progression:** spell ranks, mastery, talents, and repeatable merchant upgrades.
- **Mixed enemy levels:** the unpressured level-40+ mix is 80% weaker / 15% peer / 5% veteran. Gear pressure shifts some encounters toward stronger bands; most remain weaker, and mature fodder stays below the actual character level. Bosses use separate budgets.
- **Animated combat:** eight-direction witch animation, nine enemy families, attack tells, fear poses, projectile trails, impact effects, and synthesized sounds.

## Saves and upgrades

There are **24 independent local save slots**, with renaming and JSON backup export/import. Legacy single-save data migrates into **Save 1**. Imports add chapters without overwriting existing ones.

Export a backup from **SAVES** before upgrading. Replace the edition's files together, then use the same browser, profile, and game address. Clearing site data, private browsing, a different localhost port, or a different browser can make local saves unavailable. Direct-file save behavior depends on the browser.

v5.1.2 accepts v5.1.1, v5.1.0 and v5.0 saves, retaining characters, banked essence, spells, gold, merchant state, world snapshots and player Aegis timers. New saves preserve adaptive wave plans and all seven guardian powers, including locked aim, teleport destination and ward state. A legacy guardian already fighting upgrades once while preserving identity, health/ward percentages and attack clocks. Saving again never repeats the adjustment. A legacy save past its timer receives a final sanctum on resuming. Older supported v3/v4 data still uses the existing migration path.

## Source layout

| File | Responsibility |
| --- | --- |
| `index.html`, `style.css` | Menus, HUD, controls, and layout |
| `game.js` | Main loop, input, camera, waves, checkpoints |
| `entities.js` | Player, enemies, loot, health changes |
| `combat.js` | Spells, collisions, particles, damage numbers |
| `ui.js` | Level-up choices, shop, saves, grimoire |
| `systems/abilities.js` | Charged specials and banked Demon form |
| `systems/encounters.js` | Final sanctum, guardian leash, minimap |
| `systems/guardian.js` | Sovereign scaling, warned powers, temporary boss ward |
| `systems/difficulty.js` | Whole-build assessment, saved wave plans, encounter budgets |
| `systems/vitality.js` | Player health feedback and red screen edges |
| Other `systems/*.js` | Progression, balance, encounter distribution, animation, audio, snapshots, storage |
| `assets.js` | Embedded PNG assets and atlas metadata |
| `generate_assets.py`, `enemy_models.py` | Reproducible procedural artwork source |
| `tests.mjs`, `test_assets.py`, `browser-tests.html` | Logic, asset, and browser verification |
| `balance-probe.mjs`, `BALANCE.md` | Reproducible throughput fixture and calibration notes |

## Development checks

```bash
node tests.mjs
python -m unittest test_assets.py
node balance-probe.mjs
```

Logic tests need Node.js 18+. Asset checks and generation need Python with Pillow. For real browser checks, serve the folder and open **`browser-tests.html`**, then choose **RUN BROWSER CHECKS**. Browser fixtures use a separate verification save store. This is a manual developer page, not the normal game entry point.

Do not equate automated sound waveform checks with testing physical speaker output or real-device performance.

## Issues

Report issues at [Cavanshirpro/Nocturne](https://github.com/Cavanshirpro/Nocturne/issues), including **JSCanvasEdition**, version/commit, browser and operating system, reproduction steps, and expected behavior. Avoid posting private backups or personal data.

## License and credits

This edition includes the **GNU Affero General Public License, version 3**; see [LICENSE](LICENSE). Preserve the applicable copyright, license, and attribution notices when redistributing.

- **Creator and developer:** Cavanshir Qurbanzade (YoungLion)
- **Prompter (JSCanvasEdition):** [@oustxr](https://github.com/oustxr)

Copyright (C) 2026 Cavanshir Qurbanzade.
