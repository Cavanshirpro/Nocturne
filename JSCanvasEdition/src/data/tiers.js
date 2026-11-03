/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
(() => {
  'use strict';const N=window.Nocturne;
  const names=['-E','+E','-D','+D','-C','+C','-B','+B','-A','+A','-S','+S','Local Power','Areal Power','Big Power','National Power'];
  const ids=['e-minus','e-plus','d-minus','d-plus','c-minus','c-plus','b-minus','b-plus','a-minus','a-plus','s-minus','s-plus','local-power','areal-power','big-power','national-power'];
  const waves=[1,4,8,14,22,32,45,60,78,99,124,151,187,225,275,335],levels=[1,4,8,12,18,26,35,45,60,75,95,115,140,170,210,260];
  const themes=['Ember awakened','First controlled flame','Runes understood','A woven arsenal','Rooted spellcraft','Evolved knowledge','Latent aspects','Specialized channels','Interwoven magic','Coven identity','Sovereign mastery','Ashbound command','Local influence','Areal influence','Great influence','National influence'];
  const colors=['#bdac96','#d5bd8c','#b5c6bc','#b0cdc9','#b2b4d9','#c5afe0','#afbedc','#a5cce1','#d8c193','#e0bd82','#ddb2d1','#e7a7d0','#d7bc83','#ddc68f','#e7cf9a','#f1daa5'];
  N.ASCENSION_TIERS=Object.freeze(names.map((name,order)=>Object.freeze({
    id:ids[order],name,order,era:order<6?'Awakening':order<10?'Ascendance':order<12?'Sovereignty':'Dominion',
    palette:Object.freeze({primary:colors[order],background:'#171d27',accent:'#a68b62'}),crest:['◇','✧','⬡','✦','❦','❖','◈','⟡','✺','✵','♛','♜','⌂','⌘','✹','☷'][order],theme:themes[order],earliestWave:waves[order],
    requirements:Object.freeze(order===0?[]:[
      {id:'completedWaves',label:'Completed waves',required:waves[order]-1},
      {id:'level',label:'Character level',required:levels[order]},
      {id:'schools',label:'Learned spell schools',required:Math.min(12,2+Math.floor(order/2))},
      {id:'developed',label:'Developed ranks (each school contributes at most 8)',required:Math.min(96,3+order*4)},
      {id:'guardians',label:'Verified guardian victories',required:Math.max(1,Math.floor(order/2))},
      ...(order>=2?[{id:'elites',label:'Elite victories',required:Math.min(12,order-1)}]:[]),
      ...(order>=5?[{id:'evolvedOrMastered',label:'Evolved or mastered schools',required:Math.min(8,order-4)}]:[])
    ].map(Object.freeze)),
    trial:order===0?null:order===1?'first-ember':'trial-'+ids[order],progressionImplemented:order<=1,
    unlocks:Object.freeze([{id:'crest-'+ids[order],name:'Tier identity and crest',kind:'cosmetic',implemented:true},...(order>=6?[{id:'future-'+ids[order],name:themes[order],kind:order>=11?'world':'spell',implemented:false}]:[])].map(Object.freeze)),
    achievement:Object.freeze({id:'ascension-'+ids[order],title:name+' · '+themes[order]}),notification:'ASCENSION · '+name,
    legacyEligible:order<=5,description:order<=1?'Earned through verified development and the First Ember trial.':'Progress requirements are visible; the unique trial and new gameplay capabilities are future content.',
    accessibilityLabel:`Ascension ${name}, stage ${order+1} of 16, ${themes[order]}`
  })));
  N.ASCENSION_BY_ID=Object.freeze(Object.assign(Object.create(null),Object.fromEntries(N.ASCENSION_TIERS.map(t=>[t.id,t]))));
})();
