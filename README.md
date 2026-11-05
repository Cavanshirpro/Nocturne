# Nocturne — Witch of Ash

**A dark-fantasy arena survival game.** Build a spell arsenal, gather Demon Essence and survive the Hollow until its Final Sovereign falls.

**Current version: <!-- version -->v0.8.2<!-- /version --> · Initial development · JSCanvasEdition**

[Download the latest release](https://github.com/Cavanshirpro/Nocturne/releases/latest) · [Play locally](#play-locally) · [Controls & game guide](JSCanvasEdition/README.md) · [Release history](JSCanvasEdition/RELEASES.md)

![Upgraded Witch facing a Final Sovereign and its warned Triune Lances attack](JSCanvasEdition/previews/gameplay.webp)

*Existing combat renderer, retained from v0.7.x: spell satellites, enemy roles and boss warnings.*

## See the game

### Cinder Halo now reaches the fight

![Actual Cinder Halo ember lashes reaching enemies beyond wisp contact range](JSCanvasEdition/previews/cinder-halo-v082.webp)

Rank-IV Moon Wisps plus Cinder Seed evolve into Cinder Halo. Automatic ember volleys now reach 368 world units and ignite distant foes; the orbiting contact effect remains. Wave completion also clears lingering camera shake. [v0.8.2 behavior and checks](JSCanvasEdition/docs/PATCH_v082.md)

### Ascension power and an explorable world cycle

![The actual v0.8.1 Ascension ladder with four eras and conservative legacy recognition](JSCanvasEdition/previews/ascension-v081.webp)

![Actual rank detail with exact damage, defence and cumulative abilities](JSCanvasEdition/previews/rank-power-v081.webp)

All 16 tiers have distinct cumulative power. Earn promotions through deep training, mastery, evolutions and 15 playable ordeals. Proven legacy progress remains recognized through +C.

![Actual v0.8.1 preparation scene with a next-wave timer and merchant, grimoire and Ascension controls](JSCanvasEdition/previews/preparation-v081.webp)

Defeat the Final Sovereign, explore during preparation, revisit the merchant, and start the next wave early or let simulation time count down. [Foundation guides and technical report](JSCanvasEdition/docs/IMPLEMENTATION_REPORT.md)

### Witch and Demon progression

![Witch progression from initiate to full arsenal and Demon form](JSCanvasEdition/previews/player-regalia.gif)

*Actual game artwork: learned spells and progression appear on the Witch and her Demon form.* [Still image](JSCanvasEdition/previews/player-regalia.webp)

### Enemies and the Final Sovereign

![Regular enemy, elite veteran, summoned commander and crowned Final Sovereign](JSCanvasEdition/previews/hostile-roles-v526.webp)

Nine enemy families have distinct silhouettes and eight-direction animation. Elite traits, summoned commanders and the crowned Final Sovereign have visible identities.

### Spells, fields and warnings

![Animated spell mechanisms, allied fields and hostile attack warnings](JSCanvasEdition/previews/mechanisms-v525.gif)

Twelve automatic spells grow with your build. Visible emitters show where attacks begin; field motifs and warnings help you read the fight. [Still image](JSCanvasEdition/previews/mechanisms-v525.webp)

More animated models, boss rituals and before/after comparisons are included in **[the visual gallery](JSCanvasEdition/visual-gallery.html)**. Open that file locally after downloading; GitHub shows its source. The gallery has an animation pause control and respects reduced motion. Historical comparison images retain their original development labels; see the [version mapping](VERSIONING.md#historical-numbering-migration).

## Play locally

1. [Download the latest JSCanvasEdition ZIP](https://github.com/Cavanshirpro/Nocturne/releases/latest) and extract it, or clone this repository.
2. Open **`JSCanvasEdition/index.html`** in a modern browser. Keep the complete edition, including `assets/` and `src/`, together.
3. Move with **WASD / arrow keys**, dash with **Space / Shift**, and build your spell arsenal through level-up choices. See the [full controls](JSCanvasEdition/README.md#controls).

No account, game engine, npm install or build step is required. Lossless WebP artwork is included locally, sound is synthesized locally, and the game works offline.

If the browser restricts local files, run this optional server from the repository root:

```bash
python -m http.server 8000 --directory JSCanvasEdition
```

Then visit **http://localhost:8000/**. Saves belong to the browser profile and address; export a backup from **SAVES** before moving or updating the game.

## What is playable

- **Three covens, twelve automatic spells** and directed charged rituals, with mastery and evolutions.
- **Wave survival and Final Sovereigns:** survive the swarm, find the sanctum, defeat its guardian, then visit the merchant.
- **Demon Witch and Aegis:** spend banked essence on a temporary transformation; time a defensive barrier during dangerous attacks.
- **Progression and local saves:** repeatable upgrades, talents, relics, 24 save slots and JSON backup import/export.
- **Ascension foundations:** a 16-stage ladder with real combat bonuses, 15 playable promotion ordeals and non-destructive historical save recognition.
- **Explorable preparation:** a paused-by-menus countdown, repeatable merchant visits and one guarded next-wave transition.
- **Desktop and touch controls**, adjustable zoom, low-quality rendering and reduced motion.

Nocturne is organized into editions: independent implementations of the same game concept. Features and release cycles may differ.

| Edition | Technology | Status |
| --- | --- | --- |
| [JSCanvasEdition](JSCanvasEdition/README.md) | HTML5 Canvas, JavaScript, CSS | Playable · <!-- version -->v0.8.2<!-- /version --> |
| PyGameEdition | Python, Pygame | Planned; no implementation yet |

## Development and releases

The project uses **MAJOR.MINOR.PATCH** and stays at **0.x.y** during initial development. [VERSION](VERSION) is the source of truth. The [versioning policy](VERSIONING.md) explains version increments, the historical mapping and publishing. [Release notes](JSCanvasEdition/RELEASES.md) cover individual changes and save compatibility.

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and checks. For bugs or proposals, [open an issue](https://github.com/Cavanshirpro/Nocturne/issues) with the edition, version, browser, reproduction steps and relevant screenshots or GIFs.

## License and credits

Nocturne is licensed under the **GNU Affero General Public License, version 3 or (at your option) any later version** (`AGPL-3.0-or-later`). The complete, unmodified license is in [LICENSE](LICENSE); the project copyright, license grant and warranty disclaimer are in [NOTICE](NOTICE). The browser edition includes its own [LICENSE](JSCanvasEdition/LICENSE) and [NOTICE](JSCanvasEdition/NOTICE).

If you distribute modifications, preserve the required notices, identify your changes and provide the corresponding source under the license. A modified version supporting remote network interaction must prominently offer its users the corresponding source of that version at no charge under section 13; update its source link to include your changes.

- **Creator and developer:** Cavanshir Qurbanzade (YoungLion)
- **Prompter (JSCanvasEdition):** [@oustxr](https://github.com/oustxr)

Copyright (C) 2026 Javanshir Gurbanzade. Distributed without warranty; see [NOTICE](NOTICE).
