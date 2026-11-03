/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
// Synthetic fixtures derived from real checkpoint fields; never reads a user's saves.
import fs from 'node:fs';import path from 'node:path';import {createHarness} from './helpers.mjs';
const h=createHarness(),{N}=h,folder=path.join(h.root,'tests/fixtures/legacy');fs.mkdirSync(folder,{recursive:true});
const cases=[['new',1,1,1,1,false],['early',5,6,2,4,false],['wave20',20,24,4,4,false],['wave50',50,60,6,8,true],['wave150',150,200,12,16,true],['extreme',1,100000,1,1000000,true]];
for(const [name,wave,level,schools,rank,evolved] of cases){
  const g=h.create();g.reset();g.wave=wave;g.player.level=level;g.player.xpNeeded=Math.floor(8+(level-1)*5+(level-1)**1.25);g.player.gold=101;
  for(const id of N.SPELL_IDS.slice(0,schools)){g.player.weapons[id]=rank;if(evolved){g.player.relics[N.WEAPONS[id].relic]=true;g.player.progress.mastery[id]=3;}}
  g.player.progress.equipped=N.SPELL_IDS.filter(id=>g.player.weapons[id]>0);g.stats.bosses=wave-1;g.stats.elites=wave>10?10:0;g.stats.dashes=wave>1?2:0;
  if(name==='extreme')g.player.damage=1e100;
  N.Difficulty.start(g);g.checkpoint('wave');const c=JSON.parse(JSON.stringify(g.save.data.checkpoint));c.schema=2;delete c.cycle;delete c.menu;delete c.player.ascension;
  const container={schema:3,activeSlotId:1,nextSlotId:2,settings:g.save.data.settings,slots:[{id:1,name:'Synthetic '+name,profile:{runs:0,bestWave:wave,bestKills:0,bestTime:0,bosses:wave-1,achievements:[]},checkpoint:c}]};
  fs.writeFileSync(path.join(folder,name+'.json'),JSON.stringify(container,null,2)+'\n');
}
console.log('Created six synthetic v3-container / v2-checkpoint fixtures.');
