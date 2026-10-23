# JSCanvasEdition release notes

These notes apply only to `JSCanvasEdition` in [Cavanshirpro/Nocturne](https://github.com/Cavanshirpro/Nocturne).

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
