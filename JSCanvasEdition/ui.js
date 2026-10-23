(() => {
  'use strict';
  const N=window.Nocturne;
  const UPGRADES=[
    {id:'damage',name:'Arcane intensity',icon:'✧',text:'+15% magic damage. Every orb strikes with greater force.',tag:'OFFENSE',apply:p=>p.damage*=1.15},
    {id:'haste',name:'Quickened ritual',icon:'ϟ',text:'Cast 12% faster. Less silence between your spells.',tag:'CAST SPEED',valid:p=>p.attackInterval>.13,apply:p=>p.attackInterval=Math.max(.12,p.attackInterval*.88)},
    {id:'speed',name:'Ghost steps',icon:'⋗',text:'+10% movement speed. Slip between the things that hunt you.',tag:'MOVEMENT',apply:p=>p.speed*=1.1},
    {id:'orb',name:'Divided moon',icon:'☽',text:'+1 projectile in every cast, up to 7. A wider constellation of magic.',tag:'MULTICAST',valid:p=>p.projectileCount<7,apply:p=>p.projectileCount++},
    {id:'health',name:'Blood covenant',icon:'♡',text:'+20 maximum vitality. Restore 25 vitality immediately.',tag:'SURVIVAL',apply:p=>{p.maxHp+=20;p.hp=Math.min(p.maxHp,p.hp+25);}},
    {id:'velocity',name:'Falling star',icon:'↗',text:'+20% projectile speed. Your magic finds its mark sooner.',tag:'PROJECTILE SPEED',apply:p=>p.projectileSpeed*=1.2},
    {id:'crit',name:'Wicked fortune',icon:'◇',text:'+8 percentage points of critical chance, up to 75%.',tag:'CRITICAL CHANCE',valid:p=>p.critChance<.75,apply:p=>p.critChance=Math.min(.75,p.critChance+.08)},
    {id:'magnet',name:'Soul gathering',icon:'◎',text:'+35% pickup range. Draw distant gold and experience to you.',tag:'COLLECTION',apply:p=>p.pickupRadius*=1.35}
  ];
  const ITEMS=[
    {id:'wand',name:'Ashwood wand',icon:'ϟ',text:'+6 base magic damage.',tag:'WEAPON',cost:15,apply:p=>p.damage+=6},
    {id:'prism',name:'Prism of dusk',icon:'◈',text:'+1 projectile per cast (maximum 7).',tag:'WEAPON',cost:30,valid:p=>p.projectileCount<7,apply:p=>p.projectileCount++},
    {id:'hourglass',name:'Broken hourglass',icon:'⋈',text:'Cast 10% faster.',tag:'RELIC',cost:18,valid:p=>p.attackInterval>.13,apply:p=>p.attackInterval=Math.max(.12,p.attackInterval*.9)},
    {id:'cloak',name:'Grave silk',icon:'♜',text:'+8% damage reduction, up to 60%.',tag:'PASSIVE',cost:17,valid:p=>p.armor<.6,apply:p=>p.armor=Math.min(.6,p.armor+.08)},
    {id:'heart',name:'Ember heart',icon:'♡',text:'+15 maximum vitality. Restore 15 vitality.',tag:'PASSIVE',cost:16,apply:p=>{p.maxHp+=15;p.hp=Math.min(p.maxHp,p.hp+15);}},
    {id:'boots',name:'Pilgrim boots',icon:'⋗',text:'+12% movement speed.',tag:'PASSIVE',cost:17,apply:p=>p.speed*=1.12},
    {id:'salve',name:'Moonlit salve',icon:'✚',text:'Restore 40 vitality immediately.',tag:'CONSUMABLE',cost:10,valid:p=>p.hp<p.maxHp,apply:p=>p.hp=Math.min(p.maxHp,p.hp+40)},
    {id:'dew',name:'Silver dew',icon:'❧',text:'Regenerate 0.4 vitality per second.',tag:'PASSIVE',cost:23,apply:p=>p.regen+=.4},
    {id:'glass',name:'Stargazer lens',icon:'◎',text:'+30% projectile speed and +20% pickup range.',tag:'RELIC',cost:18,apply:p=>{p.projectileSpeed*=1.3;p.pickupRadius*=1.2;}},
    {id:'ring',name:'Serpent ring',icon:'○',text:'+10 percentage points of critical chance (maximum 75%).',tag:'PASSIVE',cost:22,valid:p=>p.critChance<.75,apply:p=>p.critChance=Math.min(.75,p.critChance+.1)}
  ];
  class UI {
    constructor(game){
      this.game=game;this.overlay=document.getElementById('overlay');this.menu=document.getElementById('menu');
      this.afterLevel='playing';this.choices=[];this.selected=false;this.rolls=0;this.slots=[];this.resetShop();
      this.hud={};
      for(const id of ['hud','bottom-hud','wave-label','timer','gold','wave-fill','health-fill','health-text','level-label','xp-text','xp-fill','kills','wave-status'])this.hud[id]=document.getElementById(id);
      document.getElementById('pause-button').addEventListener('click',()=>this.togglePause());
      document.addEventListener('keydown',e=>{
        if(e.code!=='Tab'||this.overlay.hidden)return;
        const elements=[...this.menu.querySelectorAll('button:not(:disabled)')];
        if(!elements.length)return;
        const first=elements[0],last=elements[elements.length-1];
        if(e.shiftKey && (document.activeElement===first || !this.menu.contains(document.activeElement))){e.preventDefault();last.focus();}
        else if(!e.shiftKey && (document.activeElement===last || !this.menu.contains(document.activeElement))){e.preventDefault();first.focus();}
      });
      this.title();
    }
    resetShop(){this.slots=Array.from({length:4},()=>({item:null,locked:false,price:0}));this.rolls=0;}
    show(html,focus=true){
      this.overlay.hidden=false;this.menu.innerHTML=html;
      if(focus)this.menu.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
    }
    hide(){this.overlay.hidden=true;document.getElementById('pause-button').focus({preventScroll:true});}
    on(selector,fn){this.menu.querySelector(selector)?.addEventListener('click',fn);}
    title(){
      this.show(`<span class="moon" aria-hidden="true">☾</span><p class="eyebrow">AN ENDLESS RITUAL</p><h1 id="menu-title">Nocturne</h1><p class="subtitle-name">Witch of Ash</p><div class="rule"></div><p class="subtitle">The hollow stirs. Your magic answers.<br>Gather fallen souls, shape your craft, and endure the night.</p><button class="primary" id="begin">ENTER THE HOLLOW <span aria-hidden="true">↗</span></button><div class="controls"><span><kbd>W A S D</kbd> MOVE</span><span>✧ AUTO CAST</span><span><kbd>ESC</kbd> PAUSE</span></div><p class="hint">Waves last 30–60 seconds. Choose a gift when you level up.<br>Spend your gold between waves. Death begins a new ritual.</p><button class="secondary" id="audio">SOUND: OFF</button>`);
      this.on('#begin',()=>{this.game.combat.enableAudio();this.game.reset();});
      this.on('#audio',e=>{const c=this.game.combat;c.soundEnabled=!c.soundEnabled;if(c.soundEnabled)c.enableAudio();e.currentTarget.textContent=`SOUND: ${c.soundEnabled?'ON':'OFF'}`;});
    }
    updateHUD(){
      const g=this.game,p=g.player,h=this.hud;
      h.hud.hidden=h['bottom-hud'].hidden=g.state==='title';
      h['wave-label'].textContent=`WAVE ${String(g.wave).padStart(2,'0')}`;
      const seconds=Math.ceil(Math.max(0,g.waveDuration-g.waveTime));
      h.timer.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
      h.gold.textContent=p.gold;h.kills.textContent=p.kills;
      h['wave-fill'].style.width=`${N.clamp(g.waveTime/g.waveDuration,0,1)*100}%`;
      h['health-fill'].style.width=`${p.hp/p.maxHp*100}%`;
      h['health-text'].textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;
      h['level-label'].textContent=`LEVEL ${String(p.level).padStart(2,'0')}`;
      h['xp-text'].textContent=`${p.xp} / ${p.xpNeeded} XP`;h['xp-fill'].style.width=`${p.xp/p.xpNeeded*100}%`;
      h['wave-status'].textContent=g.state==='shop'?'A MOMENT OF RESPITE':g.state==='paused'?'RITUAL PAUSED':'THE HOLLOW';
    }
    banner(title,sub){
      const el=document.getElementById('wave-banner');el.innerHTML=`<small>${sub}</small>${title}`;
      el.classList.add('visible');clearTimeout(this.bannerTimer);this.bannerTimer=setTimeout(()=>el.classList.remove('visible'),2400);
    }
    toast(text){
      const el=document.getElementById('toast');el.textContent=text;el.classList.add('visible');
      clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>el.classList.remove('visible'),1900);
    }
    levelUp(){
      this.game.state='levelup';this.game.input.clear();this.selected=false;
      this.choices=N.shuffle(UPGRADES.filter(u=>!u.valid||u.valid(this.game.player))).slice(0,3);
      this.show(`<p class="eyebrow">A SOUL REMEMBERS</p><h2 id="menu-title">Choose your awakening</h2><p class="subtitle">One gift for the path ahead. The night can wait.</p><div class="cards">${this.choices.map((u,i)=>`<button class="card choice" data-choice="${i}"><span class="card-icon" aria-hidden="true">${u.icon}</span><h3>${u.name}</h3><p>${u.text}</p><span class="tag">${u.tag} · ${i+1}</span></button>`).join('')}</div><p class="hint">${this.game.player.pendingLevels>1?`${this.game.player.pendingLevels} awakenings waiting · `:''}Choose a card or press 1, 2, or 3.</p>`);
      this.menu.querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>this.chooseLevel(Number(b.dataset.choice))));
    }
    chooseLevel(index){
      if(this.game.state!=='levelup'||this.selected||!this.choices[index])return;
      this.selected=true;const u=this.choices[index],p=this.game.player;
      u.apply(p);p.upgrades.push(u.id);p.pendingLevels--;
      if(p.pendingLevels>0)this.levelUp();
      else if(this.afterLevel==='shop')this.openShop();
      else{this.game.state='playing';this.hide();}
    }
    eligibleItems(){return ITEMS.filter(u=>!u.valid||u.valid(this.game.player));}
    rollSlot(slot){
      slot.item=N.pick(this.eligibleItems());slot.price=slot.item.cost+Math.floor((this.game.wave-1)*2);
      slot.locked=false;
    }
    openShop(){
      this.game.state='shop';this.game.input.clear();this.rolls=0;
      for(const slot of this.slots)if(!slot.locked||!slot.item)this.rollSlot(slot);
      this.renderShop();
    }
    rerollCost(){return 3+this.game.wave+this.rolls*2;}
    reroll(){
      const g=this.game,cost=this.rerollCost();
      if(g.state!=='shop'||g.player.gold<cost||this.slots.every(s=>s.locked))return;
      g.player.gold-=cost;this.rolls++;
      for(const slot of this.slots)if(!slot.locked)this.rollSlot(slot);
      this.renderShop('[data-reroll]');
    }
    toggleLock(index){
      const s=this.slots[index];if(this.game.state!=='shop'||!s?.item)return;
      s.locked=!s.locked;this.renderShop(`[data-lock="${index}"]`);
    }
    buy(index){
      const g=this.game,s=this.slots[index];
      if(g.state!=='shop'||!s?.item||g.player.gold<s.price)return;
      if(s.item.valid&&!s.item.valid(g.player)){this.toast('This gift has reached its limit. Reroll this slot.');return;}
      const name=s.item.name;g.player.gold-=s.price;s.item.apply(g.player);g.player.upgrades.push(s.item.id);
      s.item=null;s.locked=false;this.renderShop('[data-start]');this.toast(`${name} acquired`);
    }
    renderShop(focus){
      const g=this.game,p=g.player;
      this.show(`<p class="eyebrow">WAVE ${String(g.wave).padStart(2,'0')} COMPLETE</p><h2 id="menu-title">The midnight merchant</h2><p class="subtitle">A little power. A little longer in the dark.</p><div class="shop-top"><span>YOUR GOLD <strong>◈ ${p.gold}</strong></span><span>NEXT WAVE <strong>${g.wave+1}</strong></span></div><div class="cards shop-cards">${this.slots.map((s,i)=>s.item?`<article class="card ${s.locked?'locked':''}"><span class="card-icon" aria-hidden="true">${s.item.icon}</span><span class="tag">${s.item.tag}</span><h3>${s.item.name}</h3><p>${s.item.text}</p><div class="card-actions"><button class="buy" data-buy="${i}" aria-label="Buy ${s.item.name} for ${s.price} gold" ${p.gold<s.price||(s.item.valid&&!s.item.valid(p))?'disabled':''}>◈ ${s.price} · BUY</button><button class="lock" data-lock="${i}" aria-label="${s.locked?'Unlock':'Lock'} ${s.item.name}" aria-pressed="${s.locked}">${s.locked?'LOCKED':'LOCK'}</button></div></article>`:`<article class="card"><span class="card-icon" aria-hidden="true">✓</span><h3>A pact is made</h3><p>This gift is yours.</p><span class="sold">SOLD</span></article>`).join('')}</div><div class="stat-strip"><span>DAMAGE <b>${p.damage.toFixed(1)}</b></span><span>CASTS / SEC <b>${(1/p.attackInterval).toFixed(2)}</b></span><span>PROJECTILES <b>${p.projectileCount}</b></span><span>CRITICAL <b>${Math.round(p.critChance*100)}%</b></span><span>ARMOR <b>${Math.round(p.armor*100)}%</b></span></div><div class="shop-actions"><button class="secondary" data-reroll ${p.gold<this.rerollCost()||this.slots.every(s=>s.locked)?'disabled':''}>REROLL · ◈ ${this.rerollCost()}</button><button class="primary" data-start>START WAVE ${g.wave+1} ↗</button></div><p class="hint">Locked items keep their price and stay through rerolls and the next shop.<br>Each new wave restores 12% of maximum vitality.</p>`,!focus);
      this.menu.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',()=>this.buy(Number(b.dataset.buy))));
      this.menu.querySelectorAll('[data-lock]').forEach(b=>b.addEventListener('click',()=>this.toggleLock(Number(b.dataset.lock))));
      this.on('[data-reroll]',()=>this.reroll());this.on('[data-start]',()=>{if(g.state==='shop')g.startWave();});
      if(focus)this.menu.querySelector(focus)?.focus({preventScroll:true});
    }
    togglePause(){if(this.game.state==='playing')this.pause();else if(this.game.state==='paused')this.resume();}
    pause(){
      if(this.game.state!=='playing')return;
      this.game.state='paused';this.game.input.clear();
      this.show(`<p class="eyebrow">THE NIGHT HOLDS ITS BREATH</p><h2 id="menu-title">Ritual paused</h2><p class="subtitle">Take a moment. Your magic will be here.</p><button class="primary" id="resume">RESUME RITUAL</button><div class="rule"></div><button class="secondary" id="sound">SOUND: ${this.game.combat.soundEnabled?'ON':'OFF'}</button> <button class="secondary" id="effects">REDUCED MOTION: ${this.game.reducedMotion?'ON':'OFF'}</button><p class="hint">WASD / arrows / touch stick to move · Magic casts automatically<br>ESC or P to resume · Focus loss pauses the game</p>`);
      this.on('#resume',()=>this.resume());
      this.on('#sound',()=>{const c=this.game.combat;c.soundEnabled=!c.soundEnabled;if(c.soundEnabled)c.enableAudio();this.pauseRefresh();});
      this.on('#effects',()=>{this.game.reducedMotion=!this.game.reducedMotion;this.pauseRefresh();});
    }
    pauseRefresh(){this.game.state='playing';this.pause();}
    resume(){if(this.game.state!=='paused')return;this.game.state='playing';this.game.input.clear();this.hide();}
    gameOver(){
      const g=this.game,p=g.player;
      this.show(`<span class="moon" aria-hidden="true">☾</span><p class="eyebrow">THE HOLLOW CLAIMS ANOTHER</p><h2 id="menu-title">Even stars turn to ash.</h2><p class="subtitle">The ritual ends. The night remains.</p><div class="stat-strip"><span>WAVE <b>${g.wave}</b></span><span>LEVEL <b>${p.level}</b></span><span>SOULS <b>${p.kills}</b></span><span>SURVIVED <b>${Math.floor(g.time/60)}m ${Math.floor(g.time%60)}s</b></span></div><div class="rule"></div><button class="primary" id="retry">BEGIN ANOTHER RITUAL ↗</button>`);
      this.on('#retry',()=>g.reset());
    }
  }
  N.UI=UI;N.UPGRADES=UPGRADES;N.ITEMS=ITEMS;
})();
