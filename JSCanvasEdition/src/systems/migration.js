/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
(() => {
  'use strict';const N=window.Nocturne,clone=x=>JSON.parse(JSON.stringify(x));
  function fingerprint(value){let hash=2166136261;for(const ch of JSON.stringify(value)){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16).padStart(8,'0');}
  N.Migration={
    evaluateLegacyAscension(checkpoint,profile={},sourceSchema=3){
      const c=checkpoint,p=c.player,s=N.Ascension.create(),completedWaves=Math.max(0,c.wave-(c.phase==='shop'||c.phase==='intermission'?0:1));
      // bestWave/profile boss totals can refer to another ritual or an unfinished wave.
      const knownGuardianRules=p.progress?.aegisRemaining!==undefined||!!c.world?.sanctum;
      s.progress={completedWaves,guardians:knownGuardianRules?Math.min(completedWaves,Math.floor(c.stats?.bosses||0)):0};
      const subject={...p,coven:c.coven,ascension:s},e=N.Ascension.evidence(subject,{stats:c.stats});
      for(const tier of N.ASCENSION_TIERS.slice(1,6)){
        if(!tier.legacyRequirements.every(r=>(e[r.id]||0)>=r.required))break;
        N.Ascension.award(subject,tier.id,'legacy',completedWaves);
      }
      s.legacyRecognition={schema:1,sourceSchema,evidence:{...e},schoolRanks:Object.fromEntries(N.SPELL_IDS.map(id=>[id,p.weapons[id]||0])),fingerprint:fingerprint({coven:c.coven,wave:c.wave,phase:c.phase,player:p,stats:c.stats}),presented:false,level:p.level,completedWaves,schools:e.schools,evolved:e.evolved,mastered:e.mastered,guardians:e.guardians,restored:c.phase==='shop'?'merchant':c.phase==='intermission'?'preparation':c.world?'world':'restart'};
      return s;
    },
    checkpoint(original,profile,sourceSchema){
      if(!original)return null;const c=clone(original);
      if(!c.player.ascension)c.player.ascension=this.evaluateLegacyAscension(c,profile,sourceSchema);
      if(c.schema===2){
        c.schema=3;
        const preparing=c.phase==='shop';
        c.cycle={schema:1,phase:preparing?'INTERMISSION':c.world?.sanctum?.phase==='fighting'?'GUARDIAN_FIGHT':c.world?.sanctum?'SANCTUM_HUNT':'COMBAT',completedWave:Math.max(0,c.wave-(preparing?0:1)),remaining:preparing?N.WaveCycle.duration(c.wave):0,shopPrepared:preparing};
        if(preparing){c.phase='intermission';c.menu='shop';}
      }
      return c;
    }
  };
})();
