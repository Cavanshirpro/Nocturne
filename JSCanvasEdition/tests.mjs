// Deterministic logic/integration tests. No browser or npm packages required.
// Run with Node.js 18+: node tests.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const elements=new Map();
const docEvents=new Map();
function element(){return {hidden:false,style:{},dataset:{},innerHTML:'',textContent:'',classList:{add(){},remove(){}},addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},focus(){},contains(){return false;},getBoundingClientRect(){return {left:0,top:0,width:106,height:106};}};}
const gradient={addColorStop(){}};
const context=new Proxy({createPattern:()=>({}),createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>{o[k]=v;return true;}});
let seed=271828;
const seededMath=Object.create(Math);
seededMath.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const memory=new Map();
const sandbox={console,Math:seededMath,Float32Array,localStorage:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},document:{hidden:false,addEventListener(type,fn,options){if(!docEvents.has(type))docEvents.set(type,[]);docEvents.get(type).push({fn,options});},getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}},innerWidth:1280,innerHeight:800,devicePixelRatio:1,addEventListener(){},matchMedia:()=>({matches:false})};
sandbox.window=sandbox;
vm.createContext(sandbox);
for(const name of ['assets.js','game.js','systems/progression.js','systems/difficulty.js','systems/abilities.js','systems/warfare.js','systems/guardian.js','systems/encounters.js','systems/vitality.js','systems/director.js','systems/balance.js','systems/animation.js','systems/appearance.js','systems/motion.js','systems/orbitals.js','systems/volumetric_regalia.js','systems/snapshots.js','systems/storage.js','systems/audio.js','entities.js','combat.js','ui.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),sandbox,{filename:name});
const N=sandbox.Nocturne;
const images=Object.fromEntries(Object.keys(sandbox.NOCTURNE_ASSETS).map(k=>[k,{}]));
const create=()=>new N.Game({getContext:()=>context},images);
let passed=0,failed=0;
function test(name,fn){memory.clear();seed=271828;try{fn();passed++;console.log(`PASS ${name}`);}catch(error){failed++;console.error(`FAIL ${name}\n${error.stack}`);}}

test('all 58 procedural PNG assets are real, encoded images',()=>{
  assert.equal(Object.keys(sandbox.NOCTURNE_ASSETS).length,58);
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
  g.player.weapons={bolt:4,orbit:4,lightning:4,nova:4};g.player.relics={mirror:true,cinder:true,conductor:true,permafrost:true};g.player.damage=600;
  let steps=0,shops=0;
  while(shops<5 && steps<90000){
    if(g.state==='levelup'){g.ui.chooseLevel(0);continue;}
    if(g.state==='shop'){
      shops++;if(shops===5)break;
      if(g.player.gold>=g.ui.slots[0].price)g.ui.buy(0);g.startWave();continue;
    }
    if(g.sanctum?.phase==='waiting'){
      const dx=g.sanctum.x-g.player.x,dy=g.sanctum.y-g.player.y,d=Math.hypot(dx,dy)||1;g.input.x=dx/d;g.input.y=dy/d;
    }else if(g.boss?.alive){
      const dx=g.boss.x-g.player.x,dy=g.boss.y-g.player.y,d=Math.hypot(dx,dy)||1,inward=N.clamp((d-140)/70,-1,1);
      g.input.x=dx/d*inward-dy/d*.65;g.input.y=dy/d*inward+dx/d*.65;
      g.input.aim={active:true,x:g.width/2+dx*g.zoom,y:g.height/2+dy*g.zoom};if(g.player.progress.specialRemaining===0){g.abilities.begin();g.abilities.release();}g.abilities.shield();
    }else{const theta=g.time*.13;g.input.x=Math.cos(theta);g.input.y=Math.sin(theta);}
    // This fixture checks five-wave state/pool stability, not a bot win rate.
    g.player.invulnerable=1;g.update(1/60);steps++;
    if(steps%90===0)g.draw();
    assert.equal(g.state==='dead',false);assert.ok(Number.isFinite(g.player.x));assert.ok(g.enemies.length<=320);
    assert.ok(g.combat.particles.active.length<=650);assert.ok(g.combat.projectiles.active.length<=240);
  }
  assert.equal(shops,5);assert.ok(g.player.kills>20);assert.ok(g.player.level>2);
  assert.ok(g.stats.bosses>=5);assert.equal(g.bossDefeated,true);
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
test('all eight spell evolutions require both rank IV and their own relic, in either order',()=>{
  for(const [id,w] of Object.entries(N.WEAPONS))for(const first of ['rank','relic']){
    const g=create();g.reset();const p=g.player;p.level=Math.max(p.level,w.unlock);
    if(first==='rank'){p.weapons[id]=4;assert.equal(p.evolved(id),false);p.relics[w.relic]=true;}
    else{p.relics[w.relic]=true;p.weapons[id]=3;assert.equal(p.evolved(id),false);p.upgradeWeapon(id);}
    p.checkEvolutions();assert.equal(p.evolved(id),true);assert.ok(g.save.data.profile.achievements.includes('evolution'));
    assert.equal(p.upgradeWeapon(id),true);assert.equal(p.weapons[id],5);
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
test('final guardian appears once and gates fifth-wave completion',()=>{
  const g=create();g.reset();g.wave=5;g.startWave(true);g.player.hp=g.player.maxHp=10000;
  g.waveTime=g.waveDuration;g.update(.02);assert.equal(g.sanctum.phase,'waiting');g.player.x=g.sanctum.x;g.player.y=g.sanctum.y;g.update(.02);
  const boss=g.boss;assert.ok(boss.guardian);assert.equal(g.enemies.filter(e=>e.boss).length,1);boss.spawnDelay=0;
  boss.guardian.cooldown=0;boss.update(.01);assert.equal(boss.guardian.action,'salvo');assert.equal(g.combat.hostile.active.length,0);
  g.update(.01);assert.equal(g.state,'playing');boss.hit(100000,false,0,0,'bolt');assert.equal(g.bossDefeated,true);g.update(.02);assert.ok(['levelup','shop'].includes(g.state));
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
  const edits=[c=>c.player.hp=NaN,c=>c.player.damage=-1,c=>c.player.armor=-1,c=>c.player.weapons.nova=-1,c=>c.player.dashCooldown=0,c=>c.player.pierce=-1,c=>c.player.projectileCount=1.5,c=>c.player.gold=-5,c=>c.player.projectileSpeed=0,c=>c.slots[0].price=-1,c=>c.stats.weapons.nova=NaN,c=>c.coven='unknown',c=>c.player.pendingLevels=1,c=>delete c.player.relics];
  for(const edit of edits){const c=JSON.parse(JSON.stringify(valid));edit(c);assert.equal(g.save.validCheckpoint(c),false);}
  memory.set(g.save.key,'{bad json');const broken=create();assert.equal(broken.save.data.checkpoint,null);broken.reset();assert.equal(broken.state,'playing');
});
test('blocked local storage never prevents startup, shopping or gameplay',()=>{
  const old=sandbox.localStorage;sandbox.localStorage={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};
  try{const g=create();assert.equal(g.save.available,false);g.reset();g.ui.openShop();assert.equal(g.state,'shop');assert.equal(g.checkpoint('shop'),false);g.startWave();g.update(1/60);assert.equal(g.state,'playing');}finally{sandbox.localStorage=old;}
});
test('settings and achievements persist; death records once and preserves a same-wave retry',()=>{
  const g=create();g.reset();g.combat.soundEnabled=true;g.reducedMotion=true;g.quality='low';g.saveSettings();
  const before=g.save.data.profile.achievements.length;g.unlock('test_unique');g.unlock('test_unique');assert.equal(g.save.data.profile.achievements.length,before+1);
  const runs=g.save.data.profile.runs;g.wave=4;g.player.kills=42;g.time=120;g.die();g.die();assert.equal(g.save.data.profile.runs,runs+1);assert.ok(g.save.validCheckpoint(g.save.data.checkpoint));assert.equal(g.save.data.checkpoint.wave,4);
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
  for(const type of Object.keys(N.ENEMY_TYPES))assert.deepEqual(dimensions('enemy_walk_'+type),[384,128]);
  assert.equal(sandbox.NOCTURNE_ANIMATIONS.witch.frames,8);assert.equal(sandbox.NOCTURNE_ANIMATIONS.enemy.frames,8);
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
  const call=calls.find(args=>args[0]===g.images.witch_atlas_E);assert.ok(call);assert.equal(call.length,9);assert.equal(call[1],(sandbox.NOCTURNE_ATLAS.clips.walk.start+g.player.walkFrame)*96);assert.equal(call[3],96);assert.ok(call[4]>0&&call[4]<=128);
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
test('all 29 sound recipes schedule finite, bounded voices and clean up their nodes',()=>{
  const g=create(),a=new FakeAudioContext(),engine=g.combat.audioEngine;engine.attach(a);engine.setEnabled(true);
  assert.equal(Object.keys(N.AudioEngine.SOUNDS).length,38);
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
  engine.setVolume(.35);engine.setAmbience(true);engine.transport(true);assert.ok(engine.ambient.gain.value>0);engine.setAmbience(false);assert.equal(engine.ambient.gain.value,0);
  engine.play('hurt');engine.setForeground(false);assert.equal(engine.voices.size,0);assert.equal(engine.master.gain.value,0);assert.equal(engine.play('fire'),false);
  engine.setForeground(true);assert.ok(engine.master.gain.value>0);assert.equal(g.player.hp,hp);
});
test('new sound settings save and legacy version 2 checkpoints remain usable',()=>{
  const g=create();g.reset();g.combat.audioEngine.setVolume(.42);g.combat.audioEngine.setAmbience(false);g.saveSettings();
  const loaded=create();assert.equal(loaded.combat.audioEngine.volume,.42);assert.equal(loaded.combat.audioEngine.ambience,false);assert.equal(loaded.continueRun(),true);
  const old=JSON.parse(memory.get(g.save.key));delete old.settings.volume;delete old.settings.ambience;old.settings.sound=false;memory.set(g.save.key,JSON.stringify(old));
  const migrated=create();assert.equal(migrated.combat.audioEngine.volume,.6);assert.equal(migrated.combat.audioEngine.ambience,false);assert.equal(migrated.combat.soundEnabled,false);assert.equal(migrated.continueRun(),true);
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
test('projectile speed upgrades expand targeting and travel without a ceiling',()=>{
  const g=create();g.reset();const e=new N.Enemy(g,'warden',400,0,1);
  for(const speed of [510,850,4000,20000]){g.combat.clear();g.player.projectileSpeed=speed;const origin=N.Orbitals.origin(g.player,'bolt');g.combat.fire(e);const b=g.combat.projectiles.active[0],expected=N.boltTravel(g.player);assert.ok(Math.abs(Math.hypot(b.vx,b.vy)*b.life-expected)<1e-5);g.combat.cooldown=99;for(let i=0;i<180;i++)g.combat.update(.017);assert.ok(Math.abs(Math.hypot(b.x-origin.x,b.y-origin.y)-expected)<1e-4);}
});

test('multicast grows full volley power and batches counts above the visual budget',()=>{
  const g=create();g.reset();g.player.critChance=0;const e=new N.Enemy(g,'slime',100,0,1);
  g.combat.fire(e);const single=g.combat.projectiles.active[0].damage;
  for(const count of [7,70,7000]){g.combat.clear();g.player.projectileCount=count;g.combat.fire(e);assert.ok(g.combat.projectiles.active.length<=24);const total=g.combat.projectiles.active.reduce((sum,b)=>sum+b.damage,0);assert.ok(Math.abs(total/single-count)<1e-6);}
});

test('stats beyond every former cap survive a save and keep upgrading',()=>{
  const g=create();g.reset();Object.assign(g.player,{damage:400,speed:900,projectileSpeed:8000,pickupRadius:20000,attackInterval:.01,armor:6,critChance:2.75,regen:90,dashCooldown:.1,maxHp:10000,hp:8000,projectileCount:80,pierce:30});
  g.player.weapons.bolt=30;g.checkpoint('wave');assert.ok(g.continueRun());const p=g.player;
  assert.equal(p.damage,400);assert.equal(p.speed,900);assert.equal(p.hp,8000);assert.equal(p.regen,90);assert.equal(p.attackInterval,.01);assert.equal(p.armor,6);assert.equal(p.critChance,2.75);assert.equal(p.projectileCount,80);assert.equal(p.weapons.bolt,30);
  for(const upgrade of N.UPGRADES.filter(u=>['damage','haste','speed','health','velocity','crit','magnet','dash','pierce'].includes(u.id))){assert.ok(!upgrade.valid||upgrade.valid(p));upgrade.apply(p);}
  assert.ok(p.damage>400&&p.speed>900&&p.armor===6&&p.critChance>2.75&&p.dashCooldown<.1&&p.attackInterval<.01&&p.pierce>30);
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
test('late builds still get three usable level-up gifts and a safe shop',()=>{
  const g=create();g.reset();Object.assign(g.player,{damage:95,speed:300,projectileSpeed:850,pickupRadius:190,attackInterval:.24,armor:.45,critChance:.45,regen:1.2,dashCooldown:1.25,maxHp:320,hp:320,projectileCount:7,pierce:2});g.player.weapons={bolt:4,orbit:4,lightning:4,nova:4};g.player.relics={mirror:true,cinder:true,conductor:true,permafrost:true};
  g.player.pendingLevels=1;g.ui.levelUp();assert.equal(g.ui.choices.length,3);assert.equal(new Set(g.ui.choices.map(c=>c.id)).size,3);g.ui.chooseLevel(0);g.ui.openShop();assert.equal(g.ui.slots.length,4);
});
test('late-game reference build cannot survive by standing still, while moving avoids curses',()=>{
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


test('encounter director mixes 80% weaker, 15% middle and 5% veterans at level 100',()=>{
  const g=create();g.reset();g.wave=10;g.player.level=100;const bands={fodder:0,regular:0,veteran:0},levels={fodder:[],regular:[],veteran:[]};
  for(let i=0;i<400;i++){const e=N.EnemyDirector.roll(g,i);bands[e.tier]++;levels[e.tier].push(e.level);assert.ok(e.level>=1);if(e.tier==='fodder')assert.equal(e.trait,'none');}
  assert.deepEqual(bands,{fodder:320,regular:60,veteran:20});assert.ok(levels.fodder.every(v=>v>=50&&v<=70));assert.ok(levels.regular.every(v=>v>=75&&v<=100));assert.ok(levels.veteran.every(v=>v>=105&&v<=110));assert.ok(Math.min(...levels.veteran)>g.player.level);
  g.player.level=10000;assert.ok(N.EnemyDirector.target(g)>9000);
});
test('director defers new veterans when the living group already has many',()=>{
  const g=create();g.reset();g.wave=12;g.enemies=Array.from({length:12},()=>({alive:true,tier:'veteran'}));assert.equal(N.EnemyDirector.roll(g,99).tier,'regular');
});
test('enemy level increases vitality, speed and damage without an upper level ceiling',()=>{
  const g=create();g.reset();g.wave=10;const make=level=>new N.Enemy(g,'gargoyle',400,0,1,false,{level,tier:'regular',trait:'none'}),a=make(20),b=make(2000);
  assert.equal(b.level,2000);assert.ok(b.maxHp>a.maxHp&&b.speed>a.speed&&b.damage>a.damage);assert.equal(a.tier,'regular');
});
test('swift, armored, mending and volatile enemies have real distinct mechanics',()=>{
  const g=create();g.reset();const make=trait=>new N.Enemy(g,'gargoyle',500,0,1,false,{level:1,tier:'regular',trait});
  const plain=make('none'),swift=make('swift'),armor=make('armored');assert.ok(swift.speed>plain.speed&&swift.maxHp<plain.maxHp);
  const hp=armor.hp;armor.hit(10);assert.ok(Math.abs(armor.hp-(hp-8.2))<1e-8);const h=armor.hp;armor.hit(10,true);assert.equal(armor.hp,h-10);
  const heal=make('mending');heal.hp=20;heal.update(1);assert.ok(heal.hp>20);heal.hit(1);const after=heal.hp;heal.update(1);assert.equal(heal.hp,after);
  const volatile=make('volatile');volatile.hit(1e8);assert.equal(g.combat.hazards.active.at(-1).delay,.9);assert.equal(g.combat.hazards.active.at(-1).radius,52);
});
test('new spells unlock at 4, 7, 10 and 14, with unlimited ranks and all learned spells active',()=>{
  const g=create();g.reset();const p=g.player;
  for(const [id,level]of [['meteor',4],['lance',7],['thorn',10],['rift',14]]){p.level=level-1;assert.equal(p.upgradeWeapon(id),false);p.level=level;assert.equal(p.upgradeWeapon(id),true);for(let i=0;i<20;i++)assert.equal(p.upgradeWeapon(id),true);assert.equal(p.weapons[id],21);assert.ok(p.progress.equipped.includes(id));}
  p.level=30;for(const id of N.SPELL_IDS)p.upgradeWeapon(id);assert.equal(p.progress.equipped.length,12);
});
test('milestone level choice guarantees the newest unlearned spell',()=>{
  const g=create();g.reset();for(const [level,id]of [[4,'meteor'],[7,'lance'],[10,'thorn'],[14,'rift']]){g.player.level=level;g.player.pendingLevels=1;g.ui.levelUp();assert.ok(g.ui.choices.some(c=>c.weapon===id));assert.equal(new Set(g.ui.choices.map(c=>c.id)).size,3);}
});
test('meteor warns before striking; its evolution produces two damaging pulses',()=>{
  const g=create();g.reset();const p=g.player;p.weapons.meteor=4;p.relics.sunstone=true;p.critChance=0;g.combat.cooldown=99;g.combat.spellTimers.meteor=99;
  const e=new N.Enemy(g,'gargoyle',100,0,1);e.hp=e.maxHp=1000;g.enemies=[e];g.hash.insert(e);g.combat.meteor();g.combat.update(.64);assert.equal(e.hp,1000);
  g.combat.update(.02);const first=e.hp;assert.ok(first<1000);g.combat.update(.14);assert.ok(e.hp<first);assert.equal(e.burn,3);assert.equal(g.combat.areas.active[0].pulses,2);
});
test('Soul Lance hits foes in its line and leaves off-axis foes untouched',()=>{
  const g=create();g.reset();g.player.weapons.lance=4;g.player.relics.soulchain=true;g.player.critChance=0;
  const line=new N.Enemy(g,'gargoyle',100,0,1),next=new N.Enemy(g,'gargoyle',180,0,2),off=new N.Enemy(g,'gargoyle',180,150,3);g.enemies=[line,next,off];
  g.combat.lance();assert.ok(line.hp<line.maxHp&&next.hp<next.maxHp);assert.equal(off.hp,off.maxHp);assert.equal(line.exposed,2);assert.ok(g.stats.weapons.lance>0);
});
test('Thorn Sigil stays where cast, slows, and respects its pulse timer',()=>{
  const g=create();g.reset();g.player.weapons.thorn=1;g.player.critChance=0;g.combat.cooldown=99;g.combat.spellTimers.thorn=99;
  const e=new N.Enemy(g,'gargoyle',0,-55,1);g.enemies=[e];g.hash.insert(e);g.combat.thorn();const area=g.combat.areas.active[0];g.player.x=250;g.combat.update(.13);assert.ok(e.slow>0);const hp=e.hp;g.combat.update(.2);assert.equal(e.hp,hp);assert.equal(area.x,0);
});
test('Abyss Rift pulls nearby enemies and its evolved closing pulse deals damage',()=>{
  const g=create();g.reset();g.player.weapons.rift=4;g.player.relics.voidglass=true;g.player.critChance=0;g.combat.cooldown=99;g.combat.spellTimers.rift=99;
  const a=new N.Enemy(g,'gargoyle',100,0,1),b=new N.Enemy(g,'gargoyle',155,0,2);for(const e of [a,b]){e.hp=e.maxHp=1000;g.hash.insert(e);}g.enemies=[a,b];
  g.combat.rift();g.combat.update(.25);assert.ok(b.x<155);const hp=a.hp;g.combat.update(2.2);assert.ok(a.hp<hp);assert.equal(g.combat.areas.active.length,0);assert.ok(g.stats.weapons.rift>0);
});
test('talent and mastery ranks keep growing and have real combat effects',()=>{
  const g=create();g.reset();const p=g.player;p.level=200;p.progress.talents.kindling=10;p.progress.talents.frostbite=10;p.progress.mastery.bolt=10;
  const e=new N.Enemy(g,'gargoyle',100,0,1);e.hp=e.maxHp=1000;e.slow=2;e.hit(10,true);assert.ok(e.hp<1000-20);assert.equal(e.burn,2);assert.ok(e.burnDamage>0);
  const talent=N.UPGRADES.find(c=>c.id==='talent_kindling');assert.ok(talent.valid(p));talent.apply(p);assert.equal(p.progress.talents.kindling,11);
  p.weapons.bolt=4;const mastery=N.UPGRADES.find(c=>c.id==='mastery_bolt');assert.ok(mastery.valid(p));mastery.apply(p);assert.equal(p.progress.mastery.bolt,11);
});
test('buying a next-wave oath is saved, applies once, and loading cannot refill its shield',()=>{
  const g=create();g.reset();g.player.gold=1000;g.ui.openShop();g.ui.slots[0]={item:N.ITEMS.find(i=>i.id==='oath_stone'),locked:false,price:14,sold:false};g.ui.buy(0);
  assert.equal(g.player.progress.preparedOath,'stone');g.startWave();assert.equal(g.player.progress.shield,35);g.player.invulnerable=0;const hp=g.player.hp;g.player.hurt(20);assert.equal(g.player.hp,hp);assert.equal(g.player.progress.shield,15);
  g.checkpoint('wave');assert.ok(g.continueRun());assert.equal(g.player.progress.shield,15);g.finishWave();assert.equal(g.player.progress.activeOath,null);assert.equal(g.player.progress.shield,0);
});
test('fractional XP and gold oath rewards accumulate accurately for small drops',()=>{
  const g=create();g.reset();g.player.progress.activeOath='wisdom';for(let i=0;i<5;i++)g.addXP(1);assert.equal(g.player.xp,6);
  g.player.progress.activeOath='fortune';for(let i=0;i<5;i++)g.earnGold(1);assert.equal(g.player.gold,6);
});
test('refill restores bought slots while preserving locked merchandise and exact price',()=>{
  const g=create();g.reset();g.player.level=100;g.player.gold=10000;g.ui.openShop();g.ui.toggleLock(0);const keep=g.ui.slots[0].item.id,price=g.ui.slots[0].price;
  for(let i=1;i<4;i++)g.ui.buy(i);assert.equal(g.ui.slots.filter(s=>!s.item).length,3);const gold=g.player.gold,cost=g.ui.refillCost();g.ui.refill();assert.equal(g.player.gold,gold-cost);assert.equal(g.ui.slots[0].item.id,keep);assert.equal(g.ui.slots[0].price,price);assert.ok(g.ui.slots[0].locked);assert.equal(new Set(g.ui.slots.map(s=>s.item.id)).size,4);
  for(let wave=2;wave<35;wave++){g.wave=wave;g.ui.openShop();assert.ok(g.ui.slots.every(s=>s.item));}
});
test('new enemy traits, learned spells and active spell areas survive exact saves',()=>{
  const g=create();g.reset();g.player.level=30;g.player.upgradeWeapon('meteor');g.player.upgradeWeapon('rift');g.nextId=1;
  const e=new N.Enemy(g,'cultist',160,50,1,false,{level:28,tier:'veteran',trait:'mending'});e.exposed=1.3;e.lastHit=.7;e.burnSource='meteor';g.enemies=[e];g.hash.insert(e);g.combat.meteor();g.combat.rift();g.combat.areas.active[0].age=.4;
  g.checkpoint('wave');assert.ok(g.save.validCheckpoint(g.save.data.checkpoint));assert.ok(g.continueRun());assert.equal(g.player.weapons.rift,1);assert.equal(g.enemies[0].level,28);assert.equal(g.enemies[0].trait,'mending');assert.equal(g.enemies[0].exposed,1.3);assert.equal(g.enemies[0].burnSource,'meteor');assert.equal(g.combat.areas.active.length,2);assert.equal(g.combat.areas.active[0].age,.4);
});
test('multi-crits work above 100% and armor ratings increase without a hard cap',()=>{
  const g=create();g.reset();g.player.critChance=2;const crit=N.critRoll(g.player);assert.equal(crit.crit,true);assert.ok(Math.abs(crit.multiplier-2.7)<1e-8);
  g.player.armor=100;assert.ok(N.armorReduction(g.player)>.99);g.player.armor=10000;assert.ok(N.armorReduction(g.player)>.999);
});
test('very fast casts retain their aggregate damage instead of stopping at frame rate',()=>{
  const g=create();g.reset();g.player.attackInterval=.0001;g.player.projectileCount=100;g.player.critChance=0;g.combat.cooldown=0;
  const e=new N.Enemy(g,'warden',300,0,1);e.maxHp=e.hp=1e12;g.enemies=[e];g.hash.insert(e);g.combat.update(1/60);
  assert.ok(g.combat.projectiles.active.length<=24);const represented=g.combat.projectiles.active.reduce((sum,b)=>sum+b.damage,0);assert.ok(represented>=g.player.damage*100*160);assert.ok(g.combat.cooldown>=0);
});
test('huge spell range queries populated cells rather than iterating empty world space',()=>{
  const hash=new N.SpatialHash(),out=[];for(let i=0;i<100;i++)hash.insert({x:i*80,y:-i*20,alive:true});hash.query(-1e15,-1e15,1e15,1e15,out);assert.equal(out.length,100);
});
test('enemy atlas renders walk, attack, hurt and death crops with real clip boundaries',()=>{
  const g=create();g.reset();const e=new N.Enemy(g,'skeleton',100,0,1),calls=[],old=context.drawImage;context.drawImage=(...args)=>calls.push(args);
  try{for(const state of ['walk','attack','hurt','death'])N.drawEnemy(context,g.images,e,0,0,80,88,state,.6);}finally{context.drawImage=old;}
  assert.equal(calls.length,4);for(let i=0;i<calls.length;i++){const clip=sandbox.NOCTURNE_ENEMY_ATLAS.clips[['walk','attack','hurt','death'][i]];assert.ok(calls[i][1]>=clip.start*96&&calls[i][1]<(clip.start+clip.frames)*96);}
});
test('audio starts quiet and never creates a looping noise buffer',()=>{
  const g=create(),a=new FakeAudioContext(),engine=g.combat.audioEngine;engine.attach(a);engine.setEnabled(true);engine.transport(true);
  assert.equal(engine.ambience,false);assert.equal(engine.ambient.gain.value,0);assert.ok(engine.ambientSources.every(n=>!n.loop));engine.setAmbience(true);assert.ok(engine.ambient.gain.value>0);engine.setAmbience(false);assert.equal(engine.ambient.gain.value,0);engine.dispose();
});

test('floating origin keeps extreme movement drawable and preserves relative world state',()=>{
  const g=create();g.reset();g.player.x=2e8;g.player.y=-3e8;g.nextId=1;g.enemies=[new N.Enemy(g,'slime',2e8+150,-3e8+70,1)];
  g.loot=[new N.Loot(g,'gold',2e8+50,-3e8-10,3)];g.combat.hazard(2e8+40,-3e8,50,1,20,1);g.rebaseWorld();
  assert.equal(g.player.x,0);assert.equal(g.camera.x,0);assert.equal(g.enemies[0].x,150);assert.equal(g.loot[0].y,-10);assert.equal(g.combat.hazards.active[0].x,40);assert.equal(g.worldOrigin.x,2e8);
  g.checkpoint('wave');assert.ok(g.continueRun());assert.equal(g.worldOrigin.x,2e8);g.draw();
});
test('actual v3 merchant data migrates armor, learned spells and genuinely empty stock',()=>{
  const g=create();g.reset();g.ui.openShop();const c=JSON.parse(JSON.stringify(g.save.data.checkpoint));
  delete c.player.progress;delete c.player.rules;c.player.armor=.45;
  for(const id of ['meteor','lance','thorn','rift']){delete c.player.weapons[id];delete c.stats.weapons[id];}
  for(const id of ['sunstone','soulchain','thornheart','voidglass'])delete c.player.relics[id];
  c.slots=Array.from({length:4},()=>({id:null,price:0,locked:false}));g.save.data.checkpoint=c;
  assert.ok(g.save.validCheckpoint(c));assert.ok(g.continueRun());assert.ok(Math.abs(N.armorReduction(g.player)-.45)<1e-10);assert.equal(g.player.weapons.meteor,0);assert.ok(g.ui.slots.every(s=>s.item&&!s.sold));
});


test('ordinary enemy health does not rubber-band to player damage or wave',()=>{
 const g=create();g.reset();const config={level:60,tier:'fodder',trait:'none'},a=new N.Enemy(g,'slime',100,0,1,false,config);g.player.damage=1e9;g.player.attackInterval=.00001;g.player.projectileCount=10000;g.wave=10000;
 const b=new N.Enemy(g,'slime',100,0,2,false,config);assert.equal(a.maxHp,b.maxHp);assert.equal(a.speed,b.speed);assert.equal(a.damage,b.damage);
});
test('low-level mix transitions gently and levels remain uncapped',()=>{
 const g=create();g.reset();for(const level of [1,8,20,40,100,100000]){g.player.level=level;const mix=N.EnemyDirector.bands(g);assert.ok(Math.abs(mix.fodder+mix.regular+mix.veteran-1)<1e-10);for(let i=0;i<100;i++){const e=N.EnemyDirector.roll(g,i);assert.ok(e.level>=1);if(level>=40&&i<80)assert.ok(e.level>=Math.floor(level*.5)&&e.level<=Math.floor(level*.7));}}
});
test('right-click special charge increases damage and respects a directed cone',()=>{
 function run(charge){const g=create();g.reset();g.player.critChance=0;g.player.lastX=1;g.player.lastY=0;const a=new N.Enemy(g,'gargoyle',140,0,1),b=new N.Enemy(g,'gargoyle',-140,0,2);a.hp=a.maxHp=b.hp=b.maxHp=10000;g.enemies=[a,b];assert.ok(g.abilities.begin());g.abilities.update(charge);assert.ok(g.abilities.release());assert.equal(b.hp,10000);assert.ok(g.player.progress.specialRemaining>0);assert.equal(g.abilities.begin(),false);return 10000-a.hp;}
 assert.ok(run(1.2)>run(0)*2);
});
test('special cycling observes unlocks and cannot bypass shared recovery',()=>{
 const g=create();g.reset();g.abilities.cycle();assert.equal(g.player.progress.special,'slash');g.player.level=16;g.abilities.cycle();assert.equal(g.player.progress.special,'frostfall');g.abilities.begin();g.abilities.release();const recovery=g.player.progress.specialRemaining;g.abilities.cycle();assert.equal(g.player.progress.special,'soulstorm');assert.equal(g.player.progress.specialRemaining,recovery);assert.equal(g.abilities.begin(),false);
});
test('special cooldown and charge freeze while game is paused',()=>{
 const g=create();g.reset();g.abilities.begin();g.update(.1);const charge=g.abilities.charge;g.state='paused';g.update(2);assert.equal(g.abilities.charge,charge);g.input.clear();assert.equal(g.abilities.charging,false);
});
test('Winter Dominion freezes ordinary foes while bosses resist',()=>{
 const g=create();g.reset();g.player.level=8;g.player.lastX=1;g.player.lastY=0;g.abilities.select('frostfall');const a=new N.Enemy(g,'gargoyle',240,0,1),b=new N.Enemy(g,'warden',260,0,2);a.hp=a.maxHp=b.hp=b.maxHp=100000;g.enemies=[a,b];g.abilities.begin();g.abilities.update(1.2);g.abilities.release();assert.equal(a.frozen,2);assert.equal(b.frozen,.15);assert.ok(g.stats.weapons.frostfall>0);
});
test('Soulstorm launches a full ring of piercing, attributed projectiles',()=>{
 const g=create();g.reset();g.player.level=16;g.abilities.select('soulstorm');g.abilities.begin();g.abilities.release();assert.ok(g.combat.projectiles.active.length>=12);assert.ok(g.combat.projectiles.active.every(b=>b.source==='soulstorm'&&b.pierce>=3));assert.ok(g.combat.projectiles.active.some(b=>b.vx<0)&&g.combat.projectiles.active.some(b=>b.vx>0));
});
test('three jewels bank essence; manual transformation buffs movement and damage and expires',()=>{
 const g=create();g.reset();for(let i=0;i<3;i++)g.abilities.jewel(34);assert.equal(g.player.progress.demonTime,0);assert.equal(g.player.progress.essence,102);assert.equal(g.abilities.transform(),true);assert.equal(g.player.progress.demonTime,12);assert.equal(g.stats.transformations,1);assert.equal(g.player.progress.essence,2);const e=new N.Enemy(g,'gargoyle',100,0,1);assert.ok(Math.abs(N.outgoingMultiplier(g.player,e,'bolt')-1.8)<1e-10);g.input.x=1;g.player.update(1);assert.ok(Math.abs(g.player.x-g.player.speed*1.45)<1e-8);g.abilities.jewel(34);assert.equal(g.player.progress.essence,36);g.abilities.update(12);assert.equal(g.player.progress.demonTime,0);assert.equal(g.player.speed,195);
});
test('Demon fear reverses pursuit, cancels charge, and stops cultist attacks',()=>{
 const g=create();g.reset();g.player.progress.demonTime=8;const e=new N.Enemy(g,'hound',150,0,1);e.charge=.4;e.chargeX=-1;e.update(.1);assert.ok(e.terrified&&e.x>150);assert.equal(e.charge,0);const c=new N.Enemy(g,'cultist',150,0,2);c.attackTimer=0;c.update(.1);assert.equal(g.combat.hostile.active.length,0);g.player.progress.demonTime=0;e.update(.1);assert.equal(e.terrified,false);
});
test('bosses resist fear and Overlords summon smaller weaker minions',()=>{
 const g=create();g.reset();g.wave=10;g.player.level=100;g.player.progress.demonTime=8;g.spawnBoss();assert.equal(g.boss.type,'overlord');g.boss.spawnDelay=0;g.boss.summonTimer=.01;g.boss.x=150;g.boss.y=0;g.boss.update(.1);assert.equal(g.boss.terrified,false);const minions=g.enemies.filter(e=>e.tier==='minion');assert.ok(minions.length>=3);assert.ok(minions.every(e=>e.level>=80&&e.spawnDelay>0));
});
test('seventh wave interlude Overlord must be defeated before merchant',()=>{
 const g=create();g.reset();g.wave=7;g.startWave(true);g.player.hp=g.player.maxHp=1e8;g.waveTime=g.waveDuration*.55;g.update(.01);assert.equal(g.boss.type,'overlord');g.waveTime=g.waveDuration+1;g.update(.01);assert.equal(g.state,'playing');g.player.x=g.sanctum.x;g.player.y=g.sanctum.y;g.update(.01);g.boss.spawnDelay=0;g.boss.hit(1e12);g.player.pendingLevels=0;g.update(.01);assert.ok(['shop','levelup'].includes(g.state));
});
test('new automatic spells unlock at 3/6/9/12 and keep unlimited ranks',()=>{
 const g=create();g.reset();for(const [id,level]of [['rapid',3],['cannon',6],['burst',9],['glacier',12]]){g.player.level=level-1;assert.equal(g.player.upgradeWeapon(id),false);g.player.level=level;assert.ok(g.player.upgradeWeapon(id));g.player.weapons[id]=100;assert.ok(g.player.upgradeWeapon(id));assert.equal(g.player.weapons[id],101);}
});
test('new automatic projectiles preserve spell source and differentiated behavior',()=>{
 const g=create();g.reset();g.player.level=20;g.player.critChance=0;const e=new N.Enemy(g,'warden',200,12,1);g.enemies=[e];g.hash.insert(e);
 for(const id of ['rapid','cannon','burst','glacier']){g.combat.clear();g.player.weapons[id]=4;g.player.relics[N.WEAPONS[id].relic]=true;g.combat.directedSpell(id);const b=g.combat.projectiles.active[0];assert.equal(b.source,id);if(id==='cannon')assert.ok(b.pierce>=6&&b.blast===65);if(id==='burst')assert.equal(g.combat.projectiles.active.length,8);if(id==='glacier')assert.equal(b.freeze,.6);}
});
test('glacier impact detonates an area, slows and freezes neighbors',()=>{
 const g=create();g.reset();g.player.level=20;g.player.critChance=0;g.player.weapons.glacier=4;g.player.relics.iceheart=true;const a=new N.Enemy(g,'gargoyle',100,12,1),b=new N.Enemy(g,'gargoyle',110,60,2);a.hp=a.maxHp=b.hp=b.maxHp=10000;g.enemies=[a,b];for(const e of g.enemies)g.hash.insert(e);g.combat.directedSpell('glacier');g.combat.cooldown=99;g.combat.spellTimers.glacier=99;g.combat.update(.3);assert.ok(a.slow>0&&b.slow>0);assert.equal(b.frozen,.6);assert.ok(b.hp<10000&&g.stats.weapons.glacier>0);
});
test('new form, ritual, projectile, overlord and jewel state round-trip exactly',()=>{
 const g=create();g.reset();g.wave=10;g.player.level=20;g.player.weapons.cannon=4;g.player.progress.special='frostfall';g.player.progress.arsenal.slash=17;g.player.progress.essence=72;g.player.progress.demonTime=4.25;g.player.progress.specialRemaining=3.4;g.spawnBoss();g.boss.summonTimer=2.2;g.boss.facing='NW';g.boss.spawnDelay=0;g.boss.x=200;g.boss.y=0;g.combat.directedSpell('cannon');g.loot.push(new N.Loot(g,'jewel',50,0,34));g.checkpoint('wave');assert.ok(g.save.validCheckpoint(g.save.data.checkpoint));assert.ok(g.continueRun());assert.equal(g.player.progress.demonTime,4.25);assert.equal(g.player.progress.specialRemaining,3.4);assert.equal(g.player.progress.arsenal.slash,17);assert.equal(g.boss.type,'overlord');assert.equal(g.boss.summonTimer,2.2);assert.equal(g.boss.facing,'NW');assert.equal(g.loot[0].type,'jewel');assert.equal(g.combat.projectiles.active[0].source,'cannon');
});
test('actual v4 data upgrades without resetting armor, spells, or checkpoint',()=>{
 const g=create();g.reset();g.player.armor=3;g.ui.openShop();const c=JSON.parse(JSON.stringify(g.save.data.checkpoint));c.player.rules=4;
 for(const id of ['rapid','cannon','burst','glacier']){delete c.player.weapons[id];delete c.player.progress.mastery[id];delete c.stats.weapons[id];}
 for(const key of ['arsenal','special','essence','demonTime','specialRemaining'])delete c.player.progress[key];g.save.data.checkpoint=c;assert.ok(g.save.validCheckpoint(c));assert.ok(g.continueRun());assert.equal(g.player.armor,3);assert.equal(g.player.progress.arsenal.slash,1);assert.equal(g.player.weapons.rapid,0);assert.equal(g.player.progress.mastery.glacier,0);assert.equal(g.state,'shop');
});
test('enemy atlas has eight rows and correct facing for all six states',()=>{
 const g=create();g.reset();const calls=[],old=context.drawImage;context.drawImage=(...args)=>calls.push(args);
 try{for(const dir of sandbox.NOCTURNE_ENEMY_ATLAS.directions)for(const state of Object.keys(sandbox.NOCTURNE_ENEMY_ATLAS.clips))N.drawEnemy(context,g.images,{type:'overlord',game:g,facing:dir},0,0,80,107,state,.5);}finally{context.drawImage=old;}
 assert.equal(calls.length,48);for(let i=0;i<calls.length;i++)assert.equal(calls[i][2],Math.floor(i/6)*128);
});
test('new snapshot validation rejects corrupted form and projectile content',()=>{
 const g=create();g.reset();g.checkpoint('wave');const c=JSON.parse(JSON.stringify(g.save.data.checkpoint));c.player.progress.demonTime=NaN;assert.equal(g.save.validCheckpoint(c),false);c.player.progress.demonTime=0;c.player.progress.arsenal.slash=-1;assert.equal(g.save.validCheckpoint(c),false);
});

test('essence banks above 100 without automatic activation, including during an active form',()=>{
  const g=create();g.reset();g.abilities.jewel(100);g.abilities.update(3);assert.equal(g.player.progress.demonTime,0);g.abilities.jewel(275);assert.equal(g.player.progress.essence,375);
  assert.ok(g.abilities.transform());assert.equal(g.player.progress.essence,75);g.abilities.jewel(125);assert.equal(g.player.progress.essence,200);const time=g.player.progress.demonTime;assert.equal(g.abilities.transform(),false);assert.equal(g.player.progress.demonTime,time);
  g.abilities.update(time);assert.equal(g.player.progress.demonTime,0);assert.equal(g.player.progress.essence,200);
});
test('stacked manual form consumes complete charges and increases duration, damage and speed',()=>{
  const g=create();g.reset();g.abilities.jewel(425);const preview=g.abilities.preview();assert.equal(preview.charges,4);assert.equal(preview.duration,36);assert.equal(preview.power,2.4);assert.equal(preview.speed,1.65);
  assert.ok(g.abilities.transform());assert.equal(g.player.progress.essence,25);assert.equal(g.player.progress.demonDuration,36);assert.equal(g.player.progress.demonPower,2.4);g.input.x=1;g.player.update(1);assert.ok(Math.abs(g.player.x-g.player.speed*1.65)<1e-8);
});
test('manual activation is inert while paused, at the shop, dead, or below the cost',()=>{
  const g=create();g.reset();g.abilities.jewel(99);assert.equal(g.abilities.transform(),false);g.abilities.jewel(101);
  for(const state of ['paused','shop','dead','levelup','title']){g.state=state;assert.equal(g.abilities.transform(),false);assert.equal(g.player.progress.essence,200);}
  g.state='playing';assert.equal(g.abilities.transform(),true);
});
test('banked essence and long boosted forms round-trip without spending or duration caps',()=>{
  const g=create();g.reset();g.abilities.jewel(100025);g.abilities.transform();g.abilities.jewel(555);g.abilities.update(4.25);const before=JSON.stringify(g.player.progress);assert.ok(g.player.progress.demonTime>3600);g.checkpoint('wave');assert.ok(g.save.validCheckpoint(g.save.data.checkpoint));g.continueRun();assert.equal(JSON.stringify(g.player.progress),before);
});
test('legacy v5 active form receives base boost defaults and never auto-spends old essence',()=>{
  const g=create();g.reset();g.player.progress.demonTime=7.5;g.player.progress.essence=100;g.checkpoint('wave');const c=g.save.data.checkpoint;
  for(const k of ['demonDuration','demonPower','demonSpeed'])delete c.player.progress[k];delete c.world.sanctum;assert.ok(g.save.validCheckpoint(c));g.continueRun();assert.equal(g.player.progress.demonPower,1.8);assert.equal(g.player.progress.demonSpeed,1.45);assert.equal(g.player.progress.demonTime,7.5);g.abilities.update(7.5);assert.equal(g.player.progress.demonTime,0);assert.equal(g.player.progress.essence,100);
});
test('damage feedback uses actual vitality lost and is independent of a saturated number pool',()=>{
  const g=create();g.reset();const p=g.player;p.invulnerable=0;p.armor=1;p.progress.shield=5;
  while(g.combat.numbers.acquire()){}p.hurt(30);assert.equal(p.hp,100);assert.equal(p.healthEvents.length,1);assert.equal(p.healthEvents[0].kind,'hurt');assert.equal(p.healthEvents[0].amount,10);assert.equal(p.healthVisible,2.5);
  const old=p.healthEvents[0].amount;p.hurt(30);assert.equal(p.healthEvents[0].amount,old);
});
test('healing pickup reports only restored vitality and never shows overheal',()=>{
  const g=create();g.reset();g.player.hp=103;new N.Loot(g,'heal',0,0,30).collect();assert.equal(g.player.hp,110);assert.equal(g.player.healthEvents.at(-1).amount,7);assert.equal(g.player.healthEvents.at(-1).kind,'heal');g.player.healthEvents=[];assert.equal(g.player.heal(30),0);assert.equal(g.player.healthEvents.length,0);
});
test('regeneration coalesces feedback, does not flood events, and stops at maximum vitality',()=>{
  const g=create();g.reset();g.player.hp=10;g.player.regen=4;
  for(let i=0;i<120;i++)g.player.update(1/60);assert.ok(Math.abs(g.player.hp-18)<1e-8);assert.ok(g.player.healthEvents.length<=2);assert.ok(g.player.healthEvents.every(e=>e.kind==='heal'&&e.amount>0));
});
test('player feedback freezes with the world and renders outlined damage and healing in low quality',()=>{
  const g=create();g.reset();g.quality='low';g.reducedMotion=true;g.player.hp=30;g.player.invulnerable=0;g.player.hurt(10);g.player.heal(3);const before=JSON.stringify(g.player.healthEvents);g.state='paused';g.update(10);assert.equal(JSON.stringify(g.player.healthEvents),before);
  const texts=[],fill=context.fillText;context.fillText=(text)=>texts.push(text);try{N.drawVitality(g.player,context);}finally{context.fillText=fill;}assert.ok(texts.includes('LOW VITALITY'));assert.ok(texts.some(t=>t.includes('−10')));assert.ok(texts.some(t=>t.includes('+3')));
});
test('low-health edges appear only below 30 percent and disappear on healing',()=>{
  const g=create();g.reset();g.reducedMotion=true;g.quality='low';let count=0;const old=context.createRadialGradient;context.createRadialGradient=()=>{count++;return gradient;};
  try{g.player.hp=g.player.maxHp*.1;N.drawLowHealth(g,context);assert.equal(count,1);g.player.heal(g.player.maxHp);N.drawLowHealth(g,context);assert.equal(count,1);g.state='title';g.player.hp=1;N.drawLowHealth(g,context);assert.equal(count,1);}finally{context.createRadialGradient=old;}
});
test('every ordinary wave creates a stable distant sanctum and cannot end on the timer',()=>{
  const g=create();g.reset();g.waveTime=g.waveDuration-.02;g.update(.01);assert.equal(g.sanctum,null);g.update(.02);assert.equal(g.state,'playing');assert.equal(g.sanctum.phase,'waiting');assert.ok(Math.abs(Math.sqrt(N.dist2(g.player,g.sanctum))-1050)<1e-6);const position=JSON.stringify(g.sanctum);g.update(.1);assert.equal(JSON.stringify(g.sanctum),position);assert.equal(g.boss,null);
});
test('sanctum approach summons exactly one guardian and only its death ends the wave',()=>{
  const g=create();g.reset();g.waveTime=g.waveDuration;g.update(.01);g.player.x=g.sanctum.x;g.player.y=g.sanctum.y;g.update(.01);assert.equal(g.sanctum.phase,'fighting');assert.equal(g.boss.type,'overlord');assert.ok(g.boss.guardian);assert.equal(g.boss.spawnDelay,1.2-0.01);g.update(.01);assert.equal(g.enemies.filter(e=>e.boss).length,1);assert.equal(g.state,'playing');g.boss.spawnDelay=0;g.boss.hit(1e9);assert.equal(g.sanctum.phase,'cleared');g.update(.01);assert.ok(['shop','levelup'].includes(g.state));
});
test('every sanctum has a Final Sovereign and ordinary spawns stop during the final hunt',()=>{
  const g=create();g.reset();g.wave=5;g.startWave(true);g.waveTime=g.waveDuration;g.spawnClock=-10;g.update(.01);assert.equal(g.enemies.length,0);g.player.x=g.sanctum.x;g.player.y=g.sanctum.y;g.update(.01);assert.equal(g.boss.type,'overlord');assert.equal(g.enemies.length,1);
});
test('a surviving invasion becomes the final guardian without duplicate bosses',()=>{
  const g=create();g.reset();g.wave=7;g.startWave(true);g.waveTime=g.waveDuration*.55;g.update(.01);const id=g.boss.id;g.waveTime=g.waveDuration;g.update(.01);assert.equal(g.sanctum.phase,'waiting');g.player.x=g.sanctum.x;g.player.y=g.sanctum.y;g.update(.01);assert.equal(g.sanctum.bossId,id);assert.equal(g.enemies.filter(e=>e.boss).length,1);assert.equal(g.boss.type,'overlord');
});
test('final guardian stays in its arena even when the player runs beyond recall distance',()=>{
  const g=create();g.reset();g.waveTime=g.waveDuration;g.update(.01);g.player.x=g.sanctum.x;g.player.y=g.sanctum.y;g.update(.01);g.boss.spawnDelay=0;g.player.x+=5000;g.boss.x=g.sanctum.x+1000;g.update(.01);assert.ok(N.dist2(g.boss,g.sanctum)<=(g.sanctum.radius-45)**2+1e-6);assert.ok(N.dist2(g.boss,g.player)>2200**2);
});
test('waiting and fighting sanctums round-trip with exact location, boss HP and identity',()=>{
  const g=create();g.reset();g.waveTime=g.waveDuration;g.update(.01);const pos=JSON.stringify(g.sanctum);g.checkpoint('wave');g.continueRun();assert.equal(JSON.stringify(g.sanctum),pos);assert.equal(g.state,'playing');g.player.x=g.sanctum.x;g.player.y=g.sanctum.y;g.update(.01);g.boss.hp-=25;g.boss.spawnDelay=.8;const hp=g.boss.hp,id=g.boss.id;g.checkpoint('wave');assert.ok(g.save.validCheckpoint(g.save.data.checkpoint));g.continueRun();assert.equal(g.sanctum.bossId,id);assert.equal(g.boss.hp,hp);assert.equal(g.boss.spawnDelay,.8);g.update(.01);assert.equal(g.enemies.filter(e=>e.boss).length,1);
});
test('legacy elapsed waves still require a newly generated final sanctum',()=>{
  const g=create();g.reset();g.waveTime=g.waveDuration+1;g.checkpoint('wave');delete g.save.data.checkpoint.world.sanctum;assert.ok(g.continueRun());g.update(.01);assert.equal(g.sanctum.phase,'waiting');assert.equal(g.state,'playing');
});
test('corrupt sanctums and non-finite form boosts are rejected without throwing',()=>{
  const g=create();g.reset();g.waveTime=g.waveDuration;g.update(.01);g.checkpoint('wave');const copy=()=>JSON.parse(JSON.stringify(g.save.data.checkpoint));
  for(const bad of [{phase:'fake'},{x:null},{radius:-1},{phase:'fighting',bossId:99},{phase:'cleared',bossId:1}]){const c=copy();Object.assign(c.world.sanctum,bad);assert.equal(g.save.validCheckpoint(c),false);}
  const c=copy();c.world.sanctum.phase='fighting';c.world.sanctum.bossId=1;c.world.enemies={};assert.equal(g.save.validCheckpoint(c),false);
  for(const bad of [-1,NaN,Infinity]){const d=copy();d.player.progress.demonPower=bad;assert.equal(g.save.validCheckpoint(d),false);}
});
test('floating origin rebases sanctum, guardian and radar objective together',()=>{
  const g=create();g.reset();g.waveTime=g.waveDuration;g.update(.01);g.player.x=g.sanctum.x;g.player.y=g.sanctum.y;g.update(.01);const dx=g.sanctum.x-g.player.x,dy=g.sanctum.y-g.player.y;g.player.x+=1e6;g.sanctum.x+=1e6;g.boss.x+=1e6;g.rebaseWorld();assert.ok(Math.abs(g.sanctum.x-g.player.x-dx)<1e-6);assert.ok(Math.abs(g.sanctum.y-g.player.y-dy)<1e-6);assert.ok(N.dist2(g.boss,g.sanctum)<1);g.checkpoint('wave');assert.ok(g.save.validCheckpoint(g.save.data.checkpoint));
});
test('radar includes the sanctum on phone and desktop independently of camera zoom',()=>{
  const g=create();g.reset();g.waveTime=g.waveDuration;g.update(.01);
  for(const width of [390,844,1440]){g.width=width;for(const zoom of [.65,1.55]){g.setZoom(zoom);const r=N.radarLayout(g),point=N.radarPoint(g,g.sanctum,r),px=point.x-r.x,py=point.y-r.y;assert.ok(px>=6&&px<=r.size-6&&py>=6&&py<=r.size-6);assert.ok(r.x>=0&&r.x+r.size<=width);N.drawRadar(g,context);}}
});
test('radar adapts its grid for distant objectives without an unbounded draw loop',()=>{
  const g=create();g.reset();g.sanctum={x:1e12,y:-1e12,radius:330,phase:'waiting',bossId:null};let lines=0;const old=context.lineTo;context.lineTo=()=>lines++;try{N.drawRadar(g,context);}finally{context.lineTo=old;}assert.ok(lines<100);
});
test('Demon HUD shows real stacks, previews growth and keeps meter widths within bounds',()=>{
  const g=create();g.reset();g.abilities.jewel(425);g.ui.hudFrame=3;g.ui.updateHUD();assert.ok(elements.get('form-text').textContent.includes('4 CHARGES'));assert.equal(elements.get('form-fill').style.width,'100%');assert.ok(elements.get('demon-preview').textContent.includes('36s'));assert.equal(elements.get('demon-button').disabled,false);g.abilities.transform();g.ui.hudFrame=3;g.ui.updateHUD();assert.equal(elements.get('form-fill').style.width,'100%');assert.equal(elements.get('demon-button').disabled,true);
});


function finalFight(level=1,wave=1){
 const g=create();g.reset();g.player.level=level;g.wave=wave;g.startWave(true);g.waveTime=g.waveDuration;N.Sanctum.create(g);g.player.x=g.sanctum.x-200;g.player.y=g.sanctum.y;N.Sanctum.update(g);g.boss.spawnDelay=0;return g;
}
function guardianTick(g,seconds){for(let left=seconds;left>1e-9;left-=.01)N.FinalGuardian.update(g,g.boss,Math.min(.01,left));}
test('Final Sovereign health follows whole-build sustained damage instead of the old fivefold floor',()=>{
 for(const level of [1,25,100,500])for(const wave of [1,7,20]){
  const g=finalFight(level,wave),b=g.boss,ref=new N.Enemy(g,'overlord',0,0,100,false,{level:b.level,tier:'overlord',trait:'none'});
  const estimate=Math.exp(N.Difficulty.assess(g.player).logDps);assert.ok(b.maxHp/estimate>=32&&b.maxHp/estimate<=48);assert.ok(b.damage>=ref.damage*5-1e-8);assert.ok(b.level>level);assert.equal(b.guardian.schema,3);
 }
});
test('final stats lock at encounter start and never mirror subsequent player damage',()=>{
 const g=finalFight(100,10),b=g.boss,hp=b.maxHp,damage=b.damage;b.hp-=50;g.player.damage=1e8;g.player.level=1000;N.FinalGuardian.promote(g,b);guardianTick(g,.1);assert.equal(b.maxHp,hp);assert.equal(b.damage,damage);assert.equal(b.hp,hp-50);
});
test('an invasion ascends once into a fully healed Sovereign without duplicating its entity',()=>{
 const g=create();g.reset();g.wave=7;g.startWave(true);g.spawnBoss(true,false);const b=g.boss,id=b.id;b.hp=1;g.waveTime=g.waveDuration;N.Sanctum.create(g);g.player.x=g.sanctum.x;g.player.y=g.sanctum.y;N.Sanctum.update(g);assert.equal(g.boss.id,id);assert.equal(b.hp,b.maxHp);assert.ok(b.guardian);const hp=b.hp;b.hp-=100;N.Sanctum.update(g);assert.equal(b.hp,hp-100);assert.equal(g.enemies.filter(e=>e.boss).length,1);
});
test('ordinary invasion Overlords retain their original stats and attack behavior',()=>{
 const g=create();g.reset();g.wave=7;g.spawnBoss(true,false);assert.equal(g.boss.guardian,undefined);g.boss.spawnDelay=0;g.boss.attackTimer=0;g.boss.update(.01);assert.equal(g.combat.hazards.active.length,1);
});
test('Hellfire Salvo has a warning before ten rapid, finite projectiles',()=>{
 const g=finalFight(),b=g.boss,q=b.guardian;q.cooldown=0;guardianTick(g,.01);assert.equal(q.action,'salvo');assert.equal(g.combat.hostile.active.length,0);guardianTick(g,.8);assert.equal(g.combat.hostile.active.length,0);guardianTick(g,1.6);assert.equal(g.combat.hostile.active.length,10);assert.ok(g.combat.hostile.active.every(s=>s.damage===N.FinalGuardian.damage(b,.15,.22)&&Number.isFinite(s.vx)&&Number.isFinite(s.vy)));
});
test('enraged Sovereign increases its salvo to fourteen shots and shortens recovery',()=>{
 const g=finalFight(),q=g.boss.guardian;g.boss.hp=g.boss.maxHp*.39;q.cooldown=0;guardianTick(g,1);assert.equal(q.salvo+g.combat.hostile.active.length,14);assert.equal(q.cooldown,2.8);guardianTick(g,1.8);assert.equal(g.combat.hostile.active.length,14);
});
test('Ash Meteors warn at fixed target positions before their damage becomes active',()=>{
 const g=finalFight(),b=g.boss,q=b.guardian;q.next=1;q.cooldown=0;guardianTick(g,.01);assert.equal(q.action,'meteors');assert.equal(g.combat.hazards.active.length,3);assert.ok(g.combat.hazards.active.every(h=>h.delay===1.15));const x=g.combat.hazards.active[0].x;g.player.invulnerable=0;g.combat.cooldown=99;const hp=g.player.hp;g.combat.update(1);assert.equal(g.player.hp,hp);g.combat.update(.16);assert.ok(g.player.hp<hp);assert.equal(g.combat.hazards.active[0].x,x);
});
test('Soul Reaping is directional: sidestepping the warned arc avoids its damage',()=>{
 const g=finalFight(),b=g.boss,q=b.guardian;g.player.x=b.x+150;g.player.y=b.y;q.next=2;N.FinalGuardian.begin(g,b);g.player.x=b.x-150;g.player.invulnerable=0;const hp=g.player.hp;q.windup=0;N.FinalGuardian.cast(g,b);assert.equal(g.player.hp,hp);
 g.player.x=b.x+150;q.next=2;N.FinalGuardian.begin(g,b);q.windup=0;N.FinalGuardian.cast(g,b);assert.ok(g.player.hp<hp);
});
test('Dread Aegis absorbs player spells, expires, and does not heal the guardian',()=>{
 const g=finalFight(),b=g.boss,q=b.guardian;q.next=3;N.FinalGuardian.begin(g,b);q.windup=0;N.FinalGuardian.cast(g,b);assert.equal(q.ward,q.wardMax);const hp=b.hp,ward=q.ward;b.hit(50);assert.equal(b.hp,hp);assert.equal(q.ward,ward-50);guardianTick(g,3);assert.equal(q.ward,0);b.hit(50);assert.equal(b.hp,hp-50);
});
test('guardian windups, partial wards and salvo clocks freeze during pause',()=>{
 const g=finalFight(),q=g.boss.guardian;q.cooldown=0;guardianTick(g,.01);const before=JSON.stringify(q);g.state='paused';g.update(50);assert.equal(JSON.stringify(q),before);
});
test('guardian attack, aim, partial ward and health survive an exact world save',()=>{
 const g=finalFight(100,5),q=g.boss.guardian;q.next=0;q.cooldown=0;guardianTick(g,1.2);q.ward=Math.min(123,q.wardMax*.5);q.wardTime=1.75;g.boss.hp-=150;const before=JSON.stringify(q),hp=g.boss.hp,id=g.boss.id;g.checkpoint('wave');assert.ok(g.save.validCheckpoint(g.save.data.checkpoint));assert.ok(g.continueRun());assert.equal(JSON.stringify(g.boss.guardian),before);assert.equal(g.boss.hp,hp);assert.equal(g.boss.id,id);
});
test('v5.1.0 fighting guardian upgrades once while preserving health fraction and identity',()=>{
 const g=finalFight(20,5);g.checkpoint('wave');const c=g.save.data.checkpoint,b=c.world.enemies.find(e=>e.id===c.world.sanctum.bossId);delete b.guardian;b.type='warden';b.maxHp=800;b.hp=300;const id=b.id;assert.ok(g.save.validCheckpoint(c));g.continueRun();assert.equal(g.boss.id,id);assert.ok(g.boss.guardian);assert.ok(Math.abs(g.boss.hp/g.boss.maxHp-.375)<1e-10);const hp=g.boss.hp;g.checkpoint('wave');g.continueRun();assert.equal(g.boss.hp,hp);
});
test('corrupt guardian state is rejected instead of bypassing attack or ward recovery',()=>{
 const g=finalFight();g.checkpoint('wave');const raw=JSON.stringify(g.save.data.checkpoint);
 for(const bad of [{salvo:25},{next:-1},{action:'unknown'},{windup:-1},{cooldown:Infinity},{ward:1e20},{targetX:NaN}]){const c=JSON.parse(raw);Object.assign(c.world.enemies.find(e=>e.guardian).guardian,bad);assert.equal(g.save.validCheckpoint(c),false);}
});
test('floating origin rebases stored guardian aim with the arena and player',()=>{
 const g=finalFight(),q=g.boss.guardian;q.cooldown=0;guardianTick(g,.01);const dx=q.targetX-g.boss.x;g.player.x+=1e6;g.boss.x+=1e6;g.sanctum.x+=1e6;q.targetX+=1e6;g.rebaseWorld();assert.ok(Math.abs(q.targetX-g.boss.x-dx)<1e-8);
});
test('player Aegis scales with vitality and level without consuming essence or gold',()=>{
 const g=create();g.reset();g.player.level=100;g.player.maxHp=g.player.hp=400;g.player.gold=90;g.abilities.jewel(425);assert.ok(g.abilities.shield());const q=g.player.progress;assert.equal(q.aegis,500);assert.equal(q.aegisMax,500);assert.equal(q.aegisTime,2.5);assert.equal(q.aegisRemaining,8);assert.equal(q.essence,425);assert.equal(g.player.gold,90);
});
test('Aegis absorbs damage after armor and before a Stone oath; overflow hits vitality',()=>{
 const g=create();g.reset();g.abilities.shield();const p=g.player,q=p.progress;p.invulnerable=0;p.armor=1;q.aegis=20;q.shield=10;p.hurt(100);assert.equal(p.hp,90);assert.equal(q.aegis,0);assert.equal(q.aegisTime,0);assert.equal(q.shield,0);assert.equal(g.stats.damageTaken,20);
});
test('Aegis blocks a rapid burst while respecting per-hit immunity and its finite charge',()=>{
 const g=finalFight(),p=g.player;g.abilities.shield();p.invulnerable=0;const hp=p.hp,capacity=p.progress.aegis;
 for(let i=0;i<10;i++){p.hurt(g.boss.damage*.1);g.abilities.update(.12);p.update(.12);}
 assert.equal(p.hp,hp);assert.ok(p.progress.aegis<capacity);assert.ok(p.progress.aegis>0);assert.equal(g.stats.damageTaken,0);
});
test('Aegis expires at 2.5s and cannot be raised again until its eight-second recovery ends',()=>{
 const g=create();g.reset();g.abilities.shield();g.abilities.update(2.5);assert.equal(g.player.progress.aegis,0);assert.equal(g.player.progress.aegisTime,0);assert.equal(g.abilities.shield(),false);g.abilities.update(5.49);assert.equal(g.abilities.shield(),false);g.abilities.update(.02);assert.equal(g.abilities.shield(),true);
});
test('Aegis charge and cooldown persist without a free refill on continue or pause',()=>{
 const g=create();g.reset();g.abilities.shield();g.player.invulnerable=0;g.player.hurt(20);g.abilities.update(1);const before=JSON.stringify(g.player.progress);g.checkpoint('wave');g.continueRun();assert.equal(JSON.stringify(g.player.progress),before);assert.equal(g.abilities.shield(),false);g.state='paused';g.update(20);assert.equal(JSON.stringify(g.player.progress),before);
});
test('shield activation is inert in menus, on death, and during recovery',()=>{
 const g=create();g.reset();for(const state of ['paused','shop','dead','levelup','title']){g.state=state;assert.equal(g.abilities.shield(),false);}g.state='playing';assert.equal(g.abilities.shield(),true);assert.equal(g.abilities.shield(),false);assert.equal(g.stats.shields,1);
});
test('corrupt shield capacity or timers are rejected while missing legacy shield fields migrate',()=>{
 const g=create();g.reset();g.abilities.shield();g.checkpoint('wave');const raw=JSON.stringify(g.save.data.checkpoint);
 for(const bad of [{aegis:1e8},{aegisTime:3},{aegisRemaining:9},{aegisTime:0},{aegisMax:-1}]){const c=JSON.parse(raw);Object.assign(c.player.progress,bad);assert.equal(g.save.validCheckpoint(c),false);}
 const c=JSON.parse(raw);for(const k of ['aegis','aegisMax','aegisTime','aegisRemaining'])delete c.player.progress[k];g.save.data.checkpoint=c;assert.ok(g.continueRun());assert.equal(g.player.progress.aegis,0);assert.equal(g.player.progress.aegisRemaining,0);
});
test('Aegis HUD previews capacity and displays active charge and recovery within bounds',()=>{
 const g=create();g.reset();g.ui.hudFrame=3;g.ui.updateHUD();assert.ok(elements.get('shield-text').textContent.includes('READY'));assert.equal(elements.get('shield-button').disabled,false);g.abilities.shield();g.ui.hudFrame=3;g.ui.updateHUD();assert.equal(elements.get('shield-button').disabled,true);assert.equal(elements.get('shield-fill').style.width,'100%');
});
test('death preserves the chapter and build, retains floor(gold/2), and saves a same-wave retry',()=>{
 const g=finalFight(20,7),p=g.player,slot=g.save.active.id;p.gold=101;p.xp=5;p.weapons.bolt=9;p.progress.talents.kindling=3;p.progress.essence=425;p.progress.demonTime=7;g.abilities.shield();p.hp=0;g.die();g.die();
 const c=g.save.data.checkpoint;assert.ok(g.save.validCheckpoint(c));assert.equal(g.save.active.id,slot);assert.equal(g.save.data.slots.length,1);assert.equal(c.wave,7);assert.equal(c.player.gold,50);assert.equal(g.deathSummary.lostGold,51);assert.equal(c.player.hp,c.player.maxHp);assert.equal(c.player.weapons.bolt,9);assert.equal(c.player.progress.talents.kindling,3);assert.equal(c.player.progress.essence,425);assert.equal(c.player.progress.demonTime,0);assert.equal(c.player.progress.aegis,0);assert.equal(c.world,undefined);assert.equal(g.save.data.profile.runs,1);
 assert.ok(g.retryWave());assert.equal(g.wave,7);assert.equal(g.waveTime,0);assert.equal(g.enemies.length,0);assert.equal(g.loot.length,0);assert.equal(g.player.hp,g.player.maxHp);assert.equal(g.player.gold,50);assert.equal(g.player.xp,5);assert.equal(g.player.progress.essence,425);assert.equal(g.sanctum,null);assert.equal(g.retryWave(),false);assert.equal(g.player.gold,50);
});
test('closing on the death screen and reloading retains the retry without a second penalty',()=>{
 const g=create();g.reset();g.wave=6;g.player.gold=77;g.die();const loaded=create();assert.ok(loaded.continueRun());assert.equal(loaded.wave,6);assert.equal(loaded.waveTime,0);assert.equal(loaded.player.gold,38);assert.equal(loaded.save.data.profile.runs,1);assert.equal(loaded.player.hp,loaded.player.maxHp);
});
test('each distinct death halves the current wallet once, including odd or empty wallets',()=>{
 for(const gold of [0,1,2,99,100,101]){const g=create();g.reset();const runs=g.save.data.profile.runs;g.player.gold=gold;g.die();g.die();assert.equal(g.player.gold,Math.floor(gold/2));assert.equal(g.deathSummary.lostGold,Math.ceil(gold/2));g.retryWave();assert.equal(g.player.gold,Math.floor(gold/2));g.die();assert.equal(g.player.gold,Math.floor(Math.floor(gold/2)/2));assert.equal(g.save.data.profile.runs,runs+2);}
});
test('fatal enemy contact, projectiles and floor hazards all preserve a valid recovery checkpoint',()=>{
 for(const source of ['contact','projectile','hazard']){const g=create();g.reset();g.player.hp=1;g.player.gold=20;g.player.invulnerable=0;g.combat.cooldown=99;
  if(source==='contact'){const e=new N.Enemy(g,'slime',0,0,1);g.enemies=[e];e.update(.01);}
  else if(source==='projectile'){g.combat.enemyShot(0,-12,0,-12,1,100);g.combat.update(.01);}
  else {g.combat.hazard(0,0,30,0,100,1);g.combat.update(.01);}
  assert.equal(g.state,'dead');assert.ok(g.save.validCheckpoint(g.save.data.checkpoint));assert.ok(g.retryWave());assert.equal(g.player.gold,10);assert.ok(g.combat.hostile.active.every(Boolean));assert.ok(g.combat.hazards.active.every(Boolean));
 }
});
test('pending level-up gifts survive death and are offered before replaying the wave',()=>{
 const g=create();g.reset();g.addXP(8);assert.equal(g.player.pendingLevels,1);g.die();assert.ok(g.save.validCheckpoint(g.save.data.checkpoint));g.retryWave();assert.equal(g.state,'levelup');assert.equal(g.player.level,2);assert.equal(g.player.pendingLevels,1);g.ui.chooseLevel(0);assert.equal(g.state,'playing');assert.equal(g.wave,1);assert.equal(g.waveTime,0);assert.equal(g.player.pendingLevels,0);
});
test('death only updates the active save slot and preserves other chapters byte-for-byte',()=>{
 const g=create();g.reset();const first=g.save.active.id,original=JSON.stringify(g.save.active);g.newRitual();g.player.gold=101;g.die();assert.equal(g.player.gold,50);assert.equal(JSON.stringify(g.save.data.slots.find(s=>s.id===first)),original);assert.equal(g.save.data.slots.length,2);
});
test('storage failure still allows a same-session retry with exactly one gold deduction',()=>{
 const g=create();g.reset();const old=sandbox.localStorage;sandbox.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 try{g.player.gold=100;g.die();assert.equal(g.save.available,false);assert.ok(g.retryWave());assert.equal(g.player.gold,50);assert.equal(g.waveTime,0);}finally{sandbox.localStorage=old;}
});
test('retry retains the current oath, prepared oath and merchant locks without consuming a second oath',()=>{
 const g=create();g.reset();g.player.gold=200;g.player.progress.activeOath='stone';g.player.progress.shield=3;g.player.progress.preparedOath='fortune';g.ui.rollSlot(g.ui.slots[0]);g.ui.slots[0].locked=true;const id=g.ui.slots[0].item.id,price=g.ui.slots[0].price;g.die();g.retryWave();assert.equal(g.player.progress.activeOath,'stone');assert.equal(g.player.progress.shield,35);assert.equal(g.player.progress.preparedOath,'fortune');assert.equal(g.ui.slots[0].item.id,id);assert.equal(g.ui.slots[0].price,price);assert.equal(g.ui.slots[0].locked,true);
});

// v5.1.2: exercise distinct builds at the same character level.
function equipStrong(p){Object.assign(p,{damage:600,attackInterval:.1,projectileCount:16,maxHp:500,armor:2});Object.assign(p.weapons,{rapid:4,cannon:3,lightning:4});p.hp=p.maxHp;}
test('shop stats increase encounter pressure without a level gain',()=>{
 const g=create();g.reset();g.player.level=25;g.wave=5;N.Difficulty.start(g);const before={...g.difficulty.plan};equipStrong(g.player);N.Difficulty.start(g);const after=g.difficulty.plan;
 assert.equal(after.level,before.level);for(const k of ['rating','pressure','effectiveLevel','effectiveWave','spawnMultiplier','aliveBudget','duration','invasionChance'])assert.ok(after[k]>before[k],k);
});
test('offense, vitality, armor, regeneration and mobility all contribute independently',()=>{
 const g=create();g.reset();const raw=JSON.stringify(g.player.progress),base=N.Difficulty.assess(g.player).rating;
 for(const [key,value] of Object.entries({damage:200,attackInterval:.05,projectileCount:12,critChance:4,critMultiplier:6,pierce:10,projectileSpeed:1500,maxHp:600,armor:4,regen:10,speed:500,dashCooldown:.3})){
  const p=Object.assign(Object.create(g.player),{[key]:value,progress:JSON.parse(raw)});assert.ok(N.Difficulty.assess(p).rating>base,key);
 }
});
test('learned spells, mastery, talents and evolution relics contribute to build strength',()=>{
 const g=create();g.reset();const p=g.player,base=N.Difficulty.assess(p).logDps;p.weapons.rapid=4;const learned=N.Difficulty.assess(p).logDps;assert.ok(learned>base);
 p.progress.mastery.rapid=20;const mastered=N.Difficulty.assess(p).logDps;assert.ok(mastered>learned);p.relics[N.WEAPONS.rapid.relic]=true;assert.ok(N.Difficulty.assess(p).logDps>mastered);
 const rating=N.Difficulty.assess(p).rating;p.progress.talents.kindling=30;assert.ok(N.Difficulty.assess(p).rating>rating);
});
test('wallet, wounds, stored essence and temporary Demon form never inflate permanent pressure',()=>{
 const g=create();g.reset();const before=JSON.stringify(N.Difficulty.assess(g.player));g.player.hp=1;g.player.gold=1e8;g.abilities.jewel(10000);g.abilities.transform();g.abilities.shield();assert.equal(JSON.stringify(N.Difficulty.assess(g.player)),before);
});
test('each equipped ritual uses its own rank and cooldown in the damage estimate',()=>{
 const g=create();g.reset();for(const id of ['slash','frostfall','soulstorm']){g.player.progress.special=id;g.player.progress.arsenal[id]=1;const before=N.Difficulty.assess(g.player).logDps;g.player.progress.arsenal[id]=20;assert.ok(N.Difficulty.assess(g.player).logDps>before,id);}
});
test('extreme multiplicative builds keep finite budgets while ordinary pressure stays bounded',()=>{
 const g=create();g.reset();Object.assign(g.player,{damage:1e100,attackInterval:1e-100,projectileCount:1e100,critChance:1e100,critMultiplier:1e100,maxHp:1e100,armor:1e100});
 const p=N.Difficulty.assess(g.player),b=N.Difficulty.boss(g);assert.equal(p.pressure,3.5);assert.ok(Number.isFinite(p.logDps));assert.ok(Number.isFinite(N.FinalGuardian.health(b)));assert.ok(N.FinalGuardian.health(b)<=1.001e150);N.Difficulty.start(g);assert.ok(N.Difficulty.valid(g.difficulty));
});
test('mid-wave difficulty refresh is gradual and leaves current enemy health untouched',()=>{
 const g=create();g.reset();const e=new N.Enemy(g,'slime',500,0,99),hp=e.maxHp;g.enemies=[e];const duration=g.waveDuration,roll=g.difficulty.plan.roll,chance=g.difficulty.plan.invasionChance;equipStrong(g.player);
 N.Difficulty.update(g,5.99);assert.equal(g.difficulty.plan.pressure,0);N.Difficulty.update(g,.02);assert.equal(g.difficulty.plan.pressure,.25);assert.equal(e.maxHp,hp);assert.equal(g.waveDuration,duration);assert.equal(g.difficulty.plan.roll,roll);assert.equal(g.difficulty.plan.invasionChance,chance);
});
test('weaker and veteran bands remain mixed even at maximum gear pressure',()=>{
 const g=create();g.reset();g.wave=10;g.player.level=100;equipStrong(g.player);N.Difficulty.start(g);const p=N.Difficulty.current(g),counts={fodder:0,regular:0,veteran:0};
 for(let i=0;i<1000;i++){const s=N.EnemyDirector.roll(g,i);counts[s.tier]++;if(s.tier==='fodder')assert.ok(s.level<g.player.level);if(s.tier==='veteran')assert.ok(s.level>p.effectiveLevel);}
 assert.ok(counts.fodder>600);assert.ok(counts.veteran<100);assert.ok(counts.regular>0);assert.ok(p.aliveBudget<=200);
});
test('spawn budget prevents a backlog and resumes after a slot opens',()=>{
 const g=create();g.reset();g.combat.update=()=>{};g.player.update=()=>{};g.waveTime=2;const budget=N.Difficulty.current(g).aliveBudget;
 g.enemies=Array.from({length:budget},(_,i)=>({id:i,alive:true,boss:false,x:500,y:0,spawnDelay:0,update(){}}));g.spawnClock=-1;g.update(.01);assert.equal(g.enemies.length,budget);assert.ok(g.spawnClock>0);g.enemies.pop();g.spawnClock=0;g.update(.01);assert.equal(g.enemies.length,budget);
});
test('invasions are power-aware, capped, and frequent for strong builds with weak-build spacing',()=>{
 const g=create();g.reset();g.wave=3;const old=seededMath.random;seededMath.random=()=>0;
 try{N.Difficulty.start(g);const chance=g.difficulty.plan.invasionChance;assert.ok(g.difficulty.plan.invades);equipStrong(g.player);N.Difficulty.start(g);assert.ok(g.difficulty.plan.invasionChance>chance);g.difficulty.lastInvasionWave=3;g.wave=4;N.Difficulty.start(g);assert.equal(g.difficulty.plan.invades,true);g.wave=6;N.Difficulty.start(g);assert.equal(g.difficulty.plan.invades,true);g.wave=1000;N.Difficulty.start(g);assert.equal(g.difficulty.plan.invasionChance,.9);}finally{seededMath.random=old;}
});
test('an invasion spawns once and cannot duplicate an existing live boss',()=>{
 const g=create();g.reset();g.wave=3;N.Difficulty.start(g);g.difficulty.plan.invades=true;g.waveTime=g.waveDuration*.6;g.spawnBoss(true,false);const id=g.boss.id;g.overlordSpawned=false;g.update(.01);assert.equal(g.boss.id,id);assert.equal(g.enemies.filter(e=>e.boss).length,1);g.overlordSpawned=true;g.boss.alive=false;g.update(.01);assert.equal(g.enemies.filter(e=>e.boss&&e.alive).length,0);
});
test('wave plan, random invasion decision and refresh clock survive exact continue',()=>{
 const g=create();g.reset();equipStrong(g.player);g.wave=5;N.Difficulty.start(g);g.difficulty.clock=2.25;const before=JSON.stringify(g.difficulty);g.checkpoint('wave');assert.ok(g.save.validCheckpoint(g.save.data.checkpoint));assert.ok(g.continueRun());assert.equal(JSON.stringify(g.difficulty),before);
});
test('death resets the refresh clock but preserves the same wave plan and invasion roll',()=>{
 const g=create();g.reset();g.wave=5;N.Difficulty.start(g);g.difficulty.clock=4;const plan=JSON.stringify(g.difficulty.plan);g.die();g.retryWave();assert.equal(JSON.stringify(g.difficulty.plan),plan);assert.equal(g.difficulty.clock,0);assert.equal(g.waveTime,0);
});
test('legacy checkpoints without a difficulty plan receive one on load',()=>{
 const g=create();g.reset();g.checkpoint('wave');delete g.save.data.checkpoint.difficulty;assert.ok(g.continueRun());assert.ok(N.Difficulty.valid(g.difficulty));
});
test('corrupt difficulty timers, probabilities and mixed bands are rejected',()=>{
 const g=create();g.reset();g.checkpoint('wave');const raw=JSON.stringify(g.save.data.checkpoint);
 for(const bad of [{pressure:4},{duration:999},{roll:1},{invasionChance:.99},{fodder:.95},{wave:9},{logDps:null}]){const c=JSON.parse(raw);Object.assign(c.difficulty.plan,bad);assert.equal(g.save.validCheckpoint(c),false);}
 const c=JSON.parse(raw);c.difficulty.clock=-1;assert.equal(g.save.validCheckpoint(c),false);
});
test('a same-level merchant build produces a stronger guardian without the old health ceiling',()=>{
 const a=finalFight(25,5),weak=a.boss.maxHp,g=create();g.reset();g.wave=5;g.player.level=25;equipStrong(g.player);N.Difficulty.start(g);g.waveTime=g.waveDuration;N.Sanctum.create(g);g.player.x=g.sanctum.x;g.player.y=g.sanctum.y;N.Sanctum.update(g);
 assert.ok(g.boss.maxHp>weak*100);assert.ok(g.boss.guardian.rating>a.boss.guardian.rating);const ref=new N.Enemy(a,'overlord',0,0,999,false,{level:a.boss.level,tier:'overlord',trait:'none'});assert.ok(weak<ref.maxHp*5);
});
test('guardian per-hit ceilings prevent a high reference damage stat from one-shotting weak builds',()=>{
 const g=finalFight(),b=g.boss,h=g.player.maxHp*(1+g.player.armor);assert.ok(N.FinalGuardian.damage(b,1,.42)<=h*.42);assert.ok(N.FinalGuardian.damage(b,.1,.18)<=h*.18);assert.ok(N.FinalGuardian.damage(b,.22,.38)<=h*.38);
 const p=g.player;p.invulnerable=0;const hp=p.hp;p.hurt(N.FinalGuardian.damage(b,1,.42));assert.ok(p.hp>=hp*.58-1e-8);
});
test('guardian opening rotation exposes seven distinct warned powers',()=>{
 const g=finalFight(),b=g.boss,seen=[];for(let i=0;i<7;i++){b.guardian.next=i;N.FinalGuardian.begin(g,b);seen.push(b.guardian.action);assert.ok(b.guardian.windup>=.9);b.guardian.windup=0;N.FinalGuardian.cast(g,b);}assert.equal(new Set(seen).size,7);
});
test('soul constellation leaves a gap along the locked aim and deals bounded damage',()=>{
 const g=finalFight(),b=g.boss,q=b.guardian;g.combat.hostile.clear();q.next=4;N.FinalGuardian.begin(g,b);const angle=q.angle;q.windup=0;N.FinalGuardian.cast(g,b);assert.equal(g.combat.hostile.active.length,10);
 for(const shot of g.combat.hostile.active){assert.ok(shot.damage<=q.hitBudget*.14);const a=Math.atan2(shot.vy,shot.vx),delta=Math.abs(Math.atan2(Math.sin(a-angle),Math.cos(a-angle)));assert.ok(delta>.2);}
});
test('Rift Step locks a warned destination inside the sanctum instead of tracking the player',()=>{
 const g=finalFight(),b=g.boss,q=b.guardian;g.player.x=g.sanctum.x+1000;q.next=5;N.FinalGuardian.begin(g,b);const x=q.destinationX,y=q.destinationY;assert.ok(Math.hypot(x-g.sanctum.x,y-g.sanctum.y)<=g.sanctum.radius-80+.00001);assert.ok(g.combat.hazards.active.length>0);g.player.x+=300;q.windup=0;N.FinalGuardian.cast(g,b);assert.equal(b.x,x);assert.equal(b.y,y);
});
test('Triune Lances hold their aim and are absorbed by the player Aegis',()=>{
 const g=finalFight(),b=g.boss,q=b.guardian;q.next=6;g.player.x=b.x+200;g.player.y=b.y;N.FinalGuardian.begin(g,b);const angle=q.angle;g.abilities.shield();g.player.invulnerable=0;const hp=g.player.hp,charge=g.player.progress.aegis;q.windup=0;N.FinalGuardian.cast(g,b);assert.equal(q.angle,angle);assert.equal(g.player.hp,hp);assert.ok(g.player.progress.aegis<charge);
});
test('guardian reacts to distant or close players only after the opening rotation',()=>{
 const g=finalFight(),b=g.boss,q=b.guardian;q.next=7;g.player.x=b.x+q.range;N.FinalGuardian.begin(g,b);assert.equal(q.action,'starfall');q.next=8;g.player.x=b.x+20;g.player.y=b.y;N.FinalGuardian.begin(g,b);assert.equal(q.action,'riftstep');q.next=10;N.FinalGuardian.begin(g,b);assert.equal(q.action,'aegis');
});
test('v5.1.1 guardian migration preserves health, ward fractions and warning clocks once',()=>{
 const g=finalFight(25,5),b=g.boss,q=b.guardian;b.maxHp=200000;b.hp=70000;Object.assign(q,{schema:1,wardMax:8000,ward:2000,wardTime:2,windup:.65,action:'salvo',next:1});for(const k of ['pressure','rating','hitBudget','destinationX','destinationY'])delete q[k];
 g.checkpoint('wave');assert.ok(g.save.validCheckpoint(g.save.data.checkpoint));g.continueRun();const upgraded=g.boss;assert.equal(upgraded.guardian.schema,3);assert.ok(Math.abs(upgraded.hp/upgraded.maxHp-.35)<1e-10);assert.equal(upgraded.guardian.ward/upgraded.guardian.wardMax,.25);assert.equal(upgraded.guardian.windup,.65);const hp=upgraded.hp;g.checkpoint('wave');g.continueRun();assert.equal(g.boss.hp,hp);
});
test('new guardian power state including Rift destination survives save and world rebase',()=>{
 const g=finalFight(),b=g.boss,q=b.guardian;q.next=5;N.FinalGuardian.begin(g,b);g.checkpoint('wave');const before=JSON.stringify(q);g.continueRun();assert.equal(JSON.stringify(g.boss.guardian),before);const r=g.boss.guardian,x=r.destinationX,y=r.destinationY;N.FinalGuardian.rebase(g.boss,100,200);assert.equal(r.destinationX,x-100);assert.equal(r.destinationY,y-200);
});
test('animated atlas blending is disabled for low quality, reduced motion and frozen actors',()=>{
 const g=finalFight(),e=g.boss;e.phase=1;e.gait=Math.PI*2*.85/8;let draws=0;const c={drawImage(){draws++;},save(){},restore(){},globalAlpha:1};
 g.quality='high';N.drawEnemy(c,images,e,0,0,96,128,'walk');assert.equal(draws,2);
 for(const mode of ['low','reduced','frozen']){draws=0;g.quality=mode==='low'?'low':'high';g.reducedMotion=mode==='reduced';e.frozen=mode==='frozen'?1:0;N.drawEnemy(c,images,e,0,0,96,128,'walk');assert.equal(draws,1,mode);}
});
test('cosmetic enemy motion consumes no encounter RNG and freezes with the simulation',()=>{
 const g=finalFight(),e=g.boss,before=seed;for(let i=0;i<10;i++){N.EnemyMotion.pose(e);N.EnemyMotion.accents(context,e);}assert.equal(seed,before);const phase=e.phase,gait=e.gait;g.state='paused';g.update(2);assert.equal(e.phase,phase);assert.equal(e.gait,gait);g.reducedMotion=true;assert.equal(JSON.stringify(N.EnemyMotion.pose(e)),JSON.stringify({lean:0,lift:0,stretch:0}));
});

function strongFight(){const g=create();g.reset();equipStrong(g.player);g.player.level=30;g.wave=8;N.Difficulty.start(g);g.waveTime=g.waveDuration;N.Sanctum.create(g);g.player.x=g.sanctum.x-240;g.player.y=g.sanctum.y;N.Sanctum.update(g);g.boss.spawnDelay=0;return g;}
test('strong guardians enlarge the arena and ranged attacks with player range',()=>{
 const g=create();g.reset();const base=N.Warfare.arena(g);equipStrong(g.player);g.player.projectileSpeed=5000;g.player.level=30;N.Difficulty.start(g);N.Sanctum.create(g);assert.ok(g.sanctum.radius>base);assert.ok(g.sanctum.radius<=1700);assert.ok(Math.sqrt(N.dist2(g.player,g.sanctum))>g.sanctum.radius);g.waveTime=g.waveDuration;g.player.x=g.sanctum.x;g.player.y=g.sanctum.y;N.Sanctum.update(g);assert.ok(g.boss.guardian.range>N.boltRange(g.player));
});
test('outer seal reduces remote chip damage without healing or resetting the guardian',()=>{
 const g=strongFight(),b=g.boss,hp=b.hp;b.guardian.guardCooldown=9;g.player.x=g.sanctum.x+g.sanctum.radius+200;b.hit(100);assert.ok(Math.abs(b.hp-(hp-10))<1e-6);assert.equal(b.maxHp,hp);g.player.x=g.sanctum.x;b.hit(100);assert.ok(Math.abs(b.hp-(hp-110))<1e-6);
});
test('leaving the arena prompts attacks at the distant player instead of a safe leash exploit',()=>{
 const g=strongFight(),q=g.boss.guardian;g.player.x=g.sanctum.x+5000;q.next=11;q.cooldown=0;guardianTick(g,.01);assert.equal(q.outside,true);assert.ok(['starfall','crossfire'].includes(q.action));if(q.action==='starfall')assert.ok(g.combat.hazards.active.some(h=>Math.abs(h.x-g.player.x)<500));
});
test('all eleven high-tier powers have readable warnings before their effect',()=>{
 const g=strongFight(),b=g.boss,q=b.guardian,seen=[];assert.ok(q.tier>=3);
 for(let i=0;i<11;i++){g.combat.clear();q.next=i;N.FinalGuardian.begin(g,b);seen.push(q.action);assert.ok(q.windup>=.9);assert.equal(g.combat.hostile.active.length,0);assert.ok(N.EnemyMotion.ritual(b));q.windup=0;N.FinalGuardian.cast(g,b);}
 assert.equal(new Set(seen).size,11);
});
test('high-tier guardians recover faster, fire longer bursts and maintain independent pressure',()=>{
 const low=finalFight(),high=strongFight();for(const g of [low,high]){const q=g.boss.guardian;q.next=0;N.FinalGuardian.begin(g,g.boss);q.windup=0;N.FinalGuardian.cast(g,g.boss);}
 assert.ok(high.boss.guardian.salvo>low.boss.guardian.salvo);assert.ok(high.boss.guardian.cooldown<low.boss.guardian.cooldown);const q=high.boss.guardian;q.pressureClock=0;guardianTick(high,.01);assert.ok(high.combat.hazards.active.some(h=>h.delay===1.25));
});
test('Starfall locks a forward trail instead of homing after its warning',()=>{
 const g=strongFight(),q=g.boss.guardian;q.next=7;g.player.lastX=1;g.player.lastY=0;N.FinalGuardian.begin(g,g.boss);const positions=g.combat.hazards.active.map(h=>h.x);assert.ok(positions.length>=6);assert.ok(positions.at(-1)>positions[0]);g.player.x+=500;assert.deepEqual(g.combat.hazards.active.map(h=>h.x),positions);assert.ok(g.combat.hazards.active.every(h=>h.delay>=1.3));
});
test('Twin Gates warn two fixed portals and release finite crossfire fans',()=>{
 const g=strongFight(),q=g.boss.guardian;q.next=8;N.FinalGuardian.begin(g,g.boss);const x=q.targetX;g.player.x+=400;q.windup=0;N.FinalGuardian.cast(g,g.boss);assert.equal(q.targetX,x);assert.equal(g.combat.hostile.active.length,2*(5+q.tier));assert.ok(g.combat.hostile.active.some(b=>b.x<x)&&g.combat.hostile.active.some(b=>b.x>x)||g.combat.hostile.active.some(b=>b.y<q.targetY)&&g.combat.hostile.active.some(b=>b.y>q.targetY));
});
test('shockwave annuli have a safe core and a visible directional gap',()=>{
 const g=create();g.reset();g.player.invulnerable=0;g.combat.cooldown=99;g.combat.hazard(0,0,200,0,20,1,{kind:'ring',inner:160,angle:0,gap:.9});const hp=g.player.hp;g.player.x=180;g.combat.update(.01);assert.equal(g.player.hp,hp);g.player.x=0;g.combat.update(.01);assert.equal(g.player.hp,hp);g.player.y=180;g.combat.update(.01);assert.equal(g.player.hp,hp-20);
});
test('Void Seal is dodgeable, short and cannot repeatedly chain casting lockouts',()=>{
 const g=create();g.reset();g.combat.hazard(0,0,90,1.3,0,.24,{kind:'seal',silence:1.25});g.player.x=200;g.combat.update(1.31);assert.equal(g.player.progress.silenceTime,0);g.player.x=0;g.combat.update(.01);assert.equal(g.player.progress.silenceTime,1.25);assert.equal(N.Warfare.silence(g),false);g.abilities.update(1.26);assert.equal(g.player.progress.silenceTime,0);assert.equal(N.Warfare.silence(g),false);g.abilities.update(5.75);assert.equal(N.Warfare.silence(g),true);
});
test('casting seal cancels charge and suppresses new auto spells but leaves dash and Aegis usable',()=>{
 const g=create();g.reset();const e=new N.Enemy(g,'warden',120,0,1);g.enemies=[e];g.hash.insert(e);g.abilities.begin();N.Warfare.silence(g);assert.equal(g.abilities.charging,false);assert.equal(g.abilities.begin(),false);g.combat.update(.1);assert.equal(g.combat.projectiles.active.length,0);assert.ok(g.player.dash());assert.ok(g.abilities.shield());assert.equal(g.player.progress.silenceTime,1.25);
});
test('casting seal pauses spell debt instead of unleashing accumulated attacks on expiry',()=>{
 const g=create();g.reset();g.player.weapons.rapid=1;N.Warfare.silence(g);g.combat.update(1);assert.ok(g.combat.cooldown>=0);assert.ok(g.combat.spellTimers.rapid>=0);g.abilities.update(1.26);const e=new N.Enemy(g,'warden',120,0,1);g.enemies=[e];g.hash.insert(e);g.combat.update(1/60);assert.ok(g.combat.projectiles.active.length<10);
});
test('reactive wards catch burst damage, remain finite and have a recovery period',()=>{
 const g=strongFight(),b=g.boss,q=b.guardian;q.guardCooldown=0;const max=b.maxHp;q.ward=0;b.hit(max*.06);assert.ok(q.ward>0);assert.equal(b.hp,max);assert.ok(q.wardMax>=max*.15);const ward=q.ward;q.guardCooldown=0;b.hit(10);assert.ok(q.ward<ward);assert.equal(q.guardCooldown,0);guardianTick(g,q.wardDuration+.01);assert.equal(q.ward,0);assert.ok(q.guardCooldown>=0);
});
test('boss dodge predicts a projectile with a tell and real movement, without invulnerability',()=>{
 const g=strongFight(),b=g.boss,q=b.guardian;q.dodgeCooldown=0;q.aiClock=0;q.cooldown=5;const shot=g.combat.projectiles.acquire();shot.reset(b.x-200,b.y-12,500,0,10,false);N.Warfare.dodge(g,b,.01);assert.equal(q.dodgeWindup,.22);const x=b.x,y=b.y;N.Warfare.dodge(g,b,.23);N.Warfare.dodge(g,b,.12);assert.ok(Math.hypot(b.x-x,b.y-y)>50);const hp=b.hp;b.hit(100);assert.ok(b.hp<hp);assert.ok(q.dodgeCooldown>0);
});
test('bosses hold their aim during attack warnings instead of dodging mid-telegraph',()=>{
 const g=strongFight(),b=g.boss,q=b.guardian;q.dodgeCooldown=0;q.aiClock=0;q.next=6;N.FinalGuardian.begin(g,b);const shot=g.combat.projectiles.acquire();shot.reset(b.x-200,b.y-12,500,0,10,false);N.Warfare.dodge(g,b,.01);assert.equal(q.dodgeWindup,0);
});
test('strong guardians summon Overlords and their commanders summon soldiers without recursion',()=>{
 const g=strongFight();g.summonMinions(g.boss);const commander=g.enemies.find(e=>e.summonedBy&&e.type==='overlord');assert.ok(commander);assert.equal(commander.summonDepth,1);g.summonMinions(commander);const troops=g.enemies.filter(e=>e.summonedBy===commander.id);assert.ok(troops.length>=3);assert.ok(troops.every(e=>e.summonDepth===2&&e.type!=='overlord'));const count=g.enemies.length;g.summonMinions(troops[0]);assert.equal(g.enemies.length,count);
});
test('army and commander caps hold under repeated summoning and existing crowded worlds',()=>{
 const g=strongFight();for(let i=0;i<50;i++){g.summonMinions(g.boss);for(const e of [...g.enemies])if(e.summonDepth===1)g.summonMinions(e);}assert.ok(g.enemies.filter(e=>e.summonedBy).length<=18);assert.ok(g.enemies.filter(e=>e.type==='overlord'&&e.summonedBy).length<=2);assert.ok(g.enemies.length<=320);
});
test('summoned armies scale with whole-build damage and have usable spawn warnings',()=>{
 const g=strongFight();g.summonMinions(g.boss);const army=g.enemies.filter(e=>e.summonedBy);assert.ok(army.every(e=>e.spawnDelay>=1&&e.level>=g.player.level));const dps=Math.exp(N.Difficulty.assess(g.player).logDps);assert.ok(army.every(e=>e.maxHp>dps));
});
test('a commander death never breaks the primary sanctum seal',()=>{
 const g=strongFight();g.summonMinions(g.boss);const boss=g.boss,commander=g.enemies.find(e=>e.summonedBy&&e.boss);commander.spawnDelay=0;commander.hit(1e40);assert.equal(g.sanctum.phase,'fighting');assert.equal(g.boss,boss);assert.equal(g.bossDefeated,false);
});
test('world saves retain army roles, primary boss identity, seal and ring warnings and dodge state',()=>{
 const g=strongFight();g.summonMinions(g.boss);g.summonMinions(g.enemies.find(e=>e.summonedBy&&e.boss));const q=g.boss.guardian;q.next=9;N.FinalGuardian.begin(g,g.boss);g.combat.hazard(100,100,90,1.3,0,.24,{kind:'seal',silence:1.25});q.dodgeCooldown=1.5;const id=g.boss.id,army=g.enemies.length,state=JSON.stringify(q);g.checkpoint('wave');assert.ok(g.save.validCheckpoint(g.save.data.checkpoint));assert.ok(g.continueRun());assert.equal(g.boss.id,id);assert.equal(g.enemies.length,army);assert.equal(JSON.stringify(g.boss.guardian),state);assert.ok(g.combat.hazards.active.some(h=>h.kind==='ring'));assert.ok(g.combat.hazards.active.some(h=>h.kind==='seal'));
});
test('casting suppression saves exactly, freezes on pause and clears on death retry',()=>{
 const g=create();g.reset();N.Warfare.silence(g);g.checkpoint('wave');g.continueRun();assert.equal(g.player.progress.silenceTime,1.25);g.state='paused';g.update(20);assert.equal(g.player.progress.silenceTime,1.25);g.state='playing';g.die();g.retryWave();assert.equal(g.player.progress.silenceTime,0);assert.equal(g.player.progress.silenceGrace,0);
});
test('v5.1.2 guardians gain tactics once without changing their existing health',()=>{
 const g=strongFight(),b=g.boss;b.hp*=.4;const hp=b.hp,max=b.maxHp;b.guardian.schema=2;g.sanctum.radius=330;g.checkpoint('wave');assert.ok(g.continueRun());assert.equal(g.boss.hp,hp);assert.equal(g.boss.maxHp,max);assert.equal(g.boss.guardian.schema,3);assert.ok(g.sanctum.radius>330);g.checkpoint('wave');const state=JSON.stringify(g.boss.guardian);g.continueRun();assert.equal(JSON.stringify(g.boss.guardian),state);
});
test('corrupt new hazards, tactical clocks, army roles and suppression are rejected',()=>{
 const g=strongFight();g.summonMinions(g.boss);g.combat.hazard(0,0,100,1,0,.2,{kind:'seal',silence:1.25});g.checkpoint('wave');const raw=JSON.stringify(g.save.data.checkpoint);
 for(const bad of [{dodgeTime:99},{tier:9},{range:Infinity},{wardDuration:90},{releaseTime:-1},{lastAction:'fake'}]){const c=JSON.parse(raw);Object.assign(c.world.enemies.find(e=>e.guardian).guardian,bad);assert.equal(g.save.validCheckpoint(c),false);}
 for(const bad of [{kind:'fake'},{silence:100},{inner:999},{gap:-1}]){const c=JSON.parse(raw);Object.assign(c.world.hazards[0],bad);assert.equal(g.save.validCheckpoint(c),false);}
 const c=JSON.parse(raw);c.player.progress.silenceTime=100;assert.equal(g.save.validCheckpoint(c),false);const d=JSON.parse(raw);d.world.enemies.find(e=>e.summonedBy).summonDepth=3;assert.equal(g.save.validCheckpoint(d),false);
});
test('attack-specific boss poses override continuous hurt and use four distinct ritual clips',()=>{
 const g=strongFight(),b=g.boss,q=b.guardian;let drawn=null;const c={drawImage(...args){drawn=args;},save(){},restore(){},globalAlpha:1};const styles=new Set();
 for(const index of [1,2,3,5]){q.next=index;N.FinalGuardian.begin(g,b);b.hitSquash=.12;styles.add(N.EnemyMotion.ritual(b).style);N.drawEnemy(c,images,b,0,0,96,128);assert.equal(drawn[0],images.enemy_ritual_overlord);assert.ok(drawn[1]>=0);}
 assert.equal(styles.size,4);
});
test('high-tier attack floors retain pressure against huge armor while respecting hit ceilings',()=>{
 const g=strongFight(),q=g.boss.guardian,b=g.boss;q.tier=4;q.hitBudget=500*101;b.damage=100;const damage=N.FinalGuardian.damage(b,.15,.22);assert.ok(damage/101>=500*.09);assert.ok(damage/101<=500*.22);
});
test('rapid impacts cannot pin a guardian or shift its main attack warning',()=>{
 const g=strongFight(),b=g.boss,q=b.guardian;for(let i=0;i<30;i++)b.hit(1,false,1,0);assert.ok(b.knockX<=45);q.next=6;N.FinalGuardian.begin(g,b);const x=b.x,y=b.y;b.update(.01);assert.equal(b.x,x);assert.equal(b.y,y);
});
test('v5.2 appearance is read-only across fully upgraded player, enemies and all eleven boss poses',()=>{
 const g=strongFight(),p=g.player;p.level=160;for(const id of N.SPELL_IDS){p.weapons[id]=8;p.relics[N.WEAPONS[id].relic]=true;p.progress.mastery[id]=20;}for(const id of Object.keys(N.TALENTS))p.progress.talents[id]=8;p.progress.demonTime=5;p.progress.demonPower=3;p.progress.demonDuration=30;
 const before=JSON.stringify(N.captureWorld(g)),player=JSON.stringify(Object.fromEntries(N.PLAYER_FIELDS.map(k=>[k,p[k]]))),progress=JSON.stringify(p.progress),random=seed;
 for(let i=0;i<4;i++){p.draw(context);for(const e of g.enemies)e.draw(context);N.Appearance.player(p);N.Appearance.enemy(g.boss);}
 assert.equal(JSON.stringify(N.captureWorld(g)),before);assert.equal(JSON.stringify(p.progress),progress);assert.equal(JSON.stringify(Object.fromEntries(N.PLAYER_FIELDS.map(k=>[k,p[k]]))),player);assert.equal(seed,random);
});
test('all twelve learned spells coexist as distinct model attachments including evolutions and mastery',()=>{
 const g=create();g.reset();g.player.level=160;for(const id of N.SPELL_IDS){g.player.weapons[id]=8;g.player.relics[N.WEAPONS[id].relic]=true;g.player.progress.mastery[id]=10;}
 const d=N.Appearance.player(g.player);assert.equal(d.spells.length,12);assert.equal(new Set(d.spells.map(s=>s.slot.join(','))).size,12);assert.ok(d.spells.every(s=>s.evolved&&s.mastery>0));
 const modules=N.Orbitals.ids(g.player);assert.equal(modules.length,12);assert.equal(new Set(modules).size,12);for(const id of modules){assert.ok(N.Orbitals.rank(g.player,id)>=8);const o=N.Orbitals.origin(g.player,id);assert.ok(Number.isFinite(o.x)&&Number.isFinite(o.y));}g.player.draw(context);
});
test('model appearance updates after a real shop upgrade and exact save without cosmetic save fields',()=>{
 const g=create();g.reset();const before=N.Appearance.player(g.player);g.player.gold=10000;g.ui.openShop();g.ui.slots[0].item=N.ITEMS.find(i=>i.id==='damage')||g.ui.slots[0].item;g.ui.slots[0].price=1;g.ui.buy(0);g.player.weapons.glacier=4;g.player.relics.iceheart=true;g.checkpoint('shop');const d=JSON.stringify(N.Appearance.player(g.player));assert.ok(g.continueRun());assert.equal(JSON.stringify(N.Appearance.player(g.player)),d);assert.ok(!Object.hasOwn(g.save.data.checkpoint.player,'appearance'));assert.ok(before.spells.length<N.Appearance.player(g.player).spells.length);
});
test('all thirteen permanent stat categories affect bounded visible equipment grades',()=>{
 const g=create();g.reset();const base=N.Appearance.player(g.player).stats;
 for(const [key,value,visual] of [['damage',10000,'damage'],['attackInterval',.01,'haste'],['projectileCount',100,'projectiles'],['critChance',8,'critical'],['critMultiplier',20,'criticalPower'],['projectileSpeed',10000,'range'],['armor',100,'armor'],['maxHp',10000,'vitality'],['regen',100,'regen'],['speed',3000,'speed'],['dashCooldown',.1,'dash'],['pickupRadius',3000,'pickup'],['pierce',100,'pierce']]){const p=Object.assign(Object.create(g.player),{[key]:value});const d=N.Appearance.player(p);assert.ok(d.stats[visual]>base[visual],visual);assert.ok(Object.values(d.stats).every(v=>v>=0&&v<=5));}
});
test('level regalia, all talents, relics and unlocked specials remain visible together',()=>{
 const g=create();g.reset();g.player.level=160;for(const id of Object.keys(N.TALENTS))g.player.progress.talents[id]=4;for(const id of Object.keys(g.player.relics))g.player.relics[id]=true;const d=N.Appearance.player(g.player);assert.equal(d.stage,5);assert.equal(d.talents.length,6);assert.equal(d.relics.length,12);assert.equal(d.specials.length,3);assert.equal(d.specials.filter(x=>x.selected).length,1);g.player.draw(context);
});
test('Demon form selects its own model atlas and stronger forms produce greater regalia',()=>{
 const g=create();g.reset();const calls=[],old=context.drawImage;context.drawImage=(...args)=>calls.push(args);try{g.abilities.jewel(100);g.abilities.transform();const low=N.Appearance.player(g.player).demonStage;g.player.draw(context);assert.ok(calls.some(a=>a[0]===images.demon_atlas_S));g.player.progress.demonPower=3;assert.ok(N.Appearance.player(g.player).demonStage>low);}finally{context.drawImage=old;}
});
test('deliberate special casting advances frames while automatic fire leaves locomotion free',()=>{
 const g=create();g.reset();const p=g.player,e=new N.Enemy(g,'slime',180,0,1);g.enemies=[e];g.input.x=1;p.update(.05);const state=p.animator.state;
 for(let i=0;i<5;i++)g.combat.fire(e);assert.equal(p.animator.state,state);assert.equal(p.castTimer,0);
 g.input.clear();p.cast();const crops=[],old=context.drawImage;context.drawImage=(...a)=>crops.push(a);
 try{for(let i=0;i<4;i++){p.update(.05);g.time+=.05;p.draw(context);}}finally{context.drawImage=old;}
 assert.ok(new Set(crops.filter(a=>a[0]===images['witch_atlas_'+p.facing]).map(a=>a[1])).size>=3);
});

test('eleven attack intents select eleven distinct boss atlas regions despite continuous hurt',()=>{
 const g=strongFight(),b=g.boss,q=b.guardian,regions=[],c={drawImage(...args){regions.push(args[1]+","+args[2]);},save(){},restore(){},globalAlpha:1};for(let i=0;i<11;i++){q.next=i;N.FinalGuardian.begin(g,b);b.hitSquash=.12;N.drawEnemy(c,images,b,0,0,96,128);}assert.equal(new Set(regions).size,11);
});
test('enemy traits, ranks and summoned roles produce distinct visible descriptors',()=>{
 const g=create();g.reset();const e=new N.Enemy(g,'overlord',0,0,1);assert.equal(N.Appearance.enemy(e).role,'overlord');e.summonedBy=8;assert.equal(N.Appearance.enemy(e).role,'commander');e.level=160;e.elite=true;e.trait='mending';const d=N.Appearance.enemy(e);assert.equal(d.stage,5);assert.equal(d.trait,'mending');assert.equal(d.elite,true);e.draw(context);
});
test('full model drawing at all eight facings emits finite geometry with balanced canvas state',()=>{
 const g=strongFight(),p=g.player;p.level=160;for(const id of N.SPELL_IDS)p.weapons[id]=8;p.progress.demonTime=5;p.progress.demonPower=3;
 let depth=0;const c=new Proxy({globalAlpha:1,save(){depth++;},restore(){depth--;assert.ok(depth>=0);},drawImage(){}},{get:(o,k)=>k in o?o[k]:(...args)=>{for(const x of args)if(typeof x==='number')assert.ok(Number.isFinite(x),String(k));},set:(o,k,v)=>{o[k]=v;return true;}});
 for(const dir of ['S','SW','W','NW','N','NE','E','SE']){p.facing=dir;p.draw(c);g.boss.facing=dir;g.boss.draw(c);assert.equal(depth,0);}
});
test('reduced motion disables cloth and recoil while functional emitters keep exact positions',()=>{
 const g=create();g.reset();g.reducedMotion=true;const p=g.player;p.moving=true;p.speed=10000;assert.equal(N.Motion.profile(p).strength,0);
 const at=N.Orbitals.origin(p,'bolt');g.quality='low';assert.deepEqual(N.Orbitals.origin(p,'bolt'),at);g.reducedMotion=false;assert.deepEqual(N.Orbitals.origin(p,'bolt'),at);
});

test('ward facets consume no charge and the grimoire portrait never changes player coordinates',()=>{
 const g=create();g.reset();g.abilities.shield();const charge=g.player.progress.aegis,x=g.player.x,y=g.player.y;g.player.draw(context);assert.equal(g.player.progress.aegis,charge);g.ui.toggleGrimoire();g.ui.drawRegaliaPortrait();assert.equal(g.player.x,x);assert.equal(g.player.y,y);
});
test('5.2.1 sprite blending respects quality and motion without changing animation state',()=>{
 const g=create();g.reset();const a=g.player.animator,clip=sandbox.NOCTURNE_ATLAS.clips.walk;
 a.play('walk',{restart:true});a.time=clip.duration*2.85/clip.frames;
 const before=JSON.stringify(a),calls=[];
 const c={globalAlpha:.6,save(){this.saved=this.globalAlpha;},restore(){this.globalAlpha=this.saved;},drawImage(...args){calls.push(args);}};
 a.draw(c,images,'E',0,0,80,107,'witch',null,'high');assert.equal(calls.length,2);assert.equal(c.globalAlpha,.6);assert.equal(JSON.stringify(a),before);
 calls.length=0;a.draw(c,images,'E',0,0,80,107,'witch',null,'low');assert.equal(calls.length,1);
 a.reduced=true;calls.length=0;a.draw(c,images,'E',0,0);assert.equal(calls.length,1);assert.equal(calls[0][1],clip.start*96);
});
test('5.2.2 context menu capture survives charging level-up and preserves editable menus',()=>{
 const g=create();g.reset();g.state='playing';g.abilities.begin();assert.ok(g.abilities.charging);g.player.pendingLevels=1;g.ui.afterLevel='playing';g.ui.levelUp();assert.equal(g.abilities.charging,false);
 const listener=docEvents.get('contextmenu').at(-1);assert.equal(listener.options,true);
 for(const state of ['playing','levelup','paused']){g.state=state;const e={target:{closest:()=>null},defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};listener.fn(e);assert.equal(e.defaultPrevented,true,state);}
 const edit={target:{closest:()=>({})},preventDefault(){throw Error('Blocked text editing context menu');}};listener.fn(edit);
});
test('5.2.2 radar remains local, clamps distant goals and respects short screens',()=>{
 const g=create();g.reset();g.state='playing';
 for(const [width,height] of [[390,844],[844,390],[1440,900]]){g.width=width;g.height=height;const layout=N.radarLayout(g),before=layout.scale;g.sanctum={x:1e12,y:-1e12,radius:330,phase:'waiting'};const point=N.radarPoint(g,g.sanctum);assert.equal(N.radarLayout(g).scale,before);assert.ok(point.offscreen);assert.ok(point.x>=layout.x&&point.x<=layout.x+layout.size);assert.ok(point.y>=layout.y&&point.y<=layout.y+layout.size);assert.ok(layout.y+layout.size+42<=height);const snapshot=JSON.stringify(g.sanctum);N.drawRadar(g,context);assert.equal(JSON.stringify(g.sanctum),snapshot);}
});
test('5.2.2 minimap marker work stays bounded for dense swarms',()=>{
 const g=create();g.reset();g.state='playing';g.enemies=Array.from({length:10000},(_,i)=>({alive:true,x:i%50,y:i%30}));let dots=0;const c=new Proxy({save(){},restore(){},arc(){dots++;}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>{o[k]=v;return true;}});N.drawRadar(g,c);assert.ok(dots<200,dots);
});
test('5.2.2 every permanent upgrade category changes actual drawn equipment',()=>{
 const g=create();g.reset();g.player.facing='S';
 const trace=p=>{const out=[];const c=new Proxy({save(){},restore(){}},{get:(o,k)=>k in o?o[k]:(...a)=>out.push([k,...a]),set:(o,k,v)=>{out.push([k,v]);o[k]=v;return true;}});N.Appearance.playerBack(c,p);N.Appearance.playerFront(c,p);return JSON.stringify(out);};
 const before=trace(g.player);
 for(const [key,value] of [['damage',10000],['attackInterval',.01],['projectileCount',100],['critChance',8],['critMultiplier',20],['projectileSpeed',10000],['armor',100],['maxHp',10000],['regen',100],['speed',3000],['dashCooldown',.1],['pickupRadius',3000],['pierce',100]]){const p=Object.assign(Object.create(g.player),{[key]:value});assert.notEqual(trace(p),before,key+' has no visible equipment effect');}
});
test('5.2.3 automatic projectile families start at their visible satellite and never body-cast',()=>{
 const g=create();g.reset();const p=g.player,e=new N.Enemy(g,'warden',240,0,1);g.enemies=[e];p.projectileCount=1;p.projectileSpeed=510;
 for(const id of ['bolt','rapid','cannon','burst','glacier']){g.combat.clear();p.weapons[id]=8;g.time=1.75;const at=N.Orbitals.origin(p,id);if(id==='bolt')g.combat.fire(e);else g.combat.directedSpell(id);const shots=g.combat.projectiles.active.filter(b=>b.source===id);assert.ok(shots.length,id);for(const b of shots){assert.equal(b.x,at.x,id);assert.equal(b.y,at.y,id);}assert.equal(p.castTimer,0,id);assert.notEqual(p.animator.state,'cast',id);}
});
test('5.2.3 lightning, beam and targeted areas show emission without automatic gestures',()=>{
 const g=create();g.reset();const p=g.player,e=new N.Enemy(g,'warden',180,0,1);g.enemies=[e];g.hash.insert(e);
 for(const id of ['lightning','lance','meteor','nova','thorn','rift']){p.weapons[id]=4;g.combat[id]();assert.equal(p.castTimer,0,id);assert.ok(N.Orbitals.flash(p,id)>0,id);}
 assert.ok(g.combat.effects.active.some(e=>e.kind==='delivery'));const beam=g.combat.effects.active.find(e=>e.kind==='lance'),at=N.Orbitals.origin(p,'lance');assert.equal(beam.x,at.x);assert.equal(beam.y,at.y);
});
test('5.2.3 hostile and guardian salvos use the common emitter; remote portals stay remote',()=>{
 const g=strongFight(),e=g.boss;g.time=3;g.combat.hostile.clear();
 for(const id of ['salvo','soulring']){const at=N.Orbitals.origin(e,id);g.combat.enemyShot(e.x,e.y,g.player.x,g.player.y,150,1,e,id);const b=g.combat.hostile.active.at(-1);assert.equal(b.x,at.x);assert.equal(b.y,at.y);}
 g.combat.enemyShot(400,500,0,0,100,1,e,'crossfire',true);assert.equal(g.combat.hostile.active.at(-1).x,400);assert.equal(g.combat.hostile.active.at(-1).y,500);
 const ranged=new N.Enemy(g,'cultist',g.player.x+200,g.player.y,999);assert.deepEqual(Array.from(N.Orbitals.ids(ranged)),['hostile']);ranged.attackTimer=0;ranged.update(.01);assert.equal(ranged.castTimer,0);assert.ok(N.Orbitals.flash(ranged,'hostile')>0);
});
test('5.2.3 orbital origin survives exact saves and is quality-independent',()=>{
 const g=create();g.reset();g.time=17.2;g.player.weapons.cannon=8;const at=N.Orbitals.origin(g.player,'cannon');g.quality='low';g.reducedMotion=true;assert.deepEqual(N.Orbitals.origin(g.player,'cannon'),at);g.checkpoint('wave');assert.ok(g.continueRun());assert.deepEqual(N.Orbitals.origin(g.player,'cannon'),at);
});
test('5.2.3 passive ring grades and active module shapes grow without unbounded geometry',()=>{
 const g=create();g.reset();for(const rank of [1,2,4,8,64,1e100]){g.player.weapons.cannon=rank;const grade=N.Orbitals.band(rank);assert.ok(grade>=1&&grade<=5);assert.ok(/^#[0-9a-f]{6}$/.test(N.Orbitals.color('cannon',grade)));}
 const elite=new N.Enemy(g,'skeleton',0,0,2,true,{level:160,trait:'armored',tier:'veteran'});assert.ok(N.Orbitals.passive(elite).length>0);elite.draw(context);assert.equal(N.Orbitals.ids(elite).length,0);
});
test('5.2.3 speed cloth grows with real movement and stays within draw budgets',()=>{
 const g=create();g.reset();const p=g.player;p.moving=true;p.lastX=1;g.time=1;const normal=N.Motion.profile(p).strength;p.speed=1600;assert.ok(N.Motion.profile(p).strength>normal);
 const draw=()=>{const calls=[];const c={drawImage(...a){calls.push(a)}};N.Motion.draw(c,{},0,0,96,128,0,0,80,107,p);return calls;};
 g.quality='high';assert.equal(draw().length,6);g.quality='low';assert.equal(draw().length,2);g.reducedMotion=true;assert.equal(draw().length,1);g.reducedMotion=false;p.moving=false;assert.equal(draw().length,1);
});
test('5.2.3 dense low-quality ordinary cloth uses one draw while the player stays expressive',()=>{
 const g=create();g.reset();g.quality='low';g.enemies=Array.from({length:120},()=>({}));const e=new N.Enemy(g,'cultist',0,0,200);e.moving=true;let calls=0;const c={drawImage(){calls++;}};N.Motion.draw(c,{},0,0,96,128,0,0,80,107,e);assert.equal(calls,1);g.player.moving=true;calls=0;N.Motion.draw(c,{},0,0,96,128,0,0,80,107,g.player);assert.equal(calls,2);
});
console.log(`\n${passed} test groups passed; ${failed} failed.`);if(failed)process.exitCode=1;
