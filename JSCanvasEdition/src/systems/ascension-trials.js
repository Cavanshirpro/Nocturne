/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
(() => {
  'use strict';const N=window.Nocturne,C=N.WORLD_CONFIG.introTrial;
  N.ASCENSION_TRIALS=Object.freeze({...Object.fromEntries(N.ASCENSION_TIERS.slice(2).map(t=>[t.trial,Object.freeze({id:t.trial,name:t.theme+' trial',implemented:false,description:'Planned unique trial. Not available in this release; historical milestone recognition does not pass this trial.'})])),'first-ember':Object.freeze({id:C.id,name:'First Ember',implemented:true,description:'Survive 20 seconds of existing impact warnings, move 250 units and dash once. A warning caught without dash/Aegis fails the trial; it does not damage or reward the character.'})});
  N.AscensionTrials={
    start(g){
      const p=g.player,s=p.ascension,e=N.Ascension.evaluate(p,g);
      if(!N.WaveCycle.preparing(g)||g.state!=='playing'||!e.trialAvailable||s.pendingTrial||s.completedTrials.includes(C.id)||p.pendingLevels>0)return false;
      g.combat.clear();g.abilities.cancel();s.pendingTrial={id:C.id,elapsed:0,distance:0,lastX:p.x,lastY:p.y,warningClock:0,startDashes:g.stats.dashes};
      g.ui.banner('FIRST EMBER','MOVE THROUGH THE WARNINGS · DASH ONCE');g.checkpoint('intermission');return true;
    },
    finish(g,outcome,reason){
      const s=g.player.ascension,t=s.pendingTrial;if(!t)return false;
      if(!['completed','failed'].includes(outcome)||outcome==='completed'&&(!N.WaveCycle.preparing(g)||g.state!=='playing'||t.elapsed<C.duration||t.distance<C.distance||g.stats.dashes-t.startDashes<C.dashes))return false;
      s.pendingTrial=null;s.lastTrial={id:C.id,outcome,reason};g.combat.clear();g.abilities.cancel();
      if(outcome==='completed'){
        if(!s.completedTrials.includes(C.id))s.completedTrials.push(C.id);
        N.Ascension.advance(g.player,g,N.ASCENSION_TIERS[1].id);
      }else g.ui.toast('First Ember: '+reason);
      g.checkpoint('intermission');return true;
    },
    update(g,dt){
      const p=g.player,s=p.ascension,t=s.pendingTrial;if(!t)return;
      t.elapsed=Math.min(C.duration,t.elapsed+dt);t.distance+=Math.hypot(p.x-t.lastX,p.y-t.lastY);t.lastX=p.x;t.lastY=p.y;t.warningClock-=dt;
      if(t.warningClock<=0&&t.elapsed<C.duration-1.5){g.combat.hazard(p.x,p.y,C.radius,C.warningDelay,0,.16);t.warningClock=C.warningEvery;}
      // Check before Combat's zero-damage block response can grant invulnerability.
      for(const h of g.combat.hazards.active)if(h.age+dt>=h.delay&&h.age<h.delay+h.duration&&N.dist2(h,p)<(h.radius+p.radius)**2&&p.invulnerable<=0&&p.progress.aegisTime<=0){this.finish(g,'failed','A warning caught you. Preparation is preserved; try again.');return;}
      g.combat.update(dt);
      if(t.elapsed>=C.duration){const met=t.distance>=C.distance&&g.stats.dashes-t.startDashes>=C.dashes;this.finish(g,met?'completed':'failed',met?'First Ember mastered.':'Move at least 250 units and use Veilstep once.');}
    }
  };
})();
