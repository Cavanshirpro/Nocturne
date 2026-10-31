/*
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade
This file is part of Nocturne. See the distribution's LICENSE and NOTICE files.
*/
// Optional art-tool dependency: @napi-rs/canvas; Python + Pillow for animated GIFs.
// Renders the real costume composer. Does not run/update any player save.
const fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm'),{spawnSync}=require('child_process');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),root=path.resolve(__dirname,'..');
const elements=new Map(),el=()=>({hidden:false,style:{},dataset:{},innerHTML:'',textContent:'',classList:{add(){},remove(){}},addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},focus(){}});
const s={OffscreenCanvas:function(w,h){return createCanvas(w,h);},console,Math,Float32Array,localStorage:{getItem:()=>null,setItem(){}},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},document:{hidden:false,addEventListener(){},getElementById(id){if(!elements.has(id))elements.set(id,el());return elements.get(id);}},innerWidth:1280,innerHeight:800,devicePixelRatio:1,addEventListener(){},matchMedia:()=>({matches:false})};s.window=s;vm.createContext(s);
for(const [,name] of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script defer src="([^"]+)"/g))vm.runInContext(fs.readFileSync(path.join(root,name.split('?')[0]),'utf8'),s,{filename:name});
const powers=['salvo','meteors','slash','aegis','soulring','riftstep','lances','starfall','crossfire','shockwave','voidseal'];
function panel(c,x,y,w,h,title,sub=''){
 c.fillStyle='#14212a';c.fillRect(x,y,w,h);c.strokeStyle='#b59b6c38';c.strokeRect(x+6,y+6,w-12,h-12);c.fillStyle='#e6cfad';c.textAlign='center';c.font='bold 13px Georgia';c.fillText(title,x+w/2,y+27);c.font='10px Arial';c.fillStyle='#9eacb8';c.fillText(sub,x+w/2,y+44);
}
function drawAt(c,e,x,y,zoom=1){c.save();c.translate(x,y);c.scale(zoom,zoom);c.translate(-e.x,-e.y);e.draw(c);c.restore();}
async function main(){
 const images=Object.fromEntries(await Promise.all(Object.entries(s.NOCTURNE_ASSETS).map(async([k,v])=>[k,await loadImage(v)]))),N=s.Nocturne;
 const g=new N.Game(createCanvas(1280,800),images),temp=fs.mkdtempSync(path.join(os.tmpdir(),'nocturne-art-')),out=path.join(root,'previews');fs.mkdirSync(out,{recursive:true});g.reset();g.state='paused';
 function outfit(level,coven,spellCount,rank=1,demon=false){const p=new N.Player(g,coven);p.level=level;p.facing='SE';p.invulnerable=0;N.SPELL_IDS.slice(0,spellCount).forEach(id=>{p.weapons[id]=rank;if(rank>=4)p.relics[N.WEAPONS[id].relic]=true;p.progress.mastery[id]=rank>=8?12:0;});
  if(level>=80){Object.assign(p,{damage:600,armor:3,maxHp:500,regen:3,projectileCount:16,projectileSpeed:1000,critChance:1.5,critMultiplier:3,attackInterval:.15,speed:300,dashCooldown:1.5,pickupRadius:160,pierce:4});for(const id of Object.keys(N.TALENTS))p.progress.talents[id]=4;p.progress.activeOath='ember';p.progress.essence=600;}
  if(demon){p.progress.demonTime=30;p.progress.demonDuration=60;p.progress.demonPower=3;p.progress.demonSpeed=1.85;}return p;
 }
 const players=[outfit(1,'ash',1),outfit(20,'storm',4,3),outfit(80,'moon',8,4),outfit(160,'ash',12,8),outfit(160,'moon',12,8,true)];
 const titles=['ASH · INITIATE','STORM · SPELLWEAVER','MOON · ADEPT','ASH · ARCHON','DEMON · ASCENDANT'];
 const monsters=Object.keys(N.ENEMY_TYPES).map((type,i)=>[1,80,160].map((level,row)=>{const e=new N.Enemy(g,type,0,0,100+i*3+row,row===2,{level,tier:row===2?'veteran':'regular',trait:row?['armored','swift','mending','volatile'][i%4]:'none'});e.scale=1;e.facing='SE';e.spawnDelay=0;return e;}));
 g.player=players[3];g.wave=8;N.Difficulty.start(g);
 const bosses=powers.map((action,i)=>{const e=new N.Enemy(g,'overlord',0,0,200+i);N.FinalGuardian.promote(g,e);e.facing='SE';e.spawnDelay=0;e.guardian.tier=4;e.guardian.lastAction=action;e.guardian.angle=.8;return e;});
 for(let frame=0;frame<12;frame++){
  g.time=frame/12*2;const t=frame/12;
  const pc=createCanvas(1280,420),pctx=pc.getContext('2d');
  players.forEach((p,i)=>{panel(pctx,i*256,0,256,420,titles[i],i<2?'Level '+p.level+' · '+N.Appearance.player(p).spells.length+' spells':i===4?'Evolved arsenal · stacked Demon form':'Passive rings + active emitters');p.walk=t*Math.PI*2;p.moving=true;p.animator.state='walk';p.animator.time=t*.45;p.castTimer=0;drawAt(pctx,p,i*256+128,348,2);});
  fs.writeFileSync(path.join(temp,'player-'+frame+'.png'),pc.toBuffer('image/png'));
  const dc=createCanvas(1280,720),dctx=dc.getContext('2d');
  [players[0],players[3],players[4]].forEach((p,row)=>{const old=p.facing,oldState=p.animator.state,oldTime=p.animator.time;
    ['S','SW','W','NW','N','NE','E','SE'].forEach((dir,col)=>{panel(dctx,col*160,row*240,160,240,dir,row===0?'Initiate':row===1?'Full arsenal':'Demon form');p.facing=dir;p.animator.state='walk';p.animator.time=t*.45;drawAt(dctx,p,col*160+80,row*240+200,1.35);});
    p.facing=old;p.animator.state=oldState;p.animator.time=oldTime;
  });
  fs.writeFileSync(path.join(temp,'directions-'+frame+'.png'),dc.toBuffer('image/png'));
  const ec=createCanvas(1350,780),ectx=ec.getContext('2d');
  monsters.forEach((rows,col)=>rows.forEach((e,row)=>{panel(ectx,col*150,row*260,150,260,row===0?e.type.toUpperCase():row===1?'L80 · '+e.trait.toUpperCase():'L160 · ELITE',row===0?'Base silhouette':row===1?'Trait + level regalia':'Engraved armor + crest');e.phase=t*Math.PI*2;e.gait=t*Math.PI*2;e.moving=true;ectx.save();ectx.beginPath();ectx.rect(col*150+8,row*260+48,134,200);ectx.clip();drawAt(ectx,e,col*150+75,row*260+220,1.6);ectx.restore();}));
  fs.writeFileSync(path.join(temp,'enemy-'+frame+'.png'),ec.toBuffer('image/png'));
  const bc=createCanvas(1400,1200),bctx=bc.getContext('2d');
  bosses.forEach((e,i)=>{const x=i%4*350,y=Math.floor(i/4)*400,q=e.guardian;panel(bctx,x,y,350,400,powers[i].toUpperCase(),'Sovereign · tier IV · eleven distinct rigs');bctx.save();bctx.beginPath();bctx.rect(x+8,y+48,334,340);bctx.clip();e.phase=t*6.28;q.action=t<.45?powers[i]:null;q.windupTotal=1.3;q.windup=t<.45?1.3*(1-t/.45):0;q.releaseTime=t>=.45?.55*(1-(t-.45)/.55):0;e.hp=e.maxHp*(i%3===0?.3:1);drawAt(bctx,e,x+166,y+330,1);bctx.restore();});
  fs.writeFileSync(path.join(temp,'boss-'+frame+'.png'),bc.toBuffer('image/png'));
 }
 const mapCanvas=createCanvas(1050,390),mc=mapCanvas.getContext('2d');
 for(let i=0;i<3;i++){
   panel(mc,i*350,0,350,390,['LOCAL THREATS','DISTANT SANCTUM','SEAL BROKEN'][i],'Fixed local scale · clamped objective · north up');
   g.width=320;g.height=844;g.state='paused';g.player.x=g.player.y=0;g.player.facing='NE';g.viewWidth=1200;g.viewHeight=950;
   g.enemies=Array.from({length:45},(_,j)=>({alive:true,x:Math.sin(j*2.399)*700,y:Math.cos(j*2.399)*700,elite:j%11===0,boss:j===4,tier:'regular'}));
   g.loot=[{type:'heal',x:180,y:160},{type:'jewel',x:-360,y:100}];g.sanctum={x:i===1?6500:600,y:-450,radius:330,phase:i===2?'cleared':'waiting'};
   const l=N.radarLayout(g);mc.save();mc.translate(i*350+94,110);mc.scale(1.35,1.35);mc.translate(-l.x,-l.y);N.drawRadar(g,mc);mc.restore();
 }
 fs.writeFileSync(path.join(out,'minimap-v522.png'),mapCanvas.toBuffer('image/png'));
 const python="from PIL import Image\nfrom pathlib import Path\nimport sys\na,b=map(Path,sys.argv[1:])\nfor kind in ['player','enemy','boss','directions']:\n frames=[Image.open(a/f'{kind}-{i}.png').convert('RGB') for i in range(12)]\n frames[2].save(b/f'{kind}-regalia.png')\n frames[0].save(b/f'{kind}-regalia.gif',save_all=True,append_images=frames[1:],duration=110,loop=0,optimize=False)\n";
 const result=spawnSync('python',['-c',python,temp,out],{encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);
 fs.rmSync(temp,{recursive:true,force:true});console.log('Rendered 48 full-model gallery frames from '+Object.keys(images).length+' decoded assets.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
