// Optional authoring tool: Node + @napi-rs/canvas; Python/Pillow for the GIF.
// Uses the real game, real fire methods and the shared renderer, not mock emitters.
const fs=require('fs'),path=require('path'),vm=require('vm'),os=require('os'),{spawnSync}=require('child_process');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),root=path.resolve(__dirname,'..');
const elements=new Map(),el=()=>({hidden:false,style:{},dataset:{},innerHTML:'',textContent:'',classList:{add(){},remove(){}},addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},focus(){}});
const s={console,Math,Float32Array,localStorage:{getItem:()=>null,setItem(){}},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},document:{hidden:false,addEventListener(){},getElementById(id){if(!elements.has(id))elements.set(id,el());return elements.get(id);}},innerWidth:1280,innerHeight:800,devicePixelRatio:1,addEventListener(){},matchMedia:()=>({matches:false})};s.window=s;vm.createContext(s);
for(const [,name] of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script defer src="([^"]+)"/g))vm.runInContext(fs.readFileSync(path.join(root,name.split('?')[0]),'utf8'),s,{filename:name});
function label(c,x,title,subtitle){c.fillStyle='#15232c';c.fillRect(x,0,400,520);c.strokeStyle='#b8a17744';c.strokeRect(x+6,6,388,508);c.textAlign='center';c.font='bold 16px Georgia';c.fillStyle='#ecd2a9';c.fillText(title,x+200,35);c.font='12px Arial';c.fillStyle='#a7bbb9';c.fillText(subtitle,x+200,58);}
async function main(){
 const images=Object.fromEntries(await Promise.all(Object.entries(s.NOCTURNE_ASSETS).map(async([k,v])=>[k,await loadImage(v)]))),N=s.Nocturne,out=path.join(root,'previews'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'nocturne-orbits-'));
 const games=Array.from({length:3},()=>{const g=new N.Game(createCanvas(1280,800),images);g.reset();g.state='playing';g.quality='high';g.visible=()=>true;g.player.invulnerable=0;return g;});
 const p=games[0].player;Object.assign(p,{level:40,armor:3,maxHp:300,regen:2,speed:300,pickupRadius:160});
 const fast=games[1].player;Object.assign(fast,{level:80,speed:800});fast.weapons.rapid=8;fast.weapons.cannon=4;fast.relics.quicksilver=true;fast.relics.ironstar=true;
 games[1].enemies=[new N.Enemy(games[1],'warden',220,0,1)];games[1].enemies[0].hp=games[1].enemies[0].maxHp=1e9;
 const e=new N.Enemy(games[2],'cultist',0,0,1,false,{level:80,tier:'veteran',trait:'armored'});games[2].enemies=[e];games[2].player.x=-220;
 const titles=['PASSIVE CIRCLES','RAPID + HEAVY SATELLITES','SHARED ENEMY SYSTEM'];
 const subs=['Defence, movement and focus grades','Walking continues while the turrets fire','Armour ring + a real hostile emitter'];
 for(let frame=0;frame<20;frame++){
  const canvas=createCanvas(1200,520),c=canvas.getContext('2d');
  games.forEach((g,i)=>{
   g.time=frame*.08;g.player.moving=true;g.player.walk=frame*.35;g.player.lastX=1;g.player.animator.state='walk';g.player.animator.time=frame*.08% .45;
   if(i===1&&frame%3===0)g.combat.directedSpell('rapid');if(i===1&&frame%9===0)g.combat.directedSpell('cannon');
   if(i===2){e.facing='W';if(frame%7===0)g.combat.enemyShot(0,0,-220,-12,175,1,e,'hostile');}
   // Move only the already-created shots. Avoid launching unrelated auto spells.
   for(const pool of [g.combat.projectiles,g.combat.hostile])for(const b of pool.active){b.x+=b.vx*.08;b.y+=b.vy*.08;}
   for(let j=g.combat.effects.active.length-1;j>=0;j--){g.combat.effects.active[j].life-=.08;if(g.combat.effects.active[j].life<=0)g.combat.effects.release(j);}
   label(c,i*400,titles[i],subs[i]);c.save();c.beginPath();c.rect(i*400+8,70,384,360);c.clip();c.translate(i*400+200,355);c.scale(1.8,1.8);
   if(i===2)e.draw(c);else g.player.draw(c);g.combat.draw(c);c.restore();
   c.fillStyle='#abc5bd';c.font='11px Arial';c.textAlign='center';c.fillText(i===1?'No automatic body cast · speed-reactive cloth':i===2?'The shot starts at the visible satellite':'Passive progression stays off the costume',i*400+200,454);
  });
  fs.writeFileSync(path.join(temp,'frame-'+frame+'.png'),canvas.toBuffer('image/png'));
 }
 const legend=createCanvas(1200,240),lc=legend.getContext('2d');lc.fillStyle='#15232c';lc.fillRect(0,0,1200,240);lc.textAlign='center';lc.font='bold 18px Georgia';lc.fillStyle='#ead2a9';lc.fillText('ORBITAL GROWTH · colour, hull facets and metal fins',600,30);
 for(let i=0;i<5;i++){const rank=[1,2,4,8,16][i],x=120+i*240;lc.save();lc.translate(x-35,104);N.Orbitals.preview(lc,'rapid',rank,2.5);lc.restore();lc.save();lc.translate(x+38,104);N.Orbitals.preview(lc,'cannon',rank,2.5);lc.restore();lc.fillStyle='#c7d4c8';lc.font='13px Arial';lc.fillText('RANK '+rank+' · GRADE '+N.Orbitals.band(rank),x,183);}
 fs.writeFileSync(path.join(out,'orbital-grades.png'),legend.toBuffer('image/png'));
 const py="from PIL import Image\nfrom pathlib import Path\nimport sys\na,b=map(Path,sys.argv[1:])\nf=[Image.open(a/f'frame-{i}.png').convert('RGB') for i in range(20)]\nf[6].save(b/'orbital-system.png')\nf[0].save(b/'orbital-system.gif',save_all=True,append_images=f[1:],duration=80,loop=0,optimize=False)\n";
 const result=spawnSync('python3',['-c',py,temp,out],{encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);fs.rmSync(temp,{recursive:true,force:true});console.log('Rendered 20 real orbital/motion frames and a five-grade hull comparison.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
