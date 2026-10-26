// Optional source-rendered showcase: @napi-rs/canvas + Python/Pillow. No live save writes.
const fs=require('fs'),path=require('path'),vm=require('vm'),os=require('os'),{spawnSync}=require('child_process');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),root=path.resolve(__dirname,'..');
const elements=new Map(),el=()=>({hidden:false,style:{},dataset:{},innerHTML:'',textContent:'',classList:{add(){},remove(){}},addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},focus(){}});
const s={console,Math,Float32Array,localStorage:{getItem:()=>null,setItem(){}},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},document:{hidden:false,addEventListener(){},getElementById(id){if(!elements.has(id))elements.set(id,el());return elements.get(id);}},innerWidth:1280,innerHeight:800,devicePixelRatio:1,addEventListener(){},matchMedia:()=>({matches:false})};s.window=s;vm.createContext(s);
for(const [,name] of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script defer src="([^"]+)"/g))vm.runInContext(fs.readFileSync(path.join(root,name.split('?')[0]),'utf8'),s,{filename:name});
function panel(c,x,y,w,h,title,sub){c.fillStyle='#14232d';c.fillRect(x,y,w,h);c.strokeStyle='#b39a7144';c.strokeRect(x+6,y+6,w-12,h-12);c.textAlign='center';c.fillStyle='#e8d0a7';c.font='bold 14px Georgia';c.fillText(title,x+w/2,y+28);c.font='11px Arial';c.fillStyle='#a9c0ba';c.fillText(sub,x+w/2,y+49);}
async function main(){
 const images=Object.fromEntries(await Promise.all(Object.entries(s.NOCTURNE_ASSETS).map(async([k,v])=>[k,await loadImage(v)]))),N=s.Nocturne,g=new N.Game(createCanvas(1280,800),images),temp=fs.mkdtempSync(path.join(os.tmpdir(),'nocturne-fields-')),out=path.join(root,'previews');g.reset();g.visible=()=>true;g.quality='high';g.state='paused';
 const actors=N.SPELL_IDS.map(id=>{const p=new N.Player(g);p.weapons=Object.fromEntries(N.SPELL_IDS.map(k=>[k,k===id?8:0]));return {p,id};});
 for(let f=0;f<24;f++){
  g.time=f/12;const canvas=createCanvas(1280,400),c=canvas.getContext('2d');
  ['thorn','veil','rift','meteor'].forEach((kind,i)=>{const data=N.Fields.styles[kind];panel(c,i*320,0,320,400,'ALLY · '+data.name,data.effect+(kind==='thorn'?' · NOT HEALING':''));const a={kind,x:0,y:0,radius:92,delay:kind==='meteor'?.7:.1,duration:kind==='veil'?.7:2,age:(f/24)*(kind==='meteor'?1:1.2),rank:4};c.save();c.translate(i*320+160,222);N.Fields.allied(c,g,a,kind==='thorn'?8:1,false,true);c.restore();});
  fs.writeFileSync(path.join(temp,'allied-'+f+'.png'),canvas.toBuffer('image/png'));
  const danger=createCanvas(1080,400),dc=danger.getContext('2d');
  ['circle','seal','ring'].forEach((kind,i)=>{const data=N.Fields.styles[kind];panel(dc,i*360,0,360,400,'DANGER · '+data.name,kind==='ring'?'EMPTY GAP IS SAFE':'HATCHED AREA IS DANGEROUS');const h={kind,x:0,y:0,radius:kind==='ring'?110:92,inner:72,angle:-Math.PI/4,gap:1.15,delay:1,duration:.8,age:f/24*1.7};dc.save();dc.translate(i*360+180,225);N.Fields.hostile(dc,g,h,true);dc.restore();});
  fs.writeFileSync(path.join(temp,'hazards-'+f+'.png'),danger.toBuffer('image/png'));
  const board=createCanvas(1280,780),bc=board.getContext('2d');actors.forEach(({p,id},i)=>{const x=i%4*320,y=Math.floor(i/4)*260,b=N.Orbitals.behaviour(id);panel(bc,x,y,320,260,N.WEAPONS[id].name.toUpperCase(),b.mode.toUpperCase()+' · GRADE 4');if(f%6===0)N.Orbitals.emit(p,id);const pos=N.Orbitals.origin(p,id);bc.save();bc.translate(x+160,y+151);bc.scale(3,3);if(id==='orbit')N.Orbitals.wisp(bc,p,0,0);else{bc.translate(-pos.x,-pos.y);N.Orbitals.satellites(bc,p,false);N.Orbitals.satellites(bc,p,true);}bc.restore();});
  fs.writeFileSync(path.join(temp,'mechanisms-'+f+'.png'),board.toBuffer('image/png'));
 }
 const py="from PIL import Image\nfrom pathlib import Path\nimport sys\na,b=map(Path,sys.argv[1:])\nfor kind in ['allied','hazards','mechanisms']:\n f=[Image.open(a/f'{kind}-{i}.png').convert('RGB') for i in range(24)]\n f[8].save(b/f'{kind}-v524.png')\n f[0].save(b/f'{kind}-v524.gif',save_all=True,append_images=f[1:],duration=85,loop=0,optimize=False)\n";
 const result=spawnSync('python3',['-c',py,temp,out],{encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);fs.rmSync(temp,{recursive:true,force:true});console.log('Rendered 72 field/unique-mechanism frames using the actual runtime renderers.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
