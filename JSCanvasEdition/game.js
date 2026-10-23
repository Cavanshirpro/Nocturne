/* Core simulation, input, spatial index and presentation. No runtime dependencies. */
(() => {
  'use strict';
  const N = window.Nocturne = {};
  N.VERSION = '5.0.0';
  const compactNumbers=new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1});N.fmt=v=>Math.abs(v)>=10000?compactNumbers.format(v):Number.isInteger(v)?String(v):Number(v.toFixed(1)).toString();
  N.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  N.rand = (a, b) => a + Math.random() * (b - a);
  // Cosmetic randomness must not alter enemy spawns, crits or item rolls.
  let fxSeed=81723;
  N.fxRand=(a,b)=>{fxSeed=(fxSeed*1664525+1013904223)>>>0;return a+fxSeed/4294967296*(b-a);};
  N.pick = a => a[Math.floor(Math.random() * a.length)];
  N.dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  N.shuffle = list => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  N.segmentDistance2 = (ax, ay, bx, by, x, y) => {
    const dx = bx - ax, dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len ? N.clamp(((x - ax) * dx + (y - ay) * dy) / len, 0, 1) : 0;
    return (x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2;
  };

  // Earliest intersection along a segment, including starts inside a circle.
  N.circleHit = (ax, ay, bx, by, x, y, radius) => {
    const dx=bx-ax,dy=by-ay,fx=ax-x,fy=ay-y;
    const a=dx*dx+dy*dy,c=fx*fx+fy*fy-radius*radius;
    if(c<=0)return 0;
    if(a===0)return Infinity;
    const b=2*(fx*dx+fy*dy),disc=b*b-4*a*c;
    if(disc<0)return Infinity;
    const t=(-b-Math.sqrt(disc))/(2*a);
    return t>=0&&t<=1?t:Infinity;
  };
  N.PLAYER_FIELDS = ['x','y','hp','maxHp','speed','damage','attackInterval','projectileSpeed',
    'projectileCount','critChance','critMultiplier','pickupRadius','armor','regen','gold',
    'kills','xp','xpNeeded','level','pendingLevels','dashCooldown','pierce'];

  class SpatialHash {
    constructor(size = 96) { this.size = size; this.cells = new Map(); this.spares = []; }
    clear() {
      for (const bucket of this.cells.values()) { bucket.length = 0; this.spares.push(bucket); }
      this.cells.clear();
    }
    insert(entity) {
      const key = `${Math.floor(entity.x / this.size)},${Math.floor(entity.y / this.size)}`;
      let bucket = this.cells.get(key);
      if (!bucket) { bucket = this.spares.pop() || []; this.cells.set(key, bucket); }
      bucket.push(entity);
    }
    query(minX, minY, maxX, maxY, out) {
      out.length = 0;
      if(((maxX-minX)/this.size+2)*((maxY-minY)/this.size+2)>this.cells.size*4+64){for(const bucket of this.cells.values())for(const e of bucket)if(e.alive&&e.x>=minX&&e.x<=maxX&&e.y>=minY&&e.y<=maxY)out.push(e);return out;}
      for (let x = Math.floor(minX / this.size); x <= Math.floor(maxX / this.size); x++) {
        for (let y = Math.floor(minY / this.size); y <= Math.floor(maxY / this.size); y++) {
          const bucket = this.cells.get(`${x},${y}`);
          if (bucket) for (const e of bucket) if (e.alive) out.push(e);
        }
      }
      return out;
    }
  }
  N.SpatialHash = SpatialHash;

  class Input {
    constructor(game) {
      this.game=game;this.keys = new Set(); this.x = 0; this.y = 0; this.pointer = null;this.aim={x:0,y:0,active:false};
      const prevent = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','Space']);
      window.addEventListener('keydown', e => {
        if (e.target?.matches?.('input, textarea, select, [contenteditable=true]')) return;
        if (prevent.has(e.code) && game.state === 'playing') e.preventDefault();
        this.keys.add(e.code);
        if (e.code==='Equal'||e.code==='NumpadAdd')game.setZoom(game.userZoom+.1);
        if (e.code==='Minus'||e.code==='NumpadSubtract')game.setZoom(game.userZoom-.1);
        if (e.code==='Digit0'||e.code==='Numpad0')game.setZoom(1);
        if (e.repeat) return;
        if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') game.player?.dash();
        if (e.code === 'Escape' || e.code === 'KeyP') game.ui?.togglePause();
        if(e.code==='KeyQ'){game.abilities?.begin();game.abilities?.release();}
        if(e.code==='KeyZ')game.abilities?.cycle();
        if (e.code === 'KeyI') game.ui?.toggleGrimoire();
        if (/^Digit[123]$/.test(e.code) && game.state === 'levelup') game.ui.chooseLevel(Number(e.code.slice(-1)) - 1);
      });
      const aim=e=>{const r=game.canvas.getBoundingClientRect();this.aim={x:(e.clientX-r.left)*game.width/r.width,y:(e.clientY-r.top)*game.height/r.height,active:true};};
      game.canvas.addEventListener?.('pointermove',aim);
      game.canvas.addEventListener?.('pointerdown',e=>{aim(e);if(e.button===2){e.preventDefault();game.abilities?.begin();}});
      window.addEventListener('pointerup',e=>{if(e.button===2)game.abilities?.release();});
      window.addEventListener('pointercancel',()=>game.abilities?.cancel());
      game.canvas.addEventListener?.('contextmenu',e=>e.preventDefault());
      document.getElementById('special-button')?.addEventListener('pointerdown',e=>{e.preventDefault();e.currentTarget.setPointerCapture?.(e.pointerId);game.abilities?.begin();});
      document.getElementById('special-button')?.addEventListener('pointerup',e=>{e.preventDefault();game.abilities?.release();});
      document.getElementById('special-button')?.addEventListener('pointercancel',()=>game.abilities?.cancel());
      document.getElementById('cycle-special')?.addEventListener('click',()=>game.abilities?.cycle());
      game.canvas.addEventListener?.('wheel',e=>{if(game.state!=='playing')return;e.preventDefault();game.setZoom(game.userZoom-Math.sign(e.deltaY)*.08);},{passive:false});
      window.addEventListener('keyup', e => this.keys.delete(e.code));
      window.addEventListener('blur', () => { this.clear();game.combat?.audioEngine.setForeground(false); if (game.state === 'playing') game.ui.pause(); });
      window.addEventListener('focus',()=>game.combat?.audioEngine.setForeground(true));
      document.addEventListener('visibilitychange', () => {
        game.combat?.audioEngine.setForeground(!document.hidden);
        if (document.hidden) { this.clear(); if (game.state === 'playing') game.ui.pause(); }
      });
      const zone = document.getElementById('touch-zone');
      const knob = document.getElementById('touch-knob');
      const move = e => {
        if (e.pointerId !== this.pointer) return;
        const r = zone.getBoundingClientRect();
        let x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        const len = Math.hypot(x, y);
        if (len > 35) { x *= 35 / len; y *= 35 / len; }
        this.x = x / 35; this.y = y / 35;
        knob.style.transform = `translate(${x}px,${y}px)`;
      };
      zone.addEventListener('pointerdown', e => {
        if (game.state !== 'playing' || this.pointer !== null) return;
        this.pointer = e.pointerId; zone.setPointerCapture(e.pointerId); move(e);
      });
      zone.addEventListener('pointermove', move);
      const release = e => {
        if (e.pointerId === this.pointer) { this.pointer = null; this.x = this.y = 0; knob.style.transform = ''; }
      };
      zone.addEventListener('pointerup', release);
      zone.addEventListener('pointercancel', release);
      zone.addEventListener('lostpointercapture', release);
      this.knob = knob;
      document.getElementById('dash-button').addEventListener('pointerdown',e=>{e.preventDefault();game.player.dash();});
    }
    clear() { this.game?.abilities?.cancel();this.keys.clear(); this.x = this.y = 0; this.pointer = null; this.knob.style.transform = ''; }
    vector() {
      const k = this.keys;
      let x = Number(k.has('KeyD') || k.has('ArrowRight')) - Number(k.has('KeyA') || k.has('ArrowLeft')) + this.x;
      let y = Number(k.has('KeyS') || k.has('ArrowDown')) - Number(k.has('KeyW') || k.has('ArrowUp')) + this.y;
      const len = Math.hypot(x, y);
      if (len > 1) { x /= len; y /= len; }
      return {x, y};
    }
  }

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
      this.boss=null;this.bossSpawned=false;this.bossDefeated=false;
      this.waveKills=0;this.waveDamage=0;this.stats=this.freshStats();this.fps=60;
      this.hash = new SpatialHash(); this.camera = {x:0, y:0};
      this.shake = 0; this.hitStop = 0;this.impactCooldown=0; this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.hurtFlash=0;
      if(this.save.data.settings.reduced!==null)this.reducedMotion=this.save.data.settings.reduced;
      document.body?.classList.toggle('reduce-motion',this.reducedMotion);
      this.groundPattern = this.ctx.createPattern(images.ground, 'repeat');
      this.input = new Input(this); this.player = new N.Player(this);
      this.abilities=new N.Abilities(this);this.combat = new N.Combat(this);this.combat.soundEnabled=this.save.data.settings.sound;
      this.ui = new N.UI(this);
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
      if(s.checkpoint||s.profile.runs||s.profile.achievements.length){if(!this.save.createSlot()){this.ui.saves();this.ui.toast('All 24 slots are occupied. Export a backup before removing a slot.');return false;}}
      this.reset(this.selectedCoven);return true;
    }
    rebaseWorld(){
      const p=this.player;if(Math.abs(p.x)<1e6&&Math.abs(p.y)<1e6)return;
      const ox=p.x,oy=p.y;this.worldOrigin.x+=ox;this.worldOrigin.y+=oy;p.x=p.y=0;this.camera.x=this.camera.y=0;
      const lists=[this.enemies,this.loot,...['projectiles','hostile','hazards','areas','effects','remnants','numbers'].map(key=>this.combat[key].active)];
      for(const list of lists)for(const item of list){
        item.x-=ox;item.y-=oy;if(item.kind!=='slash'&&Number.isFinite(item.x2))item.x2-=ox;if(item.kind!=='slash'&&Number.isFinite(item.y2))item.y2-=oy;
        if(item.trailX)for(let i=0;i<5;i++){item.trailX[i]-=ox;item.trailY[i]-=oy;}
      }
      this.landmarks.clear();
    }
    freshStats(){return {damage:0,damageTaken:0,goldEarned:0,elites:0,bosses:0,dashes:0,weapons:Object.fromEntries(N.SPELL_IDS.map(id=>[id,0]))};}
    reset(coven=this.selectedCoven) {
      this.selectedCoven=N.COVENS[coven]?coven:'ash';
      this.player = new N.Player(this,this.selectedCoven); this.enemies.length = this.loot.length = 0;
      this.combat.clear(); this.hash.clear(); this.input.clear();
      this.wave = 0; this.time = 0;this.worldOrigin={x:0,y:0}; this.camera.x = this.camera.y = 0;
      this.stats=this.freshStats();this.shake = this.hitStop = this.impactCooldown = 0; this.ui.resetShop();this.abilities.cancel(); this.startWave();
    }
    startWave(resuming=false) {
      if(!resuming){this.wave++;this.player.progress.activeOath=this.player.progress.preparedOath;this.player.progress.preparedOath=null;this.player.progress.shield=this.player.progress.activeOath==='stone'?35:0;}
      this.waveTime = 0; this.spawnClock = .15;this.threatClock=8;this.autosaveClock=0;
      this.boss=null;this.bossSpawned=false;this.bossDefeated=false;this.overlordSpawned=false;this.waveKills=0;this.waveDamage=0;
      this.waveDuration = 30 + Math.min(this.wave - 1, 6) * 5;
      if(!resuming)this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * .12);
      this.player.invulnerable = 1;
      this.hurtFlash=0;
      this.player.dashTimer=0;this.player.dashRemaining=0;this.combat.clear();this.combat.cooldown = .1;
      this.state = 'playing'; this.input.clear(); this.ui.hide();
      this.ui.banner(`WAVE ${String(this.wave).padStart(2,'0')}`, this.wave%10===0?'AN OVERLORD APPROACHES':this.wave%5===0?'A WARDEN APPROACHES':this.wave === 1 ? 'THE HOLLOW AWAKENS' : this.biome().name.toUpperCase());
      this.checkpoint('wave');
      this.combat.sound('wave');
    }
    biome(){return [{name:'The Hollow',color:'#7e9b8030',accent:'#b7c09d'}, {name:'Ember Mire',color:'#97584a27',accent:'#d1a18a'}, {name:'Moonlit Ruins',color:'#7274aa2c',accent:'#b7a9db'}][Math.floor(Math.max(0,this.wave-1)/3)%3];}
    checkpoint(phase){
      if(this.player.pendingLevels>0||this.player.hp<=0)return false;
      const player={};for(const k of N.PLAYER_FIELDS)player[k]=this.player[k];
      player.weapons={...this.player.weapons};player.relics={...this.player.relics};player.upgrades=[...this.player.upgrades];player.rules=5;player.progress=JSON.parse(JSON.stringify(this.player.progress));
      this.save.data.checkpoint={schema:2,phase,coven:this.player.coven,wave:this.wave,time:this.time,player,
        world:phase==='wave'?N.captureWorld(this):undefined,
        stats:JSON.parse(JSON.stringify(this.stats)),rolls:this.ui.rolls,slots:this.ui.slots.map(s=>({id:s.item?.id||null,locked:s.locked,price:s.price,sold:s.sold===true}))};
      return this.save.write();
    }
    continueRun(){
      const c=this.save.data.checkpoint;if(!this.save.validCheckpoint(c))return false;
      this.enemies.length=this.loot.length=0;this.hash.clear();this.combat.clear();this.input.clear();
      this.player=new N.Player(this,c.coven);for(const k of N.PLAYER_FIELDS)this.player[k]=c.player[k];
      if(!(c.player.rules>=4))this.player.armor=this.player.armor/(1-this.player.armor);
      N.balancePlayer(this.player);
      this.player.weapons={...this.player.weapons,...c.player.weapons};this.player.relics={...this.player.relics,...c.player.relics};
      this.player.progress=c.player.progress?JSON.parse(JSON.stringify(c.player.progress)):N.newProgression(this.player);N.mergeProgression(this.player);this.player.upgrades=[...c.player.upgrades];
      this.player.evolutions=new Set(Object.keys(this.player.weapons).filter(id=>this.player.evolved(id)));
      this.selectedCoven=c.coven;this.wave=c.wave;this.time=c.time;this.stats=JSON.parse(JSON.stringify(c.stats));this.stats.weapons={...Object.fromEntries(N.SPELL_IDS.map(id=>[id,0])),...this.stats.weapons};
      this.camera.x=this.player.x;this.camera.y=this.player.y;this.shake=this.hitStop=this.impactCooldown=0;this.boss=null;
      this.ui.rolls=c.rolls;
      this.ui.slots=c.slots.map(s=>({item:N.ITEMS.find(item=>item.id===s.id)||null,locked:s.locked,price:s.price,sold:s.sold??(s.id===null&&s.price>0)}));
      if(c.phase==='shop'){for(const slot of this.ui.slots)if(!slot.item&&!slot.sold)this.ui.rollSlot(slot);this.waveTime=this.waveDuration=30+Math.min(this.wave-1,6)*5;this.state='shop';this.ui.renderShop();}
      else {this.startWave(true);if(c.world)N.restoreWorld(this,c.world);this.checkpoint('wave');}
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
      this.boss=new N.Enemy(this,overlord?'overlord':'warden',this.player.x+Math.cos(angle)*r,this.player.y+Math.sin(angle)*r,++this.nextId,false,{level:Math.max(this.player.level+3,Math.ceil(this.player.level*(overlord?1.18:1.08))),tier:overlord?'overlord':'warden',trait:'none'});
      this.boss.spawnDelay=this.visible(this.boss.x,this.boss.y,60)?1.2:0;
      this.enemies.push(this.boss);if(required)this.bossSpawned=true;else this.overlordSpawned=true;this.ui.banner(overlord?'THE ASH OVERLORD':'THE HOLLOW WARDEN',overlord?'BREAK THE SOVEREIGN CROWN':'BREAK THE SEAL');
      this.combat.sound('boss');
    }
    summonMinions(owner){
      const available=Math.max(0,320-this.enemies.length);for(let i=0;i<Math.min(3,available);i++){const a=i*Math.PI*2/3,e=new N.Enemy(this,'slime',owner.x+Math.cos(a)*75,owner.y+Math.sin(a)*75,++this.nextId,false,{level:Math.max(1,Math.floor(this.player.level*.45)),tier:'minion',trait:'none'});e.maxHp*=.35;e.hp=e.maxHp;e.scale*=.65;e.radius*=.65;e.spawnDelay=.85;this.enemies.push(e);}
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
      this.enemies.length = 0; this.hash.clear(); this.combat.clear();
      // Bank uncollected drops before the shop; no loot can be lost to transition.
      for (const drop of this.loot) {
        if (drop.type === 'gold') this.earnGold(drop.value);
        else if(drop.type==='heal')this.player.hp=Math.min(this.player.maxHp,this.player.hp+drop.value);
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
      this.ui.afterLevel = 'shop';
      if (this.player.pendingLevels > 0) this.ui.levelUp();
      else this.ui.openShop();
    }
    die() {
      if(this.state==='dead')return;
      this.state = 'dead'; this.input.clear();
      const p=this.save.data.profile;p.runs++;p.bestWave=Math.max(p.bestWave,this.wave);p.bestKills=Math.max(p.bestKills,this.player.kills);p.bestTime=Math.max(p.bestTime,this.time);
      this.save.data.checkpoint=null;this.save.write();this.ui.gameOver();
    }
    update(dt) {
      if (this.state !== 'playing') return;
      this.impactCooldown=Math.max(0,this.impactCooldown-dt);
      if (this.hitStop > 0) { this.hitStop -= dt; return; }
      this.time += dt; this.waveTime += dt;
      this.hurtFlash=Math.max(0,this.hurtFlash-dt);
      this.abilities.update(dt);this.player.update(dt);this.rebaseWorld();
      this.zoomFactor+=(this.targetZoom-this.zoomFactor)*(1-Math.exp(-9*dt));this.applyZoom();
      this.threatClock-=dt;
      if(this.wave>=3&&this.threatClock<=0){
        this.threatClock=Math.max(3.8,9-this.wave*.16);
        this.combat.hazard(this.player.x,this.player.y,58+Math.min(22,this.wave),1.35,24+this.wave*1.7,1.15);
        this.combat.sound('warning');
        if(this.wave===3&&this.waveTime<10)this.ui.banner('HOLLOW CURSE','LEAVE THE MARKED CIRCLE BEFORE IT IGNITES');
      }
      if(this.wave>=7&&this.wave%7===0&&this.wave%5!==0&&!this.overlordSpawned&&this.waveTime>=this.waveDuration*.52)this.spawnBoss(true,false);
      if(this.wave%5===0&&!this.bossSpawned&&this.waveTime>=3)this.spawnBoss();
      this.spawnClock -= dt;
      const interval = Math.max(.09, .63 / (1 + .21 * (this.wave - 1)))*(this.wave%5===0?1.5:1);
      while (this.spawnClock <= 0) { this.spawn(); this.spawnClock += interval; }
      const recallRange=Math.max(2200,N.boltRange(this.player)*2);
      for(const e of this.enemies)if(e.alive){
        if(N.dist2(e,this.player)>recallRange**2){
          if(!e.boss){e.alive=false;continue;}
          const angle=N.rand(0,Math.PI*2);e.x=this.player.x+Math.cos(angle)*700;e.y=this.player.y+Math.sin(angle)*700;e.spawnDelay=1.2;e.charge=e.windup=e.knockX=e.knockY=0;
        }
        e.update(dt);
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
      if (this.waveTime >= this.waveDuration && (!this.boss||!this.boss.alive)) { this.finishWave(); return; }
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
    drawGround(c) {
      const x = this.camera.x - this.viewWidth / 2 - 20, y = this.camera.y - this.viewHeight / 2 - 20;
      c.fillStyle = this.groundPattern; c.fillRect(x, y, this.viewWidth + 40, this.viewHeight + 40);
      // Ancient inscription at the starting point; persistent world landmarks.
      if (this.visible(0,0,180)) {
        c.save(); c.strokeStyle = '#a2a78a20'; c.lineWidth = 1;
        for (const r of [112, 119, 159]) { c.beginPath(); c.ellipse(0,0,r,r*.73,0,0,Math.PI*2); c.stroke(); }
        for (let i=0;i<12;i++) {
          const a = i * Math.PI/6;
          c.beginPath(); c.moveTo(Math.cos(a)*125, Math.sin(a)*92); c.lineTo(Math.cos(a)*146, Math.sin(a)*107); c.stroke();
        }
        c.restore();
      }
      const size = 340;
      const sx = Math.floor(x/size), sy = Math.floor(y/size);
      for(let ix=0;ix<Math.ceil(this.viewWidth/size)+3;ix++){const gx=sx+ix;
        for(let iy=0;iy<Math.ceil(this.viewHeight/size)+3;iy++){const gy=sy+iy;
          const seed = Math.sin(gx*127.1+gy*311.7)*43758.5453;
          const f = seed - Math.floor(seed);
          const px = gx*size+f*200, py=gy*size+f*170;
          c.fillStyle='#10171880'; c.beginPath(); c.ellipse(px+4,py+5,20,9,0,0,Math.PI*2); c.fill();
          c.fillStyle='#363c3c'; c.beginPath(); c.moveTo(px-13,py); c.lineTo(px-8,py-12); c.lineTo(px+6,py-15); c.lineTo(px+16,py-5); c.lineTo(px+12,py+5); c.lineTo(px-8,py+5); c.closePath(); c.fill();
          c.strokeStyle='#68706955';c.beginPath();c.moveTo(px-8,py-12);c.lineTo(px+6,py-15);c.lineTo(px+15,py-5);c.stroke();
          c.strokeStyle='#58654c60';
          for(let i=0;i<5;i++){c.beginPath();c.moveTo(px+25+i*3,py+14);c.lineTo(px+21+i*4,py+3-i%3*3);c.stroke();}
        }
      }
    }
    gatherLandmarks(list){
      const size=440,minX=Math.floor((this.camera.x-this.viewWidth/2-160)/size),maxX=Math.ceil((this.camera.x+this.viewWidth/2+160)/size);
      const minY=Math.floor((this.camera.y-this.viewHeight/2-200)/size),maxY=Math.ceil((this.camera.y+this.viewHeight/2+200)/size);
      const used=new Set();
      for(let ix=0;ix<Math.ceil(this.viewWidth/size)+5;ix++)for(let iy=0;iy<Math.ceil(this.viewHeight/size)+5;iy++){const gx=minX+ix,gy=minY+iy;
        const key=gx+','+gy;used.add(key);let prop=this.landmarks.get(key);
        if(!prop){
          const f=Math.sin(gx*213.31+gy*179.17+81.6)*41971.321,n=f-Math.floor(f),kind=n<.2?'arch':n<.48?'tomb':'tree';
          const x=gx*size+70+n*220,y=gy*size+80+n*200;
          prop={x,y,draw:c=>{const scale=kind==='tree'?1.12:.8,near=Math.abs(this.player.x-x)<85*scale&&this.player.y>y-165*scale&&this.player.y<y+15;c.save();if(near)c.globalAlpha=.32;c.drawImage(this.images['prop_'+kind],x-80*scale,y-187*scale,160*scale,200*scale);c.restore();}};
          this.landmarks.set(key,prop);
        }
        if(this.visible(prop.x,prop.y,180))list.push(prop);
      }
      for(const key of this.landmarks.keys())if(!used.has(key))this.landmarks.delete(key);
    }
    draw() {
      const c = this.ctx;
      c.setTransform(this.dpr,0,0,this.dpr,0,0);
      c.fillStyle='#171d1e'; c.fillRect(0,0,this.width,this.height);
      c.save(); c.translate(this.width/2,this.height/2); c.scale(this.zoom,this.zoom);
      const amount = this.reducedMotion ? 0 : this.shake;
      c.translate(-this.camera.x+N.fxRand(-amount,amount),-this.camera.y+N.fxRand(-amount,amount));
      this.drawGround(c);
      c.fillStyle=this.biome().color;c.fillRect(this.camera.x-this.viewWidth/2-20,this.camera.y-this.viewHeight/2-20,this.viewWidth+40,this.viewHeight+40);
      this.combat.drawGround(c);this.abilities.draw(c);
      for(const drop of this.loot) if(this.visible(drop.x,drop.y,30)) drop.draw(c);
      const list=this.renderList;list.length=0;
      for(const e of this.enemies) if(e.alive && this.visible(e.x,e.y)) list.push(e);
      this.gatherLandmarks(list);list.push(this.player);list.sort((a,b)=>a.y-b.y);
      for(const entity of list) entity.draw(c);
      this.combat.draw(c);
      if(!this.reducedMotion&&this.quality!=='low'){
        c.save();c.globalCompositeOperation='lighter';c.fillStyle='#c9c5b833';
        for(let i=0;i<20;i++){
          const phase=this.time*(.1+(i%4)*.025)+i*2.39996;
          const x=this.camera.x+Math.sin(phase)*this.viewWidth*.52,y=this.camera.y+Math.cos(phase*.77+i)*this.viewHeight*.48;
          c.globalAlpha=.2+.35*Math.sin(phase+i)**2;c.beginPath();c.arc(x,y,i%3===0?1.5:1,0,Math.PI*2);c.fill();
        }
        c.restore();
      }
      c.restore();
      if(this.hurtFlash>0&&!this.reducedMotion){c.fillStyle=`rgba(160,65,57,${this.hurtFlash*.16})`;c.fillRect(0,0,this.width,this.height);}
      // Soft illumination follows the screen center, leaving UI legible.
      if(this.quality!=='low'){
        const fog=c.createRadialGradient(this.width/2,this.height/2,70,this.width/2,this.height/2,Math.max(this.width,this.height)*.7);
        fog.addColorStop(0,'#75847c00');fog.addColorStop(1,'#080e114f');c.fillStyle=fog;c.fillRect(0,0,this.width,this.height);
      }
      if(this.boss?.alive&&!this.visible(this.boss.x,this.boss.y,0)){
        const a=Math.atan2(this.boss.y-this.camera.y,this.boss.x-this.camera.x);
        const r=Math.min(this.width,this.height)*.37;
        c.save();c.translate(this.width/2+Math.cos(a)*r,this.height/2+Math.sin(a)*r);c.rotate(a);
        c.fillStyle='#d5a28d';c.beginPath();c.moveTo(10,0);c.lineTo(-6,-5);c.lineTo(-6,5);c.fill();c.restore();
      }
    }
  }
  N.Game = Game;

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const images = {};
      await Promise.all(Object.entries(window.NOCTURNE_ASSETS).map(([name,src]) => new Promise((resolve,reject) => {
        const im = new Image();
        im.onload = () => { images[name] = im; resolve(); };
        im.onerror = () => reject(new Error(`Unable to decode asset: ${name}`)); im.src = src;
      })));
      N.game = new Game(document.getElementById('game'), images);
    } catch (error) {
      console.error(error);
      document.getElementById('menu').innerHTML='<h1 id="menu-title">The grimoire could not open.</h1><p class="subtitle">Ensure all game files are in the same folder, then reload. Canvas 2D and JavaScript must be enabled.</p><button class="primary" onclick="location.reload()">TRY AGAIN</button>';
    }
  });
})();
