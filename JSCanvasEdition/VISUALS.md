# Orbit & Flow — v5.2.3 art guide

The current visual system is documented in [ORBITALS.md](ORBITALS.md). Old costume badge/fitted-fixture sections below are historical and are superseded by passive circles and active emitters. Character meshes are baked only; live rendering uses Canvas sprites, ellipses, cached hulls and a bounded atlas-band effect.

The new `previews/orbital-system.gif` shows passive circles, automatic player fire and a hostile satellite. `previews/orbital-grades.png` compares all five shape/colour grades. `previews/player-regalia.gif` and `previews/directions-regalia.gif` now use walking rather than a permanently repeating cast.

---

# Sculpted Realms — v5.2.2 art guide

The current player artwork comes from `witch_models.py`: a small offline mesh renderer with depth-sorted surfaces, a fixed orthographic camera and camera-space shading. Ellipsoids, oriented limb tubes and thick ring profiles give the body and clothing real depth before baking. The game still uses Canvas 2D and embedded PNG atlases; it does not require WebGL.

`systems/volumetric_regalia.js` now draws fitted, filled spell fixtures and compact gems. It no longer covers the base artwork with a second robe or hat outline. The chest, staff/bracer and boots carry training, while twelve independent school fixtures retain rank, evolution and mastery marks. The existing descriptor and save data remain authoritative.

`systems/encounters.js` draws the compass minimap. Its local range does not expand when the objective moves farther away; clamped markers retain an interior margin. Ordinary enemies share 4-pixel cells and at most 180 ordinary markers are drawn. Bosses and elite enemies draw afterward. The map reads HUD bounds for docking and never writes gameplay state.

Rebuild embedded assets with `python generate_assets.py` (Pillow). Rebuild the 48-frame player/direction/enemy/boss galleries and static minimap example with `node scripts/render_visuals.cjs` (optional `@napi-rs/canvas`). No rebuild is required for play.

The following sections document the earlier visual passes and the underlying gameplay-to-equipment mapping; their historical flat-panel descriptions are superseded by the implementation above.

---

# Living Regalia — v5.2.x art guide

## v5.2.1: Sculpted Silhouettes

The v5.2.1 model pass corrects profile-specific collapse of planar clothing and hat elements. The offline Pillow model now produces deeper robe cross sections, a pitched elliptical hat brim, volumetric skull shading, profile facial details and staggered boot heels. A Canvas pass adds projection-consistent skirt facets and rim occlusion.

Thirteen permanent stat channels are represented by three grouped equipment systems, with constrained sub-marks instead of dozens of overlapping symbols. Learned spells keep all twelve dedicated attachment slots and ranks; mastery, evolutions, relics, talents, rituals, oath, essence and Demon upgrades remain readable. All drawing reads existing gameplay fields without storing cosmetic progression.

**Build instruction:** run `python generate_assets.py` after applying the patch so embedded sprites match the new model source. If you have the optional `@napi-rs/canvas` dependency, regenerate the separate screenshots/gallery with `node scripts/render_visuals.cjs`. The original preview gallery is not automatically replaced by asset generation alone. Low quality and reduced motion skip sprite blending.



This release changes presentation: models, costume composition, animation, projectile art and a read-only grimoire portrait. It retains the v5.1.3 simulation, AI, difficulty, hitboxes, damage, timers, summons and save schema.

Open **[visual-gallery.html](visual-gallery.html)** for animated comparisons made with the actual game renderer. Motion can be paused, and the gallery respects reduced-motion preferences. Images are local and work offline. Enemy comparison models use a normalized drawing scale; actual game sizes stay unchanged.

## Player costume

The witch is rebuilt from a projected, articulated model with a fitted brocade robe, layered back mantle, corset, jointed arms, finger poses, individual boots, moving hair locks, face planes, an asymmetric hat and a forked staff. Ash, Moon and Storm use different mantle and trim palettes.

`systems/appearance.js` reads the existing character state each draw. Every learned spell gets a stable physical attachment slot. Back equipment rotates with the character and can be partly occluded from the front, just as worn equipment would be. There is no active-spell limit or cosmetic save state.

| Learned spell | Model equipment |
| --- | --- |
| Arcane Bolt | Forked staff crystal and focusing prongs |
| Moon Wisps | Crescent hat brooch |
| Chain Lightning | Back-mounted branching conductors |
| Frost Nova | Six-point rime ornament at the robe hem |
| Ember Meteor | Ember lantern on the left shoulder |
| Soul Lance | Faceted forearm blade |
| Thorn Sigil | Bramble bracer |
| Abyss Rift | Framed void mirror on the outer back mantle |
| Rapid Fire | Three-barrel right-wrist focus |
| Heavy Cannon | Armored shoulder housing and round core |
| Burst Heavy | Three-pronged belt emitter |
| Glacial Seed | Clustered ice crystals behind the shoulder |

Rank increases refine equipment; mastery adds etched points. Evolution adds a luminous endstone and extra framing. All twelve pieces can be worn at once. Every owned relic also contributes a colored belt gem, including relics whose spell is not yet evolved.

| Permanent characteristic | Visual detail |
| --- | --- |
| Damage | Ember notches along the staff shaft |
| Cast speed | Wrist-cuff bands |
| Projectile count | Grouped focus gems |
| Critical chance / multiplier | Hat optic and small crown studs |
| Projectile speed / range | Staff focusing rings |
| Armor | Layered shoulder plates |
| Maximum vitality | Green breastplate stones |
| Regeneration | Green restorative pendant |
| Movement speed | Boot stitching |
| Dash recovery | Winged boot fittings |
| Pickup radius | Belt-ring charm |
| Pierce | Staff barbs |

Scavenger, Kindling, Veil, Frostbite, Blood Ledger and Focus each add their own charm, flame, boot leaves, collar crystals, vial or optic. Unlocked directed rituals appear as three shoulder/collar stones; the selected ritual has a frame. The active oath adds its colored central pendant. Banked essence appears as a small vial-stone stack.

The level mantle/diadem gains ornaments at **8, 20, 40, 80 and 160**. The exact character level is also drawn below the model. Repeated stat/rank details use bounded logarithmic visual grades (maximum five), keeping endless numbers from producing endless geometry. This is a drawing limit; it does not cap any gameplay stat or rank. Exact values remain in the HUD/grimoire.

## Demon Ascendant

The Demon is a separate eight-direction model atlas, with **192 frames** across idle, walking, casting, hurt and dash clips. It has its own diadem, cheek armor, swept horns, pale locks, rose-metal fittings and clothing palette. It is no longer a filter applied to the normal witch.

The runtime rig adds articulated membrane wings, wing ribs/joints, shoulder armor, antlers and tiered crest gems. Stacked Demon power grows this regalia through five visual grades. The learned spell kit, talents and relics remain present during the transformation. Its bonuses, duration and activation rules are unchanged.

## Enemy families and status

| Family | New modeling detail |
| --- | --- |
| Slime | Suspended skull core, cavities, reeds and independently moving lobes/bubbles |
| Skeleton | Engraved chest plate, ragged back cloth, articulated bones and weapon |
| Gargoyle | Faceted wing membranes, ribs, horns and luminous body fractures |
| Hound | Layered dorsal mane, collar, claws, jaw articulation and segmented tail motion |
| Cultist | Sculpted mask, brocade panels, seals and a jointed staff arm |
| Wraith | Moon mask, streaming spectral ribbons and detached-looking hands |
| Reaper | Rib armor, layered vestments and a sweeping silver scythe |
| Warden | Plated gauntlets, shoulder armor, carved visor and engraved costume |
| Overlord | Temple chains, ribbed breastplate, segmented mantle, wing facets and crown |

Enemy level grades add crests, armor and cloth. Slimes/hounds receive low-body growths rather than humanoid capes. Elites gain gold-edged horns. **Armored** adds riveted plates; **Swift** adds fins; **Mending** adds rootwork and a green core; **Volatile** exposes an orange fractured core. Summoned Overlord commanders have a blue pennant. Final Sovereigns have wider regalia, more crown teeth and shoulder stones based on combat tier; enraged models show luminous breastplate fractures.

## Sovereign animation

There are **eleven distinct skeletal casting clips**, with six frames in eight directions for each of the two boss families: **1,056 boss-power frames**. The model's body, hands, staff and power colors differ per attack. Runtime ornaments reinforce the intent without changing warning geometry or timing.

| Existing attack | Animation identity |
| --- | --- |
| Hellfire Salvo | Forward arm focus and a three-pronged firing assembly |
| Ash Meteors | Both hands raised, with suspended ember crystals |
| Soul Reaping | Twisting arm sweep and a curved blade trail |
| Dread Aegis | Crossed forearms and faceted guard panels |
| Soul Constellation | Open arms and an eight-stone orbit |
| Rift Step | Asymmetric recoil, compressed stance and phase traces |
| Triune Lances | Extended arms and three aligned focusing prongs |
| Hunter Starfall | One raised hand and descending star geometry |
| Twin Gates | Opposed hands and paired portal rings |
| Crown Shockwaves | A downward hand press and stacked rings |
| Void Seal | A forehead-hand pose and a conjured eye seal |

Attack poses take priority over continuous hurt frames. Very fast player auto-casting uses a display-only cycle so repeated firing does not pin the rendered pose to its first frame. The simulation animator, cooldowns and attacks remain untouched. Faceted Aegis/ward shells reflect remaining charge and never refill it. Projectile art now differentiates needles, shards, cannon cores, frost crystals and hostile embers while preserving collision radii and trajectories.

## Rendering and verification

- No random numbers, saved appearance fields or new simulation clocks are needed. The model reads existing state. Pause and reduced motion freeze added geometry; low quality keeps the same equipment identities.
- Boss power atlases use two rows per facing at **3168 × 2048**, keeping each image below 4096 pixels on both axes. Ordinary enemy atlases retain their footprint. Extra equipment is bounded procedural geometry rather than a separate texture for each build combination.
- `node tests.mjs` checks gameplay regressions, read-only drawing, all equipment together, atlas selection, finite geometry, balanced Canvas state, reduced motion and save compatibility.
- `python -m unittest test_assets.py` checks actual image pixels, cell boundaries, independent directional poses, Demon atlases and deterministic regeneration.
- `scripts/render_visuals.cjs` optionally regenerates the gallery from the real renderer using `@napi-rs/canvas` plus Python/Pillow. These are art-tool dependencies only; play and gallery viewing need neither.
- Native Canvas checks are not a substitute for browser DOM/CSS, physical input, actual device performance or audio checks. The included manual browser fixtures cover the new portrait and art; they were not executed for this package.

Creator/developer: Cavanshir Qurbanzade (YoungLion). JSCanvasEdition prompter: [@oustxr](https://github.com/oustxr). Existing [LICENSE](LICENSE) and notices remain applicable.
