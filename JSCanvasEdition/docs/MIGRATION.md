# Save migration — v0.8.1

Export a JSON backup from **SAVES** before replacing files. Keep the complete edition and the same browser/profile/origin. Source data is never deleted automatically.

| Layer | Previous | Current |
| --- | --- | --- |
| Storage key | `nocturne.coven.v3`, with `nocturne.coven.v2` fallback | `nocturne.coven.v4` |
| Verification-only key | `nocturne.coven.qa.v3` / `.qa.v2` | `nocturne.coven.qa.v4` |
| Container | schema 3 slots / schema 2 single save | schema 4, up to 24 independent slots |
| Checkpoint | schema 2, `wave` / `shop` | schema 3, including `intermission`, cycle and optional exact gift choices |
| World snapshot | schema 1 | schema 1; existing enemy/guardian/projectile fields retained |
| Ascension / wave cycle | absent | separate schema 1 records |

Release numbers do not determine save-schema numbers. Prior v0.7.x and the supported v0.6/v0.5 and historical v3/v4 character migrations still use their existing armor, ability and guardian rules. Tier migration never rewrites base damage or saved maximum boss vitality, attack clocks, invasion decisions, relics, upgrades, mastery, gold or the original death penalty.

## Reading and committing

Storage checks v4 first, then v3, then v2. Every populated slot is validated and converted independently. Valid old single-save data becomes Save 1. Conversion adds Ascension and explicit wave-cycle data, validates the result, writes the new key and verifies the stored bytes. The source v3/v2 keys remain intact even after success. A quota or storage failure leaves the migrated character available in memory, displays unavailable-storage feedback and retains the original bytes for the next launch or backup.

An invalid world snapshot can be removed from the *recovered* checkpoint while retaining its full original checkpoint in the slot's recovery data. Permanent character progress resumes at the wave start with a visible warning. A wholly invalid checkpoint is retained for backup recovery while other valid slots remain usable. Invalid chapter identifiers and excess chapters are retained in exported recovery records as well. Recognized tier milestones add cosmetic chronicle entries, never fake trial-completion flags. Undecodable current-container data blocks writes to its key and is retained as `recoveryRaw` in exported backups; it is not overwritten with an empty save. This is recovery evidence, not a promise that arbitrarily corrupt data can be made playable.

Imports validate before adding independent chapters. They do not overwrite populated chapters. Importing an old backup twice creates two copies with their original resources; it does not issue new rewards or merge their gold. The source backup's selected slot is mapped to its newly assigned identifier. Existing local chapters remain independent.

## Evidence and historical recognition

`Migration.evaluateLegacyAscension(checkpoint, profile)` is deterministic and does not mutate or reroll the checkpoint. It evaluates each tier's independent requirements in order, with an automatic historical boundary of **+C**.

- For active/retry checkpoints, completed waves are `max(0, wave - 1)`.
- A legacy merchant checkpoint counts the just-completed `wave`. It becomes a preparation checkpoint with the merchant open, its stock/locks/prices/rerolls retained, and the configured full preparation duration; old saves did not record a preparation timer.
- Profile `bestWave` and profile boss totals are not proofs for the active ritual. They may belong to a failed attempt or another ritual.
- Guardian recognition requires completed progress, per-run boss victories and evidence of the mandatory-guardian rules: a saved sanctum or the later Aegis fields. Earlier or incomplete data without that proof receives fulfilled requirement credit, not fabricated guardian victories.
- Learned schools, separately normalized ranks, elite victories, evolutions and mastery provide independent evidence. Huge damage, BUILD POWER or a single unlimited spell rank cannot compensate for missing categories.
- Historical recognition records milestones; it does **not** write `completedTrials`. Later trials remain unverified even for an advanced legacy character.

The first successful continuation shows **Legacy Progress Recognized**: save-format source, character level, completed waves, schools, evolutions/masteries, guardian evidence, awarded tier and restoration mode. Original game-release versions were not recorded in old saves, so the UI does not invent them. The summary's presented flag is persisted; it remains reviewable from the Grimoire/Ascension screen. Pending gifts take priority over this overlay.

| Synthetic current wave | Development | Result |
| --- | --- | --- |
| 1 | Level 1, starting spell | -E |
| 5 | Level 6, two rank-IV schools, guardian proof | +E |
| 20 | Level 24, four rank-IV schools, elite/guardian proof | +D; 19 completed waves do not meet the 21-completion -C requirement |
| 50 | Level 60, six developed schools, evolution/mastery | +C |
| 150 | Level 200, twelve evolved/mastered schools | +C, with advanced requirements visible; no invented +S trial |
| 1 | Level 100,000, extreme damage and one rank-1,000,000 spell | -E; no completed waves or breadth of development |

These are synthetic fixtures in `tests/fixtures/legacy`, not measurements of real players.

## Death, interruption and origin boundaries

Normal death still charges `floor(gold / 2)` once and saves a fresh retry of the same wave, with permanent progress and unspent essence retained. Loading/retrying does not charge again. Awarded Ascension survives. Pending First Ember is interrupted on reload and cannot become a free victory. Preparation reloads retain their exact remaining simulation time, location, purchases and completed-wave evidence. Completion rewards and pending gift cards are saved together; closing during those choices cannot rerun the guardian reward.

Browser storage cannot automatically cross `file://`, a different folder/profile, a different localhost port or a hosted website. Use backup export/import to move between origins. Verified Chromium file launch is supported, but local-storage policies vary by browser; a local HTTP server provides a stable origin. Export recovery backups before clearing any site data or old keys.

Run `node --test tests/migration.test.mjs tests/wave-cycle.test.mjs tests/ascension.test.mjs` from this edition. These cover the migration matrix, live guardian state, a composed legacy/three-guardian/death/retry fixture, idempotence, import/export, write failure and malformed data.

## v0.8.0 → v0.8.1

The v4 container, v3 checkpoint and schema-1 Ascension records remain readable. Earned current/highest tiers, history and old First Ember completions are preserved. The schema-1 trial identifiers now cover the 15 registered ordeals; an interrupted pending ordeal never counts as complete. Previous software versions may not understand new advanced completions, so use exported backups when rolling back.

Old v2/v3 historical recognition uses `legacyRequirements`, the frozen v0.8.0 policy. New live requirements use depth/mastery/evolution gates. No existing tier is re-evaluated downward. Derived combat bonuses now apply to earned tiers, including historical milestones, but do not rewrite stored base stats and cannot compound on reload. Save validation accepts and checks Ascension pulse damage reports; chronicle capacity accommodates the full ladder. The half-gold death penalty and per-chapter isolation remain unchanged.
