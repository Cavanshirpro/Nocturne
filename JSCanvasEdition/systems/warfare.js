/*
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade
This file is part of Nocturne. See the distribution's LICENSE and NOTICE files.
*/
/* Encounter roles, bounded armies, short counterplay windows and reactive movement. */
(() => {
  'use strict';const N=window.Nocturne;
  N.Warfare={
    tier(g){const p=N.Difficulty.assess(g.player),v=N.Difficulty.current(g);return N.clamp(Math.max(Math.floor((p.rating-100)/160),Math.floor((v.effectiveLevel-20)/30)),0,4);},
    arena(g){return Math.round(Math.max(420+this.tier(g)*105,Math.min(1700,N.boltRange(g.player)*1.15+180)));},
    profile(g){const tier=this.tier(g);return {tier,range:Math.max(1000,Math.min(1e6,N.boltRange(g.player)*1.5+400)),wardFraction:.08+tier*.025,wardDuration:3+tier*.4};},
    silence(g,seconds=1.25){
      const q=g.player.progress;if(q.silenceGrace>0||q.silenceTime>0)return false;
      q.silenceTime=seconds;q.silenceGrace=7;g.abilities.cancel();g.ui.toast('VOID SEAL · CASTING SEALED · MOVE / DASH / AEGIS');return true;
    },
    summon(g,owner){
      const tier=owner.guardian?.tier??this.tier(g),army=g.enemies.filter(e=>e.alive&&e.summonedBy),depth=owner.summonDepth||0;
      if(depth>=2||army.length>=18)return;
      const commanders=army.filter(e=>e.type==='overlord'),commander=!!owner.guardian&&tier>=3&&commanders.length<2;
      const count=Math.min(commander?2:3+tier,18-army.length,320-g.enemies.length);
      const build=N.Difficulty.boss(g),dps=Math.exp(Math.min(Math.log(1e145),build.logDps));
      for(let i=0;i<count;i++){
        const type=commander&&i===0?'overlord':['skeleton','hound','cultist','gargoyle','reaper'][(i+owner.attackCount)%5],a=i*Math.PI*2/count;
        const level=Math.max(1,Math.round(Math.max(owner.level*.8,N.Difficulty.current(g).effectiveLevel*.9)));
        const e=new N.Enemy(g,type,owner.x+Math.cos(a)*110,owner.y+Math.sin(a)*110,++g.nextId,false,{level,tier:type==='overlord'?'overlord':'minion',trait:tier>=2?'armored':'none'});
        e.summonedBy=owner.id;e.summonDepth=type==='overlord'?1:2;
        e.maxHp=Math.max(e.maxHp,Math.min(1e150,dps*(type==='overlord'?3.5:1.1+tier*.2)));e.hp=e.maxHp;
        e.damage=Math.min(Math.max(e.damage,build.damageBudget*(type==='overlord'?.22:.10)),build.hitBudget*(type==='overlord'?.22:.12));
        e.xp=Math.min(e.xp,10);e.gold=Math.min(e.gold,12);e.spawnDelay=1.15;e.summonTimer=5;
        if(type!=='overlord'){e.scale*=.85;e.radius*=.85;}
        g.enemies.push(e);
      }
    },
    // At most 24 projectile predictions per scan, no random invulnerability rolls.
    dodge(g,e,dt){
      const q=e.guardian||e.tactics;
      if(!q||q.tier<1)return;
      q.dodgeCooldown=Math.max(0,q.dodgeCooldown-dt);q.aiClock=Math.max(-.18,q.aiClock-dt);
      if(q.dodgeWindup>0){q.dodgeWindup=Math.max(0,q.dodgeWindup-dt);if(q.dodgeWindup===0)q.dodgeTime=.24;return;}
      if(q.dodgeTime>0){const step=Math.min(dt,q.dodgeTime),speed=Math.min(850,380+q.tier*80);e.x+=q.dodgeX*speed*step;e.y+=q.dodgeY*speed*step;q.dodgeTime=Math.max(0,q.dodgeTime-dt);return;}
      if(q.aiClock>0||q.dodgeCooldown>0||q.windup>0||q.salvo>0)return;
      q.aiClock=.18;let threat=null;
      const shots=g.combat.projectiles.active;
      for(let i=0;i<Math.min(24,shots.length);i++){
        const b=shots[(i+e.id)%shots.length];
        if(N.dist2(b,e)<460**2&&N.circleHit(b.x,b.y,b.x+b.vx*.45,b.y+b.vy*.45,e.x,e.y-12,e.radius+b.radius)<Infinity){threat=b;break;}
      }
      if(!threat)return;const speed=Math.hypot(threat.vx,threat.vy)||1,side=e.id%2?1:-1;
      q.dodgeX=-threat.vy/speed*side;q.dodgeY=threat.vx/speed*side;q.dodgeWindup=.22;q.dodgeCooldown=5.5-q.tier*.65;
      e.castTimer=.24;
    },
    tactics(e){if(!e.tactics)e.tactics={tier:this.tier(e.game),aiClock:0,dodgeCooldown:2,dodgeWindup:0,dodgeTime:0,dodgeX:0,dodgeY:0};return e.tactics;},
    validTactics(q){return q&&['tier','aiClock','dodgeCooldown','dodgeWindup','dodgeTime','dodgeX','dodgeY'].every(k=>Number.isFinite(q[k]))&&Number.isInteger(q.tier)&&q.tier>=0&&q.tier<=4&&q.aiClock>=-.2&&q.aiClock<=.2&&q.dodgeCooldown>=0&&q.dodgeCooldown<=6&&q.dodgeWindup>=0&&q.dodgeWindup<=.23&&q.dodgeTime>=0&&q.dodgeTime<=.25&&Math.abs(q.dodgeX)<=1&&Math.abs(q.dodgeY)<=1;},
    drawDodge(c,e){const q=e.guardian||e.tactics;if(!q||q.dodgeWindup<=0)return;c.save();c.strokeStyle='#a5f3e5';c.lineWidth=3;c.setLineDash([5,4]);c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.x+q.dodgeX*120,e.y+q.dodgeY*120);c.stroke();c.restore();}
  };
})();
