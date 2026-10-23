# Nocturne — Witch of Ash: JSCanvasEdition

**Version 5.1.0 · Final Sanctum**

**JSCanvasEdition** is the HTML5 Canvas and JavaScript implementation of [Nocturne — Witch of Ash](https://github.com/Cavanshirpro/Nocturne), a dark-fantasy, top-down arena survival game. Move through the Hollow, build a spell arsenal, gather loot, and defeat each wave's final guardian.

The game runs locally in a modern browser. No game engine, account, build step, npm package, or internet connection is required for play. Images are embedded in `assets.js`; sound effects are synthesized through Web Audio.

## What's new in 5.1.0

- **Readable vitality:** outlined red damage and green healing numbers above the witch, a temporary overhead vitality bar, and a persistent low-vitality warning. Shielded hits report actual vitality lost; full-health pickups do not show fake healing.
- **Critical-health edges:** the screen edges turn red below 30% vitality. The warning grows stronger as health falls and clears after sufficient healing. It also works in low-quality and reduced-motion modes.
- **Banked Demon Essence:** jewels no longer transform the witch automatically. Save essence, then press **F** or **UNLEASH** to spend it on a stronger, longer Demon Witch form.
- **A final sanctum every wave:** when the survival timer expires, a marked ritual arena appears elsewhere in the world. Reach it, summon its guardian, and defeat that boss to open the merchant.
- **Minimap:** a player-centered radar shows nearby enemies, bosses, the final sanctum, and a camera-footprint outline. It expands its range to keep a distant sanctum visible.

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
| Mouse wheel / `+` / `−` | Adjust camera zoom |
| `0` | Reset zoom |
| `I` | Open the grimoire |
| `Esc` / `P` | Pause or resume |
| `1` / `2` / `3` | Choose a level-up gift |
| Touch controls | Move, dash, charge specials, and activate Demon Witch |

Sound starts after an interaction. Volume, tonal ambience, low-quality rendering, and reduced motion are available in the pause menu. Tonal ambience defaults to off.

## The wave loop

1. Survive the timed swarm and collect XP, gold, healing, and rare Demon Jewels.
2. Choose one of three gifts when leveling up; the world pauses while choosing.
3. At the end of the timer, follow the **crimson diamond** on the minimap or the world-direction arrow to the **Final Sanctum**. Ordinary swarm spawning stops during this final hunt; surviving enemies and hazards remain dangerous.
4. Enter the marked arena to summon its guardian. Most waves summon a Warden; every fifth wave summons an Overlord. The guardian stays within its arena and must be defeated before the merchant opens. A surviving Overlord invasion is reused as the guardian instead of creating a duplicate boss.
5. Buy upgrades, reroll or refill stock, lock offers, prepare an oath, then start the next wave.

Overlords can also invade every seventh wave that is not a fifth-wave encounter. Ending the survival timer alone never completes a wave.

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

v5.1.0 accepts existing v5.0 saves. It preserves banked essence, active form time, spells, gold, merchant state, and world snapshots. New snapshots also preserve the sanctum location, encounter phase, guardian identity/health, and stacked transformation bonuses. A legacy save already past its wave timer receives a final sanctum on resuming. Older supported v3/v4 data still uses the existing migration path.

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
