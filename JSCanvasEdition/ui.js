(() => {
  'use strict';
  const N=window.Nocturne;
  const ACHIEVEMENTS=[
    {id:'untouched',name:'Untouched',text:'Finish a wave without losing vitality.'},
    {id:'survivor',name:'A longer night',text:'Complete wave 3.'},
    {id:'century',name:'A hundred whispers',text:'Banish 100 souls in one ritual.'},
    {id:'elite',name:'Gilded ashes',text:'Banish an elite enemy.'},
    {id:'warden',name:'Sealbreaker',text:'Defeat a Hollow Warden.'},
    {id:'evolution',name:'Forbidden knowledge',text:'Evolve any spell with its matching relic.'}
  ];
  const RELICS={
    mirror:{name:'Lunar Mirror',icon:'◈',text:'+8% magic damage. Evolves rank IV Arcane Bolt into Shattered Moon.',cost:30,apply:p=>p.damage*=1.08},
    cinder:{name:'Cinder Seed',icon:'❧',text:'+0.2 vitality regeneration. Evolves rank IV Moon Wisps into Cinder Halo.',cost:28,apply:p=>p.regen+=.2},
    conductor:{name:'Storm Conductor',icon:'ϟ',text:'+5 percentage points of critical chance (cap 45%). Evolves rank IV Chain Lightning into Thunder Crown.',cost:30,apply:p=>p.critChance=Math.min(.45,p.critChance+.05)},
    permafrost:{name:'Permafrost Shard',icon:'❄',text:'+10 maximum vitality, restore 10 vitality. Evolves rank IV Frost Nova into Absolute Winter.',cost:28,apply:p=>{p.maxHp+=10;p.hp=Math.min(p.maxHp,p.hp+10);}}
  };
  const weaponChoices=Object.entries(N.WEAPONS).map(([id,w])=>({
    id:'spell_'+id,name:w.name,icon:w.icon,tag:'SPELL',valid:p=>p.weapons[id]<4,
    text:p=>`${p.weapons[id]===0?'Learn this spell.':`Advance to rank ${p.weapons[id]+1} / 4.`} ${w.text}`,
    apply:p=>p.upgradeWeapon(id),weapon:id
  }));
  const UPGRADES=[
    {id:'damage',name:'Arcane intensity',icon:'✧',text:'+15% magic damage, up to 95.',tag:'OFFENSE',valid:p=>p.damage<95,apply:p=>p.damage*=1.15},
    {id:'haste',name:'Quickened ritual',icon:'ϟ',text:'Cast 12% faster. Also quickens lightning and nova.',tag:'CAST SPEED',valid:p=>p.attackInterval>.24,apply:p=>p.attackInterval=Math.max(.24,p.attackInterval*.88)},
    {id:'speed',name:'Ghost steps',icon:'⋗',text:'+10% movement speed, up to 300. Dash distance grows with it.',tag:'MOVEMENT',valid:p=>p.speed<300,apply:p=>p.speed*=1.1},
    {id:'orb',name:'Divided moon',icon:'☽',text:'+1 orb per cast, up to 7. Power is shared; total volley damage grows with the square root of orb count.',tag:'MULTICAST',valid:p=>p.projectileCount<7,apply:p=>p.projectileCount++},
    {id:'health',name:'Blood covenant',icon:'♡',text:'+20 maximum vitality. Restore 25 vitality now.',tag:'SURVIVAL',valid:p=>p.maxHp<320,apply:p=>{p.maxHp+=20;p.hp=Math.min(p.maxHp,p.hp+25);}},
    {id:'velocity',name:'Falling star',icon:'↗',text:'+20% projectile speed, up to 850. Travel range stays at 490.',tag:'PROJECTILE SPEED',valid:p=>p.projectileSpeed<850,apply:p=>p.projectileSpeed*=1.2},
    {id:'crit',name:'Wicked fortune',icon:'◇',text:'+8 percentage points of critical chance, up to 45%.',tag:'CRITICAL CHANCE',valid:p=>p.critChance<.45,apply:p=>p.critChance=Math.min(.45,p.critChance+.08)},
    {id:'magnet',name:'Soul gathering',icon:'◎',text:'+35% pickup range, up to 190 world units.',tag:'COLLECTION',valid:p=>p.pickupRadius<190,apply:p=>p.pickupRadius*=1.35},
    {id:'dash',name:'Between worlds',icon:'»',text:'Dash recovers 15% sooner (minimum 1.25 seconds).',tag:'EVASION',valid:p=>p.dashCooldown>1.25,apply:p=>p.dashCooldown=Math.max(1.25,p.dashCooldown*.85)},
    {id:'pierce',name:'Needle of night',icon:'⤴',text:'Arcane orbs pierce +1 target (maximum 2 bonus targets).',tag:'PENETRATION',valid:p=>p.pierce<2,apply:p=>p.pierce++},
    ...weaponChoices
  ];
  const ITEMS=[
    {id:'wand',name:'Ashwood wand',icon:'ϟ',text:'+6 magic damage, up to 95.',tag:'CHARM',rarity:'common',cost:15,valid:p=>p.damage<95,apply:p=>p.damage+=6},
    {id:'prism',name:'Prism of dusk',icon:'◈',text:'+1 arcane orb (maximum 7). Multicast shares power across the volley.',tag:'CHARM',rarity:'rare',cost:30,valid:p=>p.projectileCount<7,apply:p=>p.projectileCount++},
    {id:'hourglass',name:'Broken hourglass',icon:'⋈',text:'Cast 10% faster. Affects all cast timers.',tag:'RELIC',rarity:'common',cost:18,valid:p=>p.attackInterval>.24,apply:p=>p.attackInterval=Math.max(.24,p.attackInterval*.9)},
    {id:'cloak',name:'Grave silk',icon:'♜',text:'+8 percentage points of damage reduction (maximum 45%).',tag:'PASSIVE',rarity:'common',cost:17,valid:p=>p.armor<.45,apply:p=>p.armor=Math.min(.45,p.armor+.08)},
    {id:'heart',name:'Ember heart',icon:'♡',text:'+15 maximum vitality. Restore 15 vitality.',tag:'PASSIVE',rarity:'common',cost:16,valid:p=>p.maxHp<320,apply:p=>{p.maxHp+=15;p.hp=Math.min(p.maxHp,p.hp+15);}},
    {id:'boots',name:'Pilgrim boots',icon:'⋗',text:'+12% movement speed, up to 300.',tag:'PASSIVE',rarity:'common',cost:17,valid:p=>p.speed<300,apply:p=>p.speed*=1.12},
    {id:'salve',name:'Moonlit salve',icon:'✚',text:'Restore 40 vitality immediately.',tag:'CONSUMABLE',rarity:'common',cost:10,valid:p=>p.hp<p.maxHp,apply:p=>p.hp=Math.min(p.maxHp,p.hp+40)},
    {id:'dew',name:'Silver dew',icon:'❧',text:'Regenerate +0.4 vitality per second, up to 1.2.',tag:'PASSIVE',rarity:'rare',cost:23,valid:p=>p.regen<1.2,apply:p=>p.regen+=.4},
    {id:'glass',name:'Stargazer lens',icon:'◎',text:'+30% projectile speed (850 cap) and +20% pickup range (190 cap). Does not increase spell range.',tag:'RELIC',rarity:'common',cost:18,valid:p=>p.projectileSpeed<850||p.pickupRadius<190,apply:p=>{p.projectileSpeed*=1.3;p.pickupRadius*=1.2;}},
    {id:'ring',name:'Serpent ring',icon:'○',text:'+10 percentage points of critical chance (maximum 45%).',tag:'PASSIVE',rarity:'rare',cost:22,valid:p=>p.critChance<.45,apply:p=>p.critChance=Math.min(.45,p.critChance+.1)},
    {id:'feather',name:'Raven feather',icon:'»',text:'Dash recovers 18% sooner (minimum 1.25 seconds).',tag:'PASSIVE',rarity:'common',cost:16,valid:p=>p.dashCooldown>1.25,apply:p=>p.dashCooldown=Math.max(1.25,p.dashCooldown*.82)},
    ...weaponChoices.map(w=>({...w,id:'tome_'+w.weapon,tag:'SPELL TOME',rarity:'rare',cost:24})),
    ...Object.entries(RELICS).map(([id,r])=>({...r,id:'relic_'+id,tag:'EVOLUTION RELIC',rarity:'epic',valid:p=>!p.relics[id],apply:p=>{p.relics[id]=true;r.apply(p);p.checkEvolutions();}}))
  ];
  class UI {
    constructor(game){
      this.game=game;this.overlay=document.getElementById('overlay');this.menu=document.getElementById('menu');
      this.afterLevel='playing';this.choices=[];this.selected=false;this.rolls=0;this.slots=[];this.hudFrame=0;this.resetShop();
      this.hud={};
      for(const id of ['hud','bottom-hud','wave-label','timer','gold','wave-fill','health-fill','health-text','level-label','xp-text','xp-fill','kills','wave-status','dash-fill','dash-text','spell-belt','boss-hud','boss-fill','boss-phase','boss-hp','biome-name','performance'])this.hud[id]=document.getElementById(id);
      document.getElementById('pause-button').addEventListener('click',()=>this.togglePause());
      document.getElementById('grimoire-button').addEventListener('click',()=>this.toggleGrimoire());
      document.addEventListener('keydown',e=>{
        if(e.code!=='Tab'||this.overlay.hidden)return;
        const buttons=[...this.menu.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)')];if(!buttons.length)return;
        const first=buttons[0],last=buttons.at(-1);
        if(e.shiftKey&&(document.activeElement===first||!this.menu.contains(document.activeElement))){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&(document.activeElement===last||!this.menu.contains(document.activeElement))){e.preventDefault();first.focus();}
      });
      for(const [id,delta] of [['zoom-out',-.1],['zoom-in',.1],['zoom-reset',0]])document.getElementById(id).addEventListener('click',()=>game.setZoom(delta?game.userZoom+delta:1));
      this.title();
    }
    describe(item){return typeof item.text==='function'?item.text(this.game.player):item.text;}
    resetShop(){this.slots=Array.from({length:4},()=>({item:null,locked:false,price:0}));this.rolls=0;}
    show(html,focus=true){
      this.transition?.cancel();
      this.menu.dataset.screen=this.game.state;
      this.overlay.hidden=false;this.menu.innerHTML=html;this.overlay.scrollTop=0;this.menu.scrollTop=0;
      if(!this.game.reducedMotion&&this.menu.animate)this.transition=this.menu.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:170,easing:'cubic-bezier(.2,.7,.3,1)'});
      document.getElementById('wave-banner').classList.remove('visible');
      document.getElementById('game').inert=true;
      document.getElementById('hud').inert=true;document.getElementById('zoom-hud').inert=true;
      if(focus)this.menu.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
    }
    hide(){this.transition?.cancel();this.overlay.hidden=true;document.getElementById('game').inert=false;document.getElementById('hud').inert=false;document.getElementById('zoom-hud').inert=false;document.getElementById('pause-button').focus({preventScroll:true});}
    on(selector,fn){this.menu.querySelector(selector)?.addEventListener('click',e=>{this.game.combat.sound('ui');fn(e);});}
    audioControls(){
      const engine=this.game.combat.audioEngine;
      return `<div class="audio-settings"><label for="volume">SOUND VOLUME <strong id="volume-value">${Math.round(engine.volume*100)}%</strong><input id="volume" type="range" min="0" max="100" step="1" value="${Math.round(engine.volume*100)}" aria-label="Sound volume"></label><button class="secondary" id="ambience">AMBIENCE: ${engine.ambience?'ON':'OFF'}</button><button class="secondary" id="test-sound">TEST SOUND</button></div>`;
    }
    bindAudioControls(){
      const g=this.game,engine=g.combat.audioEngine;
      this.menu.querySelector('#volume')?.addEventListener('input',e=>{
        engine.setVolume(Number(e.currentTarget.value)/100);this.menu.querySelector('#volume-value').textContent=`${Math.round(engine.volume*100)}%`;g.saveSettings();
      });
      this.on('#ambience',e=>{engine.setAmbience(!engine.ambience);g.saveSettings();e.currentTarget.textContent=`AMBIENCE: ${engine.ambience?'ON':'OFF'}`;});
      this.on('#test-sound',()=>{g.combat.soundEnabled=true;g.combat.enableAudio('choose');g.saveSettings();const b=this.menu.querySelector('#sound');if(b)b.textContent='SOUND: ON';});
    }
    escape(text){return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
    title(){
      const g=this.game;if(g.state==='paused')g.checkpoint('wave');g.state='title';g.input.clear();
      const profile=g.save.data.profile,checkpoint=g.save.data.checkpoint,slot=g.save.active;
      this.show(`<div class="title-crest"><div class="title-art" aria-hidden="true"><span>☾</span><img src="${window.NOCTURNE_ASSETS.witch_SE}" alt=""></div><div><p class="eyebrow">ARCANE HORIZONS · ${N.VERSION}</p><h1 id="menu-title">Nocturne</h1><p class="subtitle-name">Witch of Ash</p><p class="subtitle title-sub">A spell is power.<br>Survival is knowing when to move.</p></div></div>
        <button class="active-save" id="saves"><span>◈ ${this.escape(slot.name)}</span><small>${checkpoint?`WAVE ${checkpoint.wave} · LEVEL ${checkpoint.player.level}`:'A NEW CHAPTER'} · ${g.save.data.slots.length} SAVE${g.save.data.slots.length===1?'':'S'} · MANAGE ↗</small></button>
        <div class="coven-grid" role="group" aria-label="Choose your starting witch">${Object.entries(N.COVENS).map(([id,c])=>`<button class="coven-choice ${g.selectedCoven===id?'chosen':''}" data-coven="${id}" aria-pressed="${g.selectedCoven===id}"><span aria-hidden="true" style="color:${c.color}">${c.icon}</span><strong>${c.name}</strong><small>${c.text}</small></button>`).join('')}</div>
        <div class="shop-actions">${checkpoint?`<button class="primary" id="continue">CONTINUE · ${this.escape(slot.name)}</button>`:''}<button class="${checkpoint?'secondary':'primary'}" id="begin">${checkpoint?'NEW RITUAL · NEW SAVE':'ENTER THE HOLLOW'} ↗</button></div>
        <div class="controls"><span><kbd>WASD</kbd> MOVE</span><span><kbd>SPACE</kbd> DASH</span><span><kbd>SCROLL / ±</kbd> ZOOM</span><span><kbd>I</kbd> GRIMOIRE</span></div>
        <p class="hint">${g.save.migrated?'Your previous ritual and chronicle have been moved to Save 1.<br>':''}${g.save.available?'Autosaves every 10 seconds, on pause, and in the merchant.':'Browser storage is unavailable. Export a backup from Saves before closing.'}<br>New rituals use a fresh slot. Your existing saves stay intact.</p>
        <div class="title-bottom"><button class="text-button" id="chronicle">CHRONICLE · ${profile.achievements.length} / ${ACHIEVEMENTS.length}</button><span>BEST WAVE ${profile.bestWave} · BEST SOULS ${profile.bestKills}</span><button class="text-button" id="audio">SOUND: ${g.save.data.settings.sound?'ON':'OFF'}</button></div>`);
      this.menu.querySelectorAll('[data-coven]').forEach(b=>b.addEventListener('click',()=>{g.selectedCoven=b.dataset.coven;this.title();this.menu.querySelector(`[data-coven="${g.selectedCoven}"]`)?.focus({preventScroll:true});}));
      this.on('#begin',()=>{g.combat.enableAudio('wave');g.newRitual();});
      this.on('#continue',()=>{g.combat.enableAudio();g.continueRun();});this.on('#saves',()=>this.saves());
      this.on('#audio',e=>{g.combat.soundEnabled=!g.combat.soundEnabled;if(g.combat.soundEnabled)g.combat.enableAudio('choose');g.saveSettings();e.currentTarget.textContent=`SOUND: ${g.combat.soundEnabled?'ON':'OFF'}`;});
      this.on('#chronicle',()=>this.chronicle());
    }
    saves(confirmDelete=null){
      const g=this.game;g.state='saves';g.input.clear();
      this.show(`<p class="eyebrow">EVERY RITUAL HAS A HOME</p><h2 id="menu-title">Your saved chapters</h2><p class="subtitle">Independent witches, chronicles and worlds.<br>Select a chapter to return to it, or start with a new one.</p>
        <div class="save-grid">${g.save.data.slots.map(s=>{const c=s.checkpoint;return `<article class="save-card ${s.id===g.save.active.id?'active':''}"><div class="save-heading"><span>${s.id===g.save.active.id?'✦ ACTIVE':'◇ CHAPTER '+s.id}</span><small>${c?c.phase==='shop'?'AT THE MERCHANT':'RITUAL IN PROGRESS':'READY'}</small></div><h3>${this.escape(s.name)}</h3><div class="save-preview"><img src="${window.NOCTURNE_ASSETS['witch_'+(c?.coven==='moon'?'SW':c?.coven==='storm'?'SE':'S')]}" alt=""><p>${c?`${N.COVENS[c.coven].name}<strong>Wave ${c.wave} · Level ${c.player.level}</strong><small>◈ ${c.player.gold} · ${c.player.kills} souls · ${c.phase==='shop'?'Merchant snapshot':c.world?'Exact world snapshot':'Legacy wave checkpoint'}</small>`:`An unwritten ritual<strong>Best wave ${s.profile.bestWave}</strong><small>${s.profile.runs} completed rituals</small>`}</p></div><div class="save-actions"><button class="${s.id===g.save.active.id?'secondary':'primary'}" data-select-save="${s.id}">${c?'SELECT & CONTINUE':'SELECT CHAPTER'}</button><button class="text-button" data-rename-save="${s.id}">RENAME</button>${g.save.data.slots.length>1?`<button class="text-button danger" data-delete-save="${s.id}" aria-label="Delete ${this.escape(s.name)}">DELETE</button>`:''}</div>${confirmDelete===s.id?`<div class="delete-confirm"><p>Remove ${this.escape(s.name)} and its chronicle?</p><button class="secondary danger" data-confirm-delete="${s.id}">DELETE THIS SAVE</button><button class="text-button" id="cancel-delete">KEEP IT</button></div>`:''}<div class="rename-row" id="rename-${s.id}" hidden><label for="name-${s.id}">CHAPTER NAME</label><input id="name-${s.id}" maxlength="32" value="${this.escape(s.name)}"><button class="secondary" data-apply-name="${s.id}">SAVE NAME</button></div></article>`;}).join('')}</div>
        <div class="shop-actions"><button class="primary" id="new-save" ${g.save.data.slots.length>=N.SaveStore.MAX_SLOTS?'disabled':''}>＋ NEW SAVE</button><button class="secondary" id="export-saves">EXPORT BACKUP</button><button class="secondary" id="import-saves">IMPORT BACKUP</button><input type="file" id="save-file" accept=".json,application/json" hidden><button class="text-button" id="back">BACK TO COVEN</button></div><p class="hint">${g.save.data.slots.length} / 24 slots · Import adds chapters without replacing existing saves.<br>Browser saves belong to this origin. Export a backup before changing browser, folder or device.</p>`);
      this.menu.querySelectorAll('[data-select-save]').forEach(b=>b.addEventListener('click',()=>{g.save.select(Number(b.dataset.selectSave));if(g.save.data.checkpoint){g.combat.enableAudio();g.continueRun();}else this.title();}));
      this.menu.querySelectorAll('[data-delete-save]').forEach(b=>b.addEventListener('click',()=>this.saves(Number(b.dataset.deleteSave))));
      this.menu.querySelectorAll('[data-confirm-delete]').forEach(b=>b.addEventListener('click',()=>{g.save.remove(Number(b.dataset.confirmDelete));this.saves();}));
      this.menu.querySelectorAll('[data-rename-save]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.renameSave;this.menu.querySelector('#rename-'+id).hidden=false;this.menu.querySelector('#name-'+id).focus();}));
      this.menu.querySelectorAll('[data-apply-name]').forEach(b=>b.addEventListener('click',()=>{const id=Number(b.dataset.applyName);g.save.rename(id,this.menu.querySelector('#name-'+id).value);this.saves();}));
      this.on('#cancel-delete',()=>this.saves());this.on('#new-save',()=>{if(g.save.createSlot())this.title();});this.on('#back',()=>this.title());
      this.on('#export-saves',()=>{
        const blob=new Blob([g.save.exportData()],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Nocturne-saves.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      });
      this.on('#import-saves',()=>this.menu.querySelector('#save-file').click());
      this.menu.querySelector('#save-file')?.addEventListener('change',async e=>{const file=e.currentTarget.files?.[0];if(!file)return;if(file.size>12e6){this.toast('Backup is too large (12 MB maximum).');return;}try{const count=g.save.importData(await file.text());this.saves();this.toast(`${count} chapter${count===1?'':'s'} imported`);}catch(error){this.toast(error.message==='Unexpected end of JSON input'?'This backup is not valid JSON.':error instanceof SyntaxError?'This backup is not valid JSON.':error.message);}});
    }
    chronicle(){
      const g=this.game,p=g.save.data.profile;g.state='chronicle';
      this.show(`<p class="eyebrow">WHAT THE HOLLOW REMEMBERS</p><h2 id="menu-title">The chronicle</h2><div class="stat-strip"><span>FINISHED RITUALS <b>${p.runs}</b></span><span>BEST WAVE <b>${p.bestWave}</b></span><span>BEST SOULS <b>${p.bestKills}</b></span><span>WARDENS <b>${p.bosses}</b></span></div><div class="achievement-grid">${ACHIEVEMENTS.map(a=>`<article class="achievement ${p.achievements.includes(a.id)?'earned':''}"><span>${p.achievements.includes(a.id)?'✦':'◇'}</span><h3>${a.name}</h3><p>${a.text}</p><small>${p.achievements.includes(a.id)?'UNLOCKED':'UNDISCOVERED'}</small></article>`).join('')}</div><p class="hint">Milestones are cosmetic records. Every witch is available from the start.</p><button class="primary" id="back">BACK TO THE COVEN</button>`);this.on('#back',()=>this.title());
    }
    updateHUD(){
      if(++this.hudFrame%4!==0)return;
      const g=this.game,p=g.player,h=this.hud;
      h.hud.hidden=h['bottom-hud'].hidden=['title','chronicle','saves'].includes(g.state);
      h['wave-label'].textContent=`WAVE ${String(g.wave).padStart(2,'0')}`;
      const seconds=Math.ceil(Math.max(0,g.waveDuration-g.waveTime));
      h.timer.textContent=seconds===0&&g.boss?.alive?'BREAK SEAL':`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
      document.getElementById('zoom-value').textContent=`${Math.round(g.userZoom*100)}%`;
      document.getElementById('zoom-hud').hidden=['title','chronicle','saves'].includes(g.state);
      document.getElementById('save-label').textContent=g.save.active.name;
      h.gold.textContent=p.gold;h.kills.textContent=p.kills;
      h['wave-fill'].style.width=`${N.clamp(g.waveTime/g.waveDuration,0,1)*100}%`;
      h['health-fill'].style.width=`${p.hp/p.maxHp*100}%`;h['health-text'].textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;
      h['level-label'].textContent=`LEVEL ${String(p.level).padStart(2,'0')}`;h['xp-text'].textContent=`${p.xp} / ${p.xpNeeded} XP`;h['xp-fill'].style.width=`${p.xp/p.xpNeeded*100}%`;
      h['dash-fill'].style.width=`${(1-p.dashRemaining/p.dashCooldown)*100}%`;h['dash-text'].textContent=p.dashRemaining>0?`${p.dashRemaining.toFixed(1)}s`:'READY · SPACE';
      h['wave-status'].textContent=g.state==='shop'?'A MOMENT OF RESPITE':g.state==='paused'?'RITUAL PAUSED':g.boss?.alive?'WARDEN HUNT':g.biome().name.toUpperCase();
      h['biome-name'].textContent=N.COVENS[p.coven].name.toUpperCase();h.performance.textContent=`${Math.round(Math.min(240,g.fps))} FPS · ${g.quality.toUpperCase()}`;
      const belt=Object.entries(N.WEAPONS).map(([id,w])=>`<span class="belt-spell ${p.weapons[id]?'learned':''} ${p.evolved(id)?'evolved':''}" title="${w.name}: ${p.weapons[id]?'rank '+p.weapons[id]:'not learned'}"><i>${w.icon}</i><small>${p.evolved(id)?'✦':p.weapons[id]||'—'}</small></span>`).join('');
      if(h['spell-belt'].innerHTML!==belt)h['spell-belt'].innerHTML=belt;
      const boss=g.boss;h['boss-hud'].hidden=!boss?.alive||['title','chronicle','saves'].includes(g.state);
      if(boss?.alive){h['boss-fill'].style.width=`${Math.max(0,boss.hp/boss.maxHp)*100}%`;h['boss-hp'].textContent=`${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`;h['boss-phase'].textContent=boss.hp<boss.maxHp*.45?'ENRAGED':'HOLLOW WARDEN';}
    }
    banner(title,sub){const el=document.getElementById('wave-banner');el.innerHTML=`<small>${sub}</small>${title}`;el.classList.add('visible');clearTimeout(this.bannerTimer);this.bannerTimer=setTimeout(()=>el.classList.remove('visible'),2400);}
    toast(text){const el=document.getElementById('toast');el.textContent=text;el.classList.add('visible');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>el.classList.remove('visible'),2400);}
    levelUp(){
      this.game.combat.sound('level');
      this.game.combat.effect('rune',this.game.player.x,this.game.player.y-6,0,0,95,'#d2bfeb',.65);
      this.game.state='levelup';this.game.input.clear();this.selected=false;
      const pool=UPGRADES.filter(u=>!u.valid||u.valid(this.game.player));
      if(pool.length<3)pool.push(...[
        {id:'dividend',name:'A hollow dividend',icon:'◈',tag:'GOLD',text:'Gain 14 gold. Your permanent stats are at their limits.',apply:p=>this.game.earnGold(14)},
        {id:'mending',name:'Mending moon',icon:'♡',tag:'RESTORATION',text:'Restore 30 vitality; gain 10 gold if already healthy.',apply:p=>{if(p.hp>=p.maxHp)this.game.earnGold(10);else p.hp=Math.min(p.maxHp,p.hp+30);}},
        {id:'respite',name:'A brief respite',icon:'☽',tag:'RECOVERY',text:'Restore 15 vitality and gain 8 gold.',apply:p=>{p.hp=Math.min(p.maxHp,p.hp+15);this.game.earnGold(8);}}]);
      const spells=N.shuffle(pool.filter(u=>u.weapon)),others=N.shuffle(pool.filter(u=>!u.weapon));
      // Always offer an eligible spell path, alongside two distinct alternatives.
      this.choices=spells.length?N.shuffle([spells[0],...N.shuffle([...spells.slice(1),...others]).slice(0,2)]):others.slice(0,3);
      this.renderLevel();
    }
    renderLevel(){
      const p=this.game.player,cost=5+p.level;
      this.show(`<p class="eyebrow">LEVEL ${p.level} · A SOUL REMEMBERS</p><h2 id="menu-title">Choose your awakening</h2><p class="subtitle">Build a spell. Find its relic. Become something the night fears.</p><div class="cards">${this.choices.map((u,i)=>`<button class="card choice ${u.weapon?'rarity-rare':''}" data-choice="${i}"><span class="card-icon" aria-hidden="true">${u.icon}</span><h3>${u.name}</h3><p>${this.describe(u)}</p><span class="tag">${u.weapon?`RANK ${p.weapons[u.weapon]+1} / 4`:u.tag} · ${i+1}</span></button>`).join('')}</div><div class="shop-actions"><button class="secondary" id="level-reroll" ${p.gold<cost?'disabled':''}>NEW GIFTS · ◈ ${cost}</button><button class="text-button" id="recipe">VIEW GRIMOIRE · I</button></div><p class="hint">${p.pendingLevels>1?`${p.pendingLevels} awakenings waiting · `:''}Choose a card or press 1, 2, or 3. Time is paused.</p>`);
      this.menu.querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>this.chooseLevel(Number(b.dataset.choice))));
      this.on('#level-reroll',()=>{if(p.gold>=cost&&this.game.state==='levelup'){p.gold-=cost;this.levelUp();}});
      this.on('#recipe',()=>this.toggleGrimoire());
    }
    chooseLevel(index){
      if(this.game.state!=='levelup'||this.selected||!this.choices[index])return;
      this.selected=true;const u=this.choices[index],p=this.game.player;u.apply(p);N.balancePlayer(p);p.upgrades.push(u.id);p.pendingLevels--;this.game.combat.sound('choose');
      if(p.pendingLevels>0)this.levelUp();else if(this.afterLevel==='shop')this.openShop();else{this.game.state='playing';this.hide();this.game.checkpoint('wave');}
    }
    eligibleItems(){return ITEMS.filter(u=>!u.valid||u.valid(this.game.player));}
    rollSlot(slot){
      const used=new Set(this.slots.filter(s=>s!==slot&&s.item).map(s=>s.item.id));
      const all=this.eligibleItems(),unique=all.filter(item=>!used.has(item.id));slot.item=N.pick(unique.length?unique:all);
      if(!slot.item){slot.price=0;slot.locked=false;return;}
      slot.price=slot.item.cost+Math.floor((this.game.wave-1)*1.5);slot.locked=false;
    }
    openShop(){
      this.game.state='shop';this.game.input.clear();this.rolls=0;
      for(const slot of this.slots)if(!slot.locked||!slot.item)this.rollSlot(slot);
      this.renderShop();this.game.checkpoint('shop');
    }
    rerollCost(){return 3+this.game.wave+this.rolls*2;}
    reroll(){
      const g=this.game,cost=this.rerollCost();if(g.state!=='shop'||g.player.gold<cost||this.slots.every(s=>s.locked))return;
      g.player.gold-=cost;this.rolls++;for(const slot of this.slots)if(!slot.locked)this.rollSlot(slot);g.combat.sound('reroll');
      this.renderShop('[data-reroll]');g.checkpoint('shop');
    }
    toggleLock(index){const s=this.slots[index];if(this.game.state!=='shop'||!s?.item)return;s.locked=!s.locked;this.game.combat.sound('lock');this.renderShop(`[data-lock="${index}"]`);this.game.checkpoint('shop');}
    buy(index){
      const g=this.game,s=this.slots[index];if(g.state!=='shop'||!s?.item||g.player.gold<s.price)return;
      if(s.item.valid&&!s.item.valid(g.player)){this.toast('This gift has reached its limit. Unlock or reroll its slot.');return;}
      const name=s.item.name;g.player.gold-=s.price;s.item.apply(g.player);N.balancePlayer(g.player);g.player.upgrades.push(s.item.id);s.item=null;s.locked=false;
      g.combat.sound('buy');
      this.renderShop('[data-start]');g.checkpoint('shop');this.toast(`${name} acquired`);
    }
    statStrip(){
      const p=this.game.player;return `<div class="stat-strip"><span>DAMAGE <b>${p.damage.toFixed(1)}</b></span><span>CASTS / SEC <b>${(1/p.attackInterval).toFixed(2)}</b></span><span>ORBS <b>${p.projectileCount}</b></span><span>CRITICAL <b>${Math.round(p.critChance*100)}%</b></span><span>ARMOR <b>${Math.round(p.armor*100)}%</b></span><span>RANGE <b>430</b></span><span>DASH <b>${p.dashCooldown.toFixed(1)}s</b></span></div>`;
    }
    renderShop(focus){
      const g=this.game,p=g.player,summary=g.waveSummary;
      this.show(`<p class="eyebrow">WAVE ${String(g.wave).padStart(2,'0')} COMPLETE</p><h2 id="menu-title">The midnight merchant</h2><p class="subtitle">${summary?`${summary.kills} souls banished · ◈ ${summary.bonus} wave reward${summary.clean?' (includes Flawless +6)':''}`:'A little power. A little longer in the dark.'}</p><div class="shop-top"><span>YOUR GOLD <strong>◈ ${p.gold}</strong></span><span>NEXT WAVE <strong>${g.wave+1}${(g.wave+1)%5===0?' · WARDEN':''}</strong></span></div><div class="cards shop-cards">${this.slots.map((s,i)=>s.item?`<article class="card rarity-${s.item.rarity||'common'} ${s.locked?'locked':''}"><span class="card-icon" aria-hidden="true">${s.item.icon}</span><span class="tag">${s.item.tag}</span><h3>${s.item.name}</h3><p>${this.describe(s.item)}</p><div class="card-actions"><button class="buy" data-buy="${i}" aria-label="Buy ${s.item.name} for ${s.price} gold" ${p.gold<s.price||(s.item.valid&&!s.item.valid(p))?'disabled':''}>◈ ${s.price} · BUY</button><button class="lock" data-lock="${i}" aria-label="${s.locked?'Unlock':'Lock'} ${s.item.name}" aria-pressed="${s.locked}">${s.locked?'LOCKED':'LOCK'}</button></div></article>`:`<article class="card"><span class="card-icon" aria-hidden="true">✓</span><h3>A pact is made</h3><p>This gift is yours.</p><span class="sold">SOLD</span></article>`).join('')}</div>${this.statStrip()}<div class="shop-actions"><button class="secondary" data-reroll ${p.gold<this.rerollCost()||this.slots.every(s=>s.locked)?'disabled':''}>REROLL · ◈ ${this.rerollCost()}</button><button class="secondary" id="inventory">GRIMOIRE · I</button><button class="secondary" id="save-quit">SAVE &amp; TITLE</button><button class="primary" data-start>START WAVE ${g.wave+1} ↗</button></div><p class="hint">Locked gifts keep their item and price through rerolls and later shops.<br>${g.save.available?this.escape(g.save.active.name)+' saved automatically.':'Storage is unavailable. This session is not saved.'} A new wave restores 12% maximum vitality.</p>`,!focus);
      this.menu.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',()=>this.buy(Number(b.dataset.buy))));
      this.menu.querySelectorAll('[data-lock]').forEach(b=>b.addEventListener('click',()=>this.toggleLock(Number(b.dataset.lock))));
      this.on('#save-quit',()=>{g.checkpoint('shop');this.title();});this.on('[data-reroll]',()=>this.reroll());this.on('[data-start]',()=>{if(g.state==='shop')g.startWave();});this.on('#inventory',()=>this.toggleGrimoire());
      if(focus){const b=this.menu.querySelector(focus);if(b&&!b.disabled)b.focus({preventScroll:true});else this.menu.querySelector('[data-start]')?.focus({preventScroll:true});}
    }
    toggleGrimoire(){
      const g=this.game;
      if(g.state==='grimoire'){
        const previous=this.grimoireFrom;
        if(previous==='shop'){g.state='shop';this.renderShop();}else if(previous==='levelup'){g.state='levelup';this.renderLevel();}else if(previous==='paused'){g.state='playing';this.pause();}else{g.state='playing';this.hide();}
        return;
      }
      if(!['playing','paused','shop','levelup'].includes(g.state))return;
      this.grimoireFrom=g.state;g.state='grimoire';g.input.clear();
      const p=g.player;
      this.show(`<p class="eyebrow">${N.COVENS[p.coven].name.toUpperCase()} · LEVEL ${p.level}</p><h2 id="menu-title">The living grimoire</h2>${this.statStrip()}<div class="grimoire-grid">${Object.entries(N.WEAPONS).map(([id,w])=>`<article class="spell-entry ${p.evolved(id)?'awakened':''}"><span class="card-icon" style="color:${w.color}">${w.icon}</span><div><span class="tag">${p.evolved(id)?'EVOLVED':p.weapons[id]?`RANK ${p.weapons[id]} / 4`:'NOT LEARNED'}</span><h3>${p.evolved(id)?w.evolution:w.name}</h3><p>${p.evolved(id)?w.evolved:w.text}</p><div class="recipe"><span class="${p.weapons[id]===4?'met':''}">${w.name} IV</span> + <span class="${p.relics[w.relic]?'met':''}">${RELICS[w.relic].name}</span> → ${w.evolution}</div><small>${Math.round(g.stats.weapons[id]).toLocaleString('en-US')} damage this ritual</small></div></article>`).join('')}</div><div class="owned-relics">${Object.entries(RELICS).map(([id,r])=>`<span class="${p.relics[id]?'owned':''}">${r.icon} ${r.name}${p.relics[id]?' ✓':''}</span>`).join('')}</div><p class="hint">${g.stats.elites} elites · ${g.stats.bosses} Wardens · ${g.stats.dashes} dashes · ◈ ${g.stats.goldEarned} earned<br>Rank IV + the matching relic evolves a spell automatically. Either purchase order works.</p><button class="primary" id="close-grimoire">RETURN · I / ESC</button>`);this.on('#close-grimoire',()=>this.toggleGrimoire());
    }
    togglePause(){if(['saves','chronicle'].includes(this.game.state))this.title();else if(this.game.state==='grimoire')this.toggleGrimoire();else if(this.game.state==='playing')this.pause();else if(this.game.state==='paused')this.resume();}
    pause(){
      const g=this.game;if(g.state!=='playing')return;g.checkpoint('wave');g.state='paused';g.input.clear();
      this.show(`<p class="eyebrow">THE NIGHT HOLDS ITS BREATH</p><h2 id="menu-title">Ritual paused</h2><p class="subtitle">${this.escape(g.save.active.name)} · ${g.save.available?'Your world is saved.':'Storage unavailable; export from the title screen.'}</p><button class="primary" id="resume">RESUME RITUAL</button><div class="rule"></div><div class="shop-actions"><button class="secondary" id="sound">SOUND: ${g.combat.soundEnabled?'ON':'OFF'}</button><button class="secondary" id="effects">REDUCED MOTION: ${g.reducedMotion?'ON':'OFF'}</button><button class="secondary" id="quality">QUALITY: ${g.quality.toUpperCase()}</button><button class="secondary" id="inventory">GRIMOIRE · I</button></div>${this.audioControls()}<div class="zoom-settings"><label for="camera-zoom">CAMERA ZOOM <strong>${Math.round(g.userZoom*100)}%</strong></label><input id="camera-zoom" type="range" min="65" max="155" value="${Math.round(g.userZoom*100)}"><small>Scroll / + / − to zoom · 0 to reset. Spell ranges stay fixed.</small></div><p class="hint">WASD / arrows / touch stick: move · SPACE / SHIFT: dash<br>I: grimoire · ESC / P: resume · Focus loss pauses the game<br>Curses appear from wave 3: leave the marked circle before it ignites.<br>Damage caps at 95 · Cast interval 0.24s · Armor / crit 45% · Regen 1.2/s</p><button class="text-button" id="title">SAVE &amp; RETURN TO TITLE</button>`);
      this.on('#resume',()=>this.resume());this.on('#inventory',()=>this.toggleGrimoire());this.on('#title',()=>this.title());
      this.on('#sound',()=>{g.combat.soundEnabled=!g.combat.soundEnabled;if(g.combat.soundEnabled)g.combat.enableAudio();g.saveSettings();this.pauseRefresh();});
      this.on('#effects',()=>{g.reducedMotion=!g.reducedMotion;g.saveSettings();this.pauseRefresh();});
      this.on('#quality',()=>{g.quality=g.quality==='high'?'low':'high';g.resize();g.saveSettings();this.pauseRefresh();});
      this.menu.querySelector('#camera-zoom')?.addEventListener('input',e=>{g.setZoom(Number(e.currentTarget.value)/100);this.menu.querySelector('.zoom-settings strong').textContent=`${Math.round(g.userZoom*100)}%`;});
      this.bindAudioControls();
    }
    pauseRefresh(){this.game.state='playing';this.pause();}
    resume(){if(this.game.state!=='paused')return;this.game.state='playing';this.game.input.clear();this.hide();}
    gameOver(){
      this.game.combat.audioEngine.stopVoices();this.game.combat.sound('gameover');
      const g=this.game,p=g.player,total=Math.max(1,g.stats.damage);
      this.show(`<span class="moon" aria-hidden="true">☾</span><p class="eyebrow">THE HOLLOW CLAIMS ANOTHER</p><h2 id="menu-title">Even stars turn to ash.</h2><p class="subtitle">${N.COVENS[p.coven].name} · The ritual ends. The chronicle remains.</p><div class="stat-strip"><span>WAVE <b>${g.wave}</b></span><span>LEVEL <b>${p.level}</b></span><span>SOULS <b>${p.kills}</b></span><span>SURVIVED <b>${Math.floor(g.time/60)}m ${Math.floor(g.time%60)}s</b></span><span>WARDENS <b>${g.stats.bosses}</b></span></div><div class="damage-report">${Object.entries(N.WEAPONS).filter(([id])=>p.weapons[id]).map(([id,w])=>`<div><span>${w.icon} ${p.evolved(id)?w.evolution:w.name}</span><b>${Math.round(g.stats.weapons[id]).toLocaleString('en-US')}</b><i style="width:${g.stats.weapons[id]/total*100}%;background:${w.color}"></i></div>`).join('')}</div><p class="hint">${Math.round(g.stats.damage).toLocaleString('en-US')} damage dealt · ${Math.round(g.stats.damageTaken)} vitality lost · ◈ ${g.stats.goldEarned} earned</p><div class="shop-actions"><button class="primary" id="retry">TRY THIS WITCH AGAIN ↗</button><button class="secondary" id="coven">CHOOSE ANOTHER COVEN</button></div>`);
      this.on('#retry',()=>{g.selectedCoven=p.coven;g.newRitual();});this.on('#coven',()=>this.title());
    }
  }
  N.UI=UI;N.UPGRADES=UPGRADES;N.ITEMS=ITEMS;N.RELICS=RELICS;N.ACHIEVEMENTS=ACHIEVEMENTS;
})();
