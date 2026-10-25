/* Whitelisted simulation snapshots. Transient cosmetic pools are intentionally rebuilt. */
(() => {
  'use strict';
  const N=window.Nocturne;
  const ENEMY_FIELDS=['x','y','id','maxHp','hp','speed','damage','radius','scale','xp','gold','flash','knockX','knockY','phase','gait','hitSquash','castTimer','slow','frozen','burn','burnTick','burnDamage','attackTimer','windup','charge','chargeX','chargeY','attackCount','spawnDelay'];
  const EXTRA_ENEMY_FIELDS=['level','exposed','lastHit'];
  const PLAYER_TRANSIENT=['invulnerable','walk','dashRemaining','dashTimer','dashX','dashY','lastX','lastY'];
  const SHOT_FIELDS=['x','y','vx','vy','damage','life','radius'];
  const HAZARD_FIELDS=['x','y','radius','delay','damage','duration','age'];
  const take=(object,keys)=>Object.fromEntries(keys.map(k=>[k,object[k]??0]));
  const finite=(object,keys)=>object&&keys.every(k=>Number.isFinite(object[k]));
  N.captureWorld=g=>({
    schema:1,sanctum:g.sanctum?{...g.sanctum}:null,worldOrigin:{...g.worldOrigin},waveTime:g.waveTime,spawnClock:g.spawnClock,threatClock:g.threatClock,autosaveClock:0,nextId:g.nextId,
    overlordSpawned:!!g.overlordSpawned,bossSpawned:g.bossSpawned,bossDefeated:g.bossDefeated,waveKills:g.waveKills,waveDamage:g.waveDamage,
    player:take(g.player,PLAYER_TRANSIENT),facing:g.player.facing,
    enemies:g.enemies.filter(e=>e.alive).map(e=>({...take(e,[...ENEMY_FIELDS,...EXTRA_ENEMY_FIELDS]),type:e.type,elite:e.elite,tier:e.tier,trait:e.trait,burnSource:e.burnSource,facing:e.facing,summonTimer:e.summonTimer,guardian:e.guardian?{...e.guardian}:undefined,tactics:e.tactics?{...e.tactics}:undefined,summonedBy:e.summonedBy,summonDepth:e.summonDepth})),
    loot:g.loot.filter(e=>e.alive).map(e=>({...take(e,['x','y','value','age','phase']),type:e.type,magnet:e.magnet})),
    projectiles:g.combat.projectiles.active.map(b=>({...take(b,SHOT_FIELDS),crit:b.crit,pierce:b.pierce,evolved:b.evolved,source:b.source,color:b.color,blast:b.blast,freeze:b.freeze,expose:b.expose,hitIds:[...b.hitIds]})),
    hostile:g.combat.hostile.active.map(b=>take(b,SHOT_FIELDS)),hazards:g.combat.hazards.active.map(h=>({...take(h,HAZARD_FIELDS),kind:h.kind||'circle',...take(h,['inner','angle','gap','silence'])})),
    areas:g.combat.areas.active.map(a=>({...a})),cooldown:g.combat.cooldown,spellTimers:{...g.combat.spellTimers},wispHits:[...g.combat.wispHits]
  });
  N.validWorld=w=>{
    if(w?.schema!==1||!finite(w,['waveTime','spawnClock','threatClock','nextId','waveKills','waveDamage','cooldown'])||w.waveTime<0||!Number.isInteger(w.nextId)||w.nextId<0)return false;
    if(typeof w.bossSpawned!=='boolean'||typeof w.bossDefeated!=='boolean'||!finite(w.player,PLAYER_TRANSIENT)||!['N','NE','E','SE','S','SW','W','NW'].includes(w.facing))return false;
    if(w.player.invulnerable<0||w.player.invulnerable>2||w.player.dashTimer<0||w.player.dashTimer>.25||w.player.dashRemaining<0||['lastX','lastY','dashX','dashY'].some(k=>Math.abs(w.player[k])>1.001))return false;
    if(w.sanctum!==undefined&&w.sanctum!==null){
      const s=w.sanctum;if(!finite(s,['x','y','radius'])||s.radius<330||s.radius>1700||!['waiting','fighting','cleared'].includes(s.phase))return false;
      if(s.phase==='waiting'?s.bossId!==null:!Number.isSafeInteger(s.bossId)||s.bossId<=0)return false;
      if(s.phase==='fighting'&&(!Array.isArray(w.enemies)||!w.enemies.some(e=>e?.id===s.bossId&&['warden','overlord'].includes(e.type))))return false;
      if(s.phase==='cleared'&&!w.bossDefeated)return false;
    }
    if(w.worldOrigin!==undefined&&!finite(w.worldOrigin,['x','y']))return false;
    if(!finite(w.spellTimers,['lightning','nova']))return false;
    if(!Array.isArray(w.enemies)||w.enemies.length>320||!w.enemies.every(e=>finite(e,ENEMY_FIELDS)&&['slime','skeleton','gargoyle','hound','cultist','warden','wraith','reaper','overlord'].includes(e.type)&&typeof e.elite==='boolean'&&e.hp>0&&e.hp<=e.maxHp&&e.radius>0&&e.damage>=0&&e.speed>=0&&Number.isSafeInteger(e.id)&&e.id>0&&e.id<=w.nextId))return false;
    if(w.enemies.some(e=>e.level!==undefined&&(!Number.isSafeInteger(e.level)||e.level<1||!['fodder','regular','veteran','warden','overlord','minion'].includes(e.tier)||!Object.hasOwn(N.ENEMY_TRAITS,e.trait)||!finite(e,EXTRA_ENEMY_FIELDS)||!N.SPELL_IDS.includes(e.burnSource))))return false;
    if(w.enemies.some(e=>e.guardian!==undefined&&!N.FinalGuardian.valid(e.guardian,e)))return false;
    if(w.enemies.some(e=>e.tactics!==undefined&&!N.Warfare.validTactics(e.tactics)||e.summonedBy!==undefined&&(!Number.isSafeInteger(e.summonedBy)||e.summonedBy<=0||e.summonedBy>w.nextId||![1,2].includes(e.summonDepth))))return false;
    if(w.enemies.filter(e=>e.guardian).length>1||w.enemies.some(e=>e.guardian&&w.sanctum?.bossId!==e.id))return false;
    if(w.areas!==undefined&&(!Array.isArray(w.areas)||w.areas.length>4096||!w.areas.every(a=>['meteor','thorn','rift','veil'].includes(a.kind)&&finite(a,['x','y','radius','delay','duration','damage','rank','weight','age','tick','pulses'])&&a.radius>0&&a.duration>0&&a.delay>=0&&a.damage>=0&&Number.isSafeInteger(a.rank)&&a.rank>=1&&a.weight>0&&a.age>=0&&typeof a.evolved==='boolean')))return false;
    if(['meteor','lance','thorn','rift','rapid','cannon','burst','glacier'].some(id=>w.spellTimers[id]!==undefined&&!Number.isFinite(w.spellTimers[id])))return false;
    if(w.overlordSpawned!==undefined&&typeof w.overlordSpawned!=='boolean')return false;
    if(w.enemies.some(e=>e.facing!==undefined&&!['N','NE','E','SE','S','SW','W','NW'].includes(e.facing)||e.summonTimer!==undefined&&!Number.isFinite(e.summonTimer)))return false;
    if(Array.isArray(w.projectiles)&&w.projectiles.some(b=>b.source!==undefined&&![...N.SPELL_IDS,...Object.keys(N.SPECIALS)].includes(b.source)||b.color!==undefined&&!/^#[0-9a-fA-F]{6}$/.test(b.color)||['blast','freeze','expose'].some(k=>b[k]!==undefined&&(!Number.isFinite(b[k])||b[k]<0))))return false;
    if(new Set(w.enemies.map(e=>e.id)).size!==w.enemies.length||w.enemies.filter(e=>(e.type==='warden'||e.type==='overlord')&&!e.summonedBy).length>1||w.enemies.filter(e=>e.summonedBy).length>18||w.enemies.filter(e=>e.type==='overlord'&&e.summonedBy).length>2||w.enemies.some(e=>e.summonedBy&&(e.type==='warden'||(e.type==='overlord'?e.summonDepth!==1:e.summonDepth!==2))))return false;
    if(!Array.isArray(w.loot)||w.loot.length>4096||!w.loot.every(e=>finite(e,['x','y','value','age','phase'])&&['xp','gold','heal','jewel'].includes(e.type)&&e.value>0&&Number.isInteger(e.value)&&typeof e.magnet==='boolean'))return false;
    if(!Array.isArray(w.projectiles)||w.projectiles.length>240||!w.projectiles.every(b=>finite(b,SHOT_FIELDS)&&b.life>0&&b.radius>0&&b.radius<50&&b.damage>=0&&typeof b.crit==='boolean'&&typeof b.evolved==='boolean'&&Number.isInteger(b.pierce)&&b.pierce>=0&&Array.isArray(b.hitIds)&&b.hitIds.every(Number.isSafeInteger)))return false;
    if(!Array.isArray(w.hostile)||w.hostile.length>180||!w.hostile.every(b=>finite(b,SHOT_FIELDS)&&b.life>0&&b.damage>=0&&b.radius>0&&b.radius<50))return false;
    if(!Array.isArray(w.hazards)||w.hazards.length>24||!w.hazards.every(h=>finite(h,HAZARD_FIELDS)&&h.radius>0&&h.delay>=0&&h.duration>0&&h.age>=0&&h.damage>=0))return false;
    if(w.hazards.some(h=>h.kind!==undefined&&(!['circle','ring','seal'].includes(h.kind)||!finite(h,['inner','angle','gap','silence'])||h.inner<0||h.inner>=h.radius||h.gap<0||h.gap>Math.PI*2||h.silence<0||h.silence>1.25)))return false;
    return Array.isArray(w.wispHits)&&w.wispHits.length<=1000&&w.wispHits.every(pair=>Array.isArray(pair)&&pair.length===2&&pair.every(Number.isFinite));
  };
  N.restoreWorld=(g,w)=>{
    for(const k of ['waveTime','spawnClock','threatClock','nextId','bossSpawned','bossDefeated','waveKills','waveDamage'])g[k]=w[k];
    g.sanctum=w.sanctum?{...w.sanctum}:null;
    g.overlordSpawned=w.overlordSpawned??false;g.worldOrigin=w.worldOrigin?{...w.worldOrigin}:{x:0,y:0};
    g.autosaveClock=0;Object.assign(g.player,w.player);g.player.facing=w.facing;
    g.enemies=w.enemies.map(data=>{const e=new N.Enemy(g,data.type,data.x,data.y,data.id,data.elite);Object.assign(e,data);return e;});
    g.boss=g.enemies.find(e=>e.id===g.sanctum?.bossId)||g.enemies.find(e=>e.boss&&!e.summonedBy)||null;
    if(g.sanctum?.phase==='fighting'&&g.boss?.id===g.sanctum.bossId)N.FinalGuardian.promote(g,g.boss,true);
    g.loot=w.loot.map(data=>Object.assign(new N.Loot(g,data.type,data.x,data.y,data.value),data));
    for(const data of w.projectiles){const b=g.combat.projectiles.acquire();b.reset(data.x,data.y,data.vx,data.vy,data.damage,data.crit,data.pierce,data.evolved);b.life=data.life;b.radius=data.radius;for(const k of ['source','color','blast','freeze','expose'])if(data[k]!==undefined)b[k]=data[k];for(const id of data.hitIds)b.hitIds.add(id);}
    for(const [name,entries] of [['hostile',w.hostile],['hazards',w.hazards]])for(const data of entries)Object.assign(g.combat[name].acquire(),name==='hazards'?{kind:'circle',inner:0,angle:0,gap:0,silence:0}:{},data);
    for(const area of w.areas||[])Object.assign(g.combat.areas.acquire(),area);
    g.combat.cooldown=w.cooldown;Object.assign(g.combat.spellTimers,w.spellTimers);g.combat.wispHits=new Map(w.wispHits);
    g.hash.clear();for(const e of g.enemies)if(e.spawnDelay<=0)g.hash.insert(e);
  };
})();
