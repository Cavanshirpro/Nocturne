// Reproducible single-target throughput calibration. Node.js 18+, no packages.
// This is not an encounter win-rate or browser-performance benchmark.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),elements=new Map();
const element=()=>({hidden:false,style:{},dataset:{},innerHTML:'',textContent:'',classList:{add(){},remove(){}},addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},focus(){}});
const context=new Proxy({createPattern:()=>({})},{get:(o,k)=>k in o?o[k]:()=>{}});
let seed=271828;
const math=Object.create(Math);math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const sandbox={console,Math:math,Float32Array,localStorage:{getItem:()=>null,setItem(){}},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},document:{hidden:false,addEventListener(){},getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}},innerWidth:1280,innerHeight:800,devicePixelRatio:1,addEventListener(){},matchMedia:()=>({matches:false})};
sandbox.window=sandbox;vm.createContext(sandbox);
for(const [,name] of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script defer src="([^"]+)"/g))vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),sandbox,{filename:name});
const N=sandbox.Nocturne,images=Object.fromEntries(Object.keys(sandbox.NOCTURNE_ASSETS).map(k=>[k,{}]));
const builds=[
 ['Starter',{}],
 ['Merchant',{damage:60,attackInterval:.3,projectileCount:4,maxHp:220,armor:.4,weapons:{rapid:2}}],
 ['Veteran',{damage:600,attackInterval:.1,projectileCount:16,maxHp:500,armor:2,weapons:{rapid:4,cannon:3,lightning:4}}],
 ['Extreme',{damage:200000,attackInterval:.035,projectileCount:100,maxHp:2500,armor:10,weapons:{rapid:8,cannon:8,lightning:8,glacier:8}}]
];
const rows=[];
for(const [name,build] of builds){
 seed=271828;const g=new N.Game({getContext:()=>context},images);g.reset();g.wave=5;g.player.level=25;
 const {weapons,...stats}=build;Object.assign(g.player,stats);if(weapons)Object.assign(g.player.weapons,weapons);g.player.hp=g.player.maxHp;g.player.lastX=1;g.player.lastY=0;
 N.Difficulty.start(g);g.waveTime=g.waveDuration;N.Sanctum.create(g);g.player.x=g.sanctum.x-120;g.player.y=g.sanctum.y;N.Sanctum.update(g);
 const b=g.boss,health=b.maxHp,plan={...g.difficulty.plan};b.spawnDelay=0;
 // Hold an immortal, unwarded target 120 units away. Disable enemy AI and movement.
 delete b.guardian;b.hp=b.maxHp=1e60;g.enemies=[b];g.combat.clear();g.stats.damage=0;
 for(let i=0;i<2100;i++){
  const dt=1/60;g.time+=dt;g.abilities.update(dt);b.x=g.player.x+120;b.y=g.player.y;g.hash.clear();g.hash.insert(b);
  if(g.player.progress.specialRemaining===0){g.abilities.begin();g.abilities.release();}g.combat.update(dt);
 }
 const dps=g.stats.damage/35;
 rows.push({name,level:25,wave:5,power:plan.rating,pressure:plan.pressure,enemyLevel:plan.effectiveLevel,invasionPercent:100*plan.invasionChance,bossLevel:b.level,bossHealth:health,estimatedDps:Math.exp(plan.logDps),fixtureDps:dps,healthOverFixtureDps:health/dps});
}
console.log(JSON.stringify(rows,null,2));
