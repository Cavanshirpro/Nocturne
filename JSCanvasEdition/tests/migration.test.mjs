/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createHarness} from './helpers.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
function load(name){const h=createHarness(),data=JSON.parse(fs.readFileSync(path.join(h.root,'tests/fixtures/legacy',name+'.json'),'utf8'));return {...h,data};}
for(const [name,expected] of [['new','e-minus'],['early','e-plus'],['wave20','d-plus'],['wave50','c-plus'],['wave150','c-plus'],['extreme','e-minus']])test(name+' legacy classification is deterministic, conservative and non-destructive',()=>{
  const {N,data,memory,create}=load(name),c=data.slots[0].checkpoint,bytes=JSON.stringify(data);const a=N.Migration.evaluateLegacyAscension(c,data.slots[0].profile),b=N.Migration.evaluateLegacyAscension(clone(c),clone(data.slots[0].profile));
  assert.equal(a.currentTier,expected);assert.deepEqual(a,b);assert.equal(a.completedTrials.length,0);assert.equal(a.discoveredAspects.length,0);assert.ok(N.Ascension.valid(a));
  memory.set('nocturne.coven.v3',bytes);const g=create();assert.equal(memory.get('nocturne.coven.v3'),bytes);assert.ok(memory.has('nocturne.coven.v4'));assert.equal(g.save.data.schema,4);assert.equal(g.save.data.checkpoint.player.ascension.currentTier,expected);assert.equal(g.save.data.checkpoint.player.gold,c.player.gold);assert.equal(g.save.data.checkpoint.player.level,c.player.level);assert.deepEqual(clone(g.save.data.checkpoint.player.weapons),c.player.weapons);
  const again=create();assert.equal(again.save.migrated,false);assert.equal(again.save.data.checkpoint.player.ascension.currentTier,expected);assert.equal(again.save.data.checkpoint.player.gold,101);
});
test('active and shop phases distinguish attempted versus completed waves and retain stock',()=>{
  const {N,data,memory,create}=load('wave20'),c=data.slots[0].checkpoint;assert.equal(N.Migration.evaluateLegacyAscension(c).progress.completedWaves,19);c.phase='shop';delete c.world;c.rolls=3;c.slots[0]={id:'wand',price:15,locked:true,sold:false};
  assert.equal(N.Migration.evaluateLegacyAscension(c).progress.completedWaves,20);memory.set('nocturne.coven.v3',JSON.stringify(data));const g=create();assert.ok(g.continueRun());assert.equal(g.state,'ascension');N.AscensionUI.close(g);assert.equal(g.state,'shop');assert.equal(g.cycle.phase,'INTERMISSION');assert.equal(g.cycle.remaining,75);assert.equal(g.ui.rolls,3);assert.equal(g.ui.slots[0].locked,true);assert.equal(g.player.gold,101);assert.equal(g.player.ascension.legacyRecognition.presented,true);
  const again=create();again.continueRun();assert.equal(again.state,'shop');assert.equal(again.player.gold,101);
});
test('legacy v2 single-save container and original key remain recoverable',()=>{
  const {data,memory,create}=load('early'),slot=data.slots[0],old={schema:2,settings:data.settings,profile:slot.profile,checkpoint:slot.checkpoint},bytes=JSON.stringify(old);memory.set('nocturne.coven.v2',bytes);const g=create();assert.equal(g.save.data.slots.length,1);assert.equal(g.save.data.checkpoint.player.gold,101);assert.equal(memory.get('nocturne.coven.v2'),bytes);assert.equal(g.save.data.checkpoint.player.ascension.currentTier,'e-plus');
});
test('multiple populated chapters migrate independently; malformed chapter data is retained for recovery',()=>{
  const {data,memory,create}=load('wave50');const early=load('early').data.slots[0];early.id=2;const bad=clone(early);bad.id=3;bad.name='Broken';bad.checkpoint.player.hp=null;data.slots.push(early,bad);data.nextSlotId=4;memory.set('nocturne.coven.v3',JSON.stringify(data));const g=create();assert.equal(g.save.data.slots.length,3);assert.equal(g.save.data.slots[0].checkpoint.player.ascension.currentTier,'c-plus');assert.equal(g.save.data.slots[1].checkpoint.player.ascension.currentTier,'e-plus');assert.equal(g.save.data.slots[2].checkpoint,null);assert.ok(g.save.data.slots[2].recovery.checkpoint);assert.ok(g.save.warnings.some(w=>w.includes('Broken')));assert.ok(JSON.parse(g.save.exportData()).slots[2].recovery);g.save.select(3);assert.ok(g.newRitual());assert.notEqual(g.save.active.id,3);assert.ok(g.save.data.slots.find(s=>s.id===3).recovery.checkpoint);
});
test('storage write failure never removes the v3 source; the next launch retries safely',()=>{
  const {data,memory,sandbox,N}=load('wave50'),bytes=JSON.stringify(data);memory.set('nocturne.coven.v3',bytes);const original=sandbox.localStorage;sandbox.localStorage={getItem:original.getItem,setItem(){throw Error('quota');}};
  const failed=new N.SaveStore();assert.equal(failed.available,false);assert.equal(memory.get('nocturne.coven.v3'),bytes);assert.equal(memory.has('nocturne.coven.v4'),false);assert.equal(failed.data.checkpoint.player.gold,101);sandbox.localStorage=original;const recovered=new N.SaveStore();assert.equal(recovered.available,true);assert.equal(recovered.data.checkpoint.player.ascension.currentTier,'c-plus');assert.equal(memory.get('nocturne.coven.v3'),bytes);
});
test('backup import, repeated legacy imports and repeated reloads cannot grant gold, items or fake trials',()=>{
  const {data,create}=load('wave150'),g=create();g.reset();const bytes=JSON.stringify(data);assert.equal(g.save.importData(bytes),1);assert.equal(g.save.importData(bytes),1);assert.equal(g.save.data.slots.length,3);
  for(const slot of g.save.data.slots.slice(1)){assert.equal(slot.checkpoint.player.gold,101);assert.equal(slot.checkpoint.player.ascension.currentTier,'c-plus');assert.equal(slot.checkpoint.player.ascension.completedTrials.length,0);}
  g.continueRun();const gold=g.player.gold;g.continueRun();assert.equal(g.player.gold,gold);assert.equal(g.player.ascension.currentTier,'c-plus');const exported=g.save.exportData(),other=create();other.save.importData(exported);assert.equal(other.save.data.checkpoint.player.gold,101);
});
test('old optional ability fields are recoverable without inventing missing guardian evidence',()=>{
  const {N,data,memory,create}=load('wave50'),q=data.slots[0].checkpoint.player.progress;for(const k of ['arsenal','special','essence','demonTime','specialRemaining','aegis','aegisMax','aegisTime','aegisRemaining'])delete q[k];const c=data.slots[0].checkpoint;assert.equal(N.Migration.evaluateLegacyAscension(c).progress.guardians,0);memory.set('nocturne.coven.v3',JSON.stringify(data));const g=create();assert.equal(g.save.data.checkpoint.player.level,60);assert.equal(g.save.data.checkpoint.player.ascension.currentTier,'e-minus');assert.ok(g.continueRun());assert.equal(g.player.progress.arsenal.slash,1);
});
test('retry checkpoint retains the one-time half-gold penalty through migration',()=>{
  const {data,create,memory}=load('early'),g=create();g.reset();g.player.gold=101;g.die();const c=clone(g.save.data.checkpoint);c.schema=2;delete c.cycle;delete c.player.ascension;data.slots[0].checkpoint=c;memory.clear();memory.set('nocturne.coven.v3',JSON.stringify(data));const loaded=create();assert.ok(loaded.continueRun());assert.equal(loaded.player.gold,50);assert.equal(loaded.wave,c.wave);loaded.continueRun();assert.equal(loaded.player.gold,50);
});
test('invalid world is recoverable, invalid current container is never overwritten',()=>{
  const {data,memory,create}=load('wave20');data.slots[0].checkpoint.world.enemies=[{broken:true}];memory.set('nocturne.coven.v3',JSON.stringify(data));const g=create();assert.ok(g.save.data.checkpoint);assert.equal(g.save.data.checkpoint.world,undefined);assert.ok(g.save.active.recovery.checkpoint.world);assert.ok(g.save.warnings.length);
  memory.clear();const bytes='{corrupt';memory.set('nocturne.coven.v4',bytes);const bad=create();bad.reset();assert.equal(bad.save.available,false);assert.equal(memory.get('nocturne.coven.v4'),bytes);assert.equal(JSON.parse(bad.save.exportData()).recoveryRaw,bytes);
});
test('an active legacy Sovereign keeps its identity, health and attack clocks after migration',()=>{
  const {N,data,create,memory}=load('new'),g=create();g.reset();g.waveTime=g.waveDuration;N.Sanctum.create(g);g.player.x=g.sanctum.x;g.player.y=g.sanctum.y;N.Sanctum.update(g);g.boss.spawnDelay=0;g.boss.hp*=.4;N.FinalGuardian.begin(g,g.boss);g.boss.guardian.windup=.37;g.checkpoint('wave');const c=clone(g.save.data.checkpoint),boss=g.boss;c.schema=2;delete c.cycle;delete c.player.ascension;data.slots[0].checkpoint=c;memory.clear();memory.set('nocturne.coven.v3',JSON.stringify(data));const loaded=create();loaded.continueRun();assert.equal(loaded.boss.id,boss.id);assert.equal(loaded.boss.hp,boss.hp);assert.equal(loaded.boss.maxHp,boss.maxHp);assert.equal(loaded.boss.guardian.windup,.37);assert.equal(loaded.boss.guardian.action,boss.guardian.action);assert.equal(loaded.enemies.filter(e=>e.guardian).length,1);
});
test('legacy migration, three true guardian completions, preparation reload and a death/retry compose safely',()=>{
  const {N,data,memory,create}=load('new');memory.set('nocturne.coven.v3',JSON.stringify(data));let g=create();g.continueRun();if(g.state==='ascension')N.AscensionUI.close(g);
  for(let wave=1;wave<=3;wave++){
    assert.equal(g.wave,wave);if(wave===2){g.player.gold=101;g.die();g=create();g.continueRun();assert.equal(g.player.gold,50);assert.equal(g.wave,2);}
    g.waveTime=g.waveDuration;g.update(.01);g.player.x=g.sanctum.x;g.player.y=g.sanctum.y;g.update(.01);g.boss.spawnDelay=0;g.boss.hit(1e100);g.update(.02);while(g.player.pendingLevels)g.ui.chooseLevel(0);
    assert.equal(g.cycle.phase,'INTERMISSION');assert.equal(g.player.ascension.progress.completedWaves,wave);assert.equal(g.player.ascension.progress.guardians,wave);const gold=g.player.gold;assert.equal(g.finishWave(),false);assert.equal(g.player.gold,gold);
    g.update(2);g.checkpoint('intermission');const remaining=g.cycle.remaining;g=create();g.continueRun();assert.equal(g.cycle.remaining,remaining);assert.equal(g.player.gold,gold);
    if(wave<3){if(wave===1){g.cycle.remaining=.01;g.update(.02);}else assert.ok(N.WaveCycle.start(g));}
  }
});
