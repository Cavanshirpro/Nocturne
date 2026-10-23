(() => {
  'use strict';
  const N=window.Nocturne;
  const WEAPONS=Object.freeze({
    bolt:{name:'Arcane Bolt',icon:'✧',color:'#eee5ff',evolution:'Shattered Moon',relic:'mirror',text:'White orbs aim at the nearest foe, then fly straight. Each rank adds 15% damage.',evolved:'Orbs pierce +1 target. Critical hits explode for 45% damage in 70 range.'},
    orbit:{name:'Moon Wisps',icon:'☽',color:'#e8ba93',evolution:'Cinder Halo',relic:'cinder',text:'1 + rank orbiting wisps. Each rank increases contact damage.',evolved:'Wisp hits ignite enemies for 2 seconds of additional damage.'},
    lightning:{name:'Chain Lightning',icon:'ϟ',color:'#b6e4ec',evolution:'Thunder Crown',relic:'conductor',text:'Chains through 2 + rank enemies. Ranks increase damage and cast rate.',evolved:'Chains to 2 more targets, reaches farther and briefly stuns enemies.'},
    nova:{name:'Frost Nova',icon:'❄',color:'#b6d6ef',evolution:'Absolute Winter',relic:'permafrost',text:'Periodic slowing pulse. Each rank increases radius, damage and cast rate.',evolved:'The pulse freezes enemies for 0.8 seconds, then leaves them slowed.'}
  });
  // All sound is synthesized locally. One shared graph, bounded short voices,
  // per-event limits, a master fader and gentle compression keep dense combat tame.
  class AudioEngine {
    constructor(game){
      this.game=game;this.context=null;this.enabled=false;this.foreground=true;
      this.volume=game.save.data.settings.volume??.6;this.ambience=game.save.data.settings.ambience!==false;
      this.voices=new Set();this.last=new Map();this.maxVoices=28;this.ambientSources=[];this.active=false;
    }
    attach(context){
      if(this.context)return this.context;
      this.context=context;this.offline=typeof context.startRendering==='function';
      const a=context;this.master=a.createGain();this.sfx=a.createGain();this.ambient=a.createGain();this.compressor=a.createDynamicsCompressor();
      this.compressor.threshold.value=-18;this.compressor.knee.value=20;this.compressor.ratio.value=6;
      this.compressor.attack.value=.004;this.compressor.release.value=.16;
      this.sfx.connect(this.master);this.ambient.connect(this.master);this.master.connect(this.compressor);this.compressor.connect(a.destination);
      this.ambient.gain.value=0;this.master.gain.value=this.enabled&&this.foreground?this.volume*.7:0;
      this.noise=a.createBuffer(1,a.sampleRate,a.sampleRate);
      let seed=91723;const values=this.noise.getChannelData(0);
      for(let i=0;i<values.length;i++){seed=(seed*1664525+1013904223)>>>0;values[i]=seed/2147483648-1;}
      if(!this.offline){
        const wind=a.createBufferSource(),filter=a.createBiquadFilter();wind.buffer=this.noise;wind.loop=true;filter.type='bandpass';filter.frequency.value=350;filter.Q.value=.45;
        wind.connect(filter);filter.connect(this.ambient);wind.start();this.ambientSources.push(wind,filter);
        for(const frequency of [82.41,123.47]){
          const tone=a.createOscillator(),gain=a.createGain();tone.type='sine';tone.frequency.value=frequency;gain.gain.value=.07;
          tone.connect(gain);gain.connect(this.ambient);tone.start();this.ambientSources.push(tone,gain);
        }
      }
      this.mix();return a;
    }
    activate(cue=null){
      try{
        const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio&&!this.context)return false;
        const a=this.context||this.attach(new Audio());
        if(a.state==='suspended'&&!this.offline)a.resume().then(()=>{this.mix();if(cue)this.play(cue);}).catch(()=>{});
        else if(cue)this.play(cue);
        this.mix();return true;
      }catch(error){console.warn('Audio unavailable:',error.message);return false;}
    }
    mix(){
      if(!this.context)return;
      const a=this.context,t=a.currentTime;
      this.master.gain.cancelScheduledValues(t);this.master.gain.setTargetAtTime(this.enabled&&this.foreground?this.volume*.7:0,t,.025);
      this.ambient.gain.cancelScheduledValues(t);this.ambient.gain.setTargetAtTime(this.enabled&&this.foreground&&this.active&&this.ambience ? .018 : 0,t,.12);
    }
    setEnabled(value){this.enabled=Boolean(value);if(!value)this.stopVoices();this.mix();}
    setVolume(value){this.volume=N.clamp(Number(value)||0,0,1);this.mix();}
    setAmbience(value){this.ambience=Boolean(value);this.mix();}
    transport(active){if(this.active===active)return;this.active=active;this.mix();}
    setForeground(value){this.foreground=Boolean(value);if(!value)this.stopVoices();this.mix();}
    stopVoices(){for(const v of [...this.voices]){try{v.source.stop();}catch{}v.cleanup();}}
    voice(spec,time,pan,priority){
      const a=this.context;
      if(this.voices.size>=this.maxVoices){
        const candidate=[...this.voices].find(v=>v.priority<priority);
        if(!candidate)return false;try{candidate.source.stop();}catch{}candidate.cleanup();
      }
      const source=spec.noise?a.createBufferSource():a.createOscillator(),gain=a.createGain(),nodes=[source,gain];
      if(spec.noise)source.buffer=this.noise;
      else{source.type=spec.wave||'sine';source.frequency.setValueAtTime(spec.f,time);source.frequency.exponentialRampToValueAtTime(Math.max(20,spec.to??spec.f),time+spec.d);}
      let output=source;
      if(spec.noise){const filter=a.createBiquadFilter();filter.type=spec.filter||'lowpass';filter.frequency.value=spec.cut||900;filter.Q.value=.6;source.connect(filter);nodes.push(filter);output=filter;}
      output.connect(gain);const attack=Math.min(.012,spec.d*.2),amplitude=spec.g??.06;
      gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,amplitude),time+attack);gain.gain.exponentialRampToValueAtTime(.0001,time+spec.d);
      if(a.createStereoPanner){const panner=a.createStereoPanner();panner.pan.value=pan;gain.connect(panner);panner.connect(this.sfx);nodes.push(panner);}else gain.connect(this.sfx);
      let released=false;const v={source,priority,cleanup:()=>{if(released)return;released=true;for(const node of nodes)node.disconnect();this.voices.delete(v);}};
      this.voices.add(v);source.onended=v.cleanup;source.start(time);source.stop(time+spec.d+.02);return true;
    }
    play(kind,x=this.game.player?.x??0){
      const recipe=AudioEngine.SOUNDS[kind],a=this.context;
      if(!recipe||!this.enabled||!this.foreground||!a||(!this.offline&&a.state!=='running'))return false;
      const now=a.currentTime;if(now-(this.last.get(kind)??-Infinity)<recipe.gap)return false;
      this.last.set(kind,now);const pan=N.clamp((x-(this.game.player?.x||0))/420,-.75,.75);
      let count=0;for(const spec of recipe.notes)if(this.voice(spec,now+(spec.at||0),pan,recipe.priority??1))count++;
      return count>0;
    }
    dispose(){this.stopVoices();for(const node of this.ambientSources){try{node.stop?.();}catch{}node.disconnect();}this.ambientSources.length=0;this.master?.disconnect();this.sfx?.disconnect();this.ambient?.disconnect();this.compressor?.disconnect();}
  }
  AudioEngine.SOUNDS=Object.freeze({
    fire:{gap:.085,notes:[{f:760,to:350,d:.12,g:.04},{noise:true,cut:1900,d:.055,g:.022}]},
    lightning:{gap:.13,notes:[{noise:true,filter:'highpass',cut:1500,d:.18,g:.085},{f:210,to:60,wave:'triangle',d:.15,g:.04}]},
    nova:{gap:.2,notes:[{noise:true,filter:'highpass',cut:2700,d:.38,g:.07},{f:940,to:320,d:.38,g:.045},{f:1410,to:640,d:.25,g:.025,at:.035}]},
    orbit:{gap:.12,notes:[{f:520,to:340,d:.1,g:.032}]},
    hit:{gap:.07,notes:[{noise:true,cut:800,d:.065,g:.055},{f:170,to:70,d:.075,g:.045}]},
    crit:{gap:.12,priority:2,notes:[{f:110,to:45,wave:'triangle',d:.19,g:.07},{f:1320,to:660,d:.19,g:.045},{noise:true,cut:2100,d:.09,g:.055}]},
    death:{gap:.1,notes:[{noise:true,cut:600,d:.24,g:.06},{f:150,to:45,d:.22,g:.04}]},
    dash:{gap:.2,priority:2,notes:[{noise:true,filter:'bandpass',cut:1500,d:.2,g:.08},{f:330,to:90,d:.2,g:.04}]},
    step:{gap:.12,priority:0,notes:[{noise:true,cut:450,d:.045,g:.035}]},
    xp:{gap:.07,notes:[{f:1000,to:1390,d:.075,g:.026}]},
    gold:{gap:.09,notes:[{f:1568,d:.11,g:.033},{f:2093,d:.09,g:.024,at:.025}]},
    heal:{gap:.2,priority:2,notes:[{f:440,to:660,d:.22,g:.05},{f:880,d:.24,g:.045,at:.09}]},
    hurt:{gap:.25,priority:3,notes:[{f:140,to:45,wave:'triangle',d:.22,g:.085},{noise:true,cut:450,d:.13,g:.08}]},
    level:{gap:.5,priority:3,notes:[0,1,2,3].map((i)=>({f:[523.25,659.25,783.99,1046.5][i],d:.32,g:.05,at:i*.085}))},
    evolve:{gap:.5,priority:3,notes:[0,1,2,3,4].map(i=>({f:[261.63,392,523.25,659.25,1046.5][i],d:.42,g:.05,at:i*.085}))},
    choose:{gap:.12,priority:2,notes:[{f:659.25,d:.16,g:.04},{f:987.77,d:.22,g:.04,at:.055}]},
    buy:{gap:.12,priority:2,notes:[{f:1397,d:.1,g:.035},{f:1865,d:.15,g:.04,at:.065}]},
    lock:{gap:.08,notes:[{noise:true,cut:1000,d:.035,g:.04},{f:350,to:240,d:.05,g:.03}]},
    reroll:{gap:.15,notes:[{noise:true,filter:'bandpass',cut:1300,d:.15,g:.05},{f:410,to:620,d:.12,g:.03,at:.045}]},
    ui:{gap:.07,notes:[{f:540,to:420,d:.055,g:.025}]},
    wave:{gap:.5,priority:2,notes:[{f:130.81,d:.65,g:.055},{f:261.63,d:.45,g:.035,at:.12}]},
    boss:{gap:1,priority:3,notes:[{f:65.41,to:49,d:1,g:.09},{f:98,to:73.5,d:.9,g:.045,at:.1},{noise:true,cut:250,d:.75,g:.055}]},
    victory:{gap:1,priority:3,notes:[{f:130.81,d:.9,g:.06},{f:261.63,d:.7,g:.05,at:.1},{f:392,d:.65,g:.04,at:.22}]},
    gameover:{gap:1,priority:3,notes:[0,1,2].map(i=>({f:[261.63,196,130.81][i],d:.5,g:.05,at:i*.19}))}
  });
  N.AudioEngine=AudioEngine;
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
      this.audioEngine=new AudioEngine(game);this.soundEnabled=false;
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
    nearest(origin=this.game.player,range=Infinity,exclude=null){
      let nearest=null,best=range*range;
      for(const e of this.game.enemies){if(!e.alive||exclude?.has(e.id))continue;const d=N.dist2(origin,e);if(d<best){best=d;nearest=e;}}
      return nearest;
    }
    fire(target){
      const p=this.game.player,ox=p.x,oy=p.y-18,angle=Math.atan2(target.y-12-oy,target.x-ox),count=p.projectileCount;
      for(let i=0;i<count;i++){
        const bullet=this.projectiles.acquire();if(!bullet)break;
        const theta=angle+(i-(count-1)/2)*.105,crit=Math.random()<p.critChance;
        bullet.reset(ox,oy,Math.cos(theta)*p.projectileSpeed,Math.sin(theta)*p.projectileSpeed,p.damage*(1+.15*(p.weapons.bolt-1))*(crit?p.critMultiplier:1),crit,p.pierce+(p.evolved('bolt')?1:0),p.evolved('bolt'));
      }
      this.sound('fire');
      p.castTimer=.15;this.effect('muzzle',ox,oy,0,0,21,p.evolved('bolt')?'#dfc2f4':'#e9e2ff',.18);
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
      let current=this.nearest(p,720),from={x:p.x,y:p.y-28};
      for(let i=0;current&&i<2+rank+(evolved?2:0);i++){
        seen.add(current.id);this.effect('lightning',from.x,from.y,current.x,current.y-14,0,'#c4edf5',.23);
        this.spellHit(current,(.65+.15*rank)*Math.max(.5,.88**i),'lightning');
        if(evolved&&current.alive)current.frozen=Math.max(current.frozen,current.boss?.04:.2);
        from=current;current=this.nearest(current,evolved?295:220,seen);
      }
      if(seen.size){this.sound('lightning');p.castTimer=.15;}
    }
    nova(){
      const p=this.game.player,rank=p.weapons.nova,radius=110+22*rank;
      this.effect('ring',p.x,p.y-6,0,0,radius,'#b6d6ef',.55);
      this.sound('nova');p.castTimer=.15;this.burst(p.x,p.y-6,12,'#bfdceb','frost');
      this.game.hash.query(p.x-radius-45,p.y-radius-45,p.x+radius+45,p.y+radius+45,this.areaCandidates);
      for(const e of this.areaCandidates)if(e.alive&&N.dist2(p,e)<(radius+e.radius)**2){
        this.spellHit(e,.7+.2*rank,'nova');e.slow=2.3;if(p.evolved('nova'))e.frozen=e.boss?.15:.8;
      }
    }
    updateWisps(){
      const p=this.game.player,rank=p.weapons.orbit;if(!rank)return;
      const count=1+rank,radius=70+rank*4;
      for(let i=0;i<count;i++){
        const angle=this.game.time*2.3+i*Math.PI*2/count,x=p.x+Math.cos(angle)*radius,y=p.y-12+Math.sin(angle)*radius*.78;
        this.game.hash.query(x-65,y-65,x+65,y+65,this.areaCandidates);
        for(const e of this.areaCandidates)if(e.alive&&(e.x-x)**2+(e.y-12-y)**2<(e.radius+11)**2&&(this.wispHits.get(e.id)||-1)<this.game.time){
          this.wispHits.set(e.id,this.game.time+.45);this.spellHit(e,.4+.12*rank,'orbit');
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
      if(this.cooldown<=0){const target=this.nearest();if(target){this.fire(target);this.cooldown=Math.max(.12,p.attackInterval);}else this.cooldown=0;}
      for(const id of ['lightning','nova'])if(p.weapons[id]>0){
        this.spellTimers[id]-=dt;
        if(this.spellTimers[id]<=0){
          if(id==='lightning')this.lightning();else this.nova();
          this.spellTimers[id]=Math.max(.4,(id==='lightning'?2.3-.25*p.weapons[id]:4.5-.4*p.weapons[id])*N.clamp(p.attackInterval/.56,.45,1.5));
        }
      }
      this.updateWisps();this.mapClock-=dt;
      if(this.mapClock<=0){this.mapClock=1;for(const [id,until] of this.wispHits)if(until<this.game.time-1)this.wispHits.delete(id);}
      const active=this.projectiles.active;
      for(let i=active.length-1;i>=0;i--){
        const b=active[i];for(let j=4;j>0;j--){b.trailX[j]=b.trailX[j-1];b.trailY[j]=b.trailY[j-1];}
        b.trailX[0]=b.x;b.trailY[0]=b.y;b.trailCount=Math.min(5,b.trailCount+1);
        const ox=b.x,oy=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
        this.game.hash.query(Math.min(ox,b.x)-65,Math.min(oy,b.y)-65,Math.max(ox,b.x)+65,Math.max(oy,b.y)+65,this.candidates);
        let consumed=false;
        for(let hitCount=0;hitCount<5;hitCount++){
          let hit=null,first=Infinity;
          for(const e of this.candidates)if(e.alive&&!b.hitIds.has(e.id)){
            const t=N.circleHit(ox,oy,b.x,b.y,e.x,e.y-12,e.radius+b.radius);if(t<first){first=t;hit=e;}
          }
          if(!hit)break;b.hitIds.add(hit.id);
          const speed=Math.hypot(b.vx,b.vy)||1;hit.hit(b.damage,b.crit,b.vx/speed,b.vy/speed);
          if(b.evolved&&b.crit){
            this.effect('ring',hit.x,hit.y-12,0,0,70,'#ead6f5');
            this.game.hash.query(hit.x-115,hit.y-115,hit.x+115,hit.y+115,this.areaCandidates);
            for(const e of this.areaCandidates)if(e.alive&&e!==hit&&N.dist2(e,hit)<(70+e.radius)**2)e.hit(b.damage*.45,false,0,0,'bolt');
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
