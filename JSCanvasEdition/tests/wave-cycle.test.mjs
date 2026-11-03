/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
import test from 'node:test';import assert from 'node:assert/strict';
import {createHarness,clearedGuardian} from './helpers.mjs';
function start(){const h=createHarness(),g=h.create();g.reset();return {...h,g};}
test('survival timer and invasion victory cannot bypass the required guardian',()=>{
  const {N,g}=start();assert.equal(g.finishWave(),false);g.waveTime=g.waveDuration;g.update(.01);assert.equal(g.cycle.phase,'SANCTUM_HUNT');assert.equal(N.WaveCycle.start(g),false);
  g.spawnBoss(true,false);g.boss.spawnDelay=0;g.boss.hit(1e100);g.update(.02);assert.equal(N.WaveCycle.preparing(g),false);
  g.player.x=g.sanctum.x;g.player.y=g.sanctum.y;g.update(.01);assert.equal(g.cycle.phase,'GUARDIAN_FIGHT');g.boss.spawnDelay=0;g.boss.hit(1e100);g.update(.02);
  while(g.player.pendingLevels)g.ui.chooseLevel(0);assert.equal(g.cycle.phase,'INTERMISSION');assert.equal(g.player.ascension.progress.completedWaves,1);const gold=g.player.gold;assert.equal(g.finishWave(),false);assert.equal(g.player.gold,gold);
});
test('all centralized preparation durations match their boundary waves',()=>{
  const {N}=start();for(const [w,seconds] of [[1,60],[10,60],[11,75],[40,75],[41,90],[100,90],[101,105],[10000,105]])assert.equal(N.WaveCycle.duration(w),seconds);
});
test('preparation permits movement without ordinary spawning or free loot',()=>{
  const {N,g}=start();clearedGuardian(g);const gold=g.player.gold,xp=g.player.xp;g.input.keys.add('KeyD');g.update(1);assert.ok(g.player.x>0);assert.equal(g.cycle.remaining,59);assert.equal(g.enemies.length,0);assert.equal(g.loot.length,0);assert.equal(g.player.gold,gold);assert.equal(g.player.xp,xp);assert.equal(g.wave,1);
});
test('pause, merchant, grimoire, ascension and inactive simulation cannot consume preparation time',()=>{
  const {N,g}=start();clearedGuardian(g);const remaining=g.cycle.remaining;
  for(const state of ['paused','shop','grimoire','ascension','levelup']){g.state=state;g.update(20);assert.equal(g.cycle.remaining,remaining);}
  g.state='playing';g.update(.5);assert.equal(g.cycle.remaining,remaining-.5);
});
test('merchant stock, locks, rerolls and purchases survive repeated visits and reloads',()=>{
  const {N,g,create}=start();clearedGuardian(g);g.player.gold=1000;g.ui.openShop();g.ui.toggleLock(0);g.ui.reroll();g.ui.buy(1);const stock=JSON.stringify(g.ui.slots.map(s=>({id:s.item?.id,price:s.price,locked:s.locked,sold:s.sold}))),rolls=g.ui.rolls,gold=g.player.gold;
  N.WaveCycle.resume(g);g.ui.openShop();assert.equal(JSON.stringify(g.ui.slots.map(s=>({id:s.item?.id,price:s.price,locked:s.locked,sold:s.sold}))),stock);assert.equal(g.ui.rolls,rolls);assert.equal(g.player.gold,gold);
  g.checkpoint('shop');const loaded=create();assert.ok(loaded.continueRun());assert.equal(loaded.state,'shop');assert.equal(loaded.player.gold,gold);assert.equal(loaded.ui.rolls,rolls);assert.equal(JSON.stringify(loaded.ui.slots.map(s=>({id:s.item?.id,price:s.price,locked:s.locked,sold:s.sold}))),stock);
});
test('automatic start and a stale manual callback cannot double-heal, skip a wave or reroll its invasion',()=>{
  const {N,g}=start();clearedGuardian(g);g.player.x=310;g.player.y=-80;g.player.hp=50;g.player.progress.preparedOath='stone';g.cycle.remaining=.01;g.update(.02);
  assert.equal(g.wave,2);assert.equal(g.player.x,310);assert.equal(g.player.y,-80);assert.equal(g.player.hp,63.2);assert.equal(g.player.progress.shield,35);const plan=JSON.stringify(g.difficulty),gold=g.player.gold;
  assert.equal(N.WaveCycle.start(g),false);assert.equal(JSON.stringify(g.difficulty),plan);assert.equal(g.wave,2);assert.equal(g.player.hp,63.2);assert.equal(g.player.gold,gold);
});
test('manual early start applies the prepared oath once and preserves location',()=>{
  const {N,g}=start();clearedGuardian(g);g.player.progress.preparedOath='fortune';g.player.x=123;assert.ok(N.WaveCycle.start(g));assert.equal(g.wave,2);assert.equal(g.player.progress.activeOath,'fortune');assert.equal(g.player.progress.preparedOath,null);assert.equal(g.player.x,123);assert.equal(N.WaveCycle.start(g),false);
});
test('reloaded preparation retains exact timer, no rewards repeat, and level-up choices block start',()=>{
  const {N,g,create}=start();clearedGuardian(g);g.update(7.25);g.checkpoint('intermission');const gold=g.player.gold,remaining=g.cycle.remaining;const loaded=create();assert.ok(loaded.continueRun());assert.equal(loaded.cycle.remaining,remaining);assert.equal(loaded.player.gold,gold);assert.equal(loaded.cycle.phase,'INTERMISSION');
  loaded.player.pendingLevels=1;loaded.player.level=2;assert.equal(N.WaveCycle.start(loaded),false);loaded.ui.afterLevel='intermission';loaded.ui.levelUp();loaded.update(10);assert.equal(loaded.cycle.remaining,remaining);loaded.ui.chooseLevel(0);assert.equal(loaded.state,'playing');assert.equal(loaded.cycle.phase,'INTERMISSION');
});
test('closing on the guardian reward or between pending gifts preserves both reward and exact choices',()=>{
  const {N,g,create}=start();g.loot.push(new N.Loot(g,'xp',10,10,24));clearedGuardian(g);assert.equal(g.state,'levelup');const gold=g.player.gold,choices=g.ui.choices.map(u=>u.id).join(','),pending=g.player.pendingLevels;
  assert.equal(g.save.data.checkpoint.phase,'intermission');assert.equal(g.save.data.checkpoint.player.pendingLevels,pending);
  const loaded=create();assert.ok(loaded.continueRun());assert.equal(loaded.state,'levelup');assert.equal(loaded.player.gold,gold);assert.equal(loaded.player.pendingLevels,pending);assert.equal(loaded.ui.choices.map(u=>u.id).join(','),choices);assert.equal(N.WaveCycle.start(loaded),false);
  loaded.ui.chooseLevel(0);const remaining=loaded.player.pendingLevels;const again=create();again.continueRun();assert.equal(again.player.pendingLevels,remaining);assert.equal(again.player.gold,gold);assert.equal(again.player.upgrades.length,1);
});
test('a level-up at the countdown deadline cannot lose a gift or start two waves',()=>{
  const {N,g}=start();clearedGuardian(g);g.cycle.remaining=0;g.player.level=2;g.player.pendingLevels=1;g.ui.afterLevel='intermission';g.ui.levelUp();g.update(10);assert.equal(g.wave,1);assert.equal(g.player.pendingLevels,1);assert.equal(N.WaveCycle.start(g),false);g.ui.chooseLevel(0);assert.equal(g.wave,1);g.update(.01);assert.equal(g.wave,2);assert.equal(g.player.upgrades.length,1);assert.equal(N.WaveCycle.start(g),false);
});
test('switching chapters during preparation keeps each timer, character and resources independent',()=>{
  const {g}=start();clearedGuardian(g);g.update(3.25);g.checkpoint('intermission');const id=g.save.active.id,remaining=g.cycle.remaining,gold=g.player.gold;g.save.createSlot();const other=g.save.active.id;g.reset();g.player.gold=999;g.checkpoint('wave');g.save.select(id);g.continueRun();assert.equal(g.cycle.phase,'INTERMISSION');assert.equal(g.cycle.remaining,remaining);assert.equal(g.player.gold,gold);assert.equal(g.save.data.slots.find(s=>s.id===other).checkpoint.player.gold,999);
});
