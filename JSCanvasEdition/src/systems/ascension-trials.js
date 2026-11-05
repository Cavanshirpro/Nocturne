/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
(() => {
  'use strict';const N=window.Nocturne;
  N.ASCENSION_TRIALS=Object.freeze(Object.fromEntries(N.ASCENSION_TIERS.slice(1).map(t=>{
    const n=t.order,first=n===1;
    return [t.trial,Object.freeze({id:t.trial,tierId:t.id,name:first?'First Ember':t.name+' · '+t.power.name,
      implemented:true,duration:first?20:20+n*2,distance:first?250:350+n*80,dashes:first?1:1+Math.ceil(n/2),
      warningEvery:first?4:4-n*.12,warningDelay:first?1.2:1.2-n*.025,radius:first?50:50+n*2,
      description:first?'Move 250 units and dash once in 20 seconds. Warnings are nonlethal; being caught fails the trial.':`Complete ${20+n*2} seconds, move ${350+n*80} units and dash ${1+Math.ceil(n/2)} times. Cross seals and shock rings join aimed warnings. No XP, gold or enemies.`})];
  })));
  N.AscensionTrials={
    current(g){return N.ASCENSION_TRIALS[g.player.ascension.pendingTrial?.id]||null;},
    start(g){
      const p=g.player,s=p.ascension,e=N.Ascension.evaluate(p,g),tier=N.Ascension.next(p),c=tier&&N.ASCENSION_TRIALS[tier.trial];
      if(!c||!N.WaveCycle.preparing(g)||g.state!=='playing'||!e.trialAvailable||s.pendingTrial||p.pendingLevels>0)return false;
      g.combat.clear();g.abilities.cancel();s.pendingTrial={id:c.id,elapsed:0,distance:0,lastX:p.x,lastY:p.y,warningClock:0,startDashes:g.stats.dashes};
      g.ui.banner(c.name.toUpperCase(),'MOVE THROUGH THE WARNINGS · USE VEILSTEP');g.checkpoint('intermission');return true;
    },
    finish(g,outcome,reason){
      const p=g.player,s=p.ascension,t=s.pendingTrial,c=this.current(g);if(!t||!c)return false;
      if(!['completed','failed'].includes(outcome)||outcome==='completed'&&(!N.WaveCycle.preparing(g)||g.state!=='playing'||t.elapsed<c.duration||t.distance<c.distance||g.stats.dashes-t.startDashes<c.dashes||!N.Ascension.evaluate(p,g,c.tierId).eligible))return false;
      s.pendingTrial=null;s.lastTrial={id:c.id,outcome,reason};g.combat.clear();g.abilities.cancel();
      if(outcome==='completed'){
        if(!s.completedTrials.includes(c.id))s.completedTrials.push(c.id);
        N.Ascension.advance(p,g,c.tierId);
      }else g.ui.toast(c.name+': '+reason);
      g.checkpoint('intermission');return true;
    },
    warnings(g,t,c){
      const p=g.player,n=N.ASCENSION_BY_ID[c.tierId].order,sequence=Math.floor(t.elapsed/c.warningEvery);
      if(n>=4&&sequence%3===2){
        g.combat.hazard(p.x,p.y,135+n*2,c.warningDelay,0,.18,{kind:'ring',inner:65,angle:Math.atan2(p.lastY,p.lastX),gap:1.2});
      }else{
        g.combat.hazard(p.x,p.y,c.radius,c.warningDelay,0,.18);
        if(n>=3&&sequence%3===1){
          const a=Math.atan2(p.lastY,p.lastX)+Math.PI/2,d=c.radius*1.7;
          for(const side of [-1,1])g.combat.hazard(p.x+Math.cos(a)*d*side,p.y+Math.sin(a)*d*side,c.radius,c.warningDelay,0,.18,{kind:'seal'});
        }
      }
    },
    update(g,dt){
      const p=g.player,t=p.ascension.pendingTrial,c=this.current(g);if(!t||!c)return;
      t.elapsed=Math.min(c.duration,t.elapsed+dt);t.distance+=Math.hypot(p.x-t.lastX,p.y-t.lastY);t.lastX=p.x;t.lastY=p.y;t.warningClock-=dt;
      if(t.warningClock<=0&&t.elapsed<c.duration-1.5){this.warnings(g,t,c);t.warningClock=c.warningEvery;}
      // Identical ring gaps and safe inner core to actual combat/rendering.
      for(const h of g.combat.hazards.active)if(h.age+dt>=h.delay&&h.age<h.delay+h.duration&&N.Fields.contains(h,p)&&p.invulnerable<=0&&p.progress.aegisTime<=0){this.finish(g,'failed','A warning caught you. Preparation is preserved; try again.');return;}
      g.combat.update(dt);
      if(t.elapsed>=c.duration){const met=t.distance>=c.distance&&g.stats.dashes-t.startDashes>=c.dashes;this.finish(g,met?'completed':'failed',met?'Ascension ordeal mastered.':`Move ${c.distance} units and use Veilstep ${c.dashes} times.`);}
    }
  };
})();
