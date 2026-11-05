# Authoritative wave cycle — v0.8.1

The existing `Game.state` still describes whether simulation can run: `playing`, paused menus, level-up selection, merchant, Grimoire and Ascension. The independent, persisted `cycle.phase` describes the world:

```text
COMBAT → SANCTUM_HUNT → GUARDIAN_FIGHT → INTERMISSION → COMBAT
```

`src/systems/wave-cycle.js` owns preparation duration, completed-wave identity, shop initialization, save/restore and the guarded next-wave action. `Game.update` remains the single fixed-step timeline. There is no wall-clock countdown or parallel interval.

## Guardian victory and rewards

Surviving the timer creates the sanctum; it does not finish the wave. A nonrequired invasion's death cannot start preparation. Only the required cleared sanctum plus boss-defeated state can enter intermission. The completed-wave guard changes before rewards are resolved, preventing repeated callbacks from paying again.

Existing remaining loot is banked, the original completion/flawless bonus is awarded once, combat entities/hazards are cleared, active wave oaths expire, and permanent progress remains. The current character's position is retained. Pending gift choices suspend preparation; the completion reward, pending count and exact current gift identifiers are checkpointed together. Each subsequent choice is saved before continuing. Old recovery checkpoints that never stored gift cards retain the pending gifts but cannot reconstruct unknown historical card rolls.

| Completed wave | Preparation time |
| --- | ---: |
| 1–10 | 60 seconds |
| 11–40 | 75 seconds |
| 41–100 | 90 seconds |
| 101+ | 105 seconds |

These values live only in `src/data/configuration.js`. They do not replace the existing 30–67-second combat duration/adaptive pressure plan.

## Explorable preparation

The world stays visible and the player can move, inspect the minimap, use the Grimoire/Ascension panel and revisit the merchant. There is no ordinary spawning or enemy/loot farm. Existing movement, regeneration, Demon/Aegis durations and ability cooldowns continue on simulation time; opening a blocking menu freezes that time. An Ascension ordeal temporarily suspends the preparation countdown while its own simulation state runs.

The compact panel shows completed wave, countdown, gold, tier, next-stage requirement count and prepared oath. It provides merchant, Grimoire, Ascension and **START NEXT WAVE** controls. The last 15 seconds warm the cleared sanctum architecture and panel border; the last five seconds use a steady incoming-wave label and stronger border. There is no flash, screen shake or extra full-screen rendering pass; reduced-motion remains supported.

Merchant stock is prepared once per completed wave after pending gifts are resolved. Reopening/closing it preserves purchased/sold items, locks, prices and paid rerolls. **RETURN TO PREPARATION** restores the same phase. Opening it does not grant resources or restart the timer. A legacy shop snapshot is converted with its existing stock already initialized.

## Starting once

`WaveCycle.start(game)` is the guarded public transition for both the timer and UI. It requires preparation, a running/merchant context, no pending level choices and no active trial. It changes phase before invoking the existing low-level `Game.startWave`, so a stale second callback is inert.

Wave increment, 12% between-wave healing, prepared oath consumption, difficulty planning, one saved invasion roll, timer initialization, presentation and checkpoint occur once. The player's world position is not arbitrarily reset. `Game.startWave` remains a low-level engine/test API; production timer/button paths use the guarded controller.

## Pausing, saving and future interactions

Preparation time advances only while `Game.state === 'playing'`. Pause, merchant, Grimoire, Ascension, pending gifts, focus loss and closing the game consume no countdown. Current checkpoints save remaining time, phase, stock state, persistent character/Ascension state and exact world position. Reloading cannot issue completion rewards again. Unfinished ordeals return to preparation as interrupted; ordinary combat death retains the existing same-wave half-gold recovery.

Future refuge/world interactions should attach to these phase entry/update/restore boundaries, not introduce another wave loop or reuse the combat spawning branch. Their own persistent state must receive explicit validation/migration before being included in checkpoints. See [ARCHITECTURE.md](ARCHITECTURE.md).
