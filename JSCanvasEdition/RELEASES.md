# JSCanvasEdition release notes

These notes apply only to `JSCanvasEdition` in [Cavanshirpro/Nocturne](https://github.com/Cavanshirpro/Nocturne).

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
