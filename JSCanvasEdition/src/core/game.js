/*
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade
This file is part of Nocturne. See the distribution's LICENSE and NOTICE files.
*/
(() => {
  'use strict';
  const N=window.Nocturne;
  class Game {
    constructor(canvas, images) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d', {alpha:false});
      if (!this.ctx) throw new Error('Canvas 2D is unavailable in this browser.');
      this.images = images;
      this.save = new N.SaveStore(); this.selectedCoven='ash';
      this.quality=this.save.data.settings.quality;this.userZoom=this.save.data.settings.zoom;this.targetZoom=this.userZoom;this.zoomFactor=this.userZoom;
      this.worldOrigin={x:0,y:0};this.threatClock=9;this.autosaveClock=0;this.landmarks=new Map();
      this.state = 'title'; this.time = 0; this.wave = 0; this.waveTime = 0;
      this.waveDuration = 30; this.spawnClock = 0;
      this.enemies = []; this.loot = []; this.renderList = []; this.nextId = 0;
      this.boss=null;this.bossSpawned=false;this.bossDefeated=false;this.sanctum=null;
      this.waveKills=0;this.waveDamage=0;this.stats=this.freshStats();this.fps=60;
      this.hash = new N.SpatialHash(); this.camera = {x:0, y:0};
      this.shake = 0; this.hitStop = 0;this.impactCooldown=0; this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.hurtFlash=0;
      if(this.save.data.settings.reduced!==null)this.reducedMotion=this.save.data.settings.reduced;
      document.body?.classList.toggle('reduce-motion',this.reducedMotion);
      this.groundPattern = this.ctx.createPattern(images.ground, 'repeat');
      this.input = new N.Input(this); this.player = new N.Player(this);
      this.abilities=new N.Abilities(this);this.combat = new N.Combat(this);this.combat.soundEnabled=this.save.data.settings.sound;
      this.ui = new N.UI(this);N.WaveUI.bind(this);
      this.resize(); window.addEventListener('resize', () => this.resize());
      window.addEventListener('pagehide',()=>{if(['playing','paused'].includes(this.state))this.checkpoint('wave');});
      this.lastFrame = null; this.accumulator = 0;
      this.frame = this.frame.bind(this);
      requestAnimationFrame(this.frame);
    }
    resize() {
      this.width = window.innerWidth; this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, this.quality==='low'?1:2);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      // A stable visible arena on narrow screens, without shrinking the HUD.
      this.baseZoom=N.clamp(Math.min(this.width/1000,this.height/680),.62,1.3);
      this.applyZoom();
      this.ctx.imageSmoothingEnabled = true;
      this.needsDraw=true;
    }
    applyZoom(){this.zoom=this.baseZoom*this.zoomFactor;this.viewWidth=this.width/this.zoom;this.viewHeight=this.height/this.zoom;this.needsDraw=true;}
    setZoom(value){
      this.userZoom=N.clamp(Math.round(value*100)/100,.65,1.55);this.targetZoom=this.userZoom;
      if(this.state!=='playing'||this.reducedMotion){this.zoomFactor=this.targetZoom;this.applyZoom();}
      this.saveSettings();
    }
    newRitual(){
      const s=this.save.active;
      if(s.checkpoint||s.recovery||s.profile.runs||s.profile.achievements.length){if(!this.save.createSlot()){this.ui.saves();this.ui.toast('All 24 slots are occupied. Export a backup before removing a slot.');return false;}}
      this.reset(this.selectedCoven);return true;
    }
    rebaseWorld(){
      const p=this.player;if(Math.abs(p.x)<1e6&&Math.abs(p.y)<1e6)return;
      const ox=p.x,oy=p.y;const trial=p.ascension?.pendingTrial;if(trial){trial.lastX-=ox;trial.lastY-=oy;}this.worldOrigin.x+=ox;this.worldOrigin.y+=oy;p.x=p.y=0;this.camera.x=this.camera.y=0;
      const lists=[this.enemies,this.loot,...['projectiles','hostile','hazards','areas','effects','remnants','numbers'].map(key=>this.combat[key].active)];
      for(const list of lists)for(const item of list){
        item.x-=ox;item.y-=oy;if(item.guardian)N.FinalGuardian.rebase(item,ox,oy);if(item.kind!=='slash'&&Number.isFinite(item.x2))item.x2-=ox;if(item.kind!=='slash'&&Number.isFinite(item.y2))item.y2-=oy;
        if(item.trailX)for(let i=0;i<5;i++){item.trailX[i]-=ox;item.trailY[i]-=oy;}
      }
      if(this.sanctum){this.sanctum.x-=ox;this.sanctum.y-=oy;}
      this.landmarks.clear();
    }
    freshStats(){return {damage:0,damageTaken:0,goldEarned:0,elites:0,bosses:0,dashes:0,weapons:Object.fromEntries(N.SPELL_IDS.map(id=>[id,0]))};}
    reset(coven=this.selectedCoven) {
      this.selectedCoven=N.COVENS[coven]?coven:'ash';
      this.player = new N.Player(this,this.selectedCoven); this.enemies.length = this.loot.length = 0;
      this.combat.clear(); this.hash.clear(); this.input.clear();
      this.difficulty=null;this.wave = 0; this.time = 0;this.worldOrigin={x:0,y:0}; this.camera.x = this.camera.y = 0;
      this.stats=this.freshStats();this.shake = this.hitStop = this.impactCooldown = 0; this.ui.resetShop();this.abilities.cancel(); this.startWave();
    }
    startWave(resuming=false) {
      if(!resuming){this.wave++;this.player.progress.activeOath=this.player.progress.preparedOath;this.player.progress.preparedOath=null;this.player.progress.shield=this.player.progress.activeOath==='stone'?35:0;}
      if(!resuming)N.WaveCycle.onStart(this);
      this.waveTime = 0; this.spawnClock = .15;this.threatClock=8;this.autosaveClock=0;
      this.boss=null;this.bossSpawned=false;this.bossDefeated=false;this.sanctum=null;this.overlordSpawned=false;this.waveKills=0;this.waveDamage=0;
      N.Difficulty.start(this,resuming);
      if(!resuming)this.player.heal(this.player.maxHp*.12);
      this.player.invulnerable = 1;
      this.hurtFlash=0;
      this.player.dashTimer=0;this.player.dashRemaining=0;this.combat.clear();this.combat.cooldown = .1;
      this.state = 'playing'; this.input.clear(); this.ui.hide();
      this.ui.banner(`WAVE ${String(this.wave).padStart(2,'0')}`, this.wave%5===0?'THE FINAL SOVEREIGN AWAITS':this.wave === 1 ? 'SURVIVE, THEN FOLLOW THE SANCTUM' : this.biome().name.toUpperCase());
      if(!resuming)this.checkpoint('wave');
      this.combat.sound('wave');
    }
    biome(){return [{name:'The Hollow',color:'#7e9b8030',accent:'#b7c09d'}, {name:'Ember Mire',color:'#97584a27',accent:'#d1a18a'}, {name:'Moonlit Ruins',color:'#7274aa2c',accent:'#b7a9db'}][Math.floor(Math.max(0,this.wave-1)/3)%3];}
    checkpoint(phase,recovery=false){
      if(N.WaveCycle.preparing(this))phase='intermission';
      if((this.player.pendingLevels>0&&!recovery&&!N.WaveCycle.preparing(this))||(this.player.hp<=0&&!recovery))return false;
      const player={};for(const k of N.PLAYER_FIELDS)player[k]=this.player[k];
      player.weapons={...this.player.weapons};player.relics={...this.player.relics};player.upgrades=[...this.player.upgrades];player.rules=5;player.ascension=JSON.parse(JSON.stringify(this.player.ascension));player.progress=JSON.parse(JSON.stringify(this.player.progress));
      if(recovery){
        player.hp=player.maxHp;player.x=player.y=0;
        Object.assign(player.progress,{demonTime:0,specialRemaining:0,silenceTime:0,silenceGrace:0,aegis:0,aegisMax:0,aegisTime:0,aegisRemaining:0,shield:player.progress.activeOath==='stone'?35:0});
      }
      this.save.data.checkpoint={schema:3,phase,cycle:N.WaveCycle.capture(this),menu:phase==='intermission'&&(this.state==='shop'||this.ui.grimoireFrom==='shop'&&this.state==='grimoire'||this.ui.ascensionFrom?.state==='shop'&&this.state==='ascension')?'shop':undefined,difficulty:N.Difficulty.capture(this,recovery),coven:this.player.coven,wave:this.wave,time:this.time,player,
        world:['wave','intermission'].includes(phase)&&!recovery?N.captureWorld(this):undefined,
        levelChoices:this.state==='levelup'&&this.ui.choices.length===3?this.ui.choices.map(u=>u.id):undefined,stats:JSON.parse(JSON.stringify(this.stats)),rolls:this.ui.rolls,slots:this.ui.slots.map(s=>({id:s.item?.id||null,locked:s.locked,price:s.price,sold:s.sold===true}))};
      return this.save.write();
    }
    continueRun(){
      const saved=this.save.data.checkpoint;if(!this.save.validCheckpoint(saved))return false;
      const c=N.Migration.checkpoint(saved,this.save.data.profile,this.save.data.schema);
      this.enemies.length=this.loot.length=0;this.hash.clear();this.combat.clear();this.input.clear();
      this.player=new N.Player(this,c.coven);for(const k of N.PLAYER_FIELDS)this.player[k]=c.player[k];
      if(!(c.player.rules>=4))this.player.armor=this.player.armor/(1-this.player.armor);
      N.balancePlayer(this.player);
      this.player.weapons={...this.player.weapons,...c.player.weapons};this.player.relics={...this.player.relics,...c.player.relics};
      this.player.progress=c.player.progress?JSON.parse(JSON.stringify(c.player.progress)):N.newProgression(this.player);N.mergeProgression(this.player);this.player.upgrades=[...c.player.upgrades];
      this.player.ascension=c.player.ascension?JSON.parse(JSON.stringify(c.player.ascension)):N.Migration.evaluateLegacyAscension(c,this.save.data.profile,3);
      this.player.evolutions=new Set(Object.keys(this.player.weapons).filter(id=>this.player.evolved(id)));
      this.difficulty=c.difficulty?JSON.parse(JSON.stringify(c.difficulty)):null;
      this.selectedCoven=c.coven;this.wave=c.wave;this.time=c.time;this.stats=JSON.parse(JSON.stringify(c.stats));this.stats.weapons={...Object.fromEntries(N.SPELL_IDS.map(id=>[id,0])),...this.stats.weapons};
      this.camera.x=this.player.x;this.camera.y=this.player.y;this.shake=this.hitStop=this.impactCooldown=0;this.boss=null;this.sanctum=null;
      this.player.healthTrail=this.player.hp;
      this.ui.rolls=c.rolls;
      this.ui.slots=c.slots.map(s=>({item:N.ITEMS.find(item=>item.id===s.id)||null,locked:s.locked,price:s.price,sold:s.sold??(s.id===null&&s.price>0)}));
      if(c.phase==='shop'||c.phase==='intermission'){
        this.waveTime=this.waveDuration=30+Math.min(this.wave-1,6)*5;
        if(c.world)N.restoreWorld(this,c.world);
        N.WaveCycle.restore(this,c);this.ui.hide();
        if(c.menu==='shop'||c.phase==='shop'){for(const slot of this.ui.slots)if(!slot.item&&!slot.sold)this.ui.rollSlot(slot);this.state='shop';this.ui.renderShop();}
      }else {this.startWave(true);if(c.world)N.restoreWorld(this,c.world);N.WaveCycle.restore(this,c);this.checkpoint('wave');}
      if(this.player.pendingLevels>0&&this.state==='playing'){this.ui.afterLevel=N.WaveCycle.preparing(this)?'intermission':'playing';if(c.levelChoices){this.state='levelup';this.ui.selected=false;this.ui.choices=c.levelChoices.map(id=>N.UPGRADES.find(u=>u.id===id));this.ui.renderLevel();}else this.ui.levelUp();}
      else N.AscensionUI.recognize(this);
      return true;
    }
    saveSettings(){
      document.body?.classList.toggle('reduce-motion',this.reducedMotion);
      this.save.data.settings={sound:this.combat.soundEnabled,volume:this.combat.audioEngine.volume,ambience:this.combat.audioEngine.ambience,audioRevision:2,reduced:this.reducedMotion,quality:this.quality,zoom:this.userZoom};this.save.write();
    }
    spawn() {
      if (this.enemies.length >= 320) return;
      // A stable world-space approach ring prevents zooming out from delaying combat.
      const angle=N.rand(0,Math.PI*2),radius=N.rand(660,760);
      const x=this.player.x+Math.cos(angle)*radius,y=this.player.y+Math.sin(angle)*radius;
      const roll = Math.random();
      const type = this.wave>=8&&roll<.07?'reaper':this.wave>=6&&roll<.15?'wraith':this.wave>=4&&roll<.13?'cultist':this.wave>=2&&roll<.27?'hound':this.wave>=3&&roll<.43?'gargoyle':roll<.68?'skeleton':'slime';
      const encounter=N.EnemyDirector.roll(this,this.nextId);
      const enemy=new N.Enemy(this,type,x,y,++this.nextId,encounter.elite,encounter);
      enemy.spawnDelay=this.visible(x,y,60)?.85:0;this.enemies.push(enemy);
    }
    spawnBoss(overlord=this.wave%10===0,required=true){
      const angle=N.rand(0,Math.PI*2);
      const r=700;
      this.boss=new N.Enemy(this,overlord?'overlord':'warden',this.player.x+Math.cos(angle)*r,this.player.y+Math.sin(angle)*r,++this.nextId,false,{level:Math.max(this.player.level+3,Math.ceil(N.Difficulty.current(this).effectiveLevel*(overlord?1.18:1.08))),tier:overlord?'overlord':'warden',trait:'none'});
      if(overlord){const build=N.Difficulty.boss(this);this.boss.maxHp=Math.max(this.boss.maxHp,Math.exp(Math.min(Math.log(1e150),build.logDps+Math.log(6+N.Warfare.tier(this)))));this.boss.hp=this.boss.maxHp;this.boss.damage=Math.min(Math.max(this.boss.damage,build.damageBudget*.35),build.hitBudget*.32);}
      this.boss.spawnDelay=this.visible(this.boss.x,this.boss.y,60)?1.2:0;
      this.enemies.push(this.boss);if(required)this.bossSpawned=true;else this.overlordSpawned=true;this.ui.banner(overlord?'THE ASH OVERLORD':'THE HOLLOW WARDEN',overlord?'BREAK THE SOVEREIGN CROWN':'BREAK THE SEAL');
      this.combat.sound('boss');
    }
    summonMinions(owner){
      N.Warfare.summon(this,owner);
    }
    earnGold(amount){const q=this.player.progress,scaled=amount*(q.activeOath==='fortune'?1.2:1)+q.goldCarry,value=Math.floor(scaled+1e-9);q.goldCarry=Math.max(0,scaled-value);this.player.gold+=value;this.stats.goldEarned+=value;}
    unlock(id){
      const p=this.save.data.profile;if(p.achievements.includes(id))return;
      p.achievements.push(id);this.save.write();
      const a=N.ACHIEVEMENTS?.find(a=>a.id===id);if(a)this.ui.toast(`✦ ${a.name}`);
    }
    addXP(amount) {
      const p = this.player;
      const scaled=amount*(p.progress.activeOath==='wisdom'?1.2:1)+p.progress.xpCarry,value=Math.floor(scaled+1e-9);p.progress.xpCarry=Math.max(0,scaled-value);
      p.xp += value;
      while (p.xp >= p.xpNeeded) {
        p.xp -= p.xpNeeded; p.level++; p.pendingLevels++;
        p.xpNeeded = Math.floor(8 + (p.level - 1) * 5 + (p.level - 1) ** 1.25);
      }
    }
    finishWave() {
      if(!N.WaveCycle.begin(this))return false;
      this.enemies.length = 0; this.hash.clear(); this.combat.clear();
      // Bank uncollected drops before the shop; no loot can be lost to transition.
      for (const drop of this.loot) {
        if (drop.type === 'gold') this.earnGold(drop.value);
        else if(drop.type==='heal')this.player.heal(drop.value);
        else if(drop.type==='jewel')this.abilities.jewel(drop.value);else this.addXP(drop.value);
      }
      this.loot.length = 0;
      const clean=this.waveDamage===0;
      this.earnGold(8+this.wave*3+(clean?6:0));
      if(clean)this.unlock('untouched');
      if(this.wave>=3)this.unlock('survivor');
      if(this.player.kills>=100)this.unlock('century');
      this.waveSummary={kills:this.waveKills,clean,bonus:8+this.wave*3+(clean?6:0)};
      this.player.progress.activeOath=null;this.player.progress.shield=0;
      this.ui.afterLevel = 'intermission';
      if (this.player.pendingLevels > 0) this.ui.levelUp();
      else N.WaveCycle.resume(this);
      this.checkpoint('intermission');
      return true;
    }
    retryWave(){if(this.state!=='dead')return false;return this.continueRun();}
    die() {
      if(this.state!=='playing')return;
      this.state = 'dead'; this.input.clear();
      const p=this.save.data.profile;p.runs++;p.bestWave=Math.max(p.bestWave,this.wave);p.bestKills=Math.max(p.bestKills,this.player.kills);p.bestTime=Math.max(p.bestTime,this.time);
      const gold=this.player.gold;this.player.gold=Math.floor(gold/2);
      this.deathSummary={wave:this.wave,lostGold:gold-this.player.gold,keptGold:this.player.gold};
      // Store a fresh same-wave retry without mutating live collision pools.
      this.checkpoint('wave',true);this.ui.gameOver();
    }
    update(dt) {
      if (this.state !== 'playing') return;
      this.impactCooldown=Math.max(0,this.impactCooldown-dt);
      if (this.hitStop > 0) { this.hitStop -= dt; return; }
      if(N.WaveCycle.preparing(this)){N.WaveCycle.tickPreparation(this,dt);return;}
      this.time += dt; this.waveTime += dt;
      this.hurtFlash=Math.max(0,this.hurtFlash-dt);
      this.abilities.update(dt);this.player.update(dt);this.rebaseWorld();N.Difficulty.update(this,dt);
      this.zoomFactor+=(this.targetZoom-this.zoomFactor)*(1-Math.exp(-9*dt));this.applyZoom();
      this.threatClock-=dt;
      if(this.wave>=3&&this.threatClock<=0){
        this.threatClock=Math.max(3.8,9-this.wave*.16);
        this.combat.hazard(this.player.x,this.player.y,58+Math.min(22,this.wave),1.35,24+this.wave*1.7,1.15);
        this.combat.sound('warning');
        if(this.wave===3&&this.waveTime<10)this.ui.banner('HOLLOW CURSE','LEAVE THE MARKED CIRCLE BEFORE IT IGNITES');
      }
      const plan=N.Difficulty.current(this);
      if(plan.invades&&!this.overlordSpawned&&!this.boss?.alive&&this.waveTime>=this.waveDuration*.52&&this.waveTime<this.waveDuration){this.spawnBoss(true,false);this.difficulty.lastInvasionWave=this.wave;}
      N.Sanctum.update(this);N.WaveCycle.sync(this);
      this.spawnClock -= dt;
      const interval = Math.max(.09,.63/(1+.21*(plan.effectiveWave-1))/plan.spawnMultiplier);
      let living=this.enemies.filter(e=>e.alive&&!e.boss).length;
      while (this.spawnClock <= 0 && this.waveTime<this.waveDuration) {if(living<plan.aliveBudget){this.spawn();living++;}this.spawnClock+=interval;}
      const recallRange=Math.max(2200,N.boltRange(this.player)*2);
      for(const e of this.enemies)if(e.alive){
        if(N.dist2(e,this.player)>recallRange**2&&this.sanctum?.bossId!==e.id){
          if(!e.boss){e.alive=false;continue;}
          const angle=N.rand(0,Math.PI*2);e.x=this.player.x+Math.cos(angle)*700;e.y=this.player.y+Math.sin(angle)*700;e.spawnDelay=1.2;e.charge=e.windup=e.knockX=e.knockY=0;
        }
        e.update(dt);N.Sanctum.leash(this,e);
      }
      if (this.state !== 'playing') return;
      this.hash.clear();
      for (const e of this.enemies) if (e.alive&&e.spawnDelay<=0) this.hash.insert(e);
      this.combat.update(dt);
      if (this.state !== 'playing') return;
      for (const drop of this.loot) if (drop.alive) drop.update(dt);
      // Compact in place rather than allocating new arrays every frame.
      let n = 0;
      for (const e of this.enemies) if (e.alive) this.enemies[n++] = e;
      this.enemies.length = n; n = 0;
      for (const drop of this.loot) if (drop.alive) this.loot[n++] = drop;
      this.loot.length = n;
      this.camera.x += (this.player.x - this.camera.x) * (1 - Math.exp(-7 * dt));
      this.camera.y += (this.player.y - this.camera.y) * (1 - Math.exp(-7 * dt));
      this.shake = Math.max(0, this.shake - dt * 22);
      if (this.waveTime >= this.waveDuration && this.sanctum?.phase==='cleared') { this.finishWave(); return; }
      this.autosaveClock+=dt;
      if(this.autosaveClock>=10&&this.player.pendingLevels===0){this.autosaveClock=0;this.checkpoint('wave');}
      if (this.player.pendingLevels > 0) { this.ui.afterLevel = 'playing'; this.ui.levelUp(); }
    }
    frame(now) {
      const elapsed = this.lastFrame === null ? 0 : Math.min((now - this.lastFrame) / 1000, .15);
      this.lastFrame = now;
      this.combat.audioEngine.transport(this.state==='playing');
      if(elapsed>0)this.fps+=(1/elapsed-this.fps)*.04;
      if (this.state === 'playing') {
        this.accumulator += elapsed;
        while (this.accumulator >= 1/60) {
          this.update(1/60); this.accumulator -= 1/60;
          if (this.state !== 'playing') { this.accumulator = 0; break; }
        }
      } else this.accumulator = 0;
      if(this.state==='playing'||this.lastDrawState!==this.state||this.needsDraw){
        this.draw();this.lastDrawState=this.state;this.needsDraw=false;
      }
      this.ui.updateHUD();
      requestAnimationFrame(this.frame);
    }
    visible(x, y, margin = 100) {
      return Math.abs(x - this.camera.x) < this.viewWidth / 2 + margin && Math.abs(y - this.camera.y) < this.viewHeight / 2 + margin;
    }
    drawGround(c) {N.Environment.ground(this,c);}
    gatherLandmarks(list){N.Environment.gather(this,list);}
    draw() {
      const c = this.ctx;
      c.setTransform(this.dpr,0,0,this.dpr,0,0);
      c.fillStyle='#171d1e'; c.fillRect(0,0,this.width,this.height);
      c.save(); c.translate(this.width/2,this.height/2); c.scale(this.zoom,this.zoom);
      const amount = this.reducedMotion ? 0 : this.shake;
      c.translate(-this.camera.x+N.fxRand(-amount,amount),-this.camera.y+N.fxRand(-amount,amount));
      this.drawGround(c);
      c.fillStyle=this.biome().color;c.fillRect(this.camera.x-this.viewWidth/2-20,this.camera.y-this.viewHeight/2-20,this.viewWidth+40,this.viewHeight+40);
      N.Environment.ambient(this,c);N.Sanctum.draw(this,c);this.combat.drawGround(c);this.abilities.draw(c);
      for(const drop of this.loot) if(this.visible(drop.x,drop.y,30)) drop.draw(c);
      const list=this.renderList;list.length=0;
      for(const e of this.enemies) if(e.alive && this.visible(e.x,e.y,e.boss?250:120)) list.push(e);
      this.gatherLandmarks(list);list.push(this.player);list.sort((a,b)=>a.y-b.y);
      for(const entity of list) entity.draw(c);N.drawAscensionIdentity(c,this.player);
      this.combat.draw(c);N.drawVitality(this.player,c);N.Fields.foreground(this,c);
      c.restore();
      if(this.hurtFlash>0&&!this.reducedMotion){c.fillStyle=`rgba(160,65,57,${this.hurtFlash*.16})`;c.fillRect(0,0,this.width,this.height);}
      // Soft illumination follows the screen center, leaving UI legible.
      if(this.quality!=='low'){
        const fog=c.createRadialGradient(this.width/2,this.height/2,70,this.width/2,this.height/2,Math.max(this.width,this.height)*.7);
        fog.addColorStop(0,'#75847c00');fog.addColorStop(1,'#080e114f');c.fillStyle=fog;c.fillRect(0,0,this.width,this.height);
      }
      N.drawLowHealth(this,c);N.drawRadar(this,c);N.Fields.hud(this,c);
      const objective=this.sanctum?.phase==='waiting'?this.sanctum:this.boss?.alive?this.boss:null;
      if(objective&&!this.visible(objective.x,objective.y,0)){
        const a=Math.atan2(objective.y-this.camera.y,objective.x-this.camera.x);
        const r=Math.min(this.width,this.height)*.37;
        c.save();c.translate(this.width/2+Math.cos(a)*r,this.height/2+Math.sin(a)*r);c.rotate(a);
        c.fillStyle='#d5a28d';c.beginPath();c.moveTo(10,0);c.lineTo(-6,-5);c.lineTo(-6,5);c.fill();c.restore();
      }
    }
  }
  N.Game = Game;

})();
