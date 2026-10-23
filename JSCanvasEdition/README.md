# Nocturne — Witch of Ash: JSCanvasEdition

**Version 5.1.1 · Sovereign Reckoning**

**JSCanvasEdition** is the HTML5 Canvas and JavaScript implementation of [Nocturne — Witch of Ash](https://github.com/Cavanshirpro/Nocturne), a dark-fantasy, top-down arena survival game. Move through the Hollow, build a spell arsenal, gather loot, and defeat each wave's final guardian.

The game runs locally in a modern browser. No game engine, account, build step, npm package, or internet connection is required for play. Images are embedded in `assets.js`; sound effects are synthesized through Web Audio.

## What's new in 5.1.1

- **Final Sovereign:** every final sanctum now has a level-scaled guardian with **5× the vitality and base attack power of a same-level Overlord**, replacing the weaker final Wardens. It uses warned Hellfire Salvo, Ash Meteors, Soul Reaping, and Dread Aegis, and enrages below 40% vitality.
- **Player Aegis:** press **E** or the **AEGIS** button to raise a temporary shield. Charge and recovery are visible and persist through saves.
- **Death recovery:** your save survives. Lose half your current gold, keep your character development, and restart the **same wave** with full vitality. The death screen and title-screen Continue both use this saved retry.
- **Retained from 5.1.0:** clear damage/healing cues, red edges below 30% vitality, manually banked Demon Essence, the final sanctum, and minimap navigation.

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

Overlords can also invade every seventh wave that is not a fifth-wave encounter. Ending the survival timer alone never completes a wave.

## Final Sovereign and Aegis

The final boss locks its level and stats when the encounter starts. Its level is at least `max(player level + 3, ceil(player level × 1.12))`, retaining a higher level if it ascends from an invasion. Its vitality and base attack value are **five times** those of a normal Overlord at that same level and wave. It does not copy later changes to your damage or constantly refill its health. Movement speed is adjusted separately so warned attacks remain avoidable.

| Guardian power | Counterplay |
| --- | --- |
| **Hellfire Salvo** | A 0.9s aiming warning, then ten rapid shots along the locked aim direction; fourteen when enraged. Sidestep, dash, or shield. Each shot deals 10% of the boss's base attack value. |
| **Ash Meteors** | Three fixed circles (four when enraged) warn for 1.15s before impact. Leave the marked ground. Each hit deals 16% of base attack value. |
| **Soul Reaping** | A warned, directed 245-unit arc deals 22% of base attack value. Leave the arc or raise Aegis. |
| **Dread Aegis** | A temporary 3s boss ward absorbs up to 4% of its maximum vitality. The ward has a separate HUD bar; it does not heal the boss. |

The Sovereign also summons minions. Below **40% health**, its recovery windows shorten. The base attack multiplier is a reference stat, not a claim that every projectile deals a fivefold contact hit.

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
- **Mixed enemy levels:** at player level 40+, ordinary encounters use an 80% weaker swarm / 15% peer / 5% veteran distribution. At player level 100, those bands are levels 50–70, 75–100, and 105–110 respectively. Bosses use separate encounter rules.
- **Animated combat:** eight-direction witch animation, nine enemy families, attack tells, fear poses, projectile trails, impact effects, and synthesized sounds.

## Saves and upgrades

There are **24 independent local save slots**, with renaming and JSON backup export/import. Legacy single-save data migrates into **Save 1**. Imports add chapters without overwriting existing ones.

Export a backup from **SAVES** before upgrading. Replace the edition's files together, then use the same browser, profile, and game address. Clearing site data, private browsing, a different localhost port, or a different browser can make local saves unavailable. Direct-file save behavior depends on the browser.

v5.1.1 accepts existing v5.1.0 and v5.0 saves. It preserves banked essence, active form time, spells, gold, merchant state, and world snapshots. New snapshots also preserve the sanctum location, encounter phase, guardian identity/health, and stacked transformation bonuses. New saves also preserve guardian attack/ward state and player Aegis timers. A v5.1.0 guardian already in combat upgrades once while retaining its health percentage and identity. A legacy save already past its wave timer receives a final sanctum on resuming. Older supported v3/v4 data still uses the existing migration path.

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
| `systems/vitality.js` | Player health feedback and red screen edges |
| Other `systems/*.js` | Progression, balance, encounter distribution, animation, audio, snapshots, storage |
| `assets.js` | Embedded PNG assets and atlas metadata |
| `generate_assets.py`, `enemy_models.py` | Reproducible procedural artwork source |
| `tests.mjs`, `test_assets.py`, `browser-tests.html` | Logic, asset, and browser verification |

## Development checks

```bash
node tests.mjs
python -m unittest test_assets.py
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
