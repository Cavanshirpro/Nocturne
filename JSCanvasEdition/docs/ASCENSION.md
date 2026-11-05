# Ascension power and progression — v0.8.1

Ascension is separate from character level, BUILD POWER and boss combat tier. Open **T**, the HUD or Grimoire to see independent requirements, exact bonuses, the preceding-rank damage increase and cumulative abilities. All 15 promotions now have playable ordeals; no promotion is granted just for reaching a wave.

## Development gates

Wave floors are lower than v0.8.0. The old fixed eight-rank contribution and “one mastery point is enough” rule no longer govern live advancement. Each tier requires several schools trained deeply, total mastery ranks, distinct mastered schools, later distinct evolutions, verified guardians and elite victories. A rank-400 spell cannot replace missing schools. One mastery point in many schools cannot replace total mastery investment. Levels and actual spell/talent ranks remain unlimited.

| Rank | Completed waves | Level | Schools at training rank | Mastery ranks / schools | Evolutions | Spell damage |
| --- | ---: | ---: | --- | --- | ---: | ---: |
| -E | 0 | 1 | 0 at rank 0 | 0 / 0 | 0 | ×1.00 |
| +E | 1 | 8 | 2 at rank 3 | 0 / 0 | 0 | ×1.18 |
| -D | 2 | 18 | 2 at rank 5 | 1 / 1 | 0 | ×1.38 |
| +D | 3 | 28 | 3 at rank 8 | 3 / 2 | 1 | ×1.62 |
| -C | 5 | 42 | 3 at rank 12 | 6 / 2 | 2 | ×1.90 |
| +C | 8 | 60 | 4 at rank 18 | 10 / 3 | 2 | ×2.25 |
| -B | 12 | 82 | 4 at rank 25 | 16 / 3 | 3 | ×2.65 |
| +B | 18 | 110 | 5 at rank 34 | 24 / 4 | 3 | ×3.12 |
| -A | 26 | 145 | 5 at rank 46 | 34 / 4 | 4 | ×3.70 |
| +A | 36 | 185 | 6 at rank 62 | 46 / 5 | 4 | ×4.40 |
| -S | 50 | 235 | 6 at rank 82 | 60 / 5 | 5 | ×5.25 |
| +S | 68 | 295 | 7 at rank 108 | 78 / 6 | 5 | ×6.30 |
| Local Power | 90 | 365 | 7 at rank 140 | 100 / 6 | 6 | ×7.60 |
| Areal Power | 118 | 445 | 8 at rank 180 | 126 / 7 | 6 | ×9.20 |
| Big Power | 152 | 535 | 8 at rank 228 | 156 / 8 | 7 | ×11.20 |
| National Power | 195 | 640 | 9 at rank 285 | 190 / 9 | 8 | ×13.70 |

Guardian victories must independently meet the completed-wave floor. From -D onward elite victories must reach three times the stage order. These remain separate proofs. Requirements are visible in full in the panel. A high-wave character with shallow rank-VIII schools and one mastery point per school can still be missing depth, mastery investment and evolution.

## Powers that affect actual combat

Bonuses are derived from the earned tier on use. Base `damage`, `maxHp`, armor and cooldown stats are not multiplied or rewritten in saves, preventing repeated-load stacking. General spell damage grows roughly 17–22% per promotion. Each stage also adds 2.5 percentage points of incoming-damage reduction, 1% movement, 3% ritual recovery, 2.5% dash recovery and 2% Aegis recovery. At National Power that means ×13.7 base spell output, 37.5% damage reduction and 15% movement, before conditional bonuses. Automatic spell cadence remains controlled by existing build stats.

- **+E — Kindled Focus**: 18% more spell damage; rank bonuses apply without changing your stored stats.
- **-D — Emberwake**: Veilstep releases a damaging 90-unit pulse during combat.
- **+D — Runic Channel**: Directed rituals recover faster, alongside stronger spellcraft.
- **-C — Briar Convergence**: Deal 20% more damage to slowed, frozen or exposed foes.
- **+C — Evolved Resonance**: Evolved or mastered spell schools deal 25% more damage.
- **-B — Veil Fracture**: Emberwake exposes foes for 2 seconds.
- **+B — Flow State**: A successful dash removes 2 seconds from the directed ritual cooldown.
- **-A — Winterwake**: Emberwake slows foes for 2 seconds and briefly freezes ordinary enemies.
- **+A — Coven Bond**: Demon power rises by 15%; Aegis absorbs 20% more damage.
- **-S — Sovereign Edge**: Deal 20% more damage to bosses and elite enemies.
- **+S — Ashbound Renewal**: Defeating an elite or principal boss heals 3% vitality and removes 2 seconds from Aegis recovery.
- **Local Power — Commanding Presence**: Directed rituals slow nearby ordinary foes within 220 units.
- **Areal Power — Areal Reach**: Emberwake reaches 180 units; directed rituals deal 25% more damage.
- **Big Power — Unbroken Aegis**: Raising Aegis clears casting silence and grants 2 seconds of seal grace.
- **National Power — National Mandate**: Directed rituals also release a 260-unit damaging, exposing pulse.

Early milestones add Emberwake dash damage, faster ritual recovery, control-target damage and evolved/mastered-school resonance. Later milestones add dash exposure, cooldown refunds, short ordinary-enemy freeze, stronger Demon/Aegis, boss/elite damage, kill renewal, ritual control, larger dash reach, casting-seal cleansing and National Mandate's ritual pulse. All are cumulative. Pulses run once on existing actions, with no extra projectile population or persistent area timers. Combat pulse/kill effects do not run in preparation, menus or trials. Commanding Presence does not slow bosses. New pulse damage appears in the death damage report.

Adaptive guardians account for only 35% of Ascension's logarithmic base offense/defense gain. This acknowledges earned power without cancelling the benefit; deterministic tests compare actual damage gain against the adapted guardian health increase. Existing guardian snapshots keep their saved health and clocks.

## Promotion ordeals

First Ember remains the 20-second, 250-unit, one-dash introduction. Higher ordeals last `20 + 2 × stage order` seconds, require `350 + 80 × stage order` movement and `1 + ceil(stage order / 2)` dashes. Warning radius grows and warning delay/interval shrink. From +D, crossing seals join aimed warnings; from -C, shock rings use the same safe inner core and directional gap as actual combat. The ordeal uses nonlethal existing geometry and no enemies, XP, gold or collectible rewards.

Start an eligible ordeal during preparation. Its clock advances only with simulation; preparation's countdown suspends. A caught warning without dash invulnerability/Aegis fails the ordeal. Completion checks the elapsed time, movement, dashes and current requirements again, then awards the next stage once. Missing or premature outcomes cannot promote. An unfinished ordeal reloads as interrupted, preserving preparation and earned tiers. Origin rebasing adjusts the movement origin so it cannot fabricate distance.

## Existing saves and calibration

Already-earned v0.8.0 tiers remain earned and receive their derived combat powers. Historical v2/v3 recognition still uses frozen v0.8.0 rules through +C, independent of new live balance. It never invents unique ordeal completions. See [MIGRATION.md](MIGRATION.md).

The table is a designed progression target, not measured average-player completion time. Tests demonstrate independent gates and all fifteen actual ordeals, not long-run human balance through National Power. Run `node tools/progression_probe.mjs` for the actual XP/economy formulas and registry requirements. Future balance changes should use real play observations while preserving earned milestones.
