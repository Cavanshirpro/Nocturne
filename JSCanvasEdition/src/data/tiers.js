/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
(() => {
  'use strict';const N=window.Nocturne;
  const names=['-E','+E','-D','+D','-C','+C','-B','+B','-A','+A','-S','+S','Local Power','Areal Power','Big Power','National Power'];
  const ids=['e-minus','e-plus','d-minus','d-plus','c-minus','c-plus','b-minus','b-plus','a-minus','a-plus','s-minus','s-plus','local-power','areal-power','big-power','national-power'];
  const legacyWaves=[1,4,8,14,22,32,45,60,78,99,124,151,187,225,275,335],legacyLevels=[1,4,8,12,18,26,35,45,60,75,95,115,140,170,210,260];
  const waves=[1,2,3,4,6,9,13,19,27,37,51,69,91,119,153,196],levels=[1,8,18,28,42,60,82,110,145,185,235,295,365,445,535,640];
  const depth=[0,3,5,8,12,18,25,34,46,62,82,108,140,180,228,285],schools=[1,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9],trained=[0,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9];
  const mastery=[0,0,1,3,6,10,16,24,34,46,60,78,100,126,156,190],mastered=[0,0,1,2,2,3,3,4,4,5,5,6,6,7,8,9],evolved=[0,0,0,1,2,2,3,3,4,4,5,5,6,6,7,8];
  const damage=[1,1.18,1.38,1.62,1.9,2.25,2.65,3.12,3.7,4.4,5.25,6.3,7.6,9.2,11.2,13.7];
  const powers=[['Initiate','Base spellcraft.'],['Kindled Focus','18% more spell damage; rank bonuses apply without changing your stored stats.'],['Emberwake','Veilstep releases a damaging 90-unit pulse during combat.'],['Runic Channel','Directed rituals recover faster, alongside stronger spellcraft.'],['Briar Convergence','Deal 20% more damage to slowed, frozen or exposed foes.'],['Evolved Resonance','Evolved or mastered spell schools deal 25% more damage.'],['Veil Fracture','Emberwake exposes foes for 2 seconds.'],['Flow State','A successful dash removes 2 seconds from the directed ritual cooldown.'],['Winterwake','Emberwake slows foes for 2 seconds and briefly freezes ordinary enemies.'],['Coven Bond','Demon power rises by 15%; Aegis absorbs 20% more damage.'],['Sovereign Edge','Deal 20% more damage to bosses and elite enemies.'],['Ashbound Renewal','Defeating an elite or principal boss heals 3% vitality and removes 2 seconds from Aegis recovery.'],['Commanding Presence','Directed rituals slow nearby ordinary foes within 220 units.'],['Areal Reach','Emberwake reaches 180 units; directed rituals deal 25% more damage.'],['Unbroken Aegis','Raising Aegis clears casting silence and grants 2 seconds of seal grace.'],['National Mandate','Directed rituals also release a 260-unit damaging, exposing pulse.']];
  const themes=['Ember awakened','First controlled flame','The ember wake','Runic channels','Briar convergence','Evolved resonance','Veil fracture','Flow state','Winterwake','Coven bond','Sovereign edge','Ashbound renewal','Commanding presence','Areal reach','Unbroken Aegis','National mandate'];
  const colors=['#bdac96','#d5bd8c','#b5c6bc','#b0cdc9','#b2b4d9','#c5afe0','#afbedc','#a5cce1','#d8c193','#e0bd82','#ddb2d1','#e7a7d0','#d7bc83','#ddc68f','#e7cf9a','#f1daa5'];
  N.ASCENSION_TIERS=Object.freeze(names.map((name,order)=>Object.freeze({
    id:ids[order],name,order,era:order<6?'Awakening':order<10?'Ascendance':order<12?'Sovereignty':'Dominion',
    palette:Object.freeze({primary:colors[order],background:'#171d27',accent:'#a68b62'}),crest:['◇','✧','⬡','✦','❦','❖','◈','⟡','✺','✵','♛','♜','⌂','⌘','✹','☷'][order],theme:themes[order],earliestWave:waves[order],
    trainingRank:depth[order],
    requirements:Object.freeze(order===0?[]:[
      {id:'completedWaves',label:'Completed waves',required:waves[order]-1},
      {id:'level',label:'Character level',required:levels[order]},
      {id:'schools',label:'Learned spell schools',required:schools[order]},
      {id:'trainedSchools',label:`Schools trained to rank ${depth[order]} or higher`,required:trained[order]},
      {id:'guardians',label:'Verified guardian victories',required:waves[order]-1},
      ...(order>=2?[{id:'masteryPoints',label:'Total spell mastery ranks',required:mastery[order]},{id:'masteredSchools',label:'Distinct mastered schools',required:mastered[order]},{id:'elites',label:'Elite victories',required:order*3}]:[]),
      ...(evolved[order]?[{id:'evolved',label:'Distinct evolved schools',required:evolved[order]}]:[])
    ].map(Object.freeze)),
    // Frozen v0.8.0 retrospective rules preserve historical awards independently of live balance.
    legacyRequirements:Object.freeze(order===0?[]:[
      {id:'completedWaves',required:legacyWaves[order]-1},{id:'level',required:legacyLevels[order]},
      {id:'schools',required:Math.min(12,2+Math.floor(order/2))},{id:'developed',required:Math.min(96,3+order*4)},
      {id:'guardians',required:Math.max(1,Math.floor(order/2))},
      ...(order>=2?[{id:'elites',required:Math.min(12,order-1)}]:[]),
      ...(order>=5?[{id:'evolvedOrMastered',required:Math.min(8,order-4)}]:[])
    ].map(Object.freeze)),
    trial:order===0?null:order===1?'first-ember':'trial-'+ids[order],progressionImplemented:true,
    power:Object.freeze({damage:damage[order],taken:1-order*.025,speed:1+order*.01,recovery:1+order*.03,dashRecovery:1+order*.025,name:powers[order][0],description:powers[order][1]}),
    unlocks:Object.freeze([{id:'crest-'+ids[order],name:'Tier identity and crest',kind:'cosmetic',implemented:true},...(order?[{id:'power-'+ids[order],name:powers[order][0]+' — '+powers[order][1],kind:'combat',implemented:true}]:[])].map(Object.freeze)),
    achievement:Object.freeze({id:'ascension-'+ids[order],title:name+' · '+themes[order]}),notification:'ASCENSION · '+name,
    legacyEligible:order<=5,description:'Earned through independent development requirements and a verified Ascension ordeal. Combat benefits are cumulative.',
    accessibilityLabel:`Ascension ${name}, stage ${order+1} of 16, ${themes[order]}`
  })));
  N.ASCENSION_BY_ID=Object.freeze(Object.assign(Object.create(null),Object.fromEntries(N.ASCENSION_TIERS.map(t=>[t.id,t]))));
})();
