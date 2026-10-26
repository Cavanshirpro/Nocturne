/* The final Sovereign snapshots the complete build and uses readable attack windows. */
(() => {
  'use strict';
  const N=window.Nocturne;
  const actions=['salvo','meteors','slash','aegis','soulring','riftstep','lances','starfall','crossfire','shockwave','voidseal'];
  const names={salvo:'HELLFIRE SALVO',meteors:'ASH METEORS',slash:'SOUL REAPING',aegis:'DREAD AEGIS',soulring:'SOUL CONSTELLATION',riftstep:'RIFT STEP',lances:'TRIUNE LANCES',starfall:'HUNTER STARFALL',crossfire:'TWIN GATES',shockwave:'CROWN SHOCKWAVES',voidseal:'VOID SEAL · KEEP MOVING'};
  N.FinalGuardian={
    promote(g,e,restore=false){
      if(e.guardian){this.upgrade(g,e);return;}
      const build=N.Difficulty.boss(g);
      const ratio=restore?N.clamp(e.hp/e.maxHp,0,1):1,t=N.ENEMY_TYPES.overlord;
      e.level=Math.max(e.level,g.player.level+3,Math.ceil(build.effectiveLevel*1.12));
      e.type='overlord';e.boss=true;e.tier='overlord';e.elite=false;e.trait='none';
      // Match an estimated sustained spell budget, including gear; never impose an early 3x ceiling.
      e.maxHp=this.health(build);
      e.damage=Math.max(5*t.damage*(1+.027*(e.level-1)),build.damageBudget);
      e.speed=t.speed*(1+.035*Math.sqrt(e.level-1))*1.08;e.radius=48;e.scale=2.2;
      e.hp=e.maxHp*ratio;e.gold=Math.max(e.gold,Math.round(t.gold*(1+.025*(e.level-1))*2));
      e.xp=Math.max(e.xp,Math.round(t.xp*(1+.035*(e.level-1))));
      e.attackTimer=0;e.summonTimer=7;
      e.guardian={schema:2,pressure:build.pressure,rating:build.rating,hitBudget:Math.min(1e150,build.hitBudget),destinationX:e.x,destinationY:e.y,next:0,action:null,cooldown:2,windup:0,angle:0,targetX:e.x,targetY:e.y,
        salvo:0,shotClock:0,shotIndex:0,ward:0,wardMax:e.maxHp*.04,wardTime:0};
      this.upgrade(g,e);
    },
    health(build){return Math.exp(N.clamp(build.logDps+Math.log(build.fightSeconds),Math.log(300),Math.log(1e150)));},
    upgrade(g,e){
      const q=e.guardian;if(q.schema===3)return;
      const build=N.Difficulty.boss(g),ratio=e.hp/e.maxHp,ward=q.ward/q.wardMax;
      if(q.schema===1){e.maxHp=this.health(build);e.hp=e.maxHp*ratio;e.damage=Math.max(e.damage,build.damageBudget);Object.assign(q,{pressure:build.pressure,rating:build.rating,hitBudget:Math.min(1e150,build.hitBudget),destinationX:e.x,destinationY:e.y});}
      const profile=N.Warfare.profile(g);q.wardMax=e.maxHp*profile.wardFraction;q.ward=q.wardMax*ward;
      Object.assign(q,{schema:3,...profile,windupTotal:Math.max(.9,q.windup),releaseTime:0,lastAction:null,guardCooldown:6,burst:0,burstClock:0,pressureClock:4,outside:false,aiClock:0,dodgeCooldown:2,dodgeWindup:0,dodgeTime:0,dodgeX:0,dodgeY:0});
      if(g.sanctum)g.sanctum.radius=Math.max(g.sanctum.radius,N.Warfare.arena(g));
    },
    valid(q,e){
      if(![1,2,3].includes(q?.schema)||e.type!=='overlord'||![null,...actions].includes(q.action))return false;
      if(q.schema>=2&&(!['pressure','rating','hitBudget','destinationX','destinationY'].every(k=>Number.isFinite(q[k]))||q.pressure<0||q.pressure>3.5||q.rating<100||q.hitBudget<=0))return false;
      if(q.schema===3&&(!N.Warfare.validTactics(q)||!['range','wardFraction','wardDuration','windupTotal','releaseTime','guardCooldown','burst','burstClock','pressureClock'].every(k=>Number.isFinite(q[k]))||q.range<900||q.range>1e6||q.wardFraction<.08||q.wardFraction>.181||q.wardDuration<3||q.wardDuration>4.61||q.windupTotal<.7||q.windupTotal>1.6||q.releaseTime<0||q.releaseTime>.6||q.guardCooldown<0||q.guardCooldown>10||q.burst<0||q.burstClock<0||q.burstClock>.8||q.pressureClock<0||q.pressureClock>5||typeof q.outside!=='boolean'||![null,...actions].includes(q.lastAction)))return false;
      return ['cooldown','windup','angle','targetX','targetY','shotClock','ward','wardMax','wardTime'].every(k=>Number.isFinite(q[k]))&&
        ['next','salvo','shotIndex'].every(k=>Number.isSafeInteger(q[k])&&q[k]>=0)&&q.salvo<=(q.schema===3?24:q.schema===1?14:16)&&q.shotIndex<=(q.schema===3?24:q.schema===1?14:16)&&q.windup>=0&&q.windup<=1.6&&q.cooldown>=0&&q.cooldown<=6&&q.ward>=0&&q.wardMax>0&&q.ward<=q.wardMax&&q.wardTime>=0&&q.wardTime<=(q.schema===3?4.61:3);
    },
    damage(e,fraction,ceiling){const q=e.guardian,budget=q.hitBudget||Infinity,tier=q.tier||0,floor=tier>0?Math.min(ceiling*.55,fraction*(.25+tier*.1)):0;return Math.min(Math.max(e.damage*fraction,floor>0?budget*floor:0),budget*ceiling);},
    begin(g,e){
      const q=e.guardian,p=g.player,deck=q.tier>=2?actions:actions.slice(0,7);q.action=deck[q.next%deck.length];
      if(q.next>=deck.length&&q.next%deck.length!==3){const distance=Math.sqrt(N.dist2(e,p));if(q.outside||distance>q.range*.65)q.action=q.next%2?'starfall':'crossfire';else if(distance<125)q.action='riftstep';}
      q.next++;
      q.angle=Math.atan2(p.y-12-(e.y-35),p.x-e.x);q.targetX=p.x;q.targetY=p.y;
      q.windup=q.action==='salvo'?.9:['meteors','lances'].includes(q.action)?1.15:['soulring','riftstep'].includes(q.action)?1.1:1;
      if(['starfall','crossfire','shockwave','voidseal'].includes(q.action))q.windup=1.3;
      q.windupTotal=q.windup;q.lastAction=q.action;q.releaseTime=0;
      e.castTimer=q.windup;g.combat.sound('warning');
      if(q.action==='meteors'){
        const offsets=e.hp<e.maxHp*.4?[[0,0],[125,75],[-125,-75],[100,-110]]:[[0,0],[125,75],[-125,-75]];
        for(const [x,y] of offsets)g.combat.hazard(q.targetX+x,q.targetY+y,68,q.windup,this.damage(e,.16,.30),.3);
      }
      if(q.action==='riftstep'){const s=g.sanctum||e,dx=p.x-s.x,dy=p.y-s.y,d=Math.hypot(dx,dy)||1,r=Math.min((s.radius||330)-80,d);q.destinationX=s.x+dx/d*r;q.destinationY=s.y+dy/d*r;g.combat.hazard(q.destinationX,q.destinationY,85,q.windup,this.damage(e,.20,.28),.25);}
      if(q.action==='starfall')for(let i=0;i<3+q.tier;i++){
        const lead=i*55;g.combat.hazard(q.targetX+p.lastX*lead,q.targetY+p.lastY*lead,65,q.windup+i*.19,this.damage(e,.23,.26),.22);
      }
      if(q.action==='voidseal')g.combat.hazard(q.targetX,q.targetY,100+q.tier*9,q.windup,0,.24,{kind:'seal',silence:1.25});
      if(q.action==='shockwave')for(let i=0;i<3;i++)g.combat.hazard(e.x,e.y,180+i*150,q.windup+i*.38,this.damage(e,.24,.28),.22,{kind:'ring',inner:145+i*150,angle:q.angle,gap:.9});
    },
    cast(g,e){
      const q=e.guardian,p=g.player,angry=e.hp<e.maxHp*.4;N.Orbitals.emit(e,q.action);
      if(q.action==='salvo'){q.salvo=(angry?14:10)+(q.tier||0)*2;q.shotClock=0;q.shotIndex=0;}
      else if(q.action==='slash'){
        const reach=245,sweep=Math.PI*.95;
        g.combat.effect('slash',e.x,e.y,q.angle,sweep,reach,'#f19ab0',.4);
        const a=Math.atan2(p.y-e.y,p.x-e.x),delta=Math.atan2(Math.sin(a-q.angle),Math.cos(a-q.angle));
        if(N.dist2(e,p)<(reach+p.radius)**2&&Math.abs(delta)<sweep/2)p.hurt(this.damage(e,.22,.38));
        g.combat.sound('slash');
      }else if(q.action==='aegis'){
        this.ward(g,e);g.combat.effect('ring',e.x,e.y-30,0,0,95,'#c1a8f2',.6);g.combat.sound('lock');
      }else if(q.action==='soulring'){
        const count=(angry?14:10)+(q.tier||0)*2;
        for(let i=0;i<count;i++){const angle=q.angle+(i+.5)*Math.PI*2/count;g.combat.enemyShot(e.x,e.y-35,e.x+Math.cos(angle)*500,e.y-35+Math.sin(angle)*500,175,this.damage(e,.085,.14),e,'soulring');}
        g.combat.effect('ring',e.x,e.y-25,0,0,180,'#c9a5f2',.6);g.combat.sound('soulstorm');
      }else if(q.action==='riftstep'){
        g.combat.effect('ring',e.x,e.y-20,0,0,95,'#cfadf2',.4);e.x=q.destinationX;e.y=q.destinationY;
        g.combat.effect('ring',e.x,e.y-20,0,0,95,'#cfadf2',.4);g.combat.sound('rift');
      }else if(q.action==='lances'){
        for(const offset of [-.34,0,.34]){
          const a=q.angle+offset,x=e.x+Math.cos(a)*q.range,y=e.y+Math.sin(a)*q.range;
          const o=N.Orbitals.origin(e,'lances');g.combat.effect('lance',o.x,o.y,x,y-16,12,'#e6b4db',.4);
          if(N.segmentDistance2(o.x,o.y,x,y-16,p.x,p.y-12)<(p.radius+12)**2)p.hurt(this.damage(e,.26,.32));
        }
        g.combat.sound('lance');
      }else if(q.action==='crossfire'){
        for(const side of [-1,1]){const x=q.targetX+Math.cos(q.angle+Math.PI/2)*260*side,y=q.targetY+Math.sin(q.angle+Math.PI/2)*260*side;
          const a=Math.atan2(q.targetY-y,q.targetX-x),count=5+q.tier;
          for(let i=0;i<count;i++){const theta=a+(i-(count-1)/2)*.16;g.combat.enemyShot(x,y,x+Math.cos(theta)*600,y+Math.sin(theta)*600,220+q.tier*20,this.damage(e,.18,.22),e,'crossfire',true);}
          g.combat.effect('ring',x,y,0,0,50,'#a9def0',.5);
        }
      }else if(q.action==='voidseal'){
        // The seal ends before a separately warned follow-up; mobility and Aegis remain usable.
        for(const offset of [-90,90])g.combat.hazard(q.targetX+offset,q.targetY,65,.9,this.damage(e,.24,.28),.22);
      }else g.combat.sound('meteor');
      q.lastAction=q.action;q.releaseTime=.55;q.action=null;q.cooldown=(angry?2.8:3.8)/(1+.45*(q.tier||0));
    },
    ward(g,e){const q=e.guardian;q.ward=q.wardMax;q.wardTime=q.wardDuration;q.guardCooldown=9;q.burst=0;g.combat.sound('lock');},
    update(g,e,dt){
      const q=e.guardian;
      q.releaseTime=Math.max(0,q.releaseTime-dt);q.guardCooldown=Math.max(0,q.guardCooldown-dt);q.burstClock=Math.max(0,q.burstClock-dt);if(q.burstClock===0)q.burst=0;
      q.outside=!!g.sanctum&&N.dist2(g.player,g.sanctum)>(g.sanctum.radius+65)**2;
      q.pressureClock=Math.max(0,q.pressureClock-dt);
      if(q.tier>=2&&q.pressureClock===0){q.pressureClock=4.8-q.tier*.5;const p=g.player;g.combat.hazard(p.x+p.lastX*60,p.y+p.lastY*60,60,1.25,this.damage(e,.18,.22),.2);}
      N.Warfare.dodge(g,e,dt);
      q.wardTime=Math.max(0,q.wardTime-dt);if(q.wardTime<1e-9){q.wardTime=0;q.ward=0;}
      e.summonTimer-=dt;if(e.summonTimer<=0){e.summonTimer=11-(q.tier||0);g.summonMinions(e);}
      if(q.salvo>0){
        q.shotClock-=dt;
        while(q.salvo>0&&q.shotClock<=0){
          const a=q.angle+Math.sin(q.shotIndex*1.7)*.055;
          g.combat.enemyShot(e.x,e.y-35,e.x+Math.cos(a)*q.range,e.y-35+Math.sin(a)*q.range,260+(q.tier||0)*45,this.damage(e,.15,.22),e,'salvo');
          q.salvo--;q.shotIndex++;q.shotClock+=.12-.01*(q.tier||0);
          g.combat.sound('fire',e.x);
        }
        return;
      }
      if(q.windup>0){q.windup=Math.max(0,q.windup-dt);if(q.windup===0)this.cast(g,e);return;}
      if(q.dodgeWindup>0||q.dodgeTime>0)return;
      q.cooldown=Math.max(0,q.cooldown-dt);if(q.cooldown===0)this.begin(g,e);
    },
    absorb(g,e,damage){
      const q=e.guardian;if(!q)return damage;
      if(g.sanctum&&N.dist2(g.player,g.sanctum)>(g.sanctum.radius+65)**2)damage*=.1;
      if(q.schema===3&&q.tier>=1&&q.ward<=0&&q.guardCooldown===0){q.burst+=damage;q.burstClock=.7;if(q.burst>e.maxHp*.055)this.ward(g,e);}
      if(q.wardTime<=0||q.ward<=0)return damage;
      const blocked=Math.min(damage,q.ward);q.ward-=blocked;
      if(q.ward===0)q.wardTime=0;
      g.combat.number(e.x,e.y-100,'WARD −'+N.fmt(Math.round(blocked)),'#cbbcff');
      return damage-blocked;
    },
    label(e){const q=e.guardian;return q?.outside?'OUTER SEAL · RETURN TO THE ARENA':q?.salvo>0?'HELLFIRE · SHIELD OR SIDESTEP':q?.action?names[q.action]+' · WARNING':q?.ward>0?'DREAD AEGIS':e.hp<e.maxHp*.4?'SOVEREIGN · ENRAGED':'FINAL SOVEREIGN';},
    rebase(e,x,y){if(e.guardian){e.guardian.targetX-=x;e.guardian.targetY-=y;if(e.guardian.schema>=2){e.guardian.destinationX-=x;e.guardian.destinationY-=y;}}},
    draw(g,e,c){
      const q=e.guardian;if(!q)return;
      c.save();c.lineWidth=2;c.strokeStyle='#f3bbcf';c.fillStyle='#ed9bbc';
      // The crown is part of the facing-aware regalia; telegraphs stay in world space.
      if(q.ward>0){c.strokeStyle='#c7b4ef';c.fillStyle='#a99bdf18';c.beginPath();c.ellipse(e.x,e.y-88,83,119,0,0,Math.PI*2);c.fill();c.stroke();}
      if(q.windup>0){
        c.strokeStyle='#ffb0bb';c.fillStyle='#ef658422';c.setLineDash([9,5]);
        c.beginPath();
        if(q.action==='lances'){for(const offset of [-.34,0,.34]){const a=q.angle+offset;const o=N.Orbitals.origin(e,'lances');c.moveTo(o.x,o.y);c.lineTo(e.x+Math.cos(a)*q.range,e.y-16+Math.sin(a)*q.range);}}
        else if(q.action==='salvo'){
          const x=e.x+Math.cos(q.angle)*680,y=e.y-35+Math.sin(q.angle)*680;
          const o=N.Orbitals.origin(e,'salvo');c.moveTo(o.x,o.y);c.lineTo(x,y);
        }else if(q.action==='crossfire'){for(const side of [-1,1]){const x=q.targetX+Math.cos(q.angle+Math.PI/2)*260*side,y=q.targetY+Math.sin(q.angle+Math.PI/2)*260*side;c.moveTo(x+45,y);c.arc(x,y,45,0,Math.PI*2);c.moveTo(x,y);c.lineTo(q.targetX,q.targetY);}}
        else if(q.action==='slash'){c.moveTo(e.x,e.y);c.arc(e.x,e.y,245,q.angle-Math.PI*.475,q.angle+Math.PI*.475);c.closePath();c.fill();}
        else {c.moveTo(e.x-9,e.y-28);c.lineTo(e.x,e.y-38);c.lineTo(e.x+9,e.y-28);}
        if(q.action==='lances'){c.setLineDash([]);c.lineWidth=24;c.strokeStyle='#ed887725';c.stroke();c.lineWidth=1.8;c.strokeStyle='#f0a08e';}c.stroke();c.setLineDash([]);c.textAlign='center';c.font='bold 11px Arial';c.fillStyle='#ffd8dc';c.strokeStyle='#11151d';c.lineWidth=3;
        c.strokeText(names[q.action],e.x,e.y-246);c.fillText(names[q.action],e.x,e.y-246);
      }
      c.restore();
    }
  };
})();
