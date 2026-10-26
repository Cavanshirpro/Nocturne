# Enemy & Sovereign — v5.2.6

This release starts from the completed v5.2.5 package. Player art, isolated cloth, field meanings, environment, HUD and progression rules are retained. The active enemy path is `Enemy.draw → drawEnemy / EnemyMotion → packed atlases`, with shared `Appearance / Orbitals` and the new `HostileVisuals` overlays. The older generic Presentation boss costume is no longer drawn over these bodies.

## Anatomy and movement

| Family | Baked structure and movement | Runtime feedback |
| --- | --- | --- |
| Slime | Translucent closed shell, suspended skull, lobes and shifting bubbles | Soft squash, rounded contact shadow, ice and heat accents |
| Skeleton | Rib cage, thick skull, jointed bones and independent scythe | Rigid directional recoil; reinforced trait plates |
| Gargoyle | Thick hinged wing ribs, claws, horns and fractured stone torso | Small heavy impact response and wing recovery |
| Hound | Four articulated legs, diagonal contact cycle, spine plates, jaw and tail | Charge crouch/extension; facing follows its real locked charge vector |
| Cultist | Layered thick robe, sculpted mask, staff and separate arms | Cloth motion distinct from rigid anatomy; automatic emitter fire leaves the body walking |
| Wraith | Translucent mask/body, suspended hands and independent spectral ribbons | Controlled hover, spectral hit lines, fading compressed defeat and a cold split emitter hull |
| Reaper | Deep hood, layered garments and a thick crescent scythe | Pronounced sweep, anticipation and garment follow-through |
| Warden | Broad enclosed plate armor, visor, articulated greaves, hammer and guard plate | Restrained mass, defensive posture and armor impact accents |
| Overlord | Ribbed regal armor, circlet, mantle, scepter and thick wing panels | Levitation, broader ritual gestures, awakened low-health wings and fractures |

All nine families have eight directions and the existing idle/walk/attack/hurt/death clips. `enemy_geometry.py` projects closed ring solids, ellipsoids, tubes and plates into the existing 96×128 cells. Faces are depth sorted and lit in camera space, then supersampled offline. Transparent face compositing preserves the internal core. No mesh or Python runs during play. The result is stylized faceted 2.5D artwork, not a real-time 3D model.

## Traits, levels and roles

Visual milestones are levels **8, 20, 40, 80 and 160**. Larger shoulder/side surfaces, fins and crest details stop at five grades; gameplay levels and statistics retain their existing progression. Armored adds plates and guarded impact lines; Swift adds swept fins; Mending adds branching leaves/crystals and restorative pulses only during the existing healing condition; Volatile exposes a warm core and fractures. Elite horns/material and veteran scars add separate identity. These structures accompany the existing passive trait rings.

Actual `summonedBy` ownership distinguishes soldiers and Overlord commanders. Commanders carry a short blue pennant; the principal guardian Overlord has the full crown and extra mantle. Summoning gestures and at most six tethers derive from its own children's existing spawn delays. No spawn timer, hierarchy, limit or ability is added.

## Existing powers, visible stages

Every gesture reads `guardian` or `tactics` windup/release/dodge/ward state. Preparation, imminent release, activation and recovery use that same clock. A sustained ward holds a stable defensive pose. The body's low-health changes use the actual existing rage thresholds: 40% for the final guardian and 45% for ordinary bosses.

| Existing power | Distinct visual cue |
| --- | --- |
| Hellfire Salvo | Aligned active emitter, hand charge and recoil |
| Ash Meteors | Raised hands and gathered ember facets |
| Soul Reaping | Scythe/body sweep and a compact weapon arc |
| Dread Aegis | Crossed defensive arms and proportional ward arcs |
| Soul Constellation | Separated raised orbiting nodes |
| Rift Step | Compressed posture, split phase marks and recovery |
| Triune Lances | Precise aiming stance and the real lance-emitter accent |
| Hunter Starfall | Focused lifted gesture and star facet |
| Twin Gates | Separated portal palms; shots retain the actual remote gate origins |
| Crown Shockwaves | Downward gesture; the existing ground rings retain their exact safe gaps |
| Void Seal | Eye-shaped preparation motif; the existing silence field is authoritative |

Boss modules stay small and subdued while dormant and become full-sized during their action/release or actual muzzle feedback. Their internal mechanisms retain school-specific motion. The `origin`, `emit` and `flash` functions match v5.2.5 exactly. Ordinary Cultist/Wraith firing does not repeatedly trigger a full-body cast.

The gallery shows all eleven poses on both boss rigs to compare their anatomy. This is an animation showcase; it does not grant every pose as a new ability to ordinary Wardens. Compact hand marks are decorative, while the existing danger renderer alone defines dangerous ground geometry.

## Runtime cost and limits

- Regalia cache: **96 surfaces of 112×144**, approximately **5.91 MiB** raw RGBA at capacity. Identical humanoid attachment shapes share surfaces across families; Slime, Hound and Wraith keep their own shapes. Entries are evicted; no unbounded level key growth is retained.
- In crowds over 100 enemies, distant ordinary units (over 300 world units), or ordinary units at low quality, use simple trait outlines. Near ordinary cache admissions are limited to six per world-time frame. The family sprite remains visible; bosses, elites and veterans retain detailed structures.
- Ordinary health labels/bars are prioritized nearby in crowds. Enemy counts, targeting, projectiles, AI and damage remain intact. All visible hostile warning boundaries remain drawn.
- No new particle pool or simulation RNG use. Critical-hit memory is a WeakMap, excluded from saves. Short defeat fragments use the existing corpse lifetime and do not delay rewards. Reduced motion removes procedural lean/lift/deformation and defeat fragments; freezing locks the sprite pose.

Automatic firing origins, collision shapes, movement speeds, cooldowns, warnings, rewards and save schema are preserved. Cosmetic hit memory can reset after load. Eight discrete facings and depth-sorted faces still have the limitations of baked stylized art. See [PERFORMANCE.md](PERFORMANCE.md) and [VALIDATION.md](VALIDATION.md) for measured evidence and device limits.

## Gallery and reproduction

Open [visual-gallery.html](visual-gallery.html) for actual v5.2.5/v5.2.6 families, 54 family/state cells, 54 trait cells, the command hierarchy, four attack stages and 22 boss pose sequences. The gallery has a pause control and respects reduced motion.

```bash
python3 generate_assets.py
node scripts/render_hostiles.cjs /path/to/v5.2.5/JSCanvasEdition
node scripts/render_visuals.cjs
```

Authoring requires Pillow and, for the optional native gallery, `@napi-rs/canvas`. Playing the included package requires neither. Creator: Cavanshir Qurbanzade (YoungLion); JSCanvasEdition prompter: @oustxr. Existing AGPL-3.0 licensing applies.
