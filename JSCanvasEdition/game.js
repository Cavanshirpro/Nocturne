/* Core simulation, input, spatial index and presentation. No runtime dependencies. */
(() => {
  'use strict';
  const N = window.Nocturne = {};
  N.VERSION = '2.1.0';
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

  class SaveStore {
    constructor(){this.key=window.location?.hash==='#verification'?'nocturne.coven.qa.v2':'nocturne.coven.v2';this.available=true;this.data=this.read();}
    defaults(){return {schema:2,profile:{runs:0,bestWave:0,bestKills:0,bestTime:0,bosses:0,achievements:[]},settings:{sound:true,volume:.6,ambience:true,reduced:null,quality:'high'},checkpoint:null};}
    read(){
      const fresh=this.defaults();
      try{
        const raw=window.localStorage.getItem(this.key);if(!raw)return fresh;
        const data=JSON.parse(raw);if(data?.schema!==2)return fresh;
        const p=data.profile;
        if(p&&['runs','bestWave','bestKills','bestTime','bosses'].every(k=>Number.isFinite(p[k])&&p[k]>=0)){
          for(const k of ['runs','bestWave','bestKills','bestTime','bosses'])fresh.profile[k]=Math.min(1e9,p[k]);
          fresh.profile.achievements=Array.isArray(p.achievements)?p.achievements.filter(id=>typeof id==='string').slice(0,32):[];
        }
        if(data.settings){
          fresh.settings.sound=data.settings.sound===true;
          fresh.settings.volume=Number.isFinite(data.settings.volume)?N.clamp(data.settings.volume,0,1):.6;
          fresh.settings.ambience=data.settings.ambience!==false;
          fresh.settings.reduced=typeof data.settings.reduced==='boolean'?data.settings.reduced:null;
          fresh.settings.quality=data.settings.quality==='low'?'low':'high';
        }
        if(this.validCheckpoint(data.checkpoint))fresh.checkpoint=data.checkpoint;
        return fresh;
      }catch{this.available=false;return fresh;}
    }
    validCheckpoint(c){
      if(!c||c.schema!==2||!['wave','shop'].includes(c.phase)||!['ash','moon','storm'].includes(c.coven))return false;
      if(!Number.isInteger(c.wave)||c.wave<1||c.wave>10000||!Number.isFinite(c.time)||c.time<0)return false;
      const p=c.player;
      if(!p||!N.PLAYER_FIELDS.every(k=>Number.isFinite(p[k])&&Math.abs(p[k])<=1e9))return false;
      if(p.hp<=0||p.maxHp<1||p.hp>p.maxHp||p.speed<1||p.damage<1||p.attackInterval<.12||p.attackInterval>10)return false;
      if(p.armor<0||p.armor>.6||p.critChance<0||p.critChance>.75||p.regen<0||p.dashCooldown<.7||p.projectileSpeed<1||p.critMultiplier<1||p.pickupRadius<1)return false;
      if(!['projectileCount','level','gold','kills','xp','xpNeeded','pendingLevels','pierce'].every(k=>Number.isInteger(p[k])&&p[k]>=0))return false;
      if(p.projectileCount<1||p.projectileCount>7||p.level<1||p.xpNeeded<1||p.xp>=p.xpNeeded||p.pendingLevels!==0||p.pierce>2)return false;
      if(!p.weapons||!['bolt','orbit','lightning','nova'].every(k=>Number.isInteger(p.weapons[k])&&p.weapons[k]>=0&&p.weapons[k]<=4)||p.weapons.bolt<1)return false;
      if(!p.relics||!['cinder','conductor','permafrost','mirror'].every(k=>typeof p.relics[k]==='boolean'))return false;
      if(!Array.isArray(p.upgrades)||p.upgrades.length>10000||!p.upgrades.every(k=>typeof k==='string'))return false;
      if(!Array.isArray(c.slots)||c.slots.length!==4||!c.slots.every(s=>s&&typeof s.locked==='boolean'&&(s.id===null||typeof s.id==='string')&&Number.isInteger(s.price)&&s.price>=0&&s.price<1e7))return false;
      if(!Number.isInteger(c.rolls)||c.rolls<0||c.rolls>10000)return false;
      if(!c.stats||!['damage','damageTaken','goldEarned','elites','bosses','dashes'].every(k=>Number.isFinite(c.stats[k])&&c.stats[k]>=0&&c.stats[k]<1e12))return false;
      if(!c.stats.weapons||!['bolt','orbit','lightning','nova'].every(k=>Number.isFinite(c.stats.weapons[k])&&c.stats.weapons[k]>=0))return false;
      return true;
    }
    write(){try{window.localStorage.setItem(this.key,JSON.stringify(this.data));this.available=true;return true;}catch{this.available=false;return false;}}
  }
  N.SaveStore=SaveStore;

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
      this.keys = new Set(); this.x = 0; this.y = 0; this.pointer = null;
      const prevent = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','Space']);
      window.addEventListener('keydown', e => {
        if (prevent.has(e.code) && game.state === 'playing') e.preventDefault();
        this.keys.add(e.code);
        if (e.repeat) return;
        if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') game.player?.dash();
        if (e.code === 'Escape' || e.code === 'KeyP') game.ui?.togglePause();
        if (e.code === 'KeyI') game.ui?.toggleGrimoire();
        if (/^Digit[123]$/.test(e.code) && game.state === 'levelup') game.ui.chooseLevel(Number(e.code.slice(-1)) - 1);
      });
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
    clear() { this.keys.clear(); this.x = this.y = 0; this.pointer = null; this.knob.style.transform = ''; }
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
      this.save = new SaveStore(); this.selectedCoven='ash';
      this.quality=this.save.data.settings.quality;
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
      this.combat = new N.Combat(this);this.combat.soundEnabled=this.save.data.settings.sound;
      this.ui = new N.UI(this);
      this.resize(); window.addEventListener('resize', () => this.resize());
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
      this.zoom = N.clamp(Math.min(this.width / 1000, this.height / 680), .62, 1.3);
      this.viewWidth = this.width / this.zoom; this.viewHeight = this.height / this.zoom;
      this.ctx.imageSmoothingEnabled = true;
      this.needsDraw=true;
    }
    freshStats(){return {damage:0,damageTaken:0,goldEarned:0,elites:0,bosses:0,dashes:0,weapons:{bolt:0,orbit:0,lightning:0,nova:0}};}
    reset(coven=this.selectedCoven) {
      this.selectedCoven=N.COVENS[coven]?coven:'ash';
      this.player = new N.Player(this,this.selectedCoven); this.enemies.length = this.loot.length = 0;
      this.combat.clear(); this.hash.clear(); this.input.clear();
      this.wave = 0; this.time = 0; this.camera.x = this.camera.y = 0;
      this.stats=this.freshStats();this.shake = this.hitStop = this.impactCooldown = 0; this.ui.resetShop(); this.startWave();
    }
    startWave(resuming=false) {
      if(!resuming)this.wave++;
      this.waveTime = 0; this.spawnClock = .15;
      this.boss=null;this.bossSpawned=false;this.bossDefeated=false;this.waveKills=0;this.waveDamage=0;
      this.waveDuration = 30 + Math.min(this.wave - 1, 6) * 5;
      if(!resuming)this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * .12);
      this.player.invulnerable = 1;
      this.hurtFlash=0;
      this.player.dashTimer=0;this.player.dashRemaining=0;this.combat.clear();this.combat.cooldown = .1;
      this.state = 'playing'; this.input.clear(); this.ui.hide();
      this.ui.banner(`WAVE ${String(this.wave).padStart(2,'0')}`, this.wave%5===0?'A WARDEN APPROACHES':this.wave === 1 ? 'THE HOLLOW AWAKENS' : this.biome().name.toUpperCase());
      this.checkpoint('wave');
      this.combat.sound('wave');
    }
    biome(){return [{name:'The Hollow',color:'#7e9b8030',accent:'#b7c09d'}, {name:'Ember Mire',color:'#97584a27',accent:'#d1a18a'}, {name:'Moonlit Ruins',color:'#7274aa2c',accent:'#b7a9db'}][Math.floor(Math.max(0,this.wave-1)/3)%3];}
    checkpoint(phase){
      if(this.player.pendingLevels>0||this.player.hp<=0)return false;
      const player={};for(const k of N.PLAYER_FIELDS)player[k]=this.player[k];
      player.weapons={...this.player.weapons};player.relics={...this.player.relics};player.upgrades=[...this.player.upgrades];
      this.save.data.checkpoint={schema:2,phase,coven:this.player.coven,wave:this.wave,time:this.time,player,
        stats:JSON.parse(JSON.stringify(this.stats)),rolls:this.ui.rolls,slots:this.ui.slots.map(s=>({id:s.item?.id||null,locked:s.locked,price:s.price}))};
      return this.save.write();
    }
    continueRun(){
      const c=this.save.data.checkpoint;if(!this.save.validCheckpoint(c))return false;
      this.enemies.length=this.loot.length=0;this.hash.clear();this.combat.clear();this.input.clear();
      this.player=new N.Player(this,c.coven);for(const k of N.PLAYER_FIELDS)this.player[k]=c.player[k];
      this.player.weapons={...c.player.weapons};this.player.relics={...c.player.relics};this.player.upgrades=[...c.player.upgrades];
      this.player.evolutions=new Set(Object.keys(this.player.weapons).filter(id=>this.player.evolved(id)));
      this.selectedCoven=c.coven;this.wave=c.wave;this.time=c.time;this.stats=JSON.parse(JSON.stringify(c.stats));
      this.camera.x=this.player.x;this.camera.y=this.player.y;this.shake=this.hitStop=this.impactCooldown=0;this.boss=null;
      this.ui.rolls=c.rolls;
      this.ui.slots=c.slots.map(s=>({item:N.ITEMS.find(item=>item.id===s.id)||null,locked:s.locked,price:s.price}));
      if(c.phase==='shop'){this.waveTime=this.waveDuration=30+Math.min(this.wave-1,6)*5;this.state='shop';this.ui.renderShop();}
      else this.startWave(true);
      return true;
    }
    saveSettings(){
      document.body?.classList.toggle('reduce-motion',this.reducedMotion);
      this.save.data.settings={sound:this.combat.soundEnabled,volume:this.combat.audioEngine.volume,ambience:this.combat.audioEngine.ambience,reduced:this.reducedMotion,quality:this.quality};this.save.write();
    }
    spawn() {
      if (this.enemies.length >= 320) return;
      const w = this.viewWidth / 2 + 85, h = this.viewHeight / 2 + 85;
      let x, y;
      const side = Math.floor(Math.random() * 4);
      if (side < 2) { x = this.camera.x + (side ? w : -w); y = this.camera.y + N.rand(-h, h); }
      else { x = this.camera.x + N.rand(-w, w); y = this.camera.y + (side === 2 ? -h : h); }
      const roll = Math.random();
      const type = this.wave>=4&&roll<.13?'cultist':this.wave>=2&&roll<.27?'hound':this.wave>=3&&roll<.43?'gargoyle':roll<.68?'skeleton':'slime';
      const elite=this.wave>=3&&Math.random()<Math.min(.15,.035+.007*this.wave);
      this.enemies.push(new N.Enemy(this, type, x, y, ++this.nextId,elite));
    }
    spawnBoss(){
      const angle=N.rand(0,Math.PI*2);
      const r=Math.min((this.viewWidth/2+110)/Math.max(.0001,Math.abs(Math.cos(angle))),
        (this.viewHeight/2+110)/Math.max(.0001,Math.abs(Math.sin(angle))));
      this.boss=new N.Enemy(this,'warden',this.camera.x+Math.cos(angle)*r,this.camera.y+Math.sin(angle)*r,++this.nextId);
      this.enemies.push(this.boss);this.bossSpawned=true;this.ui.banner('THE HOLLOW WARDEN','BREAK THE SEAL');
      this.combat.sound('boss');
    }
    earnGold(amount){this.player.gold+=amount;this.stats.goldEarned+=amount;}
    unlock(id){
      const p=this.save.data.profile;if(p.achievements.includes(id))return;
      p.achievements.push(id);this.save.write();
      const a=N.ACHIEVEMENTS?.find(a=>a.id===id);if(a)this.ui.toast(`✦ ${a.name}`);
    }
    addXP(amount) {
      const p = this.player;
      p.xp += amount;
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
        else this.addXP(drop.value);
      }
      this.loot.length = 0;
      const clean=this.waveDamage===0;
      this.earnGold(8+this.wave*3+(clean?6:0));
      if(clean)this.unlock('untouched');
      if(this.wave>=3)this.unlock('survivor');
      if(this.player.kills>=100)this.unlock('century');
      this.waveSummary={kills:this.waveKills,clean,bonus:8+this.wave*3+(clean?6:0)};
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
      this.player.update(dt);
      if(this.wave%5===0&&!this.bossSpawned&&this.waveTime>=3)this.spawnBoss();
      this.spawnClock -= dt;
      const interval = Math.max(.09, .63 / (1 + .21 * (this.wave - 1)))*(this.wave%5===0?1.5:1);
      while (this.spawnClock <= 0) { this.spawn(); this.spawnClock += interval; }
      for (const e of this.enemies) if (e.alive) e.update(dt);
      if (this.state !== 'playing') return;
      this.hash.clear();
      for (const e of this.enemies) if (e.alive) this.hash.insert(e);
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
      if (this.waveTime >= this.waveDuration && (this.wave%5!==0||this.bossDefeated)) { this.finishWave(); return; }
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
      for (let gx=sx;gx<=Math.ceil((x+this.viewWidth+40)/size);gx++) {
        for (let gy=sy;gy<=Math.ceil((y+this.viewHeight+40)/size);gy++) {
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
    draw() {
      const c = this.ctx;
      c.setTransform(this.dpr,0,0,this.dpr,0,0);
      c.fillStyle='#171d1e'; c.fillRect(0,0,this.width,this.height);
      c.save(); c.translate(this.width/2,this.height/2); c.scale(this.zoom,this.zoom);
      const amount = this.reducedMotion ? 0 : this.shake;
      c.translate(-this.camera.x+N.fxRand(-amount,amount),-this.camera.y+N.fxRand(-amount,amount));
      this.drawGround(c);
      c.fillStyle=this.biome().color;c.fillRect(this.camera.x-this.viewWidth/2-20,this.camera.y-this.viewHeight/2-20,this.viewWidth+40,this.viewHeight+40);
      this.combat.drawGround(c);
      for(const drop of this.loot) if(this.visible(drop.x,drop.y,30)) drop.draw(c);
      const list=this.renderList;list.length=0;
      for(const e of this.enemies) if(e.alive && this.visible(e.x,e.y)) list.push(e);
      list.push(this.player);list.sort((a,b)=>a.y-b.y);
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
