/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHarness,clearedGuardian} from './helpers.mjs';

function ready(){const h=createHarness(),g=h.create();g.reset();g.wave=3;g.player.level=10;g.player.weapons.bolt=g.player.weapons.orbit=4;clearedGuardian(g);return {...h,g};}
test('all 16 stages have stable independent descriptors and safely unavailable future powers',()=>{
  const {N}=createHarness();assert.deepEqual(Array.from(N.ASCENSION_TIERS,t=>t.name),['-E','+E','-D','+D','-C','+C','-B','+B','-A','+A','-S','+S','Local Power','Areal Power','Big Power','National Power']);
  assert.equal(new Set(N.ASCENSION_TIERS.map(t=>t.id)).size,16);
  assert.deepEqual(Array.from(N.ASCENSION_TIERS,t=>t.earliestWave),[1,4,8,14,22,32,45,60,78,99,124,151,187,225,275,335]);
  for(const t of N.ASCENSION_TIERS){assert.ok(t.accessibilityLabel&&t.crest&&t.theme&&t.achievement);assert.equal(t.progressionImplemented,t.order<=1);for(const u of t.unlocks)if(u.kind!=='cosmetic')assert.equal(u.implemented,false);}
});
test('requirements are pure, detailed, and cannot be replaced by extreme level or BUILD POWER',()=>{
  const {N,g}=ready();g.player.ascension=N.Ascension.create();g.player.level=100000;g.player.damage=1e100;
  const before=JSON.stringify(g.player.ascension),e=N.Ascension.evaluate(g.player,g);assert.equal(e.eligible,false);assert.ok(e.missingRequirements.some(r=>r.id==='completedWaves'));assert.equal(JSON.stringify(g.player.ascension),before);assert.equal(g.player.ascension.currentTier,'e-minus');
});
test('First Ember runs existing telegraphs, movement and dash, awards only once',()=>{
  const {N,g}=ready(),gold=g.player.gold;assert.equal(N.Ascension.evaluate(g.player,g).eligible,true);assert.equal(N.AscensionTrials.start(g),true);assert.equal(N.WaveCycle.start(g),false);
  g.input.keys.add('KeyD');g.player.dash();for(let i=0;i<1220&&g.player.ascension.pendingTrial;i++)g.update(1/60);
  assert.equal(g.player.ascension.currentTier,'e-plus');assert.deepEqual(Array.from(g.player.ascension.completedTrials),['first-ember']);assert.equal(g.player.gold,gold);assert.equal(g.enemies.length,0);assert.equal(g.player.ascension.history.length,1);assert.equal(N.Ascension.valid(g.player.ascension),true);
  assert.equal(N.AscensionTrials.start(g),false);assert.equal(N.Ascension.advance(g.player,g,'e-plus'),false);assert.equal(g.player.ascension.history.length,1);assert.equal(g.player.gold,gold);
});
test('a stationary character fails without wave, vitality, gold or reward corruption',()=>{
  const {N,g}=ready(),gold=g.player.gold,hp=g.player.hp,remaining=g.cycle.remaining;assert.ok(N.AscensionTrials.start(g));
  for(let i=0;i<200&&g.player.ascension.pendingTrial;i++)g.update(1/60);
  assert.equal(g.player.ascension.lastTrial.outcome,'failed');assert.equal(g.player.ascension.currentTier,'e-minus');assert.equal(g.player.hp,hp);assert.equal(g.player.gold,gold);assert.equal(g.cycle.remaining,remaining);assert.equal(g.cycle.phase,'INTERMISSION');
});
test('a premature completion callback cannot award a tier or consume its trial',()=>{
  const {N,g}=ready();assert.ok(N.AscensionTrials.start(g));assert.equal(N.AscensionTrials.finish(g,'completed','Too early'),false);assert.ok(g.player.ascension.pendingTrial);assert.equal(g.player.ascension.currentTier,'e-minus');assert.equal(g.player.ascension.completedTrials.length,0);
});
test('unfinished trial reload is interrupted and cannot grant an automatic victory',()=>{
  const {N,g,create}=ready();N.AscensionTrials.start(g);g.input.keys.add('KeyD');g.update(.2);g.checkpoint('intermission');const remaining=g.cycle.remaining;
  const loaded=create();assert.ok(loaded.continueRun());assert.equal(loaded.player.ascension.pendingTrial,null);assert.equal(loaded.player.ascension.lastTrial.outcome,'interrupted');assert.equal(loaded.player.ascension.completedTrials.length,0);assert.equal(loaded.player.ascension.currentTier,'e-minus');assert.equal(loaded.cycle.remaining,remaining);assert.equal(loaded.combat.hazards.active.length,0);
});
test('tier and verified trial survive ordinary death, exact reload and JSON backup',()=>{
  const {N,g,create}=ready();N.AscensionTrials.start(g);g.input.keys.add('KeyD');g.player.dash();for(let i=0;i<1220&&g.player.ascension.pendingTrial;i++)g.update(1/60);assert.equal(g.player.ascension.currentTier,'e-plus');
  N.WaveCycle.start(g);g.player.gold=101;g.die();assert.equal(g.player.gold,50);assert.ok(g.retryWave());assert.equal(g.player.gold,50);assert.equal(g.player.ascension.currentTier,'e-plus');
  const backup=g.save.exportData(),loaded=create();loaded.save.importData(backup);assert.ok(loaded.continueRun());assert.equal(loaded.player.ascension.currentTier,'e-plus');assert.equal(loaded.player.ascension.completedTrials.length,1);
});
test('malformed, nonmonotonic and unbounded trial state is rejected',()=>{
  const {N,g}=ready();for(const mutate of [s=>s.currentTier='bogus',s=>s.unlockedTiers.push('e-plus'),s=>s.progress.guardians=Infinity,s=>s.completedTrials=['first-ember','first-ember'],s=>s.pendingTrial={id:'first-ember',elapsed:NaN},s=>s.legacyRecognition={schema:1}]){const s=JSON.parse(JSON.stringify(g.player.ascension));mutate(s);assert.equal(N.Ascension.valid(s),false);}
});
