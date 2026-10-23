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
const sandbox={console,Math:seededMath,Float32Array,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},document:{hidden:false,addEventListener(){},getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}},innerWidth:1280,innerHeight:800,devicePixelRatio:1,addEventListener(){},matchMedia:()=>({matches:false})};
sandbox.window=sandbox;
vm.createContext(sandbox);
for(const name of ['assets.js','game.js','entities.js','combat.js','ui.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),sandbox,{filename:name});
const N=sandbox.Nocturne;
const images=Object.fromEntries(Object.keys(sandbox.NOCTURNE_ASSETS).map(k=>[k,{}]));
const create=()=>new N.Game({getContext:()=>context},images);
let passed=0;
function test(name,fn){fn();passed++;console.log(`PASS ${name}`);}

test('all 13 procedural PNG assets are real, encoded images',()=>{
  assert.equal(Object.keys(sandbox.NOCTURNE_ASSETS).length,13);
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
  assert.equal(g.loot.length,2);
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
  g.finishWave();assert.equal(g.state,'levelup');assert.equal(g.enemies.length,0);assert.equal(g.loot.length,0);assert.equal(g.player.gold,18);
  while(g.player.pendingLevels)g.ui.chooseLevel(0);
  assert.equal(g.state,'shop');
});
test('invulnerability blocks repeat damage and death ends the simulation',()=>{
  const g=create();g.reset();g.player.invulnerable=0;g.player.hurt(10);g.player.hurt(10);assert.equal(g.player.hp,90);
  g.player.invulnerable=0;g.player.hurt(1000);assert.equal(g.state,'dead');const t=g.time;g.update(1);assert.equal(g.time,t);
});
test('pause/resume freezes world, clears keys, and never closes level/shop menus',()=>{
  const g=create();g.reset();g.input.keys.add('KeyW');g.ui.pause();const t=g.time;g.update(10);
  assert.equal(g.time,t);assert.equal(g.input.keys.size,0);g.ui.resume();assert.equal(g.state,'playing');
  g.ui.openShop();g.ui.togglePause();assert.equal(g.state,'shop');
});
test('restart clears progression, retained shop items and effects',()=>{
  const g=create();g.reset();g.player.gold=300;g.player.damage=90;g.ui.openShop();g.ui.toggleLock(0);g.combat.burst(0,0,5,'white');
  g.reset();assert.equal(g.wave,1);assert.equal(g.player.damage,16);assert.equal(g.player.gold,0);assert.equal(g.combat.particles.active.length,0);assert.ok(g.ui.slots.every(s=>!s.locked));
});
test('five-wave fixed-step integration stays finite and respects caps',()=>{
  const g=create();g.reset();g.player.maxHp=g.player.hp=100000;
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
  console.log(`  ${steps} fixed updates; ${g.player.kills} kills; level ${g.player.level}`);
});
console.log(`\n${passed} test groups passed.`);
