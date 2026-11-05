/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHarness,clearedGuardian} from './helpers.mjs';

function setup(order=0){const h=createHarness(),g=h.create();g.reset();for(let n=1;n<=order;n++)h.N.Ascension.award(g.player,h.N.ASCENSION_TIERS[n].id,'legacy',1);return {...h,g};}
function qualify(N,g){
  g.player.level=640;for(const id of N.SPELL_IDS){g.player.weapons[id]=400;g.player.progress.mastery[id]=20;g.player.relics[N.WEAPONS[id].relic]=true;}
  g.player.ascension.progress={completedWaves:200,guardians:200};g.stats.elites=1000;
}
function enemy(N,g,x=40,type='slime',elite=false){const e=new N.Enemy(g,type,x,0,g.nextId++,elite);e.maxHp=e.hp=1e8;e.spawnDelay=0;g.enemies.push(e);return e;}

test('high wave, level and shallow ranks cannot replace depth, mastery and evolution',()=>{
  const {N,g}=setup(5);qualify(N,g);for(const id of N.SPELL_IDS){g.player.weapons[id]=8;g.player.progress.mastery[id]=1;g.player.relics[N.WEAPONS[id].relic]=false;}
  const result=N.Ascension.evaluate(g.player,g),missing=Array.from(result.missingRequirements,r=>r.id);
  assert.ok(missing.includes('trainedSchools'));assert.ok(missing.includes('masteryPoints'));assert.ok(missing.includes('evolved'));assert.equal(result.trialAvailable,false);
});
test('school depth and total mastery remain independent gates after wave requirements pass',()=>{
  const {N,g}=setup(8);qualify(N,g);g.player.progress.mastery=Object.fromEntries(N.SPELL_IDS.map(id=>[id,1]));
  assert.ok(N.Ascension.evaluate(g.player,g).missingRequirements.some(r=>r.id==='masteryPoints'));
  for(const id of N.SPELL_IDS)g.player.progress.mastery[id]=20;
  assert.equal(N.Ascension.evaluate(g.player,g).eligible,true);
  const before=g.player.weapons.bolt;N.Ascension.evaluate(g.player,g);assert.equal(g.player.weapons.bolt,before);
});
test('all fifteen actual ordeals are completable once, preserve preparation and reload exact powers',()=>{
  const {N,g,create}=setup();qualify(N,g);g.wave=200;clearedGuardian(g);const remaining=g.cycle.remaining,gold=g.player.gold;
  for(let n=1;n<16;n++){
    assert.equal(N.AscensionTrials.start(g),true,'start '+n);g.input.keys.add('KeyD');
    for(let i=0;i<3300&&g.player.ascension.pendingTrial;i++){g.player.dash();g.update(1/60);}
    assert.equal(g.player.ascension.currentTier,N.ASCENSION_TIERS[n].id,'completed '+n);
    assert.equal(g.player.ascension.lastTrial.outcome,'completed');assert.equal(g.player.ascension.completedTrials.length,n);
    assert.ok(N.Ascension.valid(g.player.ascension));assert.equal(g.cycle.remaining,remaining);assert.equal(g.player.gold,gold);
    assert.equal(g.enemies.length,0);assert.equal(g.loot.length,0);
  }
  assert.equal(N.AscensionTrials.start(g),false);g.checkpoint('intermission');const loaded=create();assert.ok(loaded.continueRun());
  assert.equal(loaded.player.ascension.currentTier,'national-power');assert.equal(N.AscensionPower.profile(loaded.player).damage,13.7);
  assert.equal(loaded.player.damage,g.player.damage);assert.equal(loaded.player.maxHp,g.player.maxHp);assert.equal(loaded.player.ascension.completedTrials.length,15);
});
test('every tier has strictly stronger actual offense, defense and recovery without rewriting base stats',()=>{
  let previous=0;
  for(let n=0;n<16;n++){
    const {N,g}=setup(n),p=g.player,e=enemy(N,g),base=p.damage;
    const multiplier=N.outgoingMultiplier(p,e,'bolt');assert.ok(multiplier>previous);previous=multiplier;
    p.invulnerable=0;p.hurt(20);assert.ok(Math.abs(p.maxHp-p.hp-20*N.AscensionPower.profile(p).taken)<1e-9);
    p.progress.specialRemaining=5;g.abilities.update(1);assert.ok(Math.abs(p.progress.specialRemaining-(5-N.AscensionPower.profile(p).recovery))<1e-9);
    assert.equal(p.damage,base);
  }
});
test('earned Ascension has a net benefit against adaptive guardians instead of being fully cancelled',()=>{
  const a=setup(),b=setup(10),ea=enemy(a.N,a.g),eb=enemy(b.N,b.g);
  const damageRatio=b.N.outgoingMultiplier(b.g.player,eb,'bolt')/a.N.outgoingMultiplier(a.g.player,ea,'bolt');
  const hpRatio=b.N.FinalGuardian.health(b.N.Difficulty.boss(b.g))/a.N.FinalGuardian.health(a.N.Difficulty.boss(a.g));
  assert.ok(damageRatio>hpRatio);assert.ok(hpRatio>1);
});
test('Emberwake damages nearby foes, upgrades control and never creates extra enemy/projectile populations',()=>{
  const {N,g}=setup(8),e=enemy(N,g),far=enemy(N,g,500);g.player.progress.specialRemaining=6;
  assert.ok(g.player.dash());assert.ok(e.hp<e.maxHp);assert.equal(far.hp,far.maxHp);assert.equal(e.exposed,2);assert.equal(e.slow,2);assert.equal(e.frozen,.25);
  assert.equal(g.player.progress.specialRemaining,4);assert.equal(g.combat.projectiles.active.length,0);assert.equal(g.enemies.length,2);
  const health=e.hp;assert.equal(g.player.dash(),false);assert.equal(e.hp,health);
});
test('rank combat actions cannot farm or alter preparation, trials or paused menus',()=>{
  const {N,g}=setup(15),e=enemy(N,g);g.player.hp=50;g.player.progress.specialRemaining=5;
  for(const mode of ['paused','intermission','trial']){
    g.state=mode==='paused'?'paused':'playing';g.cycle.phase=mode==='intermission'?'INTERMISSION':'COMBAT';g.player.ascension.pendingTrial=mode==='trial'?{id:'first-ember'}:null;
    const before=e.hp;N.AscensionPower.dash(g);N.AscensionPower.ritual(g);N.AscensionPower.defeated(g,{elite:true});
    assert.equal(e.hp,before);assert.equal(g.player.hp,50);assert.equal(g.player.progress.specialRemaining,5);
  }
});
test('Coven Bond changes real Aegis and Demon power; Unbroken Aegis clears a seal',()=>{
  const {N,g}=setup(14),p=g.player;p.progress.silenceTime=1;assert.ok(g.abilities.shield());
  assert.equal(p.progress.aegisMax,(p.maxHp*.75+p.level*2)*1.2);assert.equal(p.progress.silenceTime,0);assert.equal(p.progress.silenceGrace,2);
  p.progress.essence=100;assert.ok(Math.abs(g.abilities.preview().power-1.8*1.15)<1e-9);assert.ok(g.abilities.transform());assert.ok(Math.abs(p.progress.demonPower-1.8*1.15)<1e-9);
});
test('conditional school/control/boss/ritual bonuses are applied through the real damage pipeline',()=>{
  const {N,g}=setup(13),p=g.player,e=enemy(N,g);const base=N.outgoingMultiplier(p,e,'bolt');p.progress.mastery.bolt=1;
  assert.ok(Math.abs(N.outgoingMultiplier(p,e,'bolt')/base-1.06*1.25)<1e-9);
  const mastered=N.outgoingMultiplier(p,e,'bolt');e.slow=1;assert.ok(Math.abs(N.outgoingMultiplier(p,e,'bolt')/mastered-1.2)<1e-9);
  e.slow=0;e.elite=true;assert.ok(Math.abs(N.outgoingMultiplier(p,e,'bolt')/mastered-1.2)<1e-9);
  e.elite=false;assert.equal(N.AscensionPower.outgoing(p,e,'slash'),N.AscensionPower.profile(p).damage*1.25);
});
test('National Mandate triggers from the real ritual, and principal/elite renewal is once per kill',()=>{
  const {N,g}=setup(15),p=g.player,e=enemy(N,g,200);g.input.aim={active:true,x:0,y:0};assert.ok(g.abilities.begin());assert.ok(g.abilities.release());
  assert.ok(e.hp<e.maxHp);assert.equal(e.exposed,4);assert.equal(e.slow,2);
  p.hp=50;p.progress.aegisRemaining=8;e.elite=true;e.hp=1;e.hit(10);const healed=p.hp;
  assert.equal(healed,50+p.maxHp*.03);assert.equal(p.progress.aegisRemaining,6);e.hit(10);assert.equal(p.hp,healed);
});
test('advanced unfinished trials interrupt safely and malformed future completion IDs are rejected',()=>{
  const {N,g,create}=setup(10);qualify(N,g);g.wave=200;clearedGuardian(g);assert.ok(N.AscensionTrials.start(g));g.checkpoint('intermission');
  const loaded=create();assert.ok(loaded.continueRun());assert.equal(loaded.player.ascension.currentTier,'s-minus');assert.equal(loaded.player.ascension.lastTrial.id,'trial-s-plus');assert.equal(loaded.player.ascension.lastTrial.outcome,'interrupted');
  const s=JSON.parse(JSON.stringify(loaded.player.ascension));s.completedTrials.push('trial-national-power');assert.equal(N.Ascension.valid(s),false);
});
test('world-origin rebasing cannot fabricate trial movement',()=>{
  const {N,g}=setup(10);qualify(N,g);g.wave=200;g.player.x=999999;clearedGuardian(g);assert.ok(N.AscensionTrials.start(g));
  g.input.keys.add('KeyD');g.update(1/60);assert.ok(g.player.x<10);assert.ok(g.player.ascension.pendingTrial.distance>0&&g.player.ascension.pendingTrial.distance<10);
});
test('Commanding Presence respects boss resistance while slowing ordinary foes',()=>{
  const {N,g}=setup(12),ordinary=enemy(N,g),boss=enemy(N,g,100,'overlord');N.AscensionPower.ritual(g);
  assert.equal(ordinary.slow,2);assert.equal(boss.slow,0);assert.equal(ordinary.hp,ordinary.maxHp);
});
test('an already-recognized weak legacy build keeps its tier and never compounds saved base damage',()=>{
  const {N,g,create,root}=setup();const fixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/legacy/wave50.json'),'utf8'));
  g.save.importData(JSON.stringify(fixture));assert.ok(g.continueRun());const damage=g.player.damage,hp=g.player.maxHp;
  assert.equal(g.player.ascension.currentTier,'c-plus');assert.equal(N.Ascension.evaluate(g.player,g).eligible,false);assert.equal(N.Ascension.evaluate(g.player,g).requirements.find(r=>r.id==='trainedSchools').recognizedFromLegacy,false);
  for(let i=0;i<4;i++){
    const loaded=create();assert.ok(loaded.continueRun());assert.equal(loaded.player.ascension.currentTier,'c-plus');
    assert.equal(loaded.player.damage,damage);assert.equal(loaded.player.maxHp,hp);assert.equal(N.AscensionPower.profile(loaded.player).damage,2.25);
    loaded.checkpoint('wave');
  }
});
