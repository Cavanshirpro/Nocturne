// Deterministic logic/integration tests. No browser or npm packages required.
// Run with Node.js 18+: node tests.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const elements=new Map();
function element(){return {hidden:false,style:{},dataset:{},innerHTML:'',textContent:'',classList:{add(){},remove(){}},addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},focus(){},contains(){return false;},getBoundingClientRect(){return {left:0,top:0,width:106,height:106};}};}
const gradient={addColorStop(){}};
const context=new Proxy({createPattern:()=>({}),createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>{o[k]=v;return true;}});
let seed=271828;
const seededMath=Object.create(Math);
seededMath.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const memory=new Map();
const sandbox={console,Math:seededMath,Float32Array,localStorage:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},document:{hidden:false,addEventListener(){},getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}},innerWidth:1280,innerHeight:800,devicePixelRatio:1,addEventListener(){},matchMedia:()=>({matches:false})};
sandbox.window=sandbox;
vm.createContext(sandbox);
for(const name of ['assets.js','game.js','systems/balance.js','systems/animation.js','systems/snapshots.js','systems/storage.js','systems/audio.js','entities.js','combat.js','ui.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),sandbox,{filename:name});
const N=sandbox.Nocturne;
const images=Object.fromEntries(Object.keys(sandbox.NOCTURNE_ASSETS).map(k=>[k,{}]));
const create=()=>new N.Game({getContext:()=>context},images);
let passed=0;
function test(name,fn){memory.clear();seed=271828;fn();passed++;console.log(`PASS ${name}`);}

test('all 33 procedural PNG assets are real, encoded images',()=>{
  assert.equal(Object.keys(sandbox.NOCTURNE_ASSETS).length,33);
  for(const src of Object.values(sandbox.NOCTURNE_ASSETS))assert.equal(Buffer.from(src.split(',')[1],'base64').subarray(1,4).toString(),'PNG');
  assert.equal(new Set(Object.entries(sandbox.NOCTURNE_ASSETS).filter(([k])=>k.startsWith('witch_')&&!k.startsWith('witch_atlas_')).map(([,v])=>v)).size,8);
});
test('normalized diagonal movement and all eight facings',()=>{
  const g=create(),p=g.player;
  for(const [x,y,direction] of [[1,0,'E'],[1,1,'SE'],[0,1,'S'],[-1,1,'SW'],[-1,0,'W'],[-1,-1,'NW'],[0,-1,'N'],[1,-1,'NE']]){
    g.input.clear();if(x)g.input.keys.add(x>0?'KeyD':'KeyA');if(y)g.input.keys.add(y>0?'KeyS':'KeyW');
    p.x=p.y=0;p.update(1);
    assert.equal(p.facing,direction);assert.ok(Math.abs(Math.hypot(p.x,p.y)-p.speed)<1e-6);
  }
});
test('spatial hash handles negative coordinates and excludes dead enemies',()=>{
  const hash=new N.SpatialHash(96),out=[];
  const a={x:-97,y:-2,alive:true},b={x:1,y:1,alive:false};hash.insert(a);hash.insert(b);
  hash.query(-110,-15,-90,10,out);assert.equal(out[0],a);
  hash.query(0,0,10,10,out);assert.equal(out.length,0);hash.clear();assert.equal(hash.cells.size,0);
});
test('swept segment collision catches fast projectiles and handles zero length',()=>{
  assert.equal(N.segmentDistance2(0,0,1000,0,500,3),9);
  assert.equal(N.segmentDistance2(0,0,0,0,3,4),25);
  const g=create();g.reset();g.enemies=[];g.player.critChance=0;
  const e=new N.Enemy(g,'slime',100,12,1);g.enemies.push(e);g.hash.insert(e);
  const bullet=g.combat.projectiles.acquire();bullet.reset(0,0,20000,0,100,false);g.combat.cooldown=10;
  g.combat.update(1/60);assert.equal(e.alive,false);assert.equal(g.player.kills,1);assert.equal(g.combat.projectiles.active.length,0);
  assert.ok(g.loot.length>=2);assert.equal(g.loot[0].type,'xp');assert.equal(g.loot[1].type,'gold');
});
test('auto aim chooses closest living enemy',()=>{
  const g=create();g.enemies=[{x:8,y:0,alive:true},{x:2,y:0,alive:false},{x:3,y:4,alive:true}];
  assert.equal(g.combat.nearest(),g.enemies[2]);
});
test('finite pools recycle without overwriting live objects',()=>{
  const p=new N.Pool(()=>({}),2),a=p.acquire(),b=p.acquire();assert.equal(p.acquire(),null);
  p.release(0);assert.equal(p.active[0],b);assert.equal(p.acquire(),a);p.clear();assert.equal(p.active.length,0);assert.equal(p.free.length,2);
});
test('particle burst expires in 300ms and projectile trails retain 5 positions',()=>{
  const g=create();g.combat.cooldown=10;g.combat.burst(0,0,10,'white');
  const b=g.combat.projectiles.acquire();b.reset(0,0,100,0,1,false);
  for(let i=0;i<20;i++)g.combat.update(1/60);
  assert.equal(g.combat.particles.active.length,0);assert.equal(b.trailCount,5);assert.ok(b.trailX[0]>b.trailX[4]);
});
test('spawn approach radius is fixed in world units and visible arrivals are telegraphed',()=>{
  const g=create();g.reset();g.player.x=1100;g.player.y=-440;g.camera={x:1100,y:-440};
  for(const zoom of [.65,1,1.55]){
    g.setZoom(zoom);g.zoomFactor=zoom;g.applyZoom();
    for(let i=0;i<70;i++){
      g.spawn();const e=g.enemies.at(-1),distance=Math.sqrt(N.dist2(e,g.player));
      assert.ok(distance>=660-1e-8&&distance<=760+1e-8);if(g.visible(e.x,e.y,60))assert.ok(e.spawnDelay>0);
    }
  }
});
test('level up pauses time, offers 3 distinct gifts and applies one',()=>{
  const g=create();g.reset();g.addXP(8);g.ui.afterLevel='playing';g.ui.levelUp();
  assert.equal(g.player.level,2);assert.equal(g.state,'levelup');assert.equal(new Set(g.ui.choices.map(x=>x.id)).size,3);
  const t=g.waveTime;g.update(1);assert.equal(g.waveTime,t);
  g.ui.chooseLevel(0);assert.equal(g.state,'playing');assert.equal(g.player.pendingLevels,0);assert.equal(g.player.upgrades.length,1);
  g.ui.chooseLevel(0);assert.equal(g.player.upgrades.length,1);
});
test('large XP awards queue every level without dropping overflow',()=>{
  const g=create();g.reset();g.addXP(100);const count=g.player.pendingLevels;
  assert.ok(count>3);assert.ok(g.player.xp<g.player.xpNeeded);g.ui.levelUp();
  for(let i=0;i<count;i++)g.ui.chooseLevel(0);
  assert.equal(g.player.pendingLevels,0);assert.equal(g.player.upgrades.length,count);assert.equal(g.state,'playing');
});
test('locked shop slot and price survive reroll and next wave shop',()=>{
  const g=create();g.reset();g.player.gold=500;g.ui.openShop();g.ui.toggleLock(0);
  const slot=g.ui.slots[0],item=slot.item,price=slot.price,cost=g.ui.rerollCost();
  g.ui.reroll();assert.equal(slot.item,item);assert.equal(slot.price,price);assert.equal(g.player.gold,500-cost);
  g.startWave();g.ui.openShop();assert.equal(slot.item,item);assert.equal(slot.price,price);assert.equal(slot.locked,true);assert.equal(g.ui.rolls,0);
});
test('all locked slots prevent paid rerolls; unaffordable purchase is inert',()=>{
  const g=create();g.reset();g.ui.openShop();g.player.gold=100;
  for(let i=0;i<4;i++)g.ui.toggleLock(i);
  g.ui.reroll();assert.equal(g.player.gold,100);assert.equal(g.ui.rolls,0);
  g.player.gold=0;const item=g.ui.slots[0].item;g.ui.buy(0);assert.equal(g.ui.slots[0].item,item);
});
test('buy deducts exact price, clears lock and prevents duplicate purchase',()=>{
  const g=create();g.reset();g.ui.openShop();g.player.gold=1000;g.ui.toggleLock(0);
  const price=g.ui.slots[0].price;g.ui.buy(0);
  assert.equal(g.player.gold,1000-price);assert.equal(g.ui.slots[0].item,null);assert.equal(g.ui.slots[0].locked,false);
  g.ui.buy(0);assert.equal(g.player.gold,1000-price);
});
test('wave transition banks drops and finishes queued levels before shopping',()=>{
  const g=create();g.reset();g.loot.push(new N.Loot(g,'xp',1000,1000,24),new N.Loot(g,'gold',1000,1000,7));
  g.finishWave();assert.equal(g.state,'levelup');assert.equal(g.enemies.length,0);assert.equal(g.loot.length,0);assert.equal(g.player.gold,24);
  while(g.player.pendingLevels)g.ui.chooseLevel(0);
  assert.equal(g.state,'shop');
});
test('invulnerability blocks repeat damage and death ends the simulation',()=>{
  const g=create();g.reset();g.player.invulnerable=0;g.player.hurt(10);g.player.hurt(10);assert.equal(g.player.hp,100);
  g.player.invulnerable=0;g.player.hurt(1000);assert.equal(g.state,'dead');const t=g.time;g.update(1);assert.equal(g.time,t);
});
test('pause/resume freezes world, clears keys, and never closes level/shop menus',()=>{
  const g=create();g.reset();g.input.keys.add('KeyW');g.ui.pause();const t=g.time;g.update(10);
  assert.equal(g.time,t);assert.equal(g.input.keys.size,0);g.ui.resume();assert.equal(g.state,'playing');
  g.ui.openShop();g.ui.togglePause();assert.equal(g.state,'shop');
});
test('restart clears progression, retained shop items and effects',()=>{
  const g=create();g.reset();g.player.gold=300;g.player.damage=90;g.ui.openShop();g.ui.toggleLock(0);g.combat.burst(0,0,5,'white');
  g.reset();assert.equal(g.wave,1);assert.equal(g.player.damage,18);assert.equal(g.player.gold,0);assert.equal(g.combat.particles.active.length,0);assert.ok(g.ui.slots.every(s=>!s.locked));
});
test('five-wave fixed-step integration stays finite, defeats Warden and respects caps',()=>{
  const g=create();g.reset();g.player.maxHp=g.player.hp=100000;
  g.player.weapons={bolt:4,orbit:4,lightning:4,nova:4};g.player.relics={mirror:true,cinder:true,conductor:true,permafrost:true};g.player.damage=55;
  let steps=0,shops=0;
  while(shops<5 && steps<20000){
    if(g.state==='levelup'){g.ui.chooseLevel(0);continue;}
    if(g.state==='shop'){
      shops++;if(shops===5)break;
      if(g.player.gold>=g.ui.slots[0].price)g.ui.buy(0);g.startWave();continue;
    }
    if(g.boss?.alive){
      const dx=g.boss.x-g.player.x,dy=g.boss.y-g.player.y,d=Math.hypot(dx,dy)||1,inward=N.clamp((d-300)/70,-1,1);
      g.input.x=dx/d*inward-dy/d*.65;g.input.y=dy/d*inward+dx/d*.65;
    }else{const theta=g.time*.13;g.input.x=Math.cos(theta);g.input.y=Math.sin(theta);}
    g.update(1/60);steps++;
    if(steps%90===0)g.draw();
    assert.equal(g.state==='dead',false);assert.ok(Number.isFinite(g.player.x));assert.ok(g.enemies.length<=320);
    assert.ok(g.combat.particles.active.length<=650);assert.ok(g.combat.projectiles.active.length<=240);
  }
  assert.equal(shops,5);assert.ok(g.player.kills>20);assert.ok(g.player.level>2);
  assert.equal(g.stats.bosses,1);assert.equal(g.bossDefeated,true);
  console.log(`  ${steps} fixed updates; ${g.player.kills} kills; level ${g.player.level}`);
});


test('three covens start with distinct, explicit stats and spells',()=>{
  const g=create();g.reset('ash');assert.equal(g.player.hp,110);assert.equal(g.player.damage,18);
  g.reset('moon');assert.equal(g.player.hp,90);assert.equal(g.player.weapons.orbit,1);
  g.reset('storm');assert.equal(g.player.hp,85);assert.equal(g.player.weapons.lightning,1);assert.equal(g.player.weapons.bolt,1);
});
test('dash is directional, grants invulnerability and respects cooldown and pause',()=>{
  const g=create();g.reset();g.player.invulnerable=0;g.input.keys.add('KeyD');
  assert.equal(g.player.dash(),true);assert.equal(g.player.dash(),false);
  const hp=g.player.hp;g.player.hurt(50);assert.equal(g.player.hp,hp);
  g.player.update(.1);assert.ok(g.player.x>g.player.speed*.3);assert.ok(Math.abs(g.player.y)<1e-6);
  g.input.clear();g.player.dashRemaining=0;g.player.dashTimer=0;g.ui.pause();assert.equal(g.player.dash(),false);
  g.ui.resume();assert.equal(g.player.dash(),true);assert.equal(g.player.dashX,1);
});
test('all four spell evolutions require both rank IV and their own relic, in either order',()=>{
  for(const [id,w] of Object.entries(N.WEAPONS))for(const first of ['rank','relic']){
    const g=create();g.reset();const p=g.player;
    if(first==='rank'){p.weapons[id]=4;assert.equal(p.evolved(id),false);p.relics[w.relic]=true;}
    else{p.relics[w.relic]=true;p.weapons[id]=3;assert.equal(p.evolved(id),false);p.upgradeWeapon(id);}
    p.checkEvolutions();assert.equal(p.evolved(id),true);assert.ok(g.save.data.profile.achievements.includes('evolution'));
    assert.equal(p.upgradeWeapon(id),false);assert.equal(p.weapons[id],4);
  }
});
test('lightning chains to distinct living enemies and reports only actual damage',()=>{
  const g=create();g.reset();g.player.weapons.lightning=1;g.player.critChance=0;
  g.enemies=[70,160,260,780].map((x,i)=>new N.Enemy(g,'slime',x,0,i+1));
  g.combat.lightning();assert.equal(g.combat.effects.active.length,3);
  assert.ok(g.enemies.slice(0,3).every(e=>e.hp<e.maxHp));assert.equal(g.enemies[3].hp,g.enemies[3].maxHp);
  assert.ok(g.stats.weapons.lightning>0);assert.equal(g.stats.damage,g.stats.weapons.lightning);
});
test('nova slows nearby foes, freezes only when evolved and excludes distant foes',()=>{
  const g=create();g.reset();const p=g.player;p.weapons.nova=4;p.critChance=0;
  g.enemies=[new N.Enemy(g,'gargoyle',40,0,1),new N.Enemy(g,'gargoyle',500,0,2)];
  for(const e of g.enemies)g.hash.insert(e);g.combat.nova();
  assert.ok(g.enemies[0].slow>0);assert.equal(g.enemies[0].frozen,0);assert.equal(g.enemies[1].hp,g.enemies[1].maxHp);
  p.relics.permafrost=true;g.combat.nova();assert.equal(g.enemies[0].frozen,.5);
});
test('orbit hit cooldown bounds damage; evolved wisps add burn damage',()=>{
  const g=create();g.reset('moon');g.player.critChance=0;g.player.weapons.orbit=4;g.player.relics.cinder=true;
  const e=new N.Enemy(g,'gargoyle',86,0,1);g.enemies=[e];g.hash.insert(e);g.time=0;
  g.combat.updateWisps();const hp=e.hp;g.combat.updateWisps();assert.equal(e.hp,hp);assert.equal(e.burn,2);
  e.update(.41);assert.ok(e.hp<hp);assert.ok(g.stats.weapons.orbit>0);
  g.time=3;g.combat.mapClock=0;g.combat.cooldown=20;g.combat.update(.01);assert.equal(g.combat.wispHits.size,0);
});
test('piercing orbs hit front-to-back once per enemy across frames',()=>{
  const g=create();g.reset();g.combat.cooldown=99;g.player.critChance=0;
  const a=new N.Enemy(g,'gargoyle',80,12,1),b=new N.Enemy(g,'gargoyle',150,12,2);
  g.enemies=[b,a];g.hash.insert(a);g.hash.insert(b);
  const shot=g.combat.projectiles.acquire();shot.reset(0,0,12000,0,10,false,1);
  g.combat.update(1/60);assert.equal(a.hp,a.maxHp-10);assert.equal(b.hp,b.maxHp-10);assert.equal(g.combat.projectiles.active.length,0);
  assert.equal(N.circleHit(0,0,300,0,100,0,10),.3);assert.equal(N.circleHit(0,0,0,0,20,0,3),Infinity);
});
test('telegraphed hazards wait before dealing damage; dash protects on activation',()=>{
  const g=create();g.reset();g.player.invulnerable=0;g.combat.cooldown=99;
  g.combat.hazard(0,0,50,1,20,1);g.combat.update(.9);assert.equal(g.player.hp,110);
  g.player.dash();g.combat.update(.2);assert.equal(g.player.hp,110);
  g.player.invulnerable=0;g.combat.update(.1);assert.equal(g.player.hp,90);
  g.combat.update(1);assert.equal(g.combat.hazards.active.length,0);
});
test('hostile projectile swept collision cannot tunnel through player',()=>{
  const g=create();g.reset();g.player.invulnerable=0;g.combat.cooldown=99;
  g.combat.enemyShot(-200,-12,200,-12,30000,17);g.combat.update(1/60);
  assert.equal(g.player.hp,93);assert.equal(g.combat.hostile.active.length,0);
});
test('hound advertises a fixed charge line and cultist fires at range',()=>{
  const g=create();g.reset();const h=new N.Enemy(g,'hound',200,0,1);h.attackTimer=0;h.update(.01);assert.ok(h.windup>.7);
  const x=h.x;h.update(.4);assert.equal(h.x,x);const heading=h.chargeX;
  g.player.y=160;h.update(.4);assert.ok(h.charge>0);h.update(.1);assert.ok(h.x<x-20);assert.equal(h.chargeX,heading);
  const c=new N.Enemy(g,'cultist',300,0,2);c.attackTimer=.5;c.update(.01);assert.ok(c.windup>0);c.update(.6);assert.equal(g.combat.hostile.active.length,1);
});
test('Warden spawns once, alternates attacks and gates fifth-wave completion',()=>{
  const g=create();g.reset();g.wave=5;g.startWave(true);g.player.hp=g.player.maxHp=10000;
  g.waveTime=2.99;g.update(.02);assert.equal(g.bossSpawned,true);const boss=g.boss;
  g.update(.02);assert.equal(g.enemies.filter(e=>e.boss).length,1);
  boss.x=100;boss.y=0;boss.attackTimer=0;boss.update(.01);assert.equal(g.combat.hazards.active.length,1);
  boss.attackTimer=0;boss.update(.01);assert.equal(g.combat.hostile.active.length,7);
  boss.hp=boss.maxHp*.4;boss.attackTimer=0;boss.update(.01);assert.ok(g.combat.hazards.active.length>=3);
  g.waveTime=g.waveDuration;g.update(.01);assert.equal(g.state,'playing');
  boss.hit(100000,false,0,0,'bolt');assert.equal(g.bossDefeated,true);assert.equal(g.stats.bosses,1);
  g.update(.02);assert.ok(['levelup','shop'].includes(g.state));
});
test('wave checkpoint resumes exact stats without healing or multiplying gold',()=>{
  const g=create();g.reset('storm');g.player.gold=77;g.player.hp=50;g.player.weapons.nova=2;g.player.relics.mirror=true;
  g.stats.damage=123;g.stats.weapons.nova=123;g.wave=3;g.time=63;g.checkpoint('wave');
  const saved=JSON.parse(memory.get(g.save.key));assert.equal(g.save.validCheckpoint(saved.slots[0].checkpoint),true);
  const loaded=create();assert.equal(loaded.continueRun(),true);assert.equal(loaded.wave,3);assert.equal(loaded.player.hp,50);assert.equal(loaded.player.gold,77);
  assert.equal(loaded.player.weapons.nova,2);assert.equal(loaded.player.relics.mirror,true);assert.equal(loaded.stats.weapons.nova,123);assert.equal(loaded.time,63);assert.equal(loaded.waveTime,0);
  loaded.continueRun();assert.equal(loaded.player.hp,50);assert.equal(loaded.player.gold,77);
});
test('merchant checkpoint retains sold slots, lock prices, reroll cost and exact finances',()=>{
  const g=create();g.reset();g.player.gold=400;g.ui.openShop();g.ui.toggleLock(0);g.ui.reroll();g.ui.buy(1);
  const item=g.ui.slots[0].item.id,price=g.ui.slots[0].price,gold=g.player.gold,cost=g.ui.rerollCost();
  const restored=create();assert.equal(restored.continueRun(),true);assert.equal(restored.state,'shop');
  assert.equal(restored.ui.slots[0].item.id,item);assert.equal(restored.ui.slots[0].price,price);assert.equal(restored.ui.slots[0].locked,true);
  assert.equal(restored.ui.slots[1].item,null);assert.equal(restored.player.gold,gold);assert.equal(restored.ui.rerollCost(),cost);
  restored.ui.buy(1);assert.equal(restored.player.gold,gold);
});
test('checkpoint validation rejects incomplete, nonfinite and out-of-range data',()=>{
  const g=create();g.reset();const valid=JSON.parse(JSON.stringify(g.save.data.checkpoint));assert.ok(g.save.validCheckpoint(valid));
  const edits=[c=>c.player.hp=NaN,c=>c.player.damage=-1,c=>c.player.armor=1,c=>c.player.weapons.nova=9,c=>c.player.dashCooldown=0,c=>c.player.pierce=8,c=>c.player.projectileCount=1.5,c=>c.player.gold=-5,c=>c.player.projectileSpeed=0,c=>c.slots[0].price=-1,c=>c.stats.weapons.nova=NaN,c=>c.coven='unknown',c=>c.player.pendingLevels=1,c=>delete c.player.relics];
  for(const edit of edits){const c=JSON.parse(JSON.stringify(valid));edit(c);assert.equal(g.save.validCheckpoint(c),false);}
  memory.set(g.save.key,'{bad json');const broken=create();assert.equal(broken.save.data.checkpoint,null);broken.reset();assert.equal(broken.state,'playing');
});
test('blocked local storage never prevents startup, shopping or gameplay',()=>{
  const old=sandbox.localStorage;sandbox.localStorage={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};
  try{const g=create();assert.equal(g.save.available,false);g.reset();g.ui.openShop();assert.equal(g.state,'shop');assert.equal(g.checkpoint('shop'),false);g.startWave();g.update(1/60);assert.equal(g.state,'playing');}finally{sandbox.localStorage=old;}
});
test('settings and achievements persist; death records once and clears checkpoint',()=>{
  const g=create();g.reset();g.combat.soundEnabled=true;g.reducedMotion=true;g.quality='low';g.saveSettings();
  const before=g.save.data.profile.achievements.length;g.unlock('test_unique');g.unlock('test_unique');assert.equal(g.save.data.profile.achievements.length,before+1);
  const runs=g.save.data.profile.runs;g.wave=4;g.player.kills=42;g.time=120;g.die();g.die();assert.equal(g.save.data.profile.runs,runs+1);assert.equal(g.save.data.checkpoint,null);
  const loaded=create();assert.equal(loaded.quality,'low');assert.equal(loaded.reducedMotion,true);assert.equal(loaded.combat.soundEnabled,true);assert.ok(loaded.save.data.profile.achievements.includes('test_unique'));
});
test('grimoire returns to the same level choices or merchant without rerolling',()=>{
  const g=create();g.reset();g.addXP(8);g.ui.levelUp();const choices=g.ui.choices.map(x=>x.id).join(',');
  g.ui.toggleGrimoire();assert.equal(g.state,'grimoire');g.ui.togglePause();assert.equal(g.state,'levelup');assert.equal(g.ui.choices.map(x=>x.id).join(','),choices);
  g.ui.chooseLevel(0);g.ui.openShop();const items=g.ui.slots.map(x=>x.item.id).join(',');g.ui.toggleGrimoire();g.ui.toggleGrimoire();assert.equal(g.state,'shop');assert.equal(g.ui.slots.map(x=>x.item.id).join(','),items);
});
test('drop collection is idempotent and healing cannot exceed maximum',()=>{
  const g=create();g.reset();const gold=new N.Loot(g,'gold',0,0,7);gold.collect();gold.collect();assert.equal(g.player.gold,7);assert.equal(g.stats.goldEarned,7);
  g.player.hp=105;new N.Loot(g,'heal',0,0,20).collect();assert.equal(g.player.hp,110);
});
test('eligible spell progression always appears in level choices and shop slots are unique',()=>{
  const g=create();g.reset();g.addXP(8);
  for(let i=0;i<40;i++){g.ui.levelUp();assert.equal(g.ui.choices.length,3);assert.ok(g.ui.choices.some(c=>c.weapon));assert.equal(new Set(g.ui.choices.map(c=>c.id)).size,3);}
  g.ui.openShop();g.player.gold=10000;
  for(let i=0;i<15;i++){g.ui.reroll();assert.equal(new Set(g.ui.slots.map(s=>s.item.id)).size,4);}
});
test('first wave is survivable for every coven without modifying health or damage',()=>{
  for(const coven of Object.keys(N.COVENS)){
    const g=create();g.reset(coven);let steps=0;
    while(g.state==='playing'&&steps<2100){
      g.input.x=Math.cos(g.time*.21);g.input.y=Math.sin(g.time*.21);g.update(1/60);steps++;
      if(g.state==='levelup')g.ui.chooseLevel(0);
    }
    assert.notEqual(g.state,'dead',coven);assert.ok(g.waveTime>=30,coven);assert.ok(g.player.hp>0,coven);
    console.log(`  ${coven}: ${g.player.hp.toFixed(0)} vitality; ${g.player.kills} kills; ${g.player.gold} gold`);
  }
});


test('Shattered Moon crit explosion damages nearby enemies and counts each hit once',()=>{
  const g=create();g.reset();g.combat.cooldown=99;
  const a=new N.Enemy(g,'gargoyle',100,12,1),b=new N.Enemy(g,'gargoyle',130,50,2),far=new N.Enemy(g,'gargoyle',400,0,3);
  g.enemies=[a,b,far];for(const e of g.enemies)g.hash.insert(e);
  const shot=g.combat.projectiles.acquire();shot.reset(0,0,7000,0,20,true,0,true);g.combat.update(1/60);
  assert.equal(a.hp,a.maxHp-20);assert.equal(b.hp,b.maxHp-9);assert.equal(far.hp,far.maxHp);assert.equal(g.stats.weapons.bolt,29);
});
test('elite kill pays enhanced drops once and stores an achievement',()=>{
  const g=create();g.reset();g.wave=3;const e=new N.Enemy(g,'slime',0,0,1,true);
  assert.ok(e.hp>N.ENEMY_TYPES.slime.hp*2);e.hit(10000);const count=g.loot.length;e.hit(10000);
  assert.equal(g.stats.elites,1);assert.equal(g.player.kills,1);assert.equal(g.loot.length,count);
  assert.equal(g.loot.find(d=>d.type==='gold').value,3);assert.equal(g.loot.find(d=>d.type==='xp').value,3);assert.ok(g.save.data.profile.achievements.includes('elite'));
});
test('flawless rewards are earned only with no vitality damage',()=>{
  const clean=create();clean.reset();clean.finishWave();assert.equal(clean.player.gold,17);assert.equal(clean.waveSummary.clean,true);
  const hit=create();hit.reset();hit.player.invulnerable=0;hit.player.hurt(1);hit.finishWave();assert.equal(hit.player.gold,11);assert.equal(hit.waveSummary.clean,false);
});
test('partially chosen levels do not overwrite a valid wave-start checkpoint',()=>{
  const g=create();g.reset();const before=memory.get(g.save.key);g.addXP(40);g.ui.levelUp();assert.equal(g.checkpoint('wave'),false);
  assert.equal(memory.get(g.save.key),before);g.ui.chooseLevel(0);assert.equal(g.checkpoint('wave'),false);
});
test('every finite combat pool enforces its cap and can be cleared',()=>{
  const g=create();g.reset();const pools=[g.combat.projectiles,g.combat.particles,g.combat.numbers,g.combat.hostile,g.combat.hazards,g.combat.effects,g.combat.remnants];
  for(const pool of pools){for(let i=0;i<pool.limit;i++)assert.ok(pool.acquire());assert.equal(pool.acquire(),null);assert.equal(pool.created,pool.limit);}
  g.combat.clear();for(const pool of pools){assert.equal(pool.active.length,0);assert.equal(pool.free.length,pool.limit);}
});
test('critical hit-stop has a cooldown instead of freezing on every chained hit',()=>{
  const g=create();g.reset();const e=new N.Enemy(g,'warden',150,0,1);
  e.hit(1,true);assert.equal(g.hitStop,.025);g.hitStop=0;e.hit(1,true);assert.equal(g.hitStop,0);assert.ok(g.impactCooldown>0);
});

test('Warden approach remains at 700 units with a warning when visible',()=>{
  const g=create();g.reset();g.wave=5;g.player.x=-120;g.player.y=470;g.camera={x:-120,y:470};
  for(const [w,h] of [[1000,1000],[500,1100],[1500,600]]){
    g.viewWidth=w;g.viewHeight=h;
    for(let i=0;i<30;i++){g.enemies.length=0;g.spawnBoss();assert.ok(Math.abs(Math.sqrt(N.dist2(g.boss,g.player))-700)<1e-7);if(g.visible(g.boss.x,g.boss.y,60))assert.ok(g.boss.spawnDelay>0);}
  }
});

class FakeParam {
  constructor(){this.value=0;this.events=[];}
  setValueAtTime(value,time){assert.ok(Number.isFinite(value)&&Number.isFinite(time));this.value=value;this.events.push(['set',value,time]);}
  exponentialRampToValueAtTime(value,time){assert.ok(value>0&&Number.isFinite(value)&&Number.isFinite(time));this.events.push(['exp',value,time]);}
  setTargetAtTime(value,time,constant){assert.ok(Number.isFinite(value)&&Number.isFinite(time)&&constant>0);this.value=value;this.events.push(['target',value,time]);}
  cancelScheduledValues(){}
}
class FakeNode {
  constructor(){for(const key of ['gain','frequency','pan','Q','threshold','knee','ratio','attack','release'])this[key]=new FakeParam();this.connections=[];this.disconnected=false;}
  connect(node){assert.ok(node);this.connections.push(node);return node;}
  disconnect(){this.disconnected=true;this.connections=[];}
  start(time=0){this.startTime=time;}
  stop(time=0){this.stopTime=time;}
}
class FakeAudioContext {
  constructor(){this.sampleRate=48000;this.currentTime=0;this.state='running';this.destination=new FakeNode();this.nodes=[];}
  node(){const n=new FakeNode();this.nodes.push(n);return n;}
  createGain(){return this.node();}createDynamicsCompressor(){return this.node();}createBufferSource(){return this.node();}createBiquadFilter(){return this.node();}createOscillator(){return this.node();}createStereoPanner(){return this.node();}
  createBuffer(channels,length){const data=Array.from({length:channels},()=>new Float32Array(length));return {getChannelData:i=>data[i]};}
  resume(){this.state='running';return Promise.resolve();}
}

test('packed witch atlases have 24 frames in five clips and enemies have four frames',()=>{
  const dimensions=key=>{const png=Buffer.from(sandbox.NOCTURNE_ASSETS[key].split(',')[1],'base64');return [png.readUInt32BE(16),png.readUInt32BE(20)];};
  for(const dir of ['N','NE','E','SE','S','SW','W','NW'])assert.deepEqual(dimensions('witch_atlas_'+dir),[2304,128]);
  for(const type of Object.keys(N.ENEMY_TYPES))assert.deepEqual(dimensions('enemy_walk_'+type),[320,88]);
  assert.equal(sandbox.NOCTURNE_ANIMATIONS.witch.frames,8);assert.equal(sandbox.NOCTURNE_ANIMATIONS.enemy.frames,4);
});
test('walk phase is distance based, diagonal safe and independent of update rate',()=>{
  const g=create();g.reset();g.input.x=1;
  g.player.update(.1);const phase=g.player.walk;const frame=g.player.walkFrame;
  const g2=create();g2.reset();g2.input.x=1;for(let i=0;i<6;i++)g2.player.update(1/60);
  assert.ok(Math.abs(g2.player.walk-phase)<1e-8);assert.equal(g2.player.walkFrame,frame);
  g2.input.clear();const stopped=g2.player.walk;g2.player.update(.2);assert.equal(g2.player.walkFrame,-1);assert.equal(g2.player.walk,stopped);
  g2.input.x=1;g2.reducedMotion=true;g2.player.update(.1);assert.equal(g2.player.walkFrame,-1);
});
test('walk drawing crops the correct facing sheet and frame',()=>{
  const g=create();g.reset();g.input.x=1;g.player.update(.1);const calls=[],old=context.drawImage;context.drawImage=(...args)=>calls.push(args);
  try{g.player.draw(context);}finally{context.drawImage=old;}
  const call=calls.find(args=>args[0]===g.images.witch_atlas_E);assert.ok(call);assert.equal(call.length,9);assert.equal(call[1],(sandbox.NOCTURNE_ATLAS.clips.walk.start+g.player.walkFrame)*96);assert.equal(call[3],96);assert.equal(call[4],128);
});
test('footsteps require actual normal walking; dash leaves bounded fading echoes',()=>{
  const g=create();g.reset();const events=[];g.combat.sound=kind=>events.push(kind);g.input.x=1;g.player.update(44/g.player.speed);
  assert.equal(events.filter(k=>k==='step').length,1);g.input.clear();g.player.update(.1);assert.equal(events.filter(k=>k==='step').length,1);
  g.player.dash();for(let i=0;i<10;i++)g.player.update(1/60);assert.ok(g.combat.remnants.active.some(r=>r.kind==='ghost'));assert.equal(events.filter(k=>k==='step').length,1);
  g.combat.cooldown=99;for(let i=0;i<50;i++)g.combat.update(1/60);assert.equal(g.combat.remnants.active.length,0);
});
test('reduced motion suppresses dash echoes and walking dust',()=>{
  const g=create();g.reset();g.reducedMotion=true;g.combat.ghost(g.player);g.combat.dust(0,0);assert.equal(g.combat.remnants.active.length,0);
  g.player.invulnerable=.7;g.player.draw(context);
});
test('paused simulation freezes walk, spell and remnant animation clocks',()=>{
  const g=create();g.reset();g.input.x=1;g.player.update(.1);g.combat.ghost(g.player);g.combat.effect('muzzle',0,0,0,0,15,'white',.2);
  const walk=g.player.walk,life=g.combat.remnants.active[0].life,fx=g.combat.effects.active[0].life;g.ui.pause();g.update(3);
  assert.equal(g.player.walk,walk);assert.equal(g.combat.remnants.active[0].life,life);assert.equal(g.combat.effects.active[0].life,fx);
});
test('cosmetic draw frequency and extra particles do not change gameplay randomness',()=>{
  function simulate(extra){
    seed=271828;const g=create();g.reset();g.player.hp=g.player.maxHp=10000;
    for(let i=0;i<500;i++){
      g.input.x=Math.cos(g.time*.15);g.input.y=Math.sin(g.time*.15);g.update(1/60);
      if(g.state==='levelup')g.ui.chooseLevel(0);
      if(extra){g.combat.burst(0,0,7,'white');g.draw();}
    }
    return JSON.stringify({time:g.time,stats:g.stats,x:g.player.x,y:g.player.y,hp:g.player.hp,xp:g.player.xp,enemies:g.enemies.map(e=>[e.type,e.x,e.y,e.hp]),gold:g.player.gold});
  }
  assert.equal(simulate(false),simulate(true));
});
test('all 25 sound recipes schedule finite, bounded voices and clean up their nodes',()=>{
  const g=create(),a=new FakeAudioContext(),engine=g.combat.audioEngine;engine.attach(a);engine.setEnabled(true);
  assert.equal(Object.keys(N.AudioEngine.SOUNDS).length,25);
  for(const kind of Object.keys(N.AudioEngine.SOUNDS)){engine.play(kind);assert.ok(engine.voices.size<=28);}
  assert.ok(engine.voices.size>0);engine.stopVoices();assert.equal(engine.voices.size,0);
  engine.dispose();assert.equal(engine.ambientSources.length,0);
  assert.ok(a.nodes.filter(n=>n.startTime!==undefined&&!n.loop).every(n=>n.disconnected));
});
test('sound limits are per event and important warnings take priority over footsteps',()=>{
  const g=create(),a=new FakeAudioContext(),engine=g.combat.audioEngine;engine.attach(a);engine.setEnabled(true);
  assert.equal(engine.play('fire'),true);assert.equal(engine.play('fire'),false);assert.equal(engine.play('hurt'),true);
  engine.stopVoices();
  for(let i=0;i<28;i++)engine.voice({noise:true,d:.2,g:.02},a.currentTime,0,0);
  assert.equal(engine.voices.size,28);assert.equal(engine.play('boss'),true);assert.equal(engine.voices.size,28);assert.ok([...engine.voices].some(v=>v.priority===3));
  engine.setEnabled(false);assert.equal(engine.voices.size,0);assert.equal(engine.play('nova'),false);
});
test('volume, ambience and foreground muting do not change player state',()=>{
  const g=create(),a=new FakeAudioContext(),engine=g.combat.audioEngine;g.reset();const hp=g.player.hp;
  engine.attach(a);engine.setEnabled(true);engine.setVolume(3);assert.equal(engine.volume,1);engine.setVolume(-2);assert.equal(engine.volume,0);
  engine.setVolume(.35);engine.transport(true);assert.ok(engine.ambient.gain.value>0);engine.setAmbience(false);assert.equal(engine.ambient.gain.value,0);
  engine.play('hurt');engine.setForeground(false);assert.equal(engine.voices.size,0);assert.equal(engine.master.gain.value,0);assert.equal(engine.play('fire'),false);
  engine.setForeground(true);assert.ok(engine.master.gain.value>0);assert.equal(g.player.hp,hp);
});
test('new sound settings save and legacy version 2 checkpoints remain usable',()=>{
  const g=create();g.reset();g.combat.audioEngine.setVolume(.42);g.combat.audioEngine.setAmbience(false);g.saveSettings();
  const loaded=create();assert.equal(loaded.combat.audioEngine.volume,.42);assert.equal(loaded.combat.audioEngine.ambience,false);assert.equal(loaded.continueRun(),true);
  const old=JSON.parse(memory.get(g.save.key));delete old.settings.volume;delete old.settings.ambience;old.settings.sound=false;memory.set(g.save.key,JSON.stringify(old));
  const migrated=create();assert.equal(migrated.combat.audioEngine.volume,.6);assert.equal(migrated.combat.audioEngine.ambience,true);assert.equal(migrated.combat.soundEnabled,false);assert.equal(migrated.continueRun(),true);
});
test('unavailable Web Audio and missing stereo panning fail gracefully',()=>{
  const g=create();assert.equal(g.combat.enableAudio(),false);assert.equal(g.combat.sound('fire'),false);
  const a=new FakeAudioContext();a.createStereoPanner=undefined;g.combat.audioEngine.attach(a);g.combat.soundEnabled=true;
  assert.equal(g.combat.sound('fire'),true);g.combat.audioEngine.dispose();
});

test('legacy single save migrates once into Save 1, preserving the original bytes',()=>{
  const g=create();g.reset('moon');g.player.gold=87;g.checkpoint('wave');
  const legacy={schema:2,profile:{runs:4,bestWave:8,bestKills:213,bestTime:430,bosses:2,achievements:['warden']},settings:{sound:false,quality:'low'},checkpoint:g.save.data.checkpoint};
  const bytes=JSON.stringify(legacy);memory.clear();memory.set(g.save.legacyKey,bytes);
  const migrated=create();assert.equal(migrated.save.migrated,true);assert.equal(migrated.save.active.name,'Save 1');assert.equal(migrated.save.data.slots.length,1);
  assert.equal(migrated.save.data.profile.bestWave,8);assert.equal(migrated.save.data.checkpoint.player.gold,87);assert.equal(memory.get(g.save.legacyKey),bytes);
  const again=create();assert.equal(again.save.migrated,false);assert.equal(again.save.data.slots.length,1);assert.equal(again.continueRun(),true);assert.equal(again.player.coven,'moon');
});
test('failed migration write retains the old save and retries on the next launch',()=>{
  const key='nocturne.coven.v2',bytes=JSON.stringify({schema:2,profile:{runs:3,bestWave:7},settings:{},checkpoint:null});memory.set(key,bytes);
  const prior=sandbox.localStorage;sandbox.localStorage={getItem:prior.getItem,setItem(){throw new Error('quota');}};
  try{const s=new N.SaveStore();assert.equal(s.available,false);assert.equal(s.data.profile.runs,3);assert.equal(memory.get(key),bytes);}finally{sandbox.localStorage=prior;}
  const s=new N.SaveStore();assert.equal(s.available,true);assert.equal(s.data.profile.bestWave,7);assert.ok(memory.has(s.key));
});
test('new ritual allocates a new slot; switching restores independent witches and gold',()=>{
  const g=create();g.reset('storm');g.player.gold=77;g.checkpoint('wave');const first=g.save.active.id;
  g.selectedCoven='moon';g.newRitual();assert.notEqual(g.save.active.id,first);assert.equal(g.player.coven,'moon');assert.equal(g.player.gold,0);
  g.player.gold=19;g.checkpoint('wave');const second=g.save.active.id;
  g.save.select(first);g.continueRun();assert.equal(g.player.coven,'storm');assert.equal(g.player.gold,77);
  g.save.select(second);g.continueRun();assert.equal(g.player.coven,'moon');assert.equal(g.player.gold,19);
});
test('slot names persist, removals leave other slots intact and ids are never reused',()=>{
  const s=new N.SaveStore();const a=s.active.id;s.rename(a,'My moon');const b=s.createSlot().id;
  const again=new N.SaveStore();assert.equal(again.data.slots[0].name,'My moon');assert.equal(again.active.id,b);
  again.remove(a);assert.equal(again.data.slots.length,1);assert.equal(again.remove(b),false);assert.ok(again.createSlot().id>b);assert.equal(again.select(999),false);
});
test('24-slot limit cannot silently overwrite a ritual',()=>{
  const s=new N.SaveStore();for(let i=1;i<24;i++)assert.ok(s.createSlot());const before=s.exportData();assert.equal(s.createSlot(),null);assert.equal(s.exportData(),before);
});
test('backup import adds slots and invalid backup changes nothing',()=>{
  const g=create();g.reset();g.player.gold=43;g.checkpoint('wave');const backup=g.save.exportData(),first=g.save.active.id;
  assert.equal(g.save.importData(backup),1);assert.notEqual(g.save.active.id,first);assert.equal(g.save.data.checkpoint.player.gold,43);
  const before=g.save.exportData();assert.throws(()=>g.save.importData('{bad'));assert.equal(g.save.exportData(),before);
  const bad=JSON.parse(backup);bad.slots[0].checkpoint.player.hp=-9;assert.throws(()=>g.save.importData(JSON.stringify(bad)));assert.equal(g.save.exportData(),before);
});
test('exact snapshot retains world clocks, unique enemies, loot, hazards and shots',()=>{
  const g=create();g.reset();g.nextId=2;g.waveTime=17.2;g.spawnClock=.31;g.threatClock=4.2;
  const a=new N.Enemy(g,'cultist',110,90,1),b=new N.Enemy(g,'hound',220,-50,2,true);a.hp=12;b.windup=.42;g.enemies=[a,b];
  g.loot=[new N.Loot(g,'gold',12,48,3)];g.loot[0].magnet=true;g.loot[0].age=1.5;
  const shot=g.combat.projectiles.acquire();shot.reset(3,5,100,10,9,true,1,true);shot.hitIds.add(1);shot.life=.42;
  g.combat.enemyShot(60,40,0,0,175,14);g.combat.hazard(80,50,65,1.35,35,1.15);g.combat.hazards.active[0].age=.6;
  g.combat.cooldown=.18;g.combat.wispHits.set(1,19);g.stats.damage=200;
  g.ui.pause();const saved=g.save.data.checkpoint;assert.ok(g.save.validCheckpoint(saved));
  const restored=create();assert.ok(restored.continueRun());assert.equal(restored.waveTime,17.2);assert.equal(restored.threatClock,4.2);
  assert.equal(restored.enemies.length,2);assert.equal(restored.enemies[0].hp,12);assert.equal(restored.enemies[1].windup,.42);assert.equal(restored.enemies[1].elite,true);
  assert.equal(restored.loot[0].age,1.5);assert.equal(restored.loot[0].magnet,true);assert.equal(restored.combat.hazards.active[0].age,.6);
  assert.equal(restored.combat.projectiles.active[0].life,.42);assert.ok(restored.combat.projectiles.active[0].hitIds.has(1));assert.equal(restored.combat.hostile.active.length,1);
  assert.equal(restored.combat.cooldown,.18);assert.equal(restored.combat.wispHits.get(1),19);assert.equal(restored.stats.damage,200);
  restored.continueRun();assert.equal(restored.enemies.length,2);assert.equal(restored.loot.length,1);assert.equal(restored.stats.damage,200);
});
test('invalid world snapshot and duplicate entity ids are rejected before load',()=>{
  const g=create();g.reset();g.nextId=1;g.enemies=[new N.Enemy(g,'slime',50,50,1)];g.checkpoint('wave');
  const good=JSON.stringify(g.save.data.checkpoint);assert.ok(g.save.validCheckpoint(JSON.parse(good)));
  for(const mutate of [c=>c.world.enemies.push({...c.world.enemies[0]}),c=>c.world.enemies[0].type='dragon',c=>c.world.hazards.push({}),c=>c.world.player.invulnerable=NaN,c=>c.world.nextId=-1]){
    const candidate=JSON.parse(good);mutate(candidate);assert.equal(g.save.validCheckpoint(candidate),false);
  }
});
test('autosave runs at ten simulation seconds and pause saves exact progress',()=>{
  const g=create();g.reset();g.spawnClock=100;for(let i=0;i<605;i++)g.update(1/60);
  const saved=new N.SaveStore().data.checkpoint;assert.ok(saved.world.waveTime>=10&&saved.world.waveTime<10.1);
  g.waveTime=12.3;g.ui.pause();assert.equal(new N.SaveStore().data.checkpoint.world.waveTime,12.3);
});
test('slot chronicles and death affect only the active chapter',()=>{
  const g=create();g.reset();g.unlock('warden');const first=g.save.active.id;g.newRitual();g.die();
  assert.equal(g.save.data.profile.runs,1);assert.equal(g.save.data.profile.achievements.length,0);
  g.save.select(first);assert.equal(g.save.data.profile.runs,0);assert.ok(g.save.data.profile.achievements.includes('warden'));assert.ok(g.save.data.checkpoint);
});
test('camera zoom clamps, persists and does not change movement or spell targeting',()=>{
  const g=create();g.reset();const p=g.player;g.enemies=[new N.Enemy(g,'slime',420,0,1),new N.Enemy(g,'slime',440,0,2)];
  for(const zoom of [.2,.65,1,1.55,8]){g.setZoom(zoom);assert.equal(g.combat.nearest(),g.enemies[0]);assert.equal(p.speed,195);assert.ok(g.userZoom>=.65&&g.userZoom<=1.55);}
  assert.equal(new N.SaveStore().data.settings.zoom,1.55);g.enemies.shift();assert.equal(g.combat.nearest(),null);
});
test('projectile speed buffs never extend an arcane orb past 490 world units',()=>{
  const g=create();g.reset();const e=new N.Enemy(g,'warden',400,0,1);
  for(const speed of [510,700,850]){g.combat.clear();g.player.projectileSpeed=speed;g.combat.fire(e);const b=g.combat.projectiles.active[0];assert.ok(Math.abs(Math.hypot(b.vx,b.vy)*b.life-490)<1e-7);g.combat.cooldown=99;for(let i=0;i<65;i++)g.combat.update(.017);assert.ok(Math.abs(Math.hypot(b.x,b.y+18)-490)<1e-6);}
});
test('multicast grows volley damage by square root instead of sevenfold',()=>{
  const g=create();g.reset();g.player.critChance=0;const e=new N.Enemy(g,'slime',100,0,1);
  g.combat.fire(e);const single=g.combat.projectiles.active[0].damage;g.combat.clear();g.player.projectileCount=7;g.combat.fire(e);
  const total=g.combat.projectiles.active.reduce((sum,b)=>sum+b.damage,0);assert.ok(Math.abs(total/single-Math.sqrt(7))<1e-8);
});
test('permanent stat upgrades respect every cap and legacy stats are normalized on load',()=>{
  const g=create();g.reset();Object.assign(g.player,{damage:400,speed:900,projectileSpeed:8000,pickupRadius:20000,attackInterval:.12,armor:.6,critChance:.75,regen:9,dashCooldown:.7,maxHp:1000,hp:800});
  g.checkpoint('wave');assert.ok(g.continueRun());const p=g.player,b=N.BALANCE;
  assert.equal(p.damage,b.maxDamage);assert.equal(p.speed,b.maxSpeed);assert.equal(p.hp,320);assert.equal(p.regen,b.maxRegen);assert.equal(p.attackInterval,.24);assert.equal(p.armor,.45);assert.equal(p.critChance,.45);assert.equal(p.dashCooldown,1.25);
  for(const upgrade of N.UPGRADES)if(upgrade.valid&&!upgrade.weapon&&upgrade.id!=='orb'&&upgrade.id!=='pierce')assert.equal(upgrade.valid(p),false,upgrade.id);
});
test('cast and hurt clips use priority, complete and return to locomotion',()=>{
  const g=create();g.reset();const p=g.player;p.cast({x:-100,y:100});assert.equal(p.facing,'SW');assert.equal(p.animator.state,'cast');p.update(.08);assert.ok(p.animator.frame>=12&&p.animator.frame<18);
  p.invulnerable=0;p.hurt(1);assert.equal(p.animator.state,'hurt');p.cast();assert.equal(p.animator.state,'hurt');p.update(.3);assert.equal(p.animator.state,'idle');
  g.input.x=1;p.update(.1);assert.equal(p.animator.state,'walk');p.dash();assert.equal(p.animator.state,'dash');
});
test('spawn portals block attacks and damage until their warning expires',()=>{
  const g=create();g.reset();const e=new N.Enemy(g,'slime',0,0,1);e.spawnDelay=.85;g.enemies=[e];g.player.invulnerable=0;const hp=g.player.hp;
  e.hit(1000);assert.equal(e.alive,true);assert.equal(g.combat.nearest(),null);e.update(.4);assert.equal(g.player.hp,hp);
  e.update(.5);assert.equal(e.spawnDelay,0);assert.equal(g.combat.nearest(),e);e.update(.01);assert.ok(g.player.hp<hp);
});
test('all capped builds still get three usable level-up gifts and a safe shop',()=>{
  const g=create();g.reset();Object.assign(g.player,{damage:95,speed:300,projectileSpeed:850,pickupRadius:190,attackInterval:.24,armor:.45,critChance:.45,regen:1.2,dashCooldown:1.25,maxHp:320,hp:320,projectileCount:7,pierce:2});g.player.weapons={bolt:4,orbit:4,lightning:4,nova:4};g.player.relics={mirror:true,cinder:true,conductor:true,permafrost:true};
  g.player.pendingLevels=1;g.ui.levelUp();assert.equal(g.ui.choices.length,3);assert.equal(new Set(g.ui.choices.map(c=>c.id)).size,3);g.ui.chooseLevel(0);g.ui.openShop();assert.equal(g.ui.slots.length,4);
});
test('late-game maxed build cannot survive by standing still, while moving avoids curses',()=>{
  function run(moving){
    seed=9981;const g=create();g.reset();g.wave=24;g.startWave(true);
    Object.assign(g.player,{damage:95,speed:300,projectileSpeed:850,pickupRadius:190,attackInterval:.24,armor:.45,critChance:.45,regen:1.2,dashCooldown:1.25,maxHp:320,hp:320,projectileCount:7,pierce:2});g.player.weapons={bolt:4,orbit:4,lightning:4,nova:4};g.player.relics={mirror:true,cinder:true,conductor:true,permafrost:true};
    for(let i=0;i<5000&&g.state!=='dead'&&g.state!=='shop';i++){
      if(g.state==='levelup'){g.ui.chooseLevel(0);continue;}
      if(moving){g.input.x=Math.cos(g.time*.35);g.input.y=Math.sin(g.time*.35);}
      g.update(1/60);
    }
    return {state:g.state,hp:g.player.hp,lost:g.stats.damageTaken,time:g.waveTime};
  }
  const still=run(false),moving=run(true);console.log('  late-wave balance:',JSON.stringify({still,moving}));
  assert.equal(still.state,'dead');assert.notEqual(moving.state,'dead');assert.ok(moving.time>=60);assert.ok(moving.lost<still.lost);
});

console.log(`\n${passed} test groups passed.`);
