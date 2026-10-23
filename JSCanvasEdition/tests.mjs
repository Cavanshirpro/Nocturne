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
for(const name of ['assets.js','game.js','entities.js','combat.js','ui.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),sandbox,{filename:name});
const N=sandbox.Nocturne;
const images=Object.fromEntries(Object.keys(sandbox.NOCTURNE_ASSETS).map(k=>[k,{}]));
const create=()=>new N.Game({getContext:()=>context},images);
let passed=0;
function test(name,fn){memory.clear();seed=271828;fn();passed++;console.log(`PASS ${name}`);}

test('all 16 procedural PNG assets are real, encoded images',()=>{
  assert.equal(Object.keys(sandbox.NOCTURNE_ASSETS).length,16);
  for(const src of Object.values(sandbox.NOCTURNE_ASSETS))assert.equal(Buffer.from(src.split(',')[1],'base64').subarray(1,4).toString(),'PNG');
  assert.equal(new Set(Object.entries(sandbox.NOCTURNE_ASSETS).filter(([k])=>k.startsWith('witch_')).map(([,v])=>v)).size,8);
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
test('spawns remain beyond every camera edge, including narrow screens',()=>{
  const g=create();g.reset();g.camera={x:1100,y:-440};
  for(let i=0;i<300;i++){
    g.spawn();const e=g.enemies.at(-1);
    assert.ok(Math.abs(e.x-g.camera.x)>g.viewWidth/2||Math.abs(e.y-g.camera.y)>g.viewHeight/2);
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
    const theta=g.time*.13;g.input.x=Math.cos(theta);g.input.y=Math.sin(theta);
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
  p.relics.permafrost=true;g.combat.nova();assert.equal(g.enemies[0].frozen,.8);
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
  const saved=JSON.parse(memory.get(g.save.key));assert.equal(g.save.validCheckpoint(saved.checkpoint),true);
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
  const g=create();g.reset();const pools=[g.combat.projectiles,g.combat.particles,g.combat.numbers,g.combat.hostile,g.combat.hazards,g.combat.effects];
  for(const pool of pools){for(let i=0;i<pool.limit;i++)assert.ok(pool.acquire());assert.equal(pool.acquire(),null);assert.equal(pool.created,pool.limit);}
  g.combat.clear();for(const pool of pools){assert.equal(pool.active.length,0);assert.equal(pool.free.length,pool.limit);}
});
test('critical hit-stop has a cooldown instead of freezing on every chained hit',()=>{
  const g=create();g.reset();const e=new N.Enemy(g,'warden',150,0,1);
  e.hit(1,true);assert.equal(g.hitStop,.025);g.hitStop=0;e.hit(1,true);assert.equal(g.hitStop,0);assert.ok(g.impactCooldown>0);
});

test('Warden always spawns outside square, portrait and landscape camera views',()=>{
  const g=create();g.reset();g.wave=5;
  for(const [w,h] of [[1000,1000],[500,1100],[1500,600]]){
    g.viewWidth=w;g.viewHeight=h;g.camera={x:-120,y:470};
    for(let i=0;i<80;i++){
      g.enemies.length=0;g.spawnBoss();const e=g.boss;
      assert.ok(Math.abs(e.x-g.camera.x)>w/2||Math.abs(e.y-g.camera.y)>h/2);
    }
  }
});
console.log(`\n${passed} test groups passed.`);
