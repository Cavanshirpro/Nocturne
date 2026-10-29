# v0.7.5 — Visual Evolution & Polish

The baseline is the complete 0.7.4 **Read the Battle** package. This release changes the active Canvas renderers and their offline artwork. It does not change the game rules or save schema.

## Art direction

Charcoal stone, aged gold, muted violet and restrained elemental materials describe a witch's mystical machinery. The priority is hostile boundaries and escape routes, then the player's silhouette, important enemies, projectiles, allied fields and environment. Ambient marks render underneath combat. Exact hostile rims render again after combat particles, without filling a safe opening.

## Character and animation

`witch_models.py` retains the 96×128 logical cell, 24 poses and eight facings of both forms. The coat has deeper front/back sections, shoulder caps have layered surfaces, and the mantle has folded sides with physical thickness. Studio light remains in camera space. Boots alternate with lower vertical bounce; deliberate casting has asymmetric preparation, release and recovery; dash and hurt have clearer weight. Automatic shooting still never calls the body casting clip.

Demon wings have separate membrane panels, rim thickness, hinge stones and ribs. They turn with the actor and render on the appropriate side of the body. A six-stroke transition accent lasts at most .36 seconds; hurt uses a steady visible silhouette instead of repeatedly half-hiding the witch. Enemy impact brightening is restrained. Boss shoulders, gauntlets, crowns and wing folds have additional baked raised faces.

## Isolated cloth

The offline mesh renderer writes **visible material IDs**, including depth occlusion, into three run-length masks per character frame: mantle, skirt and weighted ornaments. `systems/motion.js` lazily splits a used frame into these pieces and the rigid artwork. Limbs, staff, face, armor and boots are never shifted with fabric.

A WeakMap keeps cosmetic directional momentum and delayed settling; it is outside actor/save state. Different cloth pieces respond at different strengths. Their anchors stay still while lower regions trail by at most 3.6 rendered units before actor scaling. This is a small sprite-presentation technique, not a physical solver. The cache holds at most 24 frame entries / 96 96×128 surfaces (4.5 MiB of raw pixels). Low quality, reduced motion, frozen characters, unsupported offscreen surfaces and ordinary enemies use an intact baked sprite. Enemy cloth remains articulated in its offline frames.

## Satellites and passive rings

All twelve schools now have different primary hull silhouettes: faceted crystal, comet body, twin conductors, crystalline petals, ember rock, narrow rail, organic thorn leaves, framed aperture, twin-barrel rotor, broad cannon breech, three prongs and floating ice shards. Existing individual internal clocks remain, with restrained tails and body/slide mechanisms. Five grades introduce collars, armor, paired fins and an open crown; evolution adds gold structures and mastery adds three bounded insets.

The **0.7.4 `origin()` formula is unchanged**. Visible muzzle marks sit on that origin. Recoil slides only the rear hull, leaving the barrel/energy anchor fixed. Learning another school, switching quality or reduced motion never changes these coordinates. Rear modules are dimmer and player hulls use a small depth scale, keeping a complete twelve-school build readable. Boss modules use the same shapes with threatening spikes. Moon Wisps retain their original real contact orbits.

Normal passive rings are calmer. Defence segments brighten on protection/hits, mobility trails respond to movement and dash, and counter-rotating focus arcs strengthen during deliberate charging. These are small attached ellipses, distinct from world-space fields.

## Fields

Thorn grows leaf-bearing branches; Veil has mist strokes and feathers; Rift draws inward-moving marks and a dark aperture; Meteor shows a descending body and crater spokes. Shapes, movement and ownership complement colour.

Hostile art distinguishes warning, imminent activation, active danger and the last active interval. These are **visual states only**. Circle radii, annulus inner/outer radii, angular gaps, damage activation and expiry retain the exact old rules. Hostile silhouettes are never dropped because of an allied detail limit.

The old every-Nth sampling could miss a nearby field at an unlucky array index. The new selection reads all fields and retains at most 32 nearest candidates per school with bounded max-heaps. Grouping and drawing operate on at most 128 candidates across the four field types. One nearby representative per school gets priority. Friendly draw limits remain 12 normally, 8 with a boss, 6 low, 4 low boss. Counts become STACKED when exact multiplicity is unavailable. The selection has O(n log 32) reads for n actual fields; the game deliberately leaves the real field pool uncapped. Large friendly group outlines remain decorative approximations, not a collision union.

## Bosses and biomes

Warden materials are raised steel/stone; Overlord materials are layered rose/void armor. Existing eleven directional casting clips remain, reinforced by hand accumulation, release accents, ward slats and low-health fractures. Their telegraphs retain their original geometry/timing. The new gallery shows both boss families in all eleven poses.

The Hollow has subdued mossy masonry, graves, ruins and trees. Ember Mire has ash-coloured cracks, charred trunks, walls and braziers. Moonlit Ruins has cool moonstone surfaces, engraved obelisks and ancient architecture. Ground textures are generated locally and embedded. Hashed landmarks remain stable across world rebasing. At most 48 props render per frame (24 low), with 96 cached records. Props fade when they would hide the player or a nearby enemy; arenas exclude obstructive landmarks. Ambient motion has at most ten marks and is absent in low quality/reduced motion.

## Projectiles and interface

Arcane facets, tracer needles, heavy cores, three-prong fragments, refractive frost and barbed hostile embers use separate artwork. Impact paths, travel trails and delivery bodies reuse the existing pools; no additional combat particles are allocated. Their trajectories and collision radii are unchanged. Critical accents remain compact.

The HUD has clearer vitality, dash, ward and essence bars, more readable spell ranks, calmer locked slots and charcoal/gold menu surfaces. Keyboard focus extends to selects and links; coarse-pointer controls have 44px targets. The Grimoire adds a sticky return toolbar and live **actual-renderer** inspection of normal / evolved / mastered modules and all seven field types. The numerical owned ranks/mastery remain separate from reference previews. Preview time and actors are independent of the paused real world.

## Assets and verification

Transparent trimming/shelf packing of enemy and ritual atlases is lossless. Logical 96×128 offsets preserve the original placement and all antialiased nonzero-alpha pixels. No resolution increase or lossy palette reduction is needed. Packed textures are 2048px wide and below 4096px high. Nine unused legacy walk strips remain available in the asset object for authoring compatibility but are not decoded during play. The active image count is 55 from 64 embedded PNGs.

See `PERFORMANCE.md` for measured costs and memory estimates, `VALIDATION.md` for checks, and `visual-gallery.html` for generated comparisons. Optional authoring dependencies are Pillow, @napi-rs/canvas and Playwright; none are required to play.

Remaining limits: sprites are still stylized small baked artwork; mask anchors are an approximation rather than cloth physics; one friendly representative does not show every stacked collision footprint; weak cosmetic state and an in-flight muzzle flash can reset on load. Physical phones, Firefox/LibreWolf, speaker output and long-session thermal behaviour were not measured.

Creator/developer: Cavanshir Qurbanzade (YoungLion). JSCanvasEdition prompter: [@oustxr](https://github.com/oustxr). AGPL-3.0 notices are retained.
