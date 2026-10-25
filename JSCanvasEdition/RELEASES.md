# JSCanvasEdition release notes

These notes apply only to `JSCanvasEdition` in [Cavanshirpro/Nocturne](https://github.com/Cavanshirpro/Nocturne).

## v5.2.0 — Living Regalia

Release package prepared: **2026-10-25**. This archive does not publish a GitHub release or tag.

### A visual minor release

v5.2.0 introduces a costume-composition system, rebuilt character artwork, a dedicated Demon model, expanded boss animation and a current-costume portrait. Its scope is presentation: the v5.1.3 balance, AI, attacks, damage, spawn rules, timers, controls, collision and save schema remain intact.

### Witch, equipment and Demon Ascendant

- Rebuilt the witch's articulated model: layered brocade, split cloth, stitched boots, a fitted corset, moving hair, facial features, individual fingers, shoulder fittings, a sculpted hat and forked staff.
- Added `systems/appearance.js`, a read-only costume composer. All **twelve learned spells** have different staff/bracer/shoulder/belt/mantle attachments and coexist without a visual equipment limit. Facing determines front/back layering.
- Spell rank refines the equipment; mastery adds etching and evolutions add extra framing/endstones. Owned relics, all six talents, unlocked directed rituals, the selected ritual, active oath and banked essence have visible costume details.
- Damage, haste, projectile count, criticals, range, armor, vitality, regeneration, speed, dash recovery, pickup radius and pierce contribute bounded equipment details. Level regalia grows at 8/20/40/80/160; exact player level appears below the model. Drawing grades do not cap gameplay progression.
- **Demon Ascendant** has eight separate atlases and **192 dedicated frames**, replacing the old tinted witch. Its diadem, cheek armor, pale locks, swept horns and rose-metal clothing differ from the normal form. Runtime membrane wings, ribs, shoulder plates, antlers and crest stones grow with stacked form power. Learned equipment remains visible.
- A large, read-only live-costume portrait and learned-spell labels appear in the grimoire. Opening it never alters character position, equipment or save data.

### Creatures and Sovereign presentation

- Renewed all nine enemy families: skull-core slime, plated skeleton, fractured gargoyle wings, ridged hound mane/collar, masked cultist, streaming moon-faced wraith, armored reaper/scythe, plated Warden and filigreed Overlord.
- Level grades add regalia and armor. Elite crests, Armored plates, Swift fins, Mending rootwork and Volatile cores are physically distinct. Summoned commanders have a pennant; final Sovereigns gain wider regalia, crown teeth and shoulder stones by combat tier, plus enraged breastplate fractures.
- Expanded from four shared ritual categories to **eleven distinct casting clips**: six frames × eight directions × two boss families = **1,056 boss-power frames**. Hands, body stance, staff position and power palette differ for each existing attack.
- Added attack-bound body ornaments: firing prongs, raised ember crystals, blade trails, guard panels, constellation stones, phase traces, portal palms, descending stars, stacked rings and an eye seal. Existing world-space warnings retain their timing and geometry.
- Replaced the floating outline crown with facing-aware crown regalia. Wards/Aegis show segmented facets proportional to remaining charge.
- Projectile silhouettes now distinguish needles, shards, cannon cores, ice crystals and hostile embers; trajectories and collision radii are unchanged. High-haste player casting uses a display-only cycle so rapid attacks no longer pin the visible pose to the first frame.

### Art atlas and compatibility

- Added [visual-gallery.html](visual-gallery.html): **36 frames of actual runtime costume renderings** in three animated comparisons, with static alternatives, a pause control and reduced-motion support. No network assets are needed.
- [VISUALS.md](VISUALS.md) documents every spell/stat/talent mapping, animation identities, model sources and bounded detail grades. Source model generators and optional gallery-render tooling are included.
- The 58 embedded PNG assets include the new Demon sheets. Boss power sheets are packed into two rows per facing at **3168×2048**, keeping each texture below 4096 pixels in both dimensions. Ordinary enemy atlas dimensions remain unchanged.
- Existing saves derive their appearance from already stored state. No cosmetic schema, equipment conversion or gameplay migration is introduced.

### Validation

- **230 logic/integration test groups passed**, including all twelve equipment pieces together, all eleven pose regions, finite geometry, balanced Canvas state, reduced-motion freezing, read-only drawing, fast casting and exact save restoration. Existing gameplay regression coverage remains.
- **21 asset tests passed**, covering actual frame pixels, all directions, normal/Demon silhouettes, new power cells, border clipping, distinct animation poses and deterministic regeneration.
- Scope verification against v5.1.3 found **11 gameplay-system files byte-identical**. Entity logic outside drawing, all combat simulation methods, 69 existing simulation/accessor methods, and every guardian rule outside drawing match their previous source. The game loop changed only its version label.
- Native Canvas decoded all 58 PNGs, rendered all eleven warning scenes, a reinforced army, a narrow reduced-motion view and the real grimoire portrait; the portrait preserved player coordinates. Gallery frames also use the actual renderer.
- Real-browser DOM/CSS, physical touch/audio and device performance checks were not run. Manual browser fixtures for the portrait and new atlases are included.

### Install

Replace the complete `JSCanvasEdition` folder and use the same browser/profile and game address. Open `index.html` to play or `visual-gallery.html` to inspect the art. Only JSCanvasEdition files are included, with README, release notes, license and preserved credits.

## v5.1.3 — Sovereign Dominion

Release package prepared: **2026-10-25**. This archive does not publish a GitHub release or tag.

### Offense, range and arena counterplay

- Retains v5.1.2 whole-build vitality tuning. New combat tiers (0–4) also drive attack recovery, shot count, ward strength, reinforcement roles and the guardian's unlocked attack deck.
- Sanctum radius grows with tier and player range, up to 1,700 units. Lances account for player range, and fixed-position attacks can pressure a player beyond the arena. The guardian remains leashed.
- **Outer Seal:** more than 65 units outside the boundary activates a visible 90% guardian damage reduction. Returning removes it; boss health and progress never reset. Walking out and firing from safety no longer bypasses the encounter.
- Tiered effective-health damage floors keep high-tier attacks relevant against extreme armor, while existing per-hit ceilings prevent one-shot escalation. Rapid impacts cannot pin a boss or drag a held warning.
- High-tier salvo bursts grow to 18 shots (22 enraged); recovery becomes shorter with tier. Tier 2+ also places occasional separate, warned ground impacts. Telegraph durations remain readable.
- Added four tier-2+ powers: **Hunter Starfall** (fixed forward impact trail), **Twin Gates** (two warned crossfire portals), **Crown Shockwaves** (three staggered annuli with safe cores/gaps), and **Void Seal** (a dodgeable casting-suppression circle). Eleven powers are available to strong guardians.
- Void Seal warns for 1.3s, then suppresses new auto-casts, wisps and specials for 1.25s on impact. Movement, dash and Aegis remain usable. A seven-second grace timer from application prevents repeated lockouts. Existing projectiles and ground spells continue; no burst backlog accumulates. Separate ground circles warn before the follow-up.

### Defense, tactics and armies

- Dread Aegis now absorbs 8–18% of maximum boss vitality for 3–4.6s by tier. Tier 1+ can react to concentrated damage with a finite ward and nine-second recovery. Wards never heal or endlessly regenerate during a burst.
- Bosses and Overlords predict nearby projectile paths, signal a sidestep for 0.22s, then move for 0.24s. Cooldowns, bounded scans and arena leashes limit dodging. They remain damageable and hold their main attack warnings steady.
- Summoned soldiers now use effective encounter levels and whole-build health/damage budgets. Spawn warnings last at least 1.15s.
- Tier 3+ guardians can summon Overlord commanders. Commanders and invasion Overlords summon soldiers. Depth limits prevent soldiers from summoning and prevent commanders from recursively creating Overlords. Global caps: two summoned Overlords and 18 army members.
- Commander deaths never break the primary guardian's seal. World saves retain ownership and summon depth and restore the primary boss even when several Overlords are alive.
- Invasions are more frequent: 8–90% saved chance based on build pressure and wave, with consecutive-wave eligibility at pressure 1.7+. Lower pressure retains a three-wave gap. Strong builds become eligible from wave 2. Existing wave rolls remain unchanged on migration or retry.
- Invasion Overlords also receive whole-build vitality and bounded damage, so their relevance grows beyond a displayed level number.

### Artwork and animation

- Four new articulated boss rituals: **channel**, **sweep**, **guard** and **blink**, with six frames and eight directions each for Wardens/Overlords. Attack-specific staff glyphs distinguish the eleven attack intents.
- Fixed repeated hurt frames hiding the boss's casting animation under rapid fire. Ritual poses now take priority; normal enemies also show attack anticipation before hurt reactions.
- Independent mantle shards, stronger float/stride/lean motion and clearer hand/staff articulation. Added `boss-ritual-preview.gif`; existing procedural artwork and previews are regenerated.
- Only two additional boss atlases are decoded; ordinary enemies retain their existing atlas dimensions. Reduced motion and low-quality rendering remain supported. Cell-boundary checks include all 384 new ritual frames.

### Compatibility and validation

- Existing supported saves remain usable. A fighting v5.1.2 guardian gains tactics and an expanded arena once without changing current/maximum vitality, while preserving ward percentage and attack clocks. New saves preserve all new clocks, army roles, seal warnings, ring gaps and suppression.
- Aegis, manual banked essence, minimap, vitality cues and same-wave half-gold death recovery are retained. Retry clears temporary casting suppression.
- **218 logic/integration groups passed**, including all eleven powers, ranged counterplay, ward recovery, dodge prediction, nonrecursive armies, boss identity, exact reloads, migration, suppression and death recovery.
- **19 asset tests passed**, including 50 valid embedded PNGs, all ordinary/ritual frame boundaries and deterministic regeneration.
- Native Canvas decoded all 50 assets and rendered all eleven warning scenes, a reinforced army and a narrow reduced-motion scene. These checks do not verify browser DOM/CSS layout, physical input, real-device performance or audio output. Real-browser checks were not run for this package; the manual browser fixtures are included.
- [BALANCE.md](BALANCE.md) explains the combat budgets, calibration fixture and limits. The scripted five-wave stability fixture uses hit immunity and is not a player win-rate benchmark.

### Install

Back up the save, replace the complete `JSCanvasEdition` folder, and open `index.html` with the same browser/profile and game address. This archive contains only that edition, README, release notes, license, source and preserved credits.

## v5.1.2 — Balance of Power

Release package prepared: **2026-10-23**. This package does not imply that a GitHub release or tag has been published.

### Whole-build encounter balance

- New `systems/difficulty.js` evaluates permanent merchant stats, learned spells, mastery, evolution relics, talents, vitality, armor, regeneration and mobility alongside level. Buying power without leveling now affects encounter pressure.
- Spawn pacing, level bands, tier mix and living-enemy budgets adapt gradually. Pressure moves by at most 0.25 every six simulation seconds and only affects new spawns. Most mature encounters remain weaker fodder, even for heavily upgraded builds. Ordinary population is capped at 200.
- **POWER** and **THREAT W** expose the build rating and effective spawn wave. The actual wave counter still advances once per completed guardian encounter.
- Survival duration accounts for build pressure at wave start and stays fixed during that attempt: 30–67 seconds. Overlord invasion chance is now 4–42%, from wave 3, with a three-wave minimum gap and at most one invasion per wave. A live boss cannot be duplicated.
- The wave plan, invasion roll and refresh clock persist in saves. Retry keeps the same plan and random decision. Gold, wounds, Aegis charge, banked essence and active Demon bonuses do not inflate permanent pressure.

### Final Sovereign rebalance and powers

- The final boss now budgets vitality from estimated sustained **whole-build** damage. Projectile spread and single-target spell coverage are included. The earlier fivefold vitality floor and small multiplier ceiling are removed: weak characters face smaller health budgets, while high shop builds produce much stronger guardians.
- Boss level also uses effective build strength. Attack budgets account for vitality and armor, with individual attack ceilings that prevent full-health single-hit kills on weak builds. Player armor and Aegis still apply. The reference attack stat remains at least 5× an equivalent ordinary Overlord's value.
- Boss stats lock on encounter entry; upgrades never heal or continuously inflate a fighting guardian. Ordinary pressure caps do not cap guardian damage-output scaling.
- **Soul Constellation:** radial shots with a gap along the locked aim, with more orbs when enraged.
- **Rift Step:** a clearly marked, locked destination inside the sanctum; the boss teleports there after its warning.
- **Triune Lances:** three warned rays with space to move between them, also countered by Aegis.
- The existing salvo, meteors, reaping arc and ward remain. The opening rotation shows all seven powers. Later choices react to distant/nearby players; enraged recovery and pressure add pace.
- A fighting v5.1.1 guardian migrates once, preserving identity, health/ward percentages and attack clocks. New saves preserve all seven powers, including teleport destinations. Reloading an updated guardian never repeats its stat adjustment.

### Enemy motion

- Independently articulated wings, robes, arms and tails, slime deformation, and clearer attack anticipation/strike poses across the nine enemy families.
- Boss strafing, floating and orbiting motes; optional adjacent-frame blending for prominent or uncrowded actors. Guardian warnings drive attack animation.
- Low quality uses one atlas draw per actor; reduced motion and freezing suppress added movement. Cosmetic motion consumes no encounter randomness. Existing atlas dimensions/frame counts remain unchanged.
- Asset checks caught and corrected slime/death-pose clipping; all enemy frames remain inside their cells. Procedural sources and animated previews are included.

### Compatibility and validation

- v5.1.1 Aegis, same-wave half-gold death recovery, manual banked Demon Essence, health feedback, sanctums and minimap behavior are retained. Existing supported saves migrate without removing upgrades.
- **193 logic/integration test groups passed**, covering whole-build balance, bounded adaptation, invasion persistence, all seven guardian powers, damage ceilings, migration, exact saves, shields and retries.
- **16 asset tests passed**, including all 48 embedded PNGs, directional poses, cell boundaries and deterministic regeneration.
- Native Canvas decoded all 48 assets and rendered **six scene images**, including new powers, shield/telegraphs, reduced motion and a narrow viewport; all nine families and six animation states also rendered. This does not certify browser DOM/CSS layout or physical input/audio. Real-browser checks were not run.
- Added reproducible `balance-probe.mjs` and [BALANCE.md](BALANCE.md), including same-level fixtures from starter through extreme merchant scaling and the limits of this calibration.

### Update

Export a backup, replace the complete `JSCanvasEdition` folder, and use the same browser/profile and game address. Open `index.html`. The archive contains only `JSCanvasEdition/`, including README, release notes, license, source and existing credits.

## v5.1.1 — Sovereign Reckoning

Release package prepared: **2026-10-23**.

### Final boss overhaul

- Every final sanctum now summons the **Final Sovereign**, a crowned Overlord ascension with **5× the vitality and base attack power of a normal Overlord at the same level and wave**. The earlier reduced-vitality final Warden is removed.
- The guardian locks its level and stats at encounter start, at least `max(player level + 3, ceil(player level × 1.12))`. An invasion's higher level is preserved. Later changes to player damage do not constantly inflate its health.
- **Hellfire Salvo:** a 0.9s warning, then ten fast shots along the locked direction; fourteen below 40% vitality. Individual shots deal 10% of its base attack value.
- **Ash Meteors:** fixed, marked circles warn for 1.15s before impact; three circles normally and four when enraged. Each hit deals 16% of base attack value.
- **Soul Reaping:** a warned directional arc deals 22% of base attack value; it can be dodged or shielded.
- **Dread Aegis:** a separate 3s boss ward absorbs up to 4% of maximum vitality. A visible ward meter accompanies the boss health bar; the ward does not heal the boss.
- Minion summons and shorter enraged recovery windows add pressure. Movement speed is balanced separately from the fivefold stat multiplier.
- A surviving invasion ascends and fully heals **once** when the final encounter begins. Its identity is retained, so no duplicate boss is created.

### Player Aegis

- **E** or the new **AEGIS** button raises a barrier for **2.5 seconds**, with **8 seconds of recovery from activation**.
- Capacity is `75% of maximum vitality + 2 per character level`, without a gold or essence cost.
- Armor applies first; Aegis absorbs next, followed by a Stone oath shield, then vitality. Overflow and shield break work normally. The existing short hit-immunity window prevents rapid-fire damage from stacking every frame.
- The shield has a visible halo, charge/recovery meter, and saved remaining capacity and timers. Pause, Continue and repeated activation do not refill it.

### Death preserves the save

- Death stores a **fresh restart of the current wave** instead of deleting the checkpoint. The active save slot and other chapters remain intact.
- Keep `floor(gold / 2)`; lose the remainder. **101 → 50 retained, 51 lost.** The penalty is applied once per death, including if the game is closed before Retry.
- **RESTART WAVE** and title-screen **CONTINUE** both resume that saved retry, with full vitality, the same wave number and time zero. Retrying creates no new slot and charges no additional gold.
- Levels, collected XP, pending level-up gifts, spells, ranks, talents, relics, upgrades, unspent essence, records and locked merchant stock are preserved.
- Enemies, boss progress, hazards and uncollected loot reset. Active Demon form ends without refunding spent essence. Combat cooldowns reset for the new attempt.
- The current wave oath remains active, and a prepared next-wave oath is not consumed. The chronicle counts fallen attempts.
- When browser storage is unavailable, the death screen explains the limitation; the in-memory retry still works in the current session.

### Compatibility and validation

- Existing v5.1.0 saves load normally. An already-fighting old guardian upgrades once while preserving its identity and health percentage. Existing player shields default to ready when the new Aegis fields are absent.
- New world snapshots preserve guardian aim, warned ability, burst state, health, ward capacity and recovery, plus player Aegis state. Corrupt new state is rejected.
- **167 logic/integration test groups passed**, including fivefold level scaling, special warnings, shield absorption/recovery, legacy migration, fatal contact/projectiles/hazards, same-wave retry, queued gifts and single-charge gold loss.
- All **48 embedded PNG assets decoded** on native Canvas, and **five gameplay scenes rendered**, including Sovereign telegraphs, player Aegis, and retry. This checks Canvas rendering; it does not certify browser DOM/CSS layout or physical touch/audio output.
- The included browser verification page has additional v5.1.1 keyboard, button, shield, guardian and retry checks. Real-browser checks were not run for this package.

### Update

Export a save backup, replace the complete `JSCanvasEdition` contents, then use the same browser/profile and game address. Open `index.html`. Only `JSCanvasEdition/` files are included; README, these notes, license and existing credits are retained.

## v5.1.0 — Final Sanctum

Release package prepared: **2026-10-23**. These notes do not imply that a GitHub release or tag has already been published.

### Added

- Distinct, outlined **red damage** and **green healing** indicators above the witch, with a temporary overhead vitality bar and low-vitality text.
- Actual healing feedback from pickups, regeneration, Blood Ledger, merchant items, level-up gifts, and between-wave recovery. Damage indicators report vitality lost after armor and shield absorption.
- A steady red screen-edge warning below **30% vitality**, including low-quality and reduced-motion rendering.
- **Manual Demon Witch activation** through **F** or the **UNLEASH** button, with charge count and duration/damage/speed previews.
- A **Final Sanctum at the end of every wave**, with a visible ritual arena, boundary stones, and an approach-triggered guardian encounter.
- A minimap showing the player, enemies, bosses, sanctum marker, camera footprint, and distance to the final objective. Its range adapts to keep the sanctum visible independently of camera zoom.
- Persistent sanctum position, encounter phase, guardian identity and health, and stacked Demon-form duration and bonuses in world saves.
- Regression coverage for banked essence, stacked forms, health cues, encounter completion, legacy saves, floating-origin movement, and distant minimap objectives.

### Changed

- Demon Jewels **bank essence instead of automatically transforming** at 100.
- Activating the form spends **all complete 100-essence charges**, leaving the remainder. One charge grants 12s, ×1.8 damage and ×1.45 movement speed. Each additional charge adds 8s; damage and speed rise logarithmically with the number of charges.
- Jewels collected during Demon Witch now grant **full essence**, banked for the next manual activation. Expiration does not automatically reactivate the form.
- Every wave now follows **survive → locate sanctum → defeat guardian → merchant**. Waiting out the timer or defeating an earlier invasion cannot skip the final encounter.
- Most sanctums summon Wardens; every fifth wave summons an Overlord. Early-wave Wardens have reduced vitality. The former automatic fifth-wave boss appearance during the timed phase is replaced by this final encounter.
- Ordinary swarm spawning stops after the timer. Existing enemies, boss minions, and marked hazards remain active during the hunt.
- A surviving invasion boss moves into the sanctum and becomes its guardian, avoiding duplicate boss encounters. Final guardians stay in their arena instead of teleporting back to a distant player.
- Enemy damage numbers have a stronger outline and improved contrast.
- Regenerated a stale enemy-direction preview so its eight frames match the included artwork generator.
- README now documents this concrete edition and version, the actual repository clone URL, controls, save compatibility, existing AGPLv3 license, and credits.

### Save compatibility

1. Export a JSON backup from **SAVES** before updating.
2. Replace the complete `JSCanvasEdition` folder contents while retaining the same game origin/browser profile.
3. Existing v5.0 banked essence and active forms are retained. Legacy forms receive the original base bonuses; future activations use the new charge rules.
4. Existing v5.0 worlds without a sanctum field remain loadable. If the survival timer has already expired, a new final sanctum appears on the next simulation update.
5. Updated saves retain the exact sanctum/guardian state and remaining Demon time. Existing v3/v4 migrations remain supported.

### Validation for this package

- **137 logic/integration test groups passed** with `node tests.mjs`.
- **16 asset tests passed** with `python -m unittest test_assets.py`, including deterministic regeneration.
- All **48 embedded PNGs decoded** on a native Canvas implementation. Four gameplay scenes rendered successfully; low-health screen-edge pixels were checked before and after healing. This does not replace browser layout testing.
- Real-browser validation of v5.1.0 was blocked by the execution environment's browser/network access restrictions. Existing earlier-version browser results are not presented as new v5.1.0 passes.
- The browser verification page is included so the release can be checked in a normal browser. Automated sound checks do not certify physical audio output.

### Packaging

The release archive contains only **`JSCanvasEdition/`**, including its README, these release notes, existing license, source, embedded assets, development scripts, tests, and animation previews. Repository-root files and other editions are outside this package.

## v5.0.0 — Demon Ascendant baseline

The repository baseline used for this update already contains twelve automatic spells, charged directed specials, Demon Witch/fear mechanics, nine animated enemy families, mixed enemy-level encounters, and Overlord invasions. v5.1.0 builds on that code; it does not claim to create or republish an earlier GitHub release.
