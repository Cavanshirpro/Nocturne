(() => {
  'use strict';
  const N=window.Nocturne;
  const WEAPONS=Object.freeze({
    bolt:{name:'Arcane Bolt',icon:'✧',color:'#eee5ff',evolution:'Shattered Moon',relic:'mirror',text:'Targets foes within 430 world units. Orbs fade after 490 units. Each rank adds 15% damage; multicast shares power across orbs.',evolved:'Orbs pierce +1 target. Critical hits explode for 45% damage in 70 range.'},
    orbit:{name:'Moon Wisps',icon:'☽',color:'#e8ba93',evolution:'Cinder Halo',relic:'cinder',text:'1 + rank orbiting wisps. Each rank increases contact damage.',evolved:'Wisp hits ignite enemies for 2 seconds of additional damage.'},
    lightning:{name:'Chain Lightning',icon:'ϟ',color:'#b6e4ec',evolution:'Thunder Crown',relic:'conductor',text:'Targets within 390 units, then chains 170 units per jump through 2 + rank enemies.',evolved:'Chains to 2 more targets, reaches farther and briefly stuns enemies.'},
    nova:{name:'Frost Nova',icon:'❄',color:'#b6d6ef',evolution:'Absolute Winter',relic:'permafrost',text:'A slowing pulse within 100 + 17 per rank units. Ranks increase damage and cast rate.',evolved:'The pulse freezes enemies for 0.5 seconds, then leaves them slowed.'}
  });
  // All sound is synthesized locally. One shared graph, bounded short voices,
  // per-event limits, a master fader and gentle compression keep dense combat tame.
  class Pool {
    constructor(factory,limit){this.factory=factory;this.limit=limit;this.free=[];this.active=[];this.created=0;}
    acquire(){let item=this.free.pop();if(!item){if(this.created>=this.limit)return null;item=this.factory();this.created++;}this.active.push(item);return item;}
    release(index){const a=this.active,item=a[index];a[index]=a[a.length-1];a.pop();this.free.push(item);}
    clear(){while(this.active.length)this.free.push(this.active.pop());}
  }
  class Projectile {
    constructor(){this.trailX=new Float32Array(5);this.trailY=new Float32Array(5);this.hitIds=new Set();}
    reset(x,y,vx,vy,damage,crit,pierce=0,evolved=false){
      Object.assign(this,{x,y,vx,vy,damage,crit,life:2.6,radius:6,trailCount:0,pierce,evolved});
      this.trailX.fill(x);this.trailY.fill(y);this.hitIds.clear();
    }
  }
  class Combat {
    constructor(game){
      this.game=game;this.cooldown=0;this.candidates=[];this.areaCandidates=[];
      this.projectiles=new Pool(()=>new Projectile(),240);this.particles=new Pool(()=>({}),650);this.numbers=new Pool(()=>({}),55);
      this.hostile=new Pool(()=>({}),180);this.hazards=new Pool(()=>({}),24);this.effects=new Pool(()=>({}),80);
      this.remnants=new Pool(()=>({}),96);
      this.spellTimers={lightning:.5,nova:1};this.wispHits=new Map();this.mapClock=0;
      this.audioEngine=new N.AudioEngine(game);this.soundEnabled=false;
    }
    clear(){
      for(const pool of [this.projectiles,this.particles,this.numbers,this.hostile,this.hazards,this.effects,this.remnants])pool.clear();
      this.wispHits.clear();this.spellTimers.lightning=.5;this.spellTimers.nova=1;this.mapClock=0;
    }
    get audio(){return this.audioEngine.context;}
    get soundEnabled(){return this.audioEngine.enabled;}
    set soundEnabled(value){this.audioEngine.setEnabled(value);}
    enableAudio(cue='ui'){return this.audioEngine.activate(cue);}
    sound(kind,x){return this.audioEngine.play(kind,x);}
    nearest(origin=this.game.player,range=N.BALANCE.boltRange,exclude=null){
      let nearest=null,best=range*range;
      for(const e of this.game.enemies){if(!e.alive||e.spawnDelay>0||exclude?.has(e.id))continue;const d=N.dist2(origin,e);if(d<best){best=d;nearest=e;}}
      return nearest;
    }
    fire(target){
      const p=this.game.player,ox=p.x,oy=p.y-18,angle=Math.atan2(target.y-12-oy,target.x-ox),count=p.projectileCount;
      for(let i=0;i<count;i++){
        const bullet=this.projectiles.acquire();if(!bullet)break;
        const theta=angle+(i-(count-1)/2)*.105,crit=Math.random()<p.critChance;
        bullet.reset(ox,oy,Math.cos(theta)*p.projectileSpeed,Math.sin(theta)*p.projectileSpeed,p.damage*(1+.15*(p.weapons.bolt-1))/Math.sqrt(count)*(crit?p.critMultiplier:1),crit,p.pierce+(p.evolved('bolt')?1:0),p.evolved('bolt'));
      }
      for(const b of this.projectiles.active)if(b.trailCount===0)b.life=Math.min(b.life,N.BALANCE.boltTravel/p.projectileSpeed);
      this.sound('fire');
      p.cast(target);this.effect('muzzle',ox,oy,0,0,21,p.evolved('bolt')?'#dfc2f4':'#e9e2ff',.18);
    }
    spellHit(enemy,multiplier,source){
      const p=this.game.player,crit=Math.random()<p.critChance;
      enemy.hit(p.damage*multiplier*(crit?p.critMultiplier:1),crit,0,0,source);
    }
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
      const r=this.remnants.acquire();if(r)Object.assign(r,{kind:'corpse',x:enemy.x,y:enemy.y,type:enemy.type,scale:enemy.scale,life:this.game.reducedMotion?.25:.6,total:this.game.reducedMotion?.25:.6,vx:0,vy:0});
      this.effect('ring',enemy.x,enemy.y-10,0,0,enemy.boss?110:enemy.radius*1.5,enemy.boss?'#e2bf8b':'#b6b0c5',enemy.boss?.8:.3);
    }
    lightning(){
      const p=this.game.player,rank=p.weapons.lightning,evolved=p.evolved('lightning'),seen=new Set();
      let current=this.nearest(p,N.BALANCE.lightningRange),from={x:p.x,y:p.y-28};
      for(let i=0;current&&i<2+rank+(evolved?2:0);i++){
        seen.add(current.id);this.effect('lightning',from.x,from.y,current.x,current.y-14,0,'#c4edf5',.23);
        this.spellHit(current,(.65+.15*rank)*Math.max(.5,.88**i),'lightning');
        if(evolved&&current.alive)current.frozen=Math.max(current.frozen,current.boss?.04:.2);
        from=current;current=this.nearest(current,evolved?N.BALANCE.evolvedChainRange:N.BALANCE.chainRange,seen);
      }
      if(seen.size){this.sound('lightning');p.cast();}
    }
    nova(){
      const p=this.game.player,rank=p.weapons.nova,radius=100+17*rank;
      this.effect('ring',p.x,p.y-6,0,0,radius,'#b6d6ef',.55);
      this.sound('nova');p.cast();this.burst(p.x,p.y-6,12,'#bfdceb','frost');
      this.game.hash.query(p.x-radius-45,p.y-radius-45,p.x+radius+45,p.y+radius+45,this.areaCandidates);
      for(const e of this.areaCandidates)if(e.alive&&e.spawnDelay<=0&&N.dist2(p,e)<(radius+e.radius)**2){
        this.spellHit(e,.7+.2*rank,'nova');e.slow=1.35;if(p.evolved('nova'))e.frozen=e.boss?.1:.5;
      }
    }
    updateWisps(){
      const p=this.game.player,rank=p.weapons.orbit;if(!rank)return;
      const count=1+rank,radius=70+rank*4;
      for(let i=0;i<count;i++){
        const angle=this.game.time*2.3+i*Math.PI*2/count,x=p.x+Math.cos(angle)*radius,y=p.y-12+Math.sin(angle)*radius*.78;
        this.game.hash.query(x-65,y-65,x+65,y+65,this.areaCandidates);
        for(const e of this.areaCandidates)if(e.alive&&e.spawnDelay<=0&&(e.x-x)**2+(e.y-12-y)**2<(e.radius+11)**2&&(this.wispHits.get(e.id)||-1)<this.game.time){
          this.wispHits.set(e.id,this.game.time+.65);this.spellHit(e,.34+.09*rank,'orbit');
          this.sound('orbit',e.x);
          if(p.evolved('orbit')&&e.alive){e.burn=2;e.burnDamage=p.damage*.16;e.burnTick=.35;}
        }
      }
    }
    enemyShot(x,y,tx,ty,speed,damage){
      const b=this.hostile.acquire();if(!b)return false;
      const d=Math.hypot(tx-x,ty-y)||1;Object.assign(b,{x,y,vx:(tx-x)/d*speed,vy:(ty-y)/d*speed,damage,life:7,radius:6});return true;
    }
    hazard(x,y,radius,delay,damage,duration){
      const h=this.hazards.acquire();if(!h)return false;
      Object.assign(h,{x,y,radius,delay,damage,duration,age:0});return true;
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
      this.cooldown-=dt;
      if(this.cooldown<=0){const target=this.nearest();if(target){this.fire(target);this.cooldown=Math.max(N.BALANCE.minAttackInterval,p.attackInterval);}else this.cooldown=0;}
      for(const id of ['lightning','nova'])if(p.weapons[id]>0){
        this.spellTimers[id]-=dt;
        if(this.spellTimers[id]<=0){
          if(id==='lightning')this.lightning();else this.nova();
          this.spellTimers[id]=Math.max(id==='lightning'?1.05:2,(id==='lightning'?2.8-.25*p.weapons[id]:5-.35*p.weapons[id])*N.clamp(p.attackInterval/.56,.72,1.5));
        }
      }
      this.updateWisps();this.mapClock-=dt;
      if(this.mapClock<=0){this.mapClock=1;for(const [id,until] of this.wispHits)if(until<this.game.time-1)this.wispHits.delete(id);}
      const active=this.projectiles.active;
      for(let i=active.length-1;i>=0;i--){
        const b=active[i];for(let j=4;j>0;j--){b.trailX[j]=b.trailX[j-1];b.trailY[j]=b.trailY[j-1];}
        b.trailX[0]=b.x;b.trailY[0]=b.y;b.trailCount=Math.min(5,b.trailCount+1);
        const ox=b.x,oy=b.y,step=Math.min(dt,Math.max(0,b.life));b.x+=b.vx*step;b.y+=b.vy*step;b.life-=dt;
        this.game.hash.query(Math.min(ox,b.x)-65,Math.min(oy,b.y)-65,Math.max(ox,b.x)+65,Math.max(oy,b.y)+65,this.candidates);
        let consumed=false;
        for(let hitCount=0;hitCount<5;hitCount++){
          let hit=null,first=Infinity;
          for(const e of this.candidates)if(e.alive&&e.spawnDelay<=0&&!b.hitIds.has(e.id)){
            const t=N.circleHit(ox,oy,b.x,b.y,e.x,e.y-12,e.radius+b.radius);if(t<first){first=t;hit=e;}
          }
          if(!hit)break;b.hitIds.add(hit.id);
          const speed=Math.hypot(b.vx,b.vy)||1;hit.hit(b.damage,b.crit,b.vx/speed,b.vy/speed);
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
        if(h.age>=h.delay&&N.dist2(h,p)<(h.radius+p.radius)**2)p.hurt(h.damage);
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
          c.globalAlpha=t*.23;N.drawWitch(c,this.game.images,r.facing,r.frame,r.x-40,r.y-99);
        }else if(r.kind==='corpse'){
          c.globalAlpha=t*.55;const s=r.scale*(.85+.15*t);
          c.drawImage(this.game.images[r.type],r.x-40*s,r.y-79*s+(1-t)*12,80*s,88*s);
        }else{
          c.globalAlpha=t*.22;c.fillStyle='#9ca18e';c.beginPath();c.ellipse(r.x,r.y,r.radius*(2-t),r.radius*.55*(2-t),0,0,Math.PI*2);c.fill();
        }
        c.restore();
      }
      for(const h of this.hazards.active){
        const warning=h.age<h.delay;c.fillStyle=warning?'#c2946d14':'#b866573f';c.strokeStyle=warning?'#d3a477aa':'#e49d8bc0';c.lineWidth=2;
        c.beginPath();c.arc(h.x,h.y,h.radius,0,Math.PI*2);c.fill();c.stroke();
        if(warning){c.setLineDash([4,8]);c.beginPath();c.arc(h.x,h.y,Math.max(1,h.radius*h.age/h.delay),0,Math.PI*2);c.stroke();c.setLineDash([]);}
        else{c.beginPath();c.moveTo(h.x-14,h.y);c.lineTo(h.x+14,h.y);c.moveTo(h.x,h.y-14);c.lineTo(h.x,h.y+14);c.stroke();}
      }
      c.restore();
    }
    draw(c){
      const p=this.game.player;c.save();c.globalCompositeOperation='lighter';
      if(p.weapons.orbit){
        const count=1+p.weapons.orbit,radius=70+p.weapons.orbit*4;c.strokeStyle='#bcb1d022';c.lineWidth=1;c.beginPath();c.ellipse(p.x,p.y-12,radius,radius*.78,0,0,Math.PI*2);c.stroke();
        for(let i=0;i<count;i++){
          const a=this.game.time*2.3+i*Math.PI*2/count,x=p.x+Math.cos(a)*radius,y=p.y-12+Math.sin(a)*radius*.78;
          c.drawImage(this.game.images.orb,x-18,y-18,36,36);c.fillStyle=p.evolved('orbit')?'#e2a17a':'#c8bbdf';c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();
        }
      }
      for(const b of this.projectiles.active){
        if(!this.game.visible(b.x,b.y,50))continue;
        for(let i=b.trailCount-1;i>=0;i--){
          c.globalAlpha=(1-i/5)*.38;c.strokeStyle='#e9e2ff';c.lineWidth=Math.max(.8,4-i*.65);c.beginPath();c.moveTo(b.trailX[i],b.trailY[i]);c.lineTo(i?b.trailX[i-1]:b.x,i?b.trailY[i-1]:b.y);c.stroke();
        }
        c.globalAlpha=1;c.drawImage(this.game.images.orb,b.x-19,b.y-19,38,38);
      }
      for(const b of this.hostile.active){
        if(!this.game.visible(b.x,b.y,30))continue;
        c.fillStyle='#e7aa8e22';c.beginPath();c.arc(b.x,b.y,13,0,Math.PI*2);c.fill();c.fillStyle='#e4ad91';c.beginPath();c.arc(b.x,b.y,5,0,Math.PI*2);c.fill();c.fillStyle='#fff0d6';c.beginPath();c.arc(b.x,b.y,2,0,Math.PI*2);c.fill();
      }
      for(const e of this.effects.active){
        c.globalAlpha=e.life/e.total;c.strokeStyle=e.color;c.lineWidth=2;
        if(e.kind==='ring'){c.beginPath();c.ellipse(e.x,e.y,Math.max(1,e.radius*(1-e.life/e.total)),Math.max(1,e.radius*.85*(1-e.life/e.total)),0,0,Math.PI*2);c.stroke();}
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
      for(const n of this.numbers.active){c.globalAlpha=Math.min(1,n.life/.25);c.fillStyle=n.color;c.font=n.crit?'bold 17px Georgia':'12px Arial';c.fillText(n.text,n.x,n.y);}c.restore();
    }
  }
  N.Pool=Pool;N.Projectile=Projectile;N.Combat=Combat;N.WEAPONS=WEAPONS;
})();
