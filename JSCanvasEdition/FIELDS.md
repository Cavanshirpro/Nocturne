# Fields — v0.7.5 Visual Evolution & Polish

## What the green areas mean

**Thorn is an allied damage-and-slow field. It does not heal the player.** Stacking during rapid automatic casting can create many of these areas in a boss fight. Veil is also allied but only slows enemies; Rift pulls and damages them. Hostile attacks live in a separate hazard pool.

| Appearance | Owner and meaning |
| --- | --- |
| Green vines + dotted edge + ALLY THORN | Your damage/slow field; not healing |
| Cyan feathers + broken edge + ALLY VEIL | Your dash talent's slowing field |
| Lavender inward spiral + ALLY RIFT | Your pull/damage field |
| Sand-gold crater / falling mark + ALLY METEOR | Your delayed impact |
| Red solid boundary + diagonal hatch + triangle | Hostile impact; timer until activation |
| Pink hatch + padlock | Hostile silence seal |
| Orange hatched annulus, empty opening, mint gate lines | Hostile shockwave; the opening and inner hole remain safe |
| Large segmented stone/gold perimeter | Boss arena boundary, not a pending damage attack |

Colour is only one cue. Ownership words, geometry, patterns, symbols and countdowns provide additional distinctions. A compact screen-space status describes a hostile region actually containing the player. Field badges compensate for camera zoom; only a few labels are shown at once. The grimoire includes the field guide.

## Geometry and clutter rules

Enemy impact/seal boundaries use their actual world-space circle radius. Shockwaves use the actual inner radius, outer radius, angle and gap; hatching is clipped to the dangerous annulus, never painted across its opening. Collision still includes the player's radius, so leave some room around the boundary. Beam warnings use the actual emitter start.

Allied selection reads every field and retains at most 32 nearest candidates per school. A bounded max-heap prevents unlucky stride indices from skipping close effects. One nearby representative of each school is preferred, before additional groups. Selected fields are decorative-grouped in 24-unit position / 8-unit radius bins, using a recent real field as representative. This is a visual approximation, not a collision union. Exact multiplicity is omitted when source counts exceed the candidate limit; STACKED is shown instead. At most 12 allied representatives render normally, 8 in boss fights, 6 on low quality or 4 for low-quality boss fights. Only three allied labels and two hostile labels render at once.

All actual fields remain in the simulation and retain their own positions, radii, damage, slowing/pulling and expiry times. No hostile warning is removed by the allied budget. The existing 24-item hostile hazard pool remains the hard warning bound.

## Individual orbital motion

| School | Mechanism / behaviour |
| --- | --- |
| Bolt | Breathing, slowly turning crystal |
| Moon Wisps | Tangential comet tail at the real contact orbit |
| Lightning | Bounded alternating coil arcs |
| Nova | Four opening petal arcs |
| Meteor | Three rising ember strokes |
| Lance | Rail-tip illumination and linear recoil |
| Thorn | Two swaying vine leaves |
| Rift | Counter-rotating iris / dark aperture |
| Rapid | Rear rotor and alternating twin barrels |
| Cannon | Heavy piston recoil and ribbed barrel |
| Burst | Three staggered spread fingers |
| Glacier | Three slow shard glints |
| Ordinary hostile shooter | Scanning eye |

Boss variants share the corresponding underlying mechanism. Distinct hover/radial amplitudes are included in the authoritative emitter calculation, so the visible hull and real projectile stay together. Learning another school still does not rearrange existing slots. Quality settings do not alter shot origins. In reduced motion, decorative mechanism phase, recoil and ring rotation stop; functional orbital/hover positions still follow world time, just as real projectiles continue moving.

Passive defence rings use segmented shield arcs and hit/heal feedback. Movement rings have direction-aware trailing arcs and dash recovery accents. Focus rings have counter-rotating arcs and charge emphasis. They remain small unit-attached ellipses, visually separate from large world-space fields.

## Performance and authoring

No live 3D model, particle simulation for the mechanisms or new network assets are required. Cached hulls retain the 160-surface bound. Mechanism stroke counts are fixed; ordinary enemies in low-quality/crowded scenes use simplified feedback. Friendly processing reads all n actual fields in O(n log 32), retains at most 128 candidates across the four schools and sorts only that bounded set; damage simulation is untouched. Hostile hatch lines, symbols and labels have fixed small budgets.

Hostile warning, imminent, active and expiring appearances retain the existing exact activation/expiry times. Exact hostile rims are redrawn over combat effects without filling the safe opening.

`node scripts/render_fields.cjs` creates the 72-frame ally/hazard/mechanism gallery using the actual renderers (optional @napi-rs/canvas + Pillow). The existing player/direction/orbital galleries can be rebuilt with their included scripts. All generated files required for play are already included.
