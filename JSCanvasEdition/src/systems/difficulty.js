/*
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade
This file is part of Nocturne. See the distribution's LICENSE and NOTICE files.
*/
/* Build-aware encounter budgets. Smooth, bounded pressure leaves upgrade gains intact. */
(() => {
  'use strict';
  const N=window.Nocturne,log=x=>Math.log(Math.max(Number.MIN_VALUE,x));
  const sum=values=>{const m=Math.max(...values);return m+Math.log(values.reduce((s,v)=>s+Math.exp(v-m),0));};
  const specs={lightning:[2.8,.65,.15,2],nova:[5,.7,.2,2],meteor:[3.6,1.25,.22,1.7],lance:[2.6,.8,.14,1.4],thorn:[4.5,.25,.07,2],rift:[6,.25,.08,2.5],rapid:[.13,.26,.035,1],cannon:[2.6,3.6,.6,1.15],burst:[1.9,.55,.08,2],glacier:[3.7,.9,.16,1.7]};
  function offense(p,boss=false){
    const w=p.weapons||{},q=p.progress||{},damage=log(p.damage),haste=-log(p.attackInterval),multi=log(p.projectileCount),crit=sum([0,log(p.critChance)+log(Math.max(Number.MIN_VALUE,p.critMultiplier-1))]);
    const accuracy=boss?log(.62+.38*Math.exp(-(p.projectileCount-1)/7)):0;
    const spells=[damage+haste+log(1+.15*Math.max(0,(w.bolt||1)-1))+multi+accuracy];
    for(const [id,[interval,base,per,coverage]] of Object.entries(specs))if(w[id]>0){
      const rank=w[id],projectile=['rapid','cannon','burst','glacier'].includes(id);
      spells.push(damage+haste+log(.56/interval)+log(base+per*rank)+Math.log1p(.11*(rank-1))+
        log(boss?1:coverage)+(projectile?multi+accuracy:0)+Math.log1p(.06*(q.mastery?.[id]||0))+(p.relics?.[N.WEAPONS[id].relic]&&rank>=4?.16:0));
    }
    if(w.orbit>0)spells.push(damage+log((.34+.09*w.orbit)/.65)+.35*Math.log1p(w.orbit));
    const special=q.special||'slash',rank=q.arsenal?.[special]||1;
    const ritual=special==='frostfall'?(2.2+.3*rank)/12:special==='soulstorm'?(1.3+.2*rank)*(boss?1.5:4)/14:(3.6+.4*rank)/8;
    spells.push(damage+log(ritual)+Math.log1p(.06*(rank-1)));
    return sum(spells)+crit+.14*Math.log1p(p.pierce)+.10*log(Math.max(1,p.projectileSpeed/510))+
      .08*log(1+(q.talents?.kindling||0)+(q.talents?.frostbite||0)+(q.talents?.focus||0))+(q.activeOath==='ember'?log(1.1):0);
  }
  function baseline(coven){
    return {damage:coven==='ash'?18:14,attackInterval:coven==='storm'?.66:.56,projectileCount:1,critChance:.1,critMultiplier:1.85,pierce:0,projectileSpeed:510,
      weapons:{bolt:1,orbit:coven==='moon'?1:0,lightning:coven==='storm'?1:0},progress:{},relics:{}};
  }
  N.Difficulty={
    assess(p){
      const ref=baseline(p.coven),off=offense(p),base=offense(ref),baseHp=p.coven==='ash'?110:p.coven==='moon'?90:85;
      const defense=log(p.maxHp/baseHp)+Math.log1p(p.armor)+.25*Math.log1p(p.regen*8/baseHp)+.05*Math.log1p(p.progress?.talents?.bloodledger||0);
      const mobility=.7*log(Math.max(1,p.speed/195))+.3*log(Math.max(1,3.2/p.dashCooldown));
      const power=Math.max(0,.60*(off-base)+.28*defense+.12*mobility);
      const surplus=Math.max(0,power-Math.log1p(.08*(p.level-1)));
      return {rating:Math.round(100*(1+power)),pressure:N.clamp(surplus,0,3.5),logDps:offense(p,true),logDefense:defense,logMobility:mobility};
    },
    values(g,pressure){
      const level=g.player.level,mature=N.clamp((level-8)/32,0,1);
      const effectiveLevel=Math.max(level,Math.round(level+Math.min(level*.85+8,pressure*(3+level*.22))));
      const fodder=.55+.25*mature-.035*pressure,veteran=.10-.05*mature+.008*pressure;
      return {level,pressure,effectiveLevel,effectiveWave:g.wave+Math.floor(pressure*1.5),spawnMultiplier:1+.22*pressure,
        aliveBudget:Math.min(200,Math.round(28+5*g.wave+12*pressure)),fodder,regular:1-fodder-veteran,veteran};
    },
    start(g,resuming=false){
      if(resuming&&g.difficulty?.plan.wave===g.wave){g.waveDuration=g.difficulty.plan.duration;return;}
      const previous=g.difficulty,last=previous?.lastInvasionWave||0,profile=this.assess(g.player),roll=Math.random();
      const invasionChance=N.clamp(.08+.015*Math.max(0,g.wave-3)+.19*profile.pressure,.08,.9);
      const plan={...this.values(g,profile.pressure),rating:profile.rating,logDps:profile.logDps,wave:g.wave,
        duration:30+Math.min(g.wave-1,6)*5+Math.round(profile.pressure*2),invasionChance,roll,
        invades:g.wave>=(profile.pressure>=1.7?2:3)&&g.wave-last>=(profile.pressure>=1.7?1:3)&&roll<invasionChance};
      g.difficulty={schema:1,plan,lastInvasionWave:last,clock:0};g.waveDuration=plan.duration;
    },
    refresh(g){
      if(!g.difficulty||g.difficulty.plan.wave!==g.wave)this.start(g);
      const plan=g.difficulty.plan,profile=this.assess(g.player),pressure=plan.pressure+N.clamp(profile.pressure-plan.pressure,-.25,.25);
      Object.assign(plan,this.values(g,pressure),{rating:profile.rating,logDps:profile.logDps});
      // Duration, the encounter roll and its chance are fixed for the whole attempt.
    },
    update(g,dt){if(!g.difficulty||g.difficulty.plan.wave!==g.wave)this.start(g);g.difficulty.clock+=dt;if(g.difficulty.clock>=6){g.difficulty.clock=0;this.refresh(g);}},
    current(g){return g.difficulty?.plan.wave===g.wave?{...g.difficulty.plan,...this.values(g,g.difficulty.plan.pressure)}:{...this.values(g,0),rating:100,invades:false};},
    capture(g,recovery=false){return g.difficulty?.plan.wave===g.wave?{schema:1,plan:{...g.difficulty.plan},lastInvasionWave:g.difficulty.lastInvasionWave,clock:recovery?0:g.difficulty.clock}:undefined;},
    valid(d){
      if(d?.schema!==1||!Number.isSafeInteger(d.lastInvasionWave)||d.lastInvasionWave<0||!Number.isFinite(d.clock)||d.clock<0||d.clock>6)return false;
      const p=d.plan;if(!p||!['level','pressure','effectiveLevel','effectiveWave','spawnMultiplier','aliveBudget','fodder','regular','veteran','rating','logDps','wave','duration','invasionChance','roll'].every(k=>Number.isFinite(p[k])))return false;
      return ['level','effectiveLevel','effectiveWave','aliveBudget','wave','duration','rating'].every(k=>Number.isSafeInteger(p[k])&&p[k]>=1)&&p.pressure>=0&&p.pressure<=3.5&&p.spawnMultiplier>=1&&p.spawnMultiplier<=1.8&&p.aliveBudget<=200&&p.effectiveLevel>=p.level&&p.effectiveWave>=p.wave&&p.duration>=30&&p.duration<=67&&p.invasionChance>=.04&&p.invasionChance<=.9&&p.roll>=0&&p.roll<1&&typeof p.invades==='boolean'&&[p.fodder,p.regular,p.veteran].every(v=>v>0&&v<1)&&Math.abs(p.fodder+p.regular+p.veteran-1)<1e-8;
    },
    boss(g){
      const profile=this.assess(g.player),v=this.values(g,profile.pressure);
      return {...profile,effectiveLevel:v.effectiveLevel,fightSeconds:32+Math.min(8,g.wave*.5)+profile.pressure*2,
        damageBudget:Math.exp(N.clamp(Math.log(110)+.85*Math.log(g.player.maxHp/110)+.7*Math.log1p(g.player.armor)+Math.log1p(.05*profile.pressure),0,Math.log(1e150))),hitBudget:g.player.maxHp*(1+g.player.armor)};
    }
  };
})();
