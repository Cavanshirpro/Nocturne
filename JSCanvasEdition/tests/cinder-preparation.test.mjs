/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHarness,clearedGuardian} from './helpers.mjs';

function setup(){const h=createHarness(),g=h.create();g.reset('moon');g.player.weapons.orbit=4;g.player.relics.cinder=true;g.player.critChance=0;g.combat.cooldown=99;return {...h,g};}
function foe(N,g,x=240,y=0){const e=new N.Enemy(g,'gargoyle',x,y,++g.nextId);e.maxHp=e.hp=100000;e.speed=0;g.enemies.push(e);g.hash.insert(e);return e;}
test('guardian completion clears the victory shake, red flash and hit stop before exploration',()=>{
  const {g}=setup();g.shake=8;g.hurtFlash=.25;g.hitStop=.025;g.impactCooldown=.16;clearedGuardian(g);
  assert.equal(g.cycle.phase,'INTERMISSION');for(const key of ['shake','hurtFlash','hitStop','impactCooldown'])assert.equal(g[key],0,key);
  for(let i=0;i<120;i++)g.update(1/60);assert.equal(g.shake,0);assert.equal(g.hurtFlash,0);
});
test('new ability feedback during preparation decays and blocking menus still freeze simulation',()=>{
  const {g}=setup();clearedGuardian(g);assert.ok(g.abilities.begin());assert.ok(g.abilities.release());assert.ok(g.shake>0);
  g.hurtFlash=.25;g.state='shop';const before=g.shake;g.update(1);assert.equal(g.shake,before);
  g.state='playing';for(let i=0;i<60;i++)g.update(1/60);assert.equal(g.shake,0);assert.equal(g.hurtFlash,0);
});
test('restoring preparation on the same engine clears stale combat feedback',()=>{
  const {g}=setup();clearedGuardian(g);g.checkpoint('intermission');g.shake=8;g.hurtFlash=.25;g.hitStop=.1;
  assert.ok(g.continueRun());assert.equal(g.shake,0);assert.equal(g.hurtFlash,0);assert.equal(g.hitStop,0);
});
test('Cinder Halo damages and ignites a midrange enemy without any wisp contact',()=>{
  const {N,g}=setup(),e=foe(N,g),base=e.hp;g.combat.updateWisps();assert.equal(e.hp,base);
  assert.ok(g.combat.cinderHalo());assert.ok(e.hp<base);assert.equal(e.burn,3);assert.equal(e.burnSource,'orbit');assert.ok(g.stats.weapons.orbit>0);
  const hp=e.hp;e.update(.41);assert.ok(e.hp<hp);assert.equal(g.combat.projectiles.active.length,0);
  const origin=N.Orbitals.wispOrigin(g.player,0,5),effect=g.combat.effects.active.find(e=>e.kind==='cinder');assert.equal(effect.x,origin.x);assert.equal(effect.y,origin.y);
});
test('ordinary Moon Wisps retain contact behavior and require rank IV plus the relic for ranged fire',()=>{
  const {N,g}=setup(),e=foe(N,g);g.player.relics.cinder=false;assert.equal(g.combat.cinderHalo(),false);assert.equal(e.hp,e.maxHp);
  g.player.relics.cinder=true;g.player.weapons.orbit=3;assert.equal(g.combat.cinderHalo(),false);assert.equal(e.hp,e.maxHp);
});
test('one target receives the full ember budget; a volley distributes that budget over distinct targets',()=>{
  const one=setup(),a=foe(one.N,one.g);one.g.combat.cinderHalo();const full=a.maxHp-a.hp;
  const two=setup(),b=foe(two.N,two.g),c=foe(two.N,two.g,-240);two.g.combat.cinderHalo();
  assert.ok(Math.abs(full-(b.maxHp-b.hp+c.maxHp-c.hp))<1e-8);assert.equal(two.g.combat.effects.active.filter(e=>e.kind==='cinder').length,2);
  assert.ok(Math.abs(full-one.g.player.damage*(.6+.12*4)*2)<1e-8);
});
test('targeting rejects out-of-range, dead and spawning foes and deterministically selects the nearest',()=>{
  const {N,g}=setup(),far=foe(N,g,N.haloRange(4)+1),dead=foe(N,g,120),spawning=foe(N,g,150),a=foe(N,g,220),b=foe(N,g,240),c=foe(N,g,300);dead.alive=false;spawning.spawnDelay=1;
  g.combat.cinderHalo();assert.ok(a.hp<a.maxHp&&b.hp<b.maxHp);for(const e of [far,dead,spawning,c])assert.equal(e.hp,e.maxHp);
});
test('rank and haste increase actual ranged output while effects and projectile population stay bounded',()=>{
  const {N,g}=setup();const initial=N.haloInterval(g.player);g.player.attackInterval*=.5;assert.equal(N.haloInterval(g.player),initial*.5);
  g.player.weapons.orbit=1000;assert.ok(N.haloInterval(g.player)<initial*.5);for(let i=0;i<20;i++)foe(N,g,180+i*5,20);
  g.combat.spellTimers.halo=-1;g.combat.update(.01);assert.ok(g.combat.effects.active.filter(e=>e.kind==='cinder').length<=6);assert.equal(g.combat.projectiles.active.length,0);
  assert.ok(Number.isFinite(g.stats.weapons.orbit));assert.equal(g.enemies.length,20);assert.equal(g.player.weapons.orbit,1000);
});
test('pause, casting seals and preparation prevent ranged farming and release no queued burst',()=>{
  const {N,g}=setup(),e=foe(N,g);g.state='paused';assert.equal(g.combat.cinderHalo(),false);g.state='playing';g.player.progress.silenceTime=1;g.combat.spellTimers.halo=0;g.combat.update(10);assert.equal(e.hp,e.maxHp);assert.equal(g.combat.spellTimers.halo,0);
  g.player.progress.silenceTime=0;g.combat.update(.01);const damage=e.maxHp-e.hp;assert.ok(damage>0&&damage<g.player.damage*3);
  g.cycle.phase='INTERMISSION';const hp=e.hp;assert.equal(g.combat.cinderHalo(),false);assert.equal(e.hp,hp);
});
test('exact ranged cooldown and ignition survive checkpoint reload without an immediate extra volley',()=>{
  const {N,g,create}=setup();foe(N,g);g.combat.cinderHalo();g.combat.spellTimers.halo=.37;g.checkpoint('wave');const loaded=create();assert.ok(loaded.continueRun());
  assert.equal(loaded.combat.spellTimers.halo,.37);assert.equal(loaded.enemies[0].burnSource,'orbit');const hp=loaded.enemies[0].hp;loaded.combat.cooldown=99;loaded.combat.update(.1);assert.equal(loaded.enemies[0].hp,hp);
});
test('old snapshots without the optional halo clock load safely and malformed clocks are rejected',()=>{
  const {N,g,create}=setup();foe(N,g);g.checkpoint('wave');const checkpoint=g.save.data.checkpoint;delete checkpoint.world.spellTimers.halo;assert.ok(g.save.validCheckpoint(checkpoint));g.save.write();const loaded=create();assert.ok(loaded.continueRun());assert.equal(loaded.combat.spellTimers.halo,.4);
  const world=N.captureWorld(g);world.spellTimers.halo=Infinity;assert.equal(N.validWorld(world),false);
});
test('quality, reduced motion and a full cosmetic pool cannot remove ranged damage',()=>{
  let damage;
  for(const quality of ['high','low'])for(const reduced of [false,true]){
    const {N,g}=setup(),e=foe(N,g);g.quality=quality;g.reducedMotion=reduced;
    for(let i=0;i<80;i++)g.combat.effect('ring',0,0,0,0,10,'#ffffff',1);
    assert.ok(g.combat.cinderHalo());const hit=e.maxHp-e.hp;if(damage===undefined)damage=hit;assert.equal(hit,damage);assert.equal(g.combat.effects.active.length,80);g.draw();
  }
});
