/* Core simulation, input, spatial index and presentation. No runtime dependencies. */
(() => {
  'use strict';
  const N = window.Nocturne = {};
  N.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  N.rand = (a, b) => a + Math.random() * (b - a);
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
        if (e.code === 'Escape' || e.code === 'KeyP') game.ui?.togglePause();
        if (/^Digit[123]$/.test(e.code) && game.state === 'levelup') game.ui.chooseLevel(Number(e.code.slice(-1)) - 1);
      });
      window.addEventListener('keyup', e => this.keys.delete(e.code));
      window.addEventListener('blur', () => { this.clear(); if (game.state === 'playing') game.ui.pause(); });
      document.addEventListener('visibilitychange', () => {
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
      this.state = 'title'; this.time = 0; this.wave = 0; this.waveTime = 0;
      this.waveDuration = 30; this.spawnClock = 0;
      this.enemies = []; this.loot = []; this.renderList = []; this.nextId = 0;
      this.hash = new SpatialHash(); this.camera = {x:0, y:0};
      this.shake = 0; this.hitStop = 0; this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.groundPattern = this.ctx.createPattern(images.ground, 'repeat');
      this.input = new Input(this); this.player = new N.Player(this);
      this.combat = new N.Combat(this); this.ui = new N.UI(this);
      this.resize(); window.addEventListener('resize', () => this.resize());
      this.lastFrame = null; this.accumulator = 0;
      this.frame = this.frame.bind(this);
      requestAnimationFrame(this.frame);
    }
    resize() {
      this.width = window.innerWidth; this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      // A stable visible arena on narrow screens, without shrinking the HUD.
      this.zoom = N.clamp(Math.min(this.width / 1000, this.height / 680), .62, 1.3);
      this.viewWidth = this.width / this.zoom; this.viewHeight = this.height / this.zoom;
      this.ctx.imageSmoothingEnabled = true;
    }
    reset() {
      this.player = new N.Player(this); this.enemies.length = this.loot.length = 0;
      this.combat.clear(); this.hash.clear(); this.input.clear();
      this.wave = 0; this.time = 0; this.camera.x = this.camera.y = 0;
      this.shake = this.hitStop = 0; this.ui.resetShop(); this.startWave();
    }
    startWave() {
      this.wave++; this.waveTime = 0; this.spawnClock = .15;
      this.waveDuration = 30 + Math.min(this.wave - 1, 6) * 5;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * .12);
      this.player.invulnerable = 1;
      this.combat.cooldown = .1;
      this.state = 'playing'; this.input.clear(); this.ui.hide();
      this.ui.banner(`WAVE ${String(this.wave).padStart(2,'0')}`, this.wave === 1 ? 'THE HOLLOW AWAKENS' : 'THE DARKNESS DEEPENS');
    }
    spawn() {
      if (this.enemies.length >= 320) return;
      const w = this.viewWidth / 2 + 85, h = this.viewHeight / 2 + 85;
      let x, y;
      const side = Math.floor(Math.random() * 4);
      if (side < 2) { x = this.camera.x + (side ? w : -w); y = this.camera.y + N.rand(-h, h); }
      else { x = this.camera.x + N.rand(-w, w); y = this.camera.y + (side === 2 ? -h : h); }
      const roll = Math.random();
      const type = this.wave >= 3 && roll < .19 ? 'gargoyle' : roll < .48 ? 'skeleton' : 'slime';
      this.enemies.push(new N.Enemy(this, type, x, y, ++this.nextId));
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
        if (drop.type === 'gold') this.player.gold += drop.value;
        else this.addXP(drop.value);
      }
      this.loot.length = 0;
      this.player.gold += 8 + this.wave * 3;
      this.ui.afterLevel = 'shop';
      if (this.player.pendingLevels > 0) this.ui.levelUp();
      else this.ui.openShop();
    }
    die() { this.state = 'dead'; this.input.clear(); this.ui.gameOver(); }
    update(dt) {
      if (this.state !== 'playing') return;
      if (this.hitStop > 0) { this.hitStop -= dt; return; }
      this.time += dt; this.waveTime += dt;
      this.player.update(dt);
      this.spawnClock -= dt;
      const interval = Math.max(.09, .63 / (1 + .21 * (this.wave - 1)));
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
      if (this.waveTime >= this.waveDuration) { this.finishWave(); return; }
      if (this.player.pendingLevels > 0) { this.ui.afterLevel = 'playing'; this.ui.levelUp(); }
    }
    frame(now) {
      const elapsed = this.lastFrame === null ? 0 : Math.min((now - this.lastFrame) / 1000, .15);
      this.lastFrame = now;
      if (this.state === 'playing') {
        this.accumulator += elapsed;
        while (this.accumulator >= 1/60) {
          this.update(1/60); this.accumulator -= 1/60;
          if (this.state !== 'playing') { this.accumulator = 0; break; }
        }
      } else this.accumulator = 0;
      this.draw(); this.ui.updateHUD();
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
      c.translate(-this.camera.x+N.rand(-amount,amount),-this.camera.y+N.rand(-amount,amount));
      this.drawGround(c);
      for(const drop of this.loot) if(this.visible(drop.x,drop.y,30)) drop.draw(c);
      const list=this.renderList;list.length=0;
      for(const e of this.enemies) if(e.alive && this.visible(e.x,e.y)) list.push(e);
      list.push(this.player);list.sort((a,b)=>a.y-b.y);
      for(const entity of list) entity.draw(c);
      this.combat.draw(c);
      c.restore();
      // Soft illumination follows the screen center, leaving UI legible.
      const fog=c.createRadialGradient(this.width/2,this.height/2,70,this.width/2,this.height/2,Math.max(this.width,this.height)*.7);
      fog.addColorStop(0,'#75847c00');fog.addColorStop(1,'#080e114f');c.fillStyle=fog;c.fillRect(0,0,this.width,this.height);
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
