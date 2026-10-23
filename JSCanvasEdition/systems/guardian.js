/* The final Sovereign snapshots the complete build and uses readable attack windows. */
(() => {
  'use strict';
  const N=window.Nocturne;
  const actions=['salvo','meteors','slash','aegis','soulring','riftstep','lances'];
  const names={salvo:'HELLFIRE SALVO',meteors:'ASH METEORS',slash:'SOUL REAPING',aegis:'DREAD AEGIS',soulring:'SOUL CONSTELLATION',riftstep:'RIFT STEP',lances:'TRIUNE LANCES'};
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
    },
    health(build){return Math.exp(N.clamp(build.logDps+Math.log(build.fightSeconds),Math.log(300),Math.log(1e150)));},
    upgrade(g,e){
      const q=e.guardian;if(q.schema===2)return;
      const build=N.Difficulty.boss(g),ratio=e.hp/e.maxHp,ward=q.ward/q.wardMax;
      e.maxHp=this.health(build);e.hp=e.maxHp*ratio;e.damage=Math.max(e.damage,build.damageBudget);q.wardMax=e.maxHp*.04;q.ward=q.wardMax*ward;
      Object.assign(q,{schema:2,pressure:build.pressure,rating:build.rating,hitBudget:Math.min(1e150,build.hitBudget),destinationX:e.x,destinationY:e.y});
    },
    valid(q,e){
      if(![1,2].includes(q?.schema)||e.type!=='overlord'||![null,...actions].includes(q.action))return false;
      if(q.schema===2&&(!['pressure','rating','hitBudget','destinationX','destinationY'].every(k=>Number.isFinite(q[k]))||q.pressure<0||q.pressure>3.5||q.rating<100||q.hitBudget<=0))return false;
      return ['cooldown','windup','angle','targetX','targetY','shotClock','ward','wardMax','wardTime'].every(k=>Number.isFinite(q[k]))&&
        ['next','salvo','shotIndex'].every(k=>Number.isSafeInteger(q[k])&&q[k]>=0)&&q.salvo<=(q.schema===1?14:16)&&q.shotIndex<=(q.schema===1?14:16)&&q.windup>=0&&q.windup<=1.2&&q.cooldown>=0&&q.cooldown<=6&&q.ward>=0&&q.wardMax>0&&q.ward<=q.wardMax&&q.wardTime>=0&&q.wardTime<=3;
    },
    damage(e,fraction,ceiling){return Math.min(e.damage*fraction,(e.guardian.hitBudget||Infinity)*ceiling);},
    begin(g,e){
      const q=e.guardian,p=g.player;q.action=actions[q.next%actions.length];
      if(q.next>=7&&q.next%7!==3){const distance=Math.sqrt(N.dist2(e,p));if(distance>420)q.action='lances';else if(distance<125)q.action='riftstep';}
      q.next++;
      q.angle=Math.atan2(p.y-12-(e.y-35),p.x-e.x);q.targetX=p.x;q.targetY=p.y;
      q.windup=q.action==='salvo'?.9:['meteors','lances'].includes(q.action)?1.15:['soulring','riftstep'].includes(q.action)?1.1:1;
      e.castTimer=q.windup;g.combat.sound('warning');
      if(q.action==='meteors'){
        const offsets=e.hp<e.maxHp*.4?[[0,0],[125,75],[-125,-75],[100,-110]]:[[0,0],[125,75],[-125,-75]];
        for(const [x,y] of offsets)g.combat.hazard(q.targetX+x,q.targetY+y,68,q.windup,this.damage(e,.16,.30),.3);
      }
      if(q.action==='riftstep'){const s=g.sanctum||e,dx=p.x-s.x,dy=p.y-s.y,d=Math.hypot(dx,dy)||1,r=Math.min(245,d);q.destinationX=s.x+dx/d*r;q.destinationY=s.y+dy/d*r;g.combat.hazard(q.destinationX,q.destinationY,72,q.windup,this.damage(e,.14,.24),.25);}
    },
    cast(g,e){
      const q=e.guardian,p=g.player,angry=e.hp<e.maxHp*.4;
      if(q.action==='salvo'){q.salvo=(angry?14:10)+Math.floor((q.pressure||0)*.5);q.shotClock=0;q.shotIndex=0;}
      else if(q.action==='slash'){
        const reach=245,sweep=Math.PI*.95;
        g.combat.effect('slash',e.x,e.y,q.angle,sweep,reach,'#f19ab0',.4);
        const a=Math.atan2(p.y-e.y,p.x-e.x),delta=Math.atan2(Math.sin(a-q.angle),Math.cos(a-q.angle));
        if(N.dist2(e,p)<(reach+p.radius)**2&&Math.abs(delta)<sweep/2)p.hurt(this.damage(e,.22,.38));
        g.combat.sound('slash');
      }else if(q.action==='aegis'){
        q.ward=q.wardMax;q.wardTime=3;g.combat.effect('ring',e.x,e.y-30,0,0,95,'#c1a8f2',.6);g.combat.sound('lock');
      }else if(q.action==='soulring'){
        const count=angry?14:10;
        for(let i=0;i<count;i++){const angle=q.angle+(i+.5)*Math.PI*2/count;g.combat.enemyShot(e.x,e.y-35,e.x+Math.cos(angle)*500,e.y-35+Math.sin(angle)*500,175,this.damage(e,.085,.14));}
        g.combat.effect('ring',e.x,e.y-25,0,0,180,'#c9a5f2',.6);g.combat.sound('soulstorm');
      }else if(q.action==='riftstep'){
        g.combat.effect('ring',e.x,e.y-20,0,0,95,'#cfadf2',.4);e.x=q.destinationX;e.y=q.destinationY;
        g.combat.effect('ring',e.x,e.y-20,0,0,95,'#cfadf2',.4);g.combat.sound('rift');
      }else if(q.action==='lances'){
        for(const offset of [-.34,0,.34]){
          const a=q.angle+offset,x=e.x+Math.cos(a)*620,y=e.y+Math.sin(a)*620;
          g.combat.effect('lance',e.x,e.y-16,x,y-16,12,'#e6b4db',.4);
          if(N.segmentDistance2(e.x,e.y-16,x,y-16,p.x,p.y-12)<(p.radius+12)**2)p.hurt(this.damage(e,.18,.28));
        }
        g.combat.sound('lance');
      }else g.combat.sound('meteor');
      q.action=null;q.cooldown=(angry?2.8:3.8)/(1+.045*(q.pressure||0));
    },
    update(g,e,dt){
      const q=e.guardian;
      q.wardTime=Math.max(0,q.wardTime-dt);if(q.wardTime<1e-9){q.wardTime=0;q.ward=0;}
      e.summonTimer-=dt;if(e.summonTimer<=0){e.summonTimer=10;g.summonMinions(e);}
      if(q.salvo>0){
        q.shotClock-=dt;
        while(q.salvo>0&&q.shotClock<=0){
          const a=q.angle+Math.sin(q.shotIndex*1.7)*.055;
          g.combat.enemyShot(e.x,e.y-35,e.x+Math.cos(a)*600,e.y-35+Math.sin(a)*600,260+Math.sqrt(e.level)*3,this.damage(e,.1,.18));
          q.salvo--;q.shotIndex++;q.shotClock+=.12-.005*(q.pressure||0);e.castTimer=.16;
          g.combat.sound('fire',e.x);
        }
        return;
      }
      if(q.windup>0){q.windup=Math.max(0,q.windup-dt);if(q.windup===0)this.cast(g,e);return;}
      q.cooldown=Math.max(0,q.cooldown-dt);if(q.cooldown===0)this.begin(g,e);
    },
    absorb(g,e,damage){
      const q=e.guardian;if(!q||q.wardTime<=0||q.ward<=0)return damage;
      const blocked=Math.min(damage,q.ward);q.ward-=blocked;
      if(q.ward===0)q.wardTime=0;
      g.combat.number(e.x,e.y-100,'WARD −'+N.fmt(Math.round(blocked)),'#cbbcff');
      return damage-blocked;
    },
    label(e){const q=e.guardian;return q?.salvo>0?'HELLFIRE · SHIELD OR SIDESTEP':q?.action?names[q.action]+' · WARNING':q?.ward>0?'DREAD AEGIS':e.hp<e.maxHp*.4?'SOVEREIGN · ENRAGED':'FINAL SOVEREIGN';},
    rebase(e,x,y){if(e.guardian){e.guardian.targetX-=x;e.guardian.targetY-=y;if(e.guardian.schema===2){e.guardian.destinationX-=x;e.guardian.destinationY-=y;}}},
    draw(g,e,c){
      const q=e.guardian;if(!q)return;
      c.save();c.lineWidth=2;c.strokeStyle='#f3bbcf';c.fillStyle='#ed9bbc';
      // A crown distinguishes the final guardian from an ordinary Overlord.
      c.beginPath();c.moveTo(e.x-22,e.y-206);c.lineTo(e.x-27,e.y-223);c.lineTo(e.x-9,e.y-216);c.lineTo(e.x,e.y-232);c.lineTo(e.x+9,e.y-216);c.lineTo(e.x+27,e.y-223);c.lineTo(e.x+22,e.y-206);c.closePath();c.stroke();
      if(q.ward>0){c.strokeStyle='#c7b4ef';c.fillStyle='#a99bdf18';c.beginPath();c.ellipse(e.x,e.y-88,83,119,0,0,Math.PI*2);c.fill();c.stroke();}
      if(q.windup>0){
        c.strokeStyle='#ffb0bb';c.fillStyle='#ef658422';c.setLineDash([9,5]);
        c.beginPath();
        if(q.action==='lances'){for(const offset of [-.34,0,.34]){const a=q.angle+offset;c.moveTo(e.x,e.y-16);c.lineTo(e.x+Math.cos(a)*620,e.y-16+Math.sin(a)*620);}}
        else if(q.action==='salvo'){
          const x=e.x+Math.cos(q.angle)*680,y=e.y-35+Math.sin(q.angle)*680;
          c.moveTo(e.x,e.y-35);c.lineTo(x,y);
        }else if(q.action==='slash'){c.moveTo(e.x,e.y);c.arc(e.x,e.y,245,q.angle-Math.PI*.475,q.angle+Math.PI*.475);c.closePath();c.fill();}
        else c.arc(e.x,e.y-25,85,0,Math.PI*2);
        c.stroke();c.setLineDash([]);c.textAlign='center';c.font='bold 11px Arial';c.fillStyle='#ffd8dc';c.strokeStyle='#11151d';c.lineWidth=3;
        c.strokeText(names[q.action],e.x,e.y-246);c.fillText(names[q.action],e.x,e.y-246);
      }
      c.restore();
    }
  };
})();
