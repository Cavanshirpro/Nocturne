(() => {
  'use strict';
  const N=window.Nocturne;
  const WEAPONS=N.WEAPONS;
  // All sound is synthesized locally. One shared graph, bounded short voices,
  // per-event limits, a master fader and gentle compression keep dense combat tame.
  class Pool {
    constructor(factory,limit){this.factory=factory;this.limit=limit;this.free=[];this.active=[];this.created=0;}
    acquire(){let item=this.free.pop();if(!item){if(this.created>=this.limit)return null;item=this.factory();this.created++;}this.active.push(item);return item;}
    release(index){const a=this.active;if(index<0||index>=a.length)return;const item=a[index];a[index]=a[a.length-1];a.pop();this.free.push(item);}
    clear(){while(this.active.length)this.free.push(this.active.pop());}
  }
  class Projectile {
    constructor(){this.trailX=new Float32Array(5);this.trailY=new Float32Array(5);this.hitIds=new Set();}
    reset(x,y,vx,vy,damage,crit,pierce=0,evolved=false){
      Object.assign(this,{x,y,vx,vy,damage,crit,life:2.6,radius:6,trailCount:0,pierce,evolved,source:'bolt',color:'#e9e2ff',blast:0,freeze:0,expose:0});
      this.trailX.fill(x);this.trailY.fill(y);this.hitIds.clear();
    }
  }
  class Combat {
    constructor(game){
      this.game=game;this.cooldown=0;this.candidates=[];this.areaCandidates=[];
      this.projectiles=new Pool(()=>new Projectile(),240);this.particles=new Pool(()=>({}),650);this.numbers=new Pool(()=>({}),55);
      this.hostile=new Pool(()=>({}),180);this.hazards=new Pool(()=>({}),24);this.effects=new Pool(()=>({}),80);
      this.remnants=new Pool(()=>({}),96);this.areas=new Pool(()=>({}),Infinity);
      this.spellTimers={lightning:.5,nova:1,meteor:1.2,lance:.8,thorn:1.5,rift:2,rapid:.15,cannon:1.3,burst:.9,glacier:1.1};this.wispHits=new Map();this.mapClock=0;
      this.audioEngine=new N.AudioEngine(game);this.soundEnabled=false;
    }
    clear(){
      for(const pool of [this.projectiles,this.particles,this.numbers,this.hostile,this.hazards,this.effects,this.remnants,this.areas])pool.clear();
      this.wispHits.clear();Object.assign(this.spellTimers,{lightning:.5,nova:1,meteor:1.2,lance:.8,thorn:1.5,rift:2,rapid:.15,cannon:1.3,burst:.9,glacier:1.1});this.mapClock=0;
    }
    get audio(){return this.audioEngine.context;}
    get soundEnabled(){return this.audioEngine.enabled;}
    set soundEnabled(value){this.audioEngine.setEnabled(value);}
    enableAudio(cue='ui'){return this.audioEngine.activate(cue);}
    sound(kind,x){return this.audioEngine.play(kind,x);}
    nearest(origin=this.game.player,range=N.boltRange(this.game.player),exclude=null){
      let nearest=null,best=range*range;
      for(const e of this.game.enemies){if(!e.alive||e.spawnDelay>0||exclude?.has(e.id))continue;const d=N.dist2(origin,e);if(d<best){best=d;nearest=e;}}
      return nearest;
    }
    emit(id,target=null){const p=this.game.player,o=N.Orbitals.emit(p,id);if(target&&['meteor','thorn','rift','nova'].includes(id))this.effect('delivery',o.x,o.y,target.x,target.y,0,N.WEAPONS[id].color,id==='meteor'?.6:.22);return o;}
    fire(target,volleys=1){
      const p=this.game.player,origin=this.emit('bolt'),ox=origin.x,oy=origin.y,angle=Math.atan2(target.y-12-oy,target.x-ox),logical=p.projectileCount;
      const count=Math.min(logical,this.game.quality==='low'?12:24),span=Math.min(Math.PI*1.4,(logical-1)*.105);
      const weight=logical/count*volleys;
      for(let i=0;i<count;i++){
        const roll=N.critRoll(p),damage=p.damage*(1+.15*((p.weapons.bolt||1)-1))*weight*roll.multiplier;
        const bullet=this.projectiles.acquire();
        if(!bullet){const existing=this.projectiles.active[0];if(existing)existing.damage+=damage*(count-i);break;}
        const theta=angle+(count>1?(i/(count-1)-.5)*span:0);
        bullet.reset(ox,oy,Math.cos(theta)*p.projectileSpeed,Math.sin(theta)*p.projectileSpeed,damage,roll.crit,p.pierce+(p.evolved('bolt')?1:0),p.evolved('bolt'));
        bullet.life=N.boltTravel(p)/p.projectileSpeed;
      }
      this.sound('fire');this.effect('muzzle',ox,oy,0,0,21,p.evolved('bolt')?'#dfc2f4':'#e9e2ff',.18);
    }
    launchVolley({angle,count,span,damage,speed,range,pierce=0,source,color,blast=0,freeze=0,expose=0,closed=false,weight=1,origin=null}){
      const p=this.game.player,visual=Math.min(count,this.game.quality==='low'?12:24),group=count/visual;
      for(let i=0;i<visual;i++){
        const roll=N.critRoll(p),power=p.damage*damage*roll.multiplier*weight*group,b=this.projectiles.acquire();
        if(!b){const existing=this.projectiles.active.find(b=>b.source===source);if(existing)existing.damage+=power*(visual-i);else {const target=this.nearest(p,range);if(target)target.hit(power*(visual-i),roll.crit,0,0,source);}break;}
        const theta=angle+(visual>1?(closed?i/visual:i/(visual-1)-.5)*span:0);
        b.reset(origin?origin.x:p.x,origin?origin.y:p.y-18,Math.cos(theta)*speed,Math.sin(theta)*speed,power,roll.crit,pierce,false);
        Object.assign(b,{life:range/speed,source,color,blast,freeze,expose,radius:source==='cannon'?10:source==='rapid'?3:6});
      }
    }
    directedSpell(id,weight=1){
      const p=this.game.player,target=this.nearest(p,id==='burst'?285:N.boltRange(p)),rank=p.weapons[id];if(!target)return;
      const origin=this.emit(id),angle=Math.atan2(target.y-12-origin.y,target.x-origin.x),evolved=p.evolved(id),count=p.projectileCount;
      const spec={
        rapid:{count,span:Math.min(1,(count-1)*.07),damage:.26+.035*rank,speed:p.projectileSpeed*(evolved?1.5:1.2),range:N.boltTravel(p),pierce:p.pierce+(evolved?2:0)},
        cannon:{count,span:Math.min(1.4,(count-1)*.1),damage:3.6+.6*rank,speed:p.projectileSpeed*.65,range:N.boltTravel(p)*1.15,pierce:p.pierce+2+rank,blast:evolved?65:0},
        burst:{count:(4+rank)*count,span:1.05,damage:.55+.08*rank,speed:p.projectileSpeed*.9,range:280+rank*8,pierce:p.pierce+(evolved?1:0),expose:evolved?2:0},
        glacier:{count,span:Math.min(1.2,(count-1)*.1),damage:.9+.16*rank,speed:p.projectileSpeed*.78,range:N.boltTravel(p),pierce:0,blast:70+rank*6,freeze:evolved?.6:0}
      }[id];
      this.launchVolley({angle,...spec,source:id,color:N.WEAPONS[id].color,weight,origin});this.sound(id);this.effect('muzzle',origin.x,origin.y,0,0,id==='cannon'?32:18,N.WEAPONS[id].color,.18);
    }
    spellHit(enemy,multiplier,source){const p=this.game.player,roll=N.critRoll(p);enemy.hit(p.damage*multiplier*roll.multiplier,roll.crit,0,0,source);}
    effect(kind,x,y,x2,y2,radius,color,duration=.32){
      const e=this.effects.acquire();if(e)Object.assign(e,{kind,x,y,x2,y2,radius,color,life:duration,total:duration,seed:N.fxRand(0,Math.PI*2)});
    }
    ghost(player){
      if(this.game.reducedMotion)return;
      const r=this.remnants.acquire();if(r)Object.assign(r,{kind:'ghost',x:player.x,y:player.y,frame:player.walkFrame,facing:player.facing,life:.24,total:.24,vx:0,vy:0});
    }
    dust(x,y){
      if(this.game.reducedMotion)return;
      for(let i=0;i<(this.game.quality==='low'?1:3);i++){
        const r=this.remnants.acquire();if(!r)break;
        Object.assign(r,{kind:'dust',x:x+N.fxRand(-7,7),y:y+N.fxRand(-3,3),vx:N.fxRand(-14,14),vy:N.fxRand(-10,2),radius:N.fxRand(2,4),life:.3,total:.3});
      }
    }
    remains(enemy){
      if(!this.game.visible(enemy.x,enemy.y,90))return;
      const r=this.remnants.acquire();if(r)Object.assign(r,{kind:'corpse',x:enemy.x,y:enemy.y,type:enemy.type,facing:enemy.facing,scale:enemy.scale,life:this.game.reducedMotion?.25:.6,total:this.game.reducedMotion?.25:.6,vx:0,vy:0});
      this.effect('ring',enemy.x,enemy.y-10,0,0,enemy.boss?110:enemy.radius*1.5,enemy.boss?'#e2bf8b':'#b6b0c5',enemy.boss?.8:.3);
    }
    lightning(weight=1){
      const p=this.game.player,rank=p.weapons.lightning,evolved=p.evolved('lightning'),seen=new Set();
      let current=this.nearest(p,390+18*((p.weapons.lightning||1)-1)),from=this.emit('lightning');
      for(let i=0;current&&i<2+rank+(evolved?2:0);i++){
        seen.add(current.id);this.effect('lightning',from.x,from.y,current.x,current.y-14,0,'#c4edf5',.23);
        this.spellHit(current,weight*(.65+.15*rank)*Math.max(.5,.88**i),'lightning');
        if(evolved&&current.alive)current.frozen=Math.max(current.frozen,current.boss?.04:.2);
        from=current;current=this.nearest(current,(evolved?210:170)+10*(rank-1),seen);
      }
      if(seen.size){this.sound('lightning');}
    }
    nova(weight=1){
      const p=this.game.player,rank=p.weapons.nova,radius=100+17*rank;
      this.effect('ring',p.x,p.y-6,0,0,radius,'#b6d6ef',.55);
      this.sound('nova');this.emit('nova',{x:p.x,y:p.y-6});this.burst(p.x,p.y-6,12,'#bfdceb','frost');
      this.game.hash.query(p.x-radius-45,p.y-radius-45,p.x+radius+45,p.y+radius+45,this.areaCandidates);
      for(const e of this.areaCandidates)if(e.alive&&e.spawnDelay<=0&&N.dist2(p,e)<(radius+e.radius)**2){
        this.spellHit(e,weight*(.7+.2*rank),'nova');e.slow=1.35;if(p.evolved('nova'))e.frozen=e.boss?.1:.5;
      }
    }
    updateWisps(){
      const p=this.game.player,rank=p.weapons.orbit;if(!rank)return;
      const logical=1+rank,count=Math.min(logical,32),radius=70+rank*4;
      for(let i=0;i<count;i++){
        const angle=this.game.time*2.3+i*Math.PI*2/count,x=p.x+Math.cos(angle)*radius,y=p.y-12+Math.sin(angle)*radius*.78;
        this.game.hash.query(x-65,y-65,x+65,y+65,this.areaCandidates);
        for(const e of this.areaCandidates)if(e.alive&&e.spawnDelay<=0&&(e.x-x)**2+(e.y-12-y)**2<(e.radius+11)**2&&(this.wispHits.get(e.id)||-1)<this.game.time){
          this.wispHits.set(e.id,this.game.time+.65);this.spellHit(e,(.34+.09*rank)*logical/count,'orbit');
          this.sound('orbit',e.x);
          if(p.evolved('orbit')&&e.alive){N.applyBurn(e,2,p.damage*.16,'orbit');}
        }
      }
    }
    addArea(kind,x,y,radius,delay,duration,damage,rank=1,evolved=false,weight=1){
      const area=this.areas.acquire();
      Object.assign(area,{kind,x,y,radius,delay,duration,damage,rank,evolved,weight,age:0,tick:0,pulses:0});return area;
    }
    meteor(weight=1){const p=this.game.player,target=this.nearest(p,370+12*(p.weapons.meteor-1));if(!target)return;
      this.addArea('meteor',target.x,target.y,65+7*p.weapons.meteor,.65,.3,p.damage*(1.25+.22*p.weapons.meteor),p.weapons.meteor,p.evolved('meteor'),weight);this.emit('meteor',target);}
    lance(weight=1){
      const p=this.game.player,target=this.nearest(p,400+14*(p.weapons.lance-1));if(!target)return;
      const angle=Math.atan2(target.y-p.y,target.x-p.x),range=410+14*(p.weapons.lance-1),x=p.x+Math.cos(angle)*range,y=p.y+Math.sin(angle)*range,width=9+p.weapons.lance*2;
      const origin=this.emit('lance');this.effect('lance',origin.x,origin.y,x,y-16,width,'#e4c4fc',.24);this.sound('lance');
      const enemies=this.game.enemies.filter(e=>e.alive&&e.spawnDelay<=0&&N.segmentDistance2(origin.x,origin.y,x,y-16,e.x,e.y-12)<(e.radius+width)**2).sort((a,b)=>N.dist2(p,a)-N.dist2(p,b));
      for(const e of enemies.slice(0,2+p.weapons.lance)){this.spellHit(e,weight*(.8+.14*p.weapons.lance),'lance');if(p.evolved('lance'))e.exposed=2;}
    }
    thorn(weight=1){const p=this.game.player,rank=p.weapons.thorn;this.addArea('thorn',p.x-p.lastX*55,p.y-p.lastY*55,74+rank*6+(p.evolved('thorn')?15:0),.12,3.2,p.damage*(.25+.07*rank),rank,p.evolved('thorn'),weight);this.emit('thorn',{x:p.x-p.lastX*55,y:p.y-p.lastY*55});this.sound('thorn');}
    rift(weight=1){const p=this.game.player,target=this.nearest(p,350+10*(p.weapons.rift-1));if(!target)return;this.addArea('rift',target.x,target.y,90+p.weapons.rift*7,.2,2.2,p.damage*(.25+.08*p.weapons.rift),p.weapons.rift,p.evolved('rift'),weight);this.emit('rift',target);this.sound('rift');}
    veilBloom(p){this.addArea('veil',p.x,p.y,42+8*p.progress.talents.veil,0,.7,0,1,false,1);}
    updateAreas(dt){
      const p=this.game.player;
      for(let i=this.areas.active.length-1;i>=0;i--){
        const a=this.areas.active[i];a.age+=dt;if(a.age<a.delay)continue;a.tick-=dt;
        const expires=a.age>=a.delay+a.duration,pulse=a.tick<=0&&(a.kind!=='meteor'||a.pulses===0||a.evolved&&a.pulses===1),final=expires&&a.kind==='rift'&&a.evolved;
        this.game.hash.query(a.x-a.radius-70,a.y-a.radius-70,a.x+a.radius+70,a.y+a.radius+70,this.areaCandidates);
        for(const e of this.areaCandidates){
          if(!e.alive||e.spawnDelay>0||N.dist2(e,a)>(a.radius+e.radius)**2)continue;
          if(a.kind==='rift'&&!e.frozen){const d=Math.hypot(a.x-e.x,a.y-e.y)||1,pull=Math.min(d,(e.boss?15+a.rank*.6:90+a.rank*4)*dt);e.x+=(a.x-e.x)/d*pull;e.y+=(a.y-e.y)/d*pull;}
          if(!pulse&&!final)continue;
          if(a.damage>0){const roll=N.critRoll(p);e.hit((a.damage*(final?2.3:1))*a.weight*roll.multiplier,roll.crit,0,0,a.kind);}
          if(a.kind==='thorn'||a.kind==='veil')e.slow=Math.max(e.slow,1.2);
          if(a.kind==='thorn'&&a.evolved&&a.pulses===0)e.frozen=Math.max(e.frozen,e.boss?.04:.25);
          if(a.kind==='meteor'&&a.evolved&&e.alive)N.applyBurn(e,3,p.damage*.15*a.weight,'meteor');
        }
        if(pulse){a.tick=a.kind==='meteor'?.14:a.kind==='thorn'?.65:.5;a.pulses++;if(a.kind==='meteor'){this.sound('meteor');this.burst(a.x,a.y-6,18,'#f1b283');this.effect('ring',a.x,a.y,0,0,a.radius,'#efbd8e',.35);if(a.evolved)this.effect('ring',a.x,a.y,0,0,a.radius*1.12,'#f4dfaa',.5);}}
        if(expires)this.areas.release(i);
      }
    }
    enemyShot(x,y,tx,ty,speed,damage,owner=null,module='hostile',remote=false){
      const b=this.hostile.acquire();if(!b)return false;
      if(owner){const o=N.Orbitals.emit(owner,module);if(!remote){x=o.x;y=o.y;}}
      const d=Math.hypot(tx-x,ty-y)||1;Object.assign(b,{x,y,vx:(tx-x)/d*speed,vy:(ty-y)/d*speed,damage,life:7,radius:6});return true;
    }
    hazard(x,y,radius,delay,damage,duration,options={}){
      const h=this.hazards.acquire();if(!h)return false;
      Object.assign(h,{x,y,radius,delay,damage,duration,age:0,kind:'circle',inner:0,angle:0,gap:0,silence:0},options);return true;
    }
    burst(x,y,count,color,style='circle'){
      if(this.game.reducedMotion||this.game.quality==='low')count=Math.ceil(count*.4);
      for(let i=0;i<count;i++){
        const part=this.particles.acquire();if(!part)break;
        const a=N.fxRand(0,Math.PI*2),speed=N.fxRand(35,190);Object.assign(part,{x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:.3,total:.3,radius:N.fxRand(1,3.3),color,style});
      }
    }
    number(x,y,text,color,crit=false){
      const n=this.numbers.acquire();if(n)Object.assign(n,{x:x+N.fxRand(-9,9),y,text,color,crit,life:.65,total:.65});
    }
    update(dt){
      const p=this.game.player;
      const sealed=p.progress.silenceTime>0;
      this.cooldown-=dt;
      if(sealed)this.cooldown=Math.max(0,this.cooldown);
      if(!sealed&&this.cooldown<=0){const target=this.nearest();if(target){const interval=N.castInterval(p),casts=Math.max(1,Math.floor(-this.cooldown/interval)+1);this.fire(target,casts);this.cooldown+=casts*interval;}else this.cooldown=0;}
      for(const id of ['lightning','nova','meteor','lance','thorn','rift','rapid','cannon','burst','glacier'])if((p.weapons[id]||0)>0){
        this.spellTimers[id]-=dt;
        if(sealed){this.spellTimers[id]=Math.max(0,this.spellTimers[id]);continue;}
        if(this.spellTimers[id]<=0){
          const base={lightning:2.8,nova:5,meteor:3.6,lance:2.6,thorn:4.5,rift:6,rapid:.13,cannon:2.6,burst:1.9,glacier:3.7}[id];
          const interval=Math.max(Number.MIN_VALUE,base/(1+.11*(p.weapons[id]-1))*(p.attackInterval/.56)),casts=Math.max(1,Math.floor(-this.spellTimers[id]/interval)+1);
          if(this[id])this[id](casts);else this.directedSpell(id,casts);this.spellTimers[id]+=casts*interval;
        }
      }
      this.updateAreas(dt);
      if(!sealed)this.updateWisps();this.mapClock-=dt;
      if(this.mapClock<=0){this.mapClock=1;for(const [id,until] of this.wispHits)if(until<this.game.time-1)this.wispHits.delete(id);}
      const active=this.projectiles.active;
      for(let i=active.length-1;i>=0;i--){
        const b=active[i];for(let j=4;j>0;j--){b.trailX[j]=b.trailX[j-1];b.trailY[j]=b.trailY[j-1];}
        b.trailX[0]=b.x;b.trailY[0]=b.y;b.trailCount=Math.min(5,b.trailCount+1);
        const ox=b.x,oy=b.y,step=Math.min(dt,Math.max(0,b.life));b.x+=b.vx*step;b.y+=b.vy*step;b.life-=dt;
        this.game.hash.query(Math.min(ox,b.x)-65,Math.min(oy,b.y)-65,Math.max(ox,b.x)+65,Math.max(oy,b.y)+65,this.candidates);
        let consumed=false;
        for(let hitCount=0;hitCount<this.candidates.length;hitCount++){
          let hit=null,first=Infinity;
          for(const e of this.candidates)if(e.alive&&e.spawnDelay<=0&&!b.hitIds.has(e.id)){
            const t=N.circleHit(ox,oy,b.x,b.y,e.x,e.y-12,e.radius+b.radius);if(t<first){first=t;hit=e;}
          }
          if(!hit)break;b.hitIds.add(hit.id);
          const speed=Math.hypot(b.vx,b.vy)||1;hit.hit(b.damage,b.crit,b.vx/speed,b.vy/speed,b.source);
          if(b.expose>0)hit.exposed=Math.max(hit.exposed,b.expose);
          if(b.blast>0){
            this.effect('ring',hit.x,hit.y-12,0,0,b.blast,b.color,.4);
            this.game.hash.query(hit.x-b.blast-60,hit.y-b.blast-60,hit.x+b.blast+60,hit.y+b.blast+60,this.areaCandidates);
            for(const e of this.areaCandidates)if(e.alive&&e.spawnDelay<=0&&N.dist2(e,hit)<(b.blast+e.radius)**2){if(e!==hit)e.hit(b.damage*.65,b.crit,0,0,b.source);if(b.source==='glacier'){e.slow=Math.max(e.slow,2);if(b.freeze)e.frozen=Math.max(e.frozen,e.boss?.1:b.freeze);}}
          }
          if(b.evolved&&b.crit){
            this.effect('ring',hit.x,hit.y-12,0,0,70,'#ead6f5');
            this.game.hash.query(hit.x-115,hit.y-115,hit.x+115,hit.y+115,this.areaCandidates);
            for(const e of this.areaCandidates)if(e.alive&&e.spawnDelay<=0&&e!==hit&&N.dist2(e,hit)<(70+e.radius)**2)e.hit(b.damage*.45,false,0,0,'bolt');
          }
          if(b.pierce<=0){consumed=true;break;}b.pierce--;
        }
        if(consumed||b.life<=0)this.projectiles.release(i);
      }
      for(let i=this.hostile.active.length-1;i>=0;i--){
        const b=this.hostile.active[i],ox=b.x,oy=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
        if(N.segmentDistance2(ox,oy,b.x,b.y,p.x,p.y-12)<(p.radius+b.radius)**2){p.hurt(b.damage);this.burst(b.x,b.y,4,'#d7a48f');this.hostile.release(i);}
        else if(b.life<=0)this.hostile.release(i);
        if(this.game.state!=='playing')return;
      }
      for(let i=this.hazards.active.length-1;i>=0;i--){
        const h=this.hazards.active[i];h.age+=dt;
        const d=Math.hypot(p.x-h.x,p.y-h.y),angle=Math.atan2(p.y-h.y,p.x-h.x),delta=Math.abs(Math.atan2(Math.sin(angle-(h.angle||0)),Math.cos(angle-(h.angle||0))));
        const inside=d<h.radius+p.radius&&(h.kind!=='ring'||d+p.radius>h.inner&&delta>h.gap/2);
        if(h.age>=h.delay&&inside){if(h.damage>0)p.hurt(h.damage);if(h.silence>0)N.Warfare.silence(this.game,h.silence);}
        if(h.age>=h.delay+h.duration)this.hazards.release(i);
        if(this.game.state!=='playing')return;
      }
      for(let i=this.particles.active.length-1;i>=0;i--){
        const part=this.particles.active[i];part.life-=dt;if(part.life<=0){this.particles.release(i);continue;}
        part.x+=part.vx*dt;part.y+=part.vy*dt;part.vx*=Math.exp(-5*dt);part.vy*=Math.exp(-5*dt);
      }
      for(let i=this.numbers.active.length-1;i>=0;i--){const n=this.numbers.active[i];n.life-=dt;n.y-=dt*27;if(n.life<=0)this.numbers.release(i);}
      for(let i=this.effects.active.length-1;i>=0;i--){const e=this.effects.active[i];e.life-=dt;if(e.life<=0)this.effects.release(i);}
      for(let i=this.remnants.active.length-1;i>=0;i--){const r=this.remnants.active[i];r.life-=dt;r.x+=r.vx*dt;r.y+=r.vy*dt;if(r.life<=0)this.remnants.release(i);}
    }
    drawGround(c){
      c.save();
      for(const r of this.remnants.active){
        if(!this.game.visible(r.x,r.y,100))continue;
        const t=Math.max(0,r.life/r.total);c.save();
        if(r.kind==='ghost'){
          c.globalAlpha=t*(this.game.quality==='low'?.08:.14);const a=window.NOCTURNE_ATLAS,sheet=this.game.images[(this.game.player.progress.demonTime>0?'demon':'witch')+'_atlas_'+r.facing],frame=a.clips.dash.start+1;c.drawImage(sheet,frame*a.width,0,a.width,a.height,r.x-40,r.y-99,80,107);
        }else if(r.kind==='corpse'){
          c.globalAlpha=t*.55;const s=r.scale*(.85+.15*t);
          N.drawEnemy(c,this.game.images,{type:r.type,facing:r.facing,game:this.game},r.x-40*s,r.y-99*s+(1-t)*5,80*s,107*s,'death',1-t);N.HostileVisuals.defeat(c,r,t,this.game);
        }else{
          c.globalAlpha=t*.22;c.fillStyle='#9ca18e';c.beginPath();c.ellipse(r.x,r.y,r.radius*(2-t),r.radius*.55*(2-t),0,0,Math.PI*2);c.fill();
        }
        c.restore();
      }
      N.Fields.draw(this.game,c);
      c.restore();
    }
    draw(c){
      const p=this.game.player;c.save();c.globalCompositeOperation='lighter';
      if(p.weapons.orbit){
        const count=Math.min(32,1+p.weapons.orbit),radius=70+p.weapons.orbit*4;c.strokeStyle='#bcb1d022';c.lineWidth=1;c.beginPath();c.ellipse(p.x,p.y-12,radius,radius*.78,0,0,Math.PI*2);c.stroke();
        for(let i=0;i<count;i++){
          const a=this.game.time*2.3+i*Math.PI*2/count,x=p.x+Math.cos(a)*radius,y=p.y-12+Math.sin(a)*radius*.78;
          N.Orbitals.wisp(c,p,x,y);
        }
      }
      for(const b of this.projectiles.active){
        if(!this.game.visible(b.x,b.y,50))continue;
        for(let i=b.trailCount-1;i>=0;i--){
          c.globalAlpha=(1-i/5)*.38;c.strokeStyle=b.color||'#e9e2ff';c.lineWidth=Math.max(.8,4-i*.65);c.beginPath();c.moveTo(b.trailX[i],b.trailY[i]);c.lineTo(i?b.trailX[i-1]:b.x,i?b.trailY[i-1]:b.y);c.stroke();
        }
        c.globalAlpha=1;N.Appearance.projectile(c,b,this.game);
      }
      for(const b of this.hostile.active){
        if(!this.game.visible(b.x,b.y,30))continue;
        N.Appearance.projectile(c,b,this.game,true);
      }
      for(const e of this.effects.active){
        c.globalAlpha=e.life/e.total;c.strokeStyle=e.color;c.lineWidth=2;
        if(N.Presentation.effect(c,e,this.game))continue;
        if(e.kind==='slash'){const t=1-e.life/e.total;c.lineWidth=2+5*(1-t);for(let j=0;j<3;j++){c.beginPath();c.arc(e.x,e.y,Math.max(1,e.radius*(.55+t*.45)-j*10),e.x2-e.y2/2,e.x2+e.y2/2);c.stroke();}}
        else if(e.kind==='delivery'){const t=1-e.life/e.total,x=e.x+(e.x2-e.x)*t,y=e.y+(e.y2-e.y)*t-Math.sin(t*Math.PI)*35;c.fillStyle=e.color;c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill();c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.lineTo(x-(e.x2-e.x)*.08,y-(e.y2-e.y)*.08);c.stroke();}
        else if(e.kind==='ring'){c.beginPath();c.ellipse(e.x,e.y,Math.max(1,e.radius*(1-e.life/e.total)),Math.max(1,e.radius*.85*(1-e.life/e.total)),0,0,Math.PI*2);c.stroke();}
        else if(e.kind==='lance'){c.lineWidth=Math.max(2,e.radius*.55);c.strokeStyle=e.color+'55';c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.x2,e.y2);c.stroke();c.lineWidth=2;c.strokeStyle='#fff4ff';c.stroke();}
        else if(e.kind==='lightning'){
          const dx=e.x2-e.x,dy=e.y2-e.y,len=Math.hypot(dx,dy)||1;c.beginPath();c.moveTo(e.x,e.y);
          for(let j=1;j<8;j++){const offset=Math.sin(j*19.7+e.seed)*9;c.lineTo(e.x+dx*j/8-dy/len*offset,e.y+dy*j/8+dx/len*offset);}c.lineTo(e.x2,e.y2);c.stroke();
        }else if(e.kind==='pickup'){
          const t=1-e.life/e.total,r=e.radius*(.4+t);c.beginPath();c.arc(e.x,e.y,r,0,Math.PI*2);c.stroke();
          if(!this.game.reducedMotion){c.fillStyle=e.color;c.fillRect(e.x-1,e.y-6-t*14,2,3);}
        }else{
          const t=1-e.life/e.total,r=Math.max(2,e.radius*(.35+t*.65));
          c.save();c.translate(e.x,e.y);if(e.kind==='rune'&&!this.game.reducedMotion)c.rotate(t*.7);
          c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();
          const spokes=e.kind==='impact'?6:e.kind==='rune'?8:4;
          for(let j=0;j<spokes;j++){
            const a=j*Math.PI*2/spokes+e.seed,inner=r*(e.kind==='impact'?.3:.72),outer=r*1.22;
            c.beginPath();c.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);c.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);c.stroke();
          }
          c.restore();
        }
      }
      for(const part of this.particles.active){
        const t=Math.max(0,part.life/part.total);c.globalAlpha=t;c.fillStyle=part.color;
        if(part.style==='frost'){
          c.save();c.translate(part.x,part.y);c.rotate(t*2);c.fillRect(-part.radius*t,-part.radius*t,part.radius*t*2,part.radius*t*2);c.restore();
        }else{c.beginPath();c.arc(part.x,part.y,part.radius*t,0,Math.PI*2);c.fill();}
      }
      c.restore();c.save();c.textAlign='center';
      for(const n of this.numbers.active){c.globalAlpha=Math.min(1,n.life/.25);c.fillStyle=n.color;c.font=n.crit?'bold 18px Georgia':'bold 13px Arial';c.strokeStyle='#0c1419';c.lineWidth=3;c.strokeText(n.text,n.x,n.y);c.fillText(n.text,n.x,n.y);}c.restore();
    }
  }
  N.Pool=Pool;N.Projectile=Projectile;N.Combat=Combat;N.WEAPONS=WEAPONS;
})();
