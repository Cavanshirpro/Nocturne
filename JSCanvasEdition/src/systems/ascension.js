/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
(() => {
  'use strict';const N=window.Nocturne,T=N.ASCENSION_TIERS,by=N.ASCENSION_BY_ID;
  const count=n=>Number.isSafeInteger(n)&&n>=0;
  N.Ascension={
    create(){return {schema:1,currentTier:T[0].id,highestTier:T[0].id,unlockedTiers:[T[0].id],progress:{completedWaves:0,guardians:0},completedTrials:[],discoveredAspects:[],legacyRecognition:null,pendingTrial:null,lastTrial:null,history:[]};},
    valid(s){
      if(!s||s.schema!==1||!by[s.currentTier]||s.highestTier!==s.currentTier||!s.progress||!count(s.progress.completedWaves)||!count(s.progress.guardians))return false;
      const order=by[s.currentTier].order;
      if(!Array.isArray(s.unlockedTiers)||JSON.stringify(s.unlockedTiers)!==JSON.stringify(T.slice(0,order+1).map(t=>t.id)))return false;
      if(!Array.isArray(s.completedTrials)||s.completedTrials.length>15||s.completedTrials.some(x=>!T.some(t=>t.trial===x&&t.order<=order))||new Set(s.completedTrials).size!==s.completedTrials.length)return false;
      if(!Array.isArray(s.discoveredAspects)||s.discoveredAspects.length!==0)return false;
      if(!Array.isArray(s.history)||s.history.length>15||!s.history.every((h,i)=>h&&by[h.tier]?.order===i+1&&['legacy','trial'].includes(h.source)&&count(h.wave)))return false;
      if(s.history.length!==order)return false;
      if(s.pendingTrial!==null){const p=s.pendingTrial,tier=T[order+1],trial=tier&&N.ASCENSION_TRIALS?.[tier.trial];if(!trial||p?.id!==tier.trial||!['elapsed','distance','lastX','lastY','warningClock','startDashes'].every(k=>Number.isFinite(p[k]))||p.elapsed<0||p.elapsed>trial.duration||p.distance<0||p.warningClock<0||p.warningClock>trial.warningEvery||!count(p.startDashes))return false;}
      if(s.lastTrial!==null&&(!['failed','interrupted','completed'].includes(s.lastTrial?.outcome)||!T.some(t=>t.trial===s.lastTrial.id)||typeof s.lastTrial.reason!=='string'||s.lastTrial.reason.length>180))return false;
      if(s.legacyRecognition?.evidence&&!Object.values(s.legacyRecognition.evidence).every(count))return false;
      if(s.legacyRecognition?.schoolRanks&&!N.SPELL_IDS.every(id=>count(s.legacyRecognition.schoolRanks[id])))return false;
      if(s.legacyRecognition!==null){const r=s.legacyRecognition;if(r?.schema!==1||!['2','3','4'].includes(String(r.sourceSchema))||typeof r.fingerprint!=='string'||!/^[0-9a-f]{8}$/.test(r.fingerprint)||typeof r.presented!=='boolean'||!['level','completedWaves','schools','evolved','mastered','guardians'].every(k=>count(r[k]))||!['world','merchant','restart','preparation'].includes(r.restored))return false;}
      return true;
    },
    tier(p){return by[p.ascension?.currentTier]||T[0];},
    evidence(p,g,tier=null){
      const ranks=N.SPELL_IDS.map(id=>p.weapons?.[id]||0),evolved=N.SPELL_IDS.filter(id=>ranks[N.SPELL_IDS.indexOf(id)]>=4&&p.relics?.[N.WEAPONS[id].relic]);
      const mastered=N.SPELL_IDS.filter(id=>(p.progress?.mastery?.[id]||0)>0);
      return {completedWaves:p.ascension?.progress.completedWaves||0,guardians:p.ascension?.progress.guardians||0,level:p.level,schools:ranks.filter(n=>n>0).length,developed:ranks.reduce((sum,n)=>sum+Math.min(8,n),0),elites:Math.max(0,Math.floor(g?.stats?.elites||0)),evolved:evolved.length,mastered:mastered.length,evolvedOrMastered:new Set([...evolved,...mastered]).size,trainedSchools:tier?ranks.filter(n=>n>=tier.trainingRank).length:0,masteredSchools:mastered.length,masteryPoints:N.SPELL_IDS.reduce((sum,id)=>Math.min(Number.MAX_SAFE_INTEGER,sum+(p.progress?.mastery?.[id]||0)),0),buildPower:N.Difficulty.assess(p).rating};
    },
    evaluate(p,g,tierId=this.next(p)?.id){
      const tier=by[tierId];if(!tier)return {eligible:false,requirements:[],missingRequirements:[],trialAvailable:false,advancementAvailable:false,implemented:false};
      const e=this.evidence(p,g,tier),legacy=p.ascension?.legacyRecognition,historical=legacy?.evidence||legacy||{};
      const requirements=tier.requirements.map(r=>({...r,current:e[r.id]||0,completed:(e[r.id]||0)>=r.required,recognizedFromLegacy:!!legacy&&(r.id==='trainedSchools'?(legacy.schoolRanks?N.SPELL_IDS.filter(id=>legacy.schoolRanks[id]>=tier.trainingRank).length:0):r.id==='masteredSchools'?(historical.masteredSchools??historical.mastered??0):(historical[r.id]||0))>=r.required}));
      const previous=this.tier(p).order+1===tier.order,eligible=previous&&requirements.every(r=>r.completed),trialCompleted=p.ascension.completedTrials.includes(tier.trial);
      return {tierId,eligible,requirements,missingRequirements:requirements.filter(r=>!r.completed),trialAvailable:eligible&&tier.progressionImplemented&&!trialCompleted,advancementAvailable:eligible&&trialCompleted&&tier.progressionImplemented,implemented:tier.progressionImplemented,trialCompleted};
    },
    next(p){return T[this.tier(p).order+1]||null;},
    award(p,tierId,source,wave){
      const t=by[tierId];if(!t||t.order!==this.tier(p).order+1)return false;
      p.ascension.currentTier=p.ascension.highestTier=tierId;p.ascension.unlockedTiers.push(tierId);p.ascension.history.push({tier:tierId,source,wave});return true;
    },
    advance(p,g,tierId){
      const result=this.evaluate(p,g,tierId);if(!result.advancementAvailable)return false;
      if(!this.award(p,tierId,'trial',g.wave))return false;
      const achievements=g.save.data.profile.achievements,id=by[tierId].achievement.id;if(!achievements.includes(id))achievements.push(id);g.checkpoint(N.WaveCycle.preparing(g)?'intermission':'wave');g.ui.banner(by[tierId].notification,'A RARE BREAKTHROUGH · '+by[tierId].theme.toUpperCase());return true;
    },
    completedWave(g){const s=g.player.ascension;s.progress.completedWaves=Math.max(s.progress.completedWaves,g.wave);s.progress.guardians++;},
    abortInterrupted(g){const s=g.player.ascension;if(!s.pendingTrial)return;const id=s.pendingTrial.id;s.pendingTrial=null;s.lastTrial={id,outcome:'interrupted',reason:'Trial interrupted by reload. Preparation restored; no reward granted.'};g.combat.clear();}
  };
})();
