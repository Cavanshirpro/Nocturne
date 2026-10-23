/* Content, build choices and bounded late-game progression. */
(() => {
  'use strict';
  const N=window.Nocturne;
  N.SPELL_IDS=['bolt','orbit','lightning','nova','meteor','lance','thorn','rift'];
  N.WEAPONS=Object.freeze({
    bolt:{name:'Arcane Bolt',icon:'✧',color:'#eee5ff',unlock:1,evolution:'Shattered Moon',relic:'mirror',text:'Targets within 430 units. Orbs travel 490 units. Projectile speed also expands range; multicast has no count ceiling.',evolved:'Orbs pierce +1 foe; critical hits explode for 45% damage within 70 units.'},
    orbit:{name:'Moon Wisps',icon:'☽',color:'#e8ba93',unlock:1,evolution:'Cinder Halo',relic:'cinder',text:'1 + rank wisps orbit nearby. Contact damage has a shared 0.65s cooldown per enemy.',evolved:'Contacts ignite foes for two seconds.'},
    lightning:{name:'Chain Lightning',icon:'ϟ',color:'#b6e4ec',unlock:1,evolution:'Thunder Crown',relic:'conductor',text:'Starts within 390 + 18 per additional rank units, chains 170 + 10 per additional rank units to 2 + rank enemies.',evolved:'Two more jumps, 210-unit chains and a short stun.'},
    nova:{name:'Frost Nova',icon:'❄',color:'#b6d6ef',unlock:1,evolution:'Absolute Winter',relic:'permafrost',text:'Slowing pulse within 100 + 17 per rank units.',evolved:'Normal enemies freeze for 0.5s; Wardens resist the freeze.'},
    meteor:{name:'Ember Meteor',icon:'☄',color:'#f0ac7e',unlock:4,evolution:'Solar Ruin',relic:'sunstone',text:'Marks a foe within 370 units. After 0.65s, a meteor strikes a 65 + 7 per rank area.',evolved:'The impact ignites survivors for 3s and leaves a second shockwave.'},
    lance:{name:'Soul Lance',icon:'⟡',color:'#d9bcf2',unlock:7,evolution:'Requiem',relic:'soulchain',text:'A 410-unit piercing beam hits up to 2 + rank foes in a straight line.',evolved:'Hits expose enemies for 2s: they take 12% more damage.'},
    thorn:{name:'Thorn Sigil',icon:'❦',color:'#a8d4a2',unlock:10,evolution:'Briar Court',relic:'thornheart',text:'Leaves a fixed 3.2s bramble circle behind your movement. Ticks every 0.65s and slows foes.',evolved:'The first pulse briefly roots normal enemies. Circle radius grows by 15 units.'},
    rift:{name:'Abyss Rift',icon:'◉',color:'#aaadee',unlock:14,evolution:'Event Horizon',relic:'voidglass',text:'A 2.2s vortex within 350 units pulls enemies inward and pulses every 0.5s.',evolved:'The closing vortex detonates. Wardens resist its pull.'}
  });
  N.TALENTS=Object.freeze({
    scavenger:{name:'Scavenger pact',icon:'◈',level:3,text:'Every 10 kills: +1 gold per rank. No rank ceiling.'},
    kindling:{name:'Cinder script',icon:'♨',level:5,text:'Arcane critical hits ignite survivors. Burn strength grows with rank.'},
    veil:{name:'Veil bloom',icon:'❄',level:6,text:'Dashing leaves a small slowing seal. Radius increases with rank; no rank ceiling.'},
    frostbite:{name:'Brittle winter',icon:'◇',level:8,text:'Deal +5% damage per rank to slowed or frozen enemies. No rank ceiling.'},
    bloodledger:{name:'Blood ledger',icon:'♡',level:9,text:'Every 20 kills restores 2 vitality per rank. No rank ceiling; no overheal.'},
    focus:{name:'Focused ritual',icon:'◎',level:12,text:'Gain +3% damage per rank against foes at or above your level. No rank ceiling.'}
  });
  N.OATHS=Object.freeze({
    ember:{name:'Ember oath',icon:'♨',text:'+10% spell damage for the next wave.'},
    stone:{name:'Stone oath',icon:'⬡',text:'Start the next wave with 35 absorbing shield. Unused shield expires.'},
    wisdom:{name:'Scholar oath',icon:'✧',text:'+20% collected XP for the next wave.'},
    pilgrim:{name:'Pilgrim oath',icon:'»',text:'+8% movement speed for the next wave.'},
    fortune:{name:'Fortune oath',icon:'◈',text:'+20% earned gold for the next wave.'}
  });
  N.newProgression=p=>({equipped:N.SPELL_IDS.filter(id=>(p.weapons[id]||0)>0),talents:Object.fromEntries(Object.keys(N.TALENTS).map(id=>[id,0])),mastery:Object.fromEntries(N.SPELL_IDS.map(id=>[id,0])),preparedOath:null,activeOath:null,shield:0,xpCarry:0,goldCarry:0});
  N.validProgression=(q,p)=>{
    if(!q||!Array.isArray(q.equipped)||q.equipped.length<1||q.equipped.length>N.SPELL_IDS.length||new Set(q.equipped).size!==q.equipped.length||!q.equipped.every(id=>N.SPELL_IDS.includes(id)&&(p.weapons[id]||0)>0))return false;
    if(!q.talents||!Object.keys(N.TALENTS).every(id=>Number.isInteger(q.talents[id])&&q.talents[id]>=0&&Number.isSafeInteger(q.talents[id])))return false;
    if(!q.mastery||!N.SPELL_IDS.every(id=>Number.isInteger(q.mastery[id])&&q.mastery[id]>=0&&Number.isSafeInteger(q.mastery[id])))return false;
    if(![q.preparedOath,q.activeOath].every(id=>id===null||Object.hasOwn(N.OATHS,id)))return false;
    return Number.isFinite(q.shield)&&q.shield>=0&&q.shield<=35&&['xpCarry','goldCarry'].every(k=>Number.isFinite(q[k])&&q[k]>=0&&q[k]<1);
  };
  N.outgoingMultiplier=(p,e,source)=>{
    const q=p.progress;
    return (q.activeOath==='ember'?1.1:1)*(1+(q.mastery[source]||0)*.06)*(e.level>=p.level?1+q.talents.focus*.03:1)*
      (e.slow>0||e.frozen>0?1+q.talents.frostbite*.05:1)*(e.exposed>0?1.12:1);
  };
  N.applyBurn=(e,seconds,damage,source)=>{e.burn=Math.max(e.burn,seconds);if(damage>=e.burnDamage||e.burnTick<=0){e.burnDamage=damage;e.burnSource=source;}e.burnTick=Math.max(.1,e.burnTick);};
})();
