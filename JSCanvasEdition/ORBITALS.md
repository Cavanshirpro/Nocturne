# Orbitals — v0.7.5

This edition remains Canvas 2D with baked directional sprites. Distinct satellite hulls, circle ellipses, layered wings and isolated baked cloth masks create depth; there is no live 3D model, WebGL requirement or cloth-physics solver.

## Mapping

| State | Visual | Actual origin / effect |
| --- | --- | --- |
| Armour, vitality, regeneration | Green defence ring, separate inset marks | Existing defence/healing rules |
| Speed, dash recovery, pickup | Blue movement ring | Existing movement rules; fabric strength follows effective speed |
| Damage, haste, projectile count, criticals, range, pierce | Purple focus ring with distinct category marks | Existing offensive modifiers |
| Talents, relics and oath | Small bounded rim insets | Existing owned progression |
| Bolt | Crystal satellite | Projectile starts at the satellite |
| Rapid Fire | Twin-barrel satellite | All volley shots start at its muzzle |
| Heavy Cannon | Broad forged barrel | All cannon shots start at its muzzle |
| Burst / Glacial Seed | Spread / ice emitter | Actual volley origin |
| Chain Lightning / Lance | Electrical / blade emitter | Chain starts or beam starts at the satellite |
| Meteor / Thorn / Rift / Nova | Elemental emitter | Visible delivery to the existing target/field centre |
| Moon Wisps | Contact-damage orbital drones | Existing real wisp positions and hit cooldowns; no duplicate cosmetic emitter |
| Cultist / Wraith | Shared hostile emitter | Actual hostile projectile origin |
| Guardian salvo / soulring / lances | Matching boss modules | Actual shot or beam origin |
| Twin Gates | Shared boss module plus remote portals | Projectiles retain the remotely warned portal positions |
| Guardian Aegis | Defence ring and ward facets | Defensive state, not a shooting module |
| Melee enemies | Passive traits if owned; ordinary melee pose | No invented ranged ability |

Player directed rituals, manual Aegis and transformation retain deliberate body gestures. Automatic fire never restarts the player's cast clip. Enemy ranged repetition uses emitter feedback; special windups and physical melee still animate the body. These visuals do not grant new abilities to enemies.

## Level language

Ranks 1, 2, 4, 8 and 16 begin the five hull grades. Higher ranks remain valid but do not add unbounded geometry. Higher grades brighten the school hue and add collars, armor, paired fins and a partial crown. Each school has its own primary silhouette, even at grade one. Evolved player modules gain gold fins; mastery adds at most three top insets. Passive ring category marks and thickness reflect the real, bounded appearance grades. Exact unbounded ranks are displayed in the grimoire.

## Timing and saves

`systems/orbitals.js` owns the shared positions. Stable school slots prevent learning a school from rearranging other modules. Orbit phase is derived from saved world time, so a resumed game retains the same muzzle positions. Low/high quality and reduced motion do not change projectile origins. In reduced motion the functional orbit still moves with world time; cloth flutter and cosmetic recoil stop. Gameplay projectiles keep moving as usual.

The 0.7.4 authoritative origin formula is unchanged in 0.7.5. The visible muzzle is fixed on that anchor; only the rear hull slides during recoil. Rear hulls are dimmer and depth-scaled for readability.

Muzzle timestamps are stored in a WeakMap and are intentionally not saved. A loaded game may lose the last fraction of a cosmetic flash, but shot positions, damage, world time and cooldowns remain saved. Drawing does not consume gameplay RNG or mutate actor state.

Projectile starts and Lance corridors move with the emitters by design; this is not a claim of pixel-identical collision behaviour with 0.7.2. Target selection, damage, volley counts, cooldowns and travel distances retain their original formulas.

Walk/dash frame blending is limited to the final 30% of a frame interval so the main pose remains crisp while fabric motion stays continuous. Deliberate gestures retain their smoother transitions.

## Budgets

- At most 12 player schools and 10 shooting/active guardian modules; ordinary ranged enemies have one.
- Existing projectile, hostile-shot and effect pools remain bounded. Extreme fire rates use the existing weighted batching.
- Satellite hull cache: at most 160 small 64×64 surfaces; at most 2.5 MiB of raw pixel storage plus browser overhead. Vector fallback is available for authoring/test runtimes without OffscreenCanvas.
- Fabric: only player mantle, skirt and ornament masks deform, with at most 24 cached frames / 96 surfaces (4.5 MiB raw pixels). Rigid anatomy/equipment remain intact. Low quality, reduced motion, frozen characters and ordinary enemies use their intact baked sprites. Momentum lives only in a cosmetic WeakMap. See EVOLUTION.md.
- Passive rings: at most three groups; low-quality/dense ordinary enemies use one. Cosmetic growth is bounded even when gameplay stats/ranks keep increasing.

## Rebuild / verify

`node tests.mjs` runs deterministic game/integration checks. `python -m unittest test_assets.py` validates real atlas pixels and deterministic generation. `browser-tests.html` runs actual DOM/Canvas/audio checks when served locally.

`python generate_assets.py` requires Pillow. The optional `node scripts/render_visuals.cjs` and `node scripts/render_orbitals.cjs` require @napi-rs/canvas and Pillow. Generated assets and previews are already included for play.
