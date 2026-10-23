/* Whitelisted simulation snapshots. Transient cosmetic pools are intentionally rebuilt. */
(() => {
  'use strict';
  const N=window.Nocturne;
  const ENEMY_FIELDS=['x','y','id','maxHp','hp','speed','damage','radius','scale','xp','gold','flash','knockX','knockY','phase','gait','hitSquash','castTimer','slow','frozen','burn','burnTick','burnDamage','attackTimer','windup','charge','chargeX','chargeY','attackCount','spawnDelay'];
  const PLAYER_TRANSIENT=['invulnerable','walk','dashRemaining','dashTimer','dashX','dashY','lastX','lastY'];
  const SHOT_FIELDS=['x','y','vx','vy','damage','life','radius'];
  const HAZARD_FIELDS=['x','y','radius','delay','damage','duration','age'];
  const take=(object,keys)=>Object.fromEntries(keys.map(k=>[k,object[k]??0]));
  const finite=(object,keys)=>object&&keys.every(k=>Number.isFinite(object[k])&&Math.abs(object[k])<=1e9);
  N.captureWorld=g=>({
    schema:1,waveTime:g.waveTime,spawnClock:g.spawnClock,threatClock:g.threatClock,autosaveClock:0,nextId:g.nextId,
    bossSpawned:g.bossSpawned,bossDefeated:g.bossDefeated,waveKills:g.waveKills,waveDamage:g.waveDamage,
    player:take(g.player,PLAYER_TRANSIENT),facing:g.player.facing,
    enemies:g.enemies.filter(e=>e.alive).map(e=>({...take(e,ENEMY_FIELDS),type:e.type,elite:e.elite})),
    loot:g.loot.filter(e=>e.alive).map(e=>({...take(e,['x','y','value','age','phase']),type:e.type,magnet:e.magnet})),
    projectiles:g.combat.projectiles.active.map(b=>({...take(b,SHOT_FIELDS),crit:b.crit,pierce:b.pierce,evolved:b.evolved,hitIds:[...b.hitIds]})),
    hostile:g.combat.hostile.active.map(b=>take(b,SHOT_FIELDS)),hazards:g.combat.hazards.active.map(h=>take(h,HAZARD_FIELDS)),
    cooldown:g.combat.cooldown,spellTimers:{...g.combat.spellTimers},wispHits:[...g.combat.wispHits]
  });
  N.validWorld=w=>{
    if(w?.schema!==1||!finite(w,['waveTime','spawnClock','threatClock','nextId','waveKills','waveDamage','cooldown'])||w.waveTime<0||w.waveTime>1e7||!Number.isInteger(w.nextId)||w.nextId<0)return false;
    if(typeof w.bossSpawned!=='boolean'||typeof w.bossDefeated!=='boolean'||!finite(w.player,PLAYER_TRANSIENT)||!['N','NE','E','SE','S','SW','W','NW'].includes(w.facing))return false;
    if(w.player.invulnerable<0||w.player.invulnerable>2||w.player.dashTimer<0||w.player.dashTimer>.25||w.player.dashRemaining<0||w.player.dashRemaining>10||['lastX','lastY','dashX','dashY'].some(k=>Math.abs(w.player[k])>1.001))return false;
    if(!finite(w.spellTimers,['lightning','nova']))return false;
    if(!Array.isArray(w.enemies)||w.enemies.length>320||!w.enemies.every(e=>finite(e,ENEMY_FIELDS)&&['slime','skeleton','gargoyle','hound','cultist','warden'].includes(e.type)&&typeof e.elite==='boolean'&&e.hp>0&&e.hp<=e.maxHp&&e.radius>0&&e.radius<=65&&e.damage>=0&&e.speed>=0&&Number.isSafeInteger(e.id)&&e.id>0&&e.id<=w.nextId))return false;
    if(new Set(w.enemies.map(e=>e.id)).size!==w.enemies.length||w.enemies.filter(e=>e.type==='warden').length>1)return false;
    if(!Array.isArray(w.loot)||w.loot.length>4096||!w.loot.every(e=>finite(e,['x','y','value','age','phase'])&&['xp','gold','heal'].includes(e.type)&&e.value>0&&Number.isInteger(e.value)&&typeof e.magnet==='boolean'))return false;
    if(!Array.isArray(w.projectiles)||w.projectiles.length>240||!w.projectiles.every(b=>finite(b,SHOT_FIELDS)&&Math.abs(b.vx)<=5000&&Math.abs(b.vy)<=5000&&b.life>0&&b.life<=10&&b.radius>0&&b.radius<50&&b.damage>=0&&typeof b.crit==='boolean'&&typeof b.evolved==='boolean'&&Number.isInteger(b.pierce)&&b.pierce>=0&&b.pierce<=3&&Array.isArray(b.hitIds)&&b.hitIds.length<=4&&b.hitIds.every(Number.isSafeInteger)))return false;
    if(!Array.isArray(w.hostile)||w.hostile.length>180||!w.hostile.every(b=>finite(b,SHOT_FIELDS)&&Math.abs(b.vx)<=5000&&Math.abs(b.vy)<=5000&&b.life>0&&b.life<=10&&b.damage>=0&&b.radius>0&&b.radius<50))return false;
    if(!Array.isArray(w.hazards)||w.hazards.length>24||!w.hazards.every(h=>finite(h,HAZARD_FIELDS)&&h.radius>0&&h.radius<500&&h.delay>=0&&h.duration>0&&h.age>=0&&h.damage>=0))return false;
    return Array.isArray(w.wispHits)&&w.wispHits.length<=1000&&w.wispHits.every(pair=>Array.isArray(pair)&&pair.length===2&&pair.every(Number.isFinite));
  };
  N.restoreWorld=(g,w)=>{
    for(const k of ['waveTime','spawnClock','threatClock','nextId','bossSpawned','bossDefeated','waveKills','waveDamage'])g[k]=w[k];
    g.autosaveClock=0;Object.assign(g.player,w.player);g.player.facing=w.facing;
    g.enemies=w.enemies.map(data=>{const e=new N.Enemy(g,data.type,data.x,data.y,data.id,data.elite);Object.assign(e,data);return e;});
    g.boss=g.enemies.find(e=>e.boss)||null;
    g.loot=w.loot.map(data=>Object.assign(new N.Loot(g,data.type,data.x,data.y,data.value),data));
    for(const data of w.projectiles){const b=g.combat.projectiles.acquire();b.reset(data.x,data.y,data.vx,data.vy,data.damage,data.crit,data.pierce,data.evolved);b.life=data.life;b.radius=data.radius;for(const id of data.hitIds)b.hitIds.add(id);}
    for(const [name,entries] of [['hostile',w.hostile],['hazards',w.hazards]])for(const data of entries)Object.assign(g.combat[name].acquire(),data);
    g.combat.cooldown=w.cooldown;Object.assign(g.combat.spellTimers,w.spellTimers);g.combat.wispHits=new Map(w.wispHits);
    g.hash.clear();for(const e of g.enemies)if(e.spawnDelay<=0)g.hash.insert(e);
  };
})();
