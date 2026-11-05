/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
import {createHarness} from '../tests/helpers.mjs';
const results=[];
for(const ranged of [false,true]){
  const {N,create}=createHarness(),g=create();g.reset('moon');g.player.weapons.orbit=4;g.player.relics.cinder=true;g.player.critChance=0;g.combat.cooldown=1e9;g.combat.spellTimers.halo=ranged?.4:1e9;
  const e=new N.Enemy(g,'gargoyle',240,0,++g.nextId);e.hp=e.maxHp=100000;e.speed=0;g.enemies.push(e);g.hash.insert(e);
  for(let i=0;i<600;i++){g.time+=1/60;g.combat.update(1/60);e.update(1/60);}
  results.push({ranged,seconds:10,distance:240,rank:4,playerDamage:g.player.damage,enemyDamage:e.maxHp-e.hp,attributedOrbitDamage:g.stats.weapons.orbit,burning:e.burn>0});
}
console.log(JSON.stringify({method:'Isolated stationary 10-second, rank-IV Cinder fixture, one enemy 240 units away, no crits or other attacks. Old contact-only behavior is represented by disabling only the new ranged timer. Not a win-rate model.',results},null,2));
