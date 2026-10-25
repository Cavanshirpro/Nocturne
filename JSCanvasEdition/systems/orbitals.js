/* Shared 2.5D emitter/ring system. Derived from actor state and world time.
 * Simulation and renderer use exactly the same origins, independent of quality.
 * Transient muzzle feedback is weakly owned and never enters a save. */
(() => {
'use strict';const N=window.Nocturne,TAU=Math.PI*2;
const schools=['bolt','orbit','lightning','nova','meteor','lance','thorn','rift','rapid','cannon','burst','glacier'];
const powers=['salvo','meteors','slash','aegis','soulring','riftstep','lances','starfall','crossfire','shockwave','voidseal'];
const palette={bolt:'#ba9ce8',orbit:'#b8a2dd',lightning:'#78d2df',nova:'#90c8f2',meteor:'#f59a66',lance:'#cea5f0',thorn:'#91bf85',rift:'#9987e0',rapid:'#e5ca91',cannon:'#dc9272',burst:'#df8caa',glacier:'#91dbe4',hostile:'#e3a190',vitality:'#89c6a4',mobility:'#73b7ce',focus:'#c6a2db'};
const alias={salvo:'rapid',meteors:'meteor',slash:'lance',aegis:'nova',soulring:'orbit',riftstep:'rift',lances:'lance',starfall:'meteor',crossfire:'burst',shockwave:'cannon',voidseal:'rift'};
const flashes=new WeakMap(),cache=new Map();
const band=n=>Math.min(5,Math.max(1,1+Math.floor(Math.log2(1+Math.max(0,n-1)))));
const isPlayer=e=>!!e.weapons;
function ids(e){if(isPlayer(e))return schools.filter(id=>(e.weapons[id]||0)>0);if(e.boss)return powers.slice(0,e.guardian?.tier>=2?11:7).filter(id=>id!=='aegis');return ['cultist','wraith'].includes(e.type)?['hostile']:[];}
function rank(e,id){return isPlayer(e)?e.weapons[id]||1:1+Math.max(0,Math.floor((e.level||1)/20))+(e.guardian?.tier||0);}
function color(id,grade){const h=palette[alias[id]||id]||palette.hostile;const rgb=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));return '#'+rgb.map(v=>Math.round(v+(245-v)*(grade-1)*.075).toString(16).padStart(2,'0')).join('');}
function origin(e,id){
 const list=isPlayer(e)?schools:e.boss?powers:['hostile'],i=Math.max(0,list.indexOf(id));
 const clock=e.game.time||0,scale=isPlayer(e)?1:Math.min(2,e.scale||1);
 // Stable slots: learning a new school never teleports another emitter.
 const angle=-.2+i*TAU/list.length+clock*.36+(isPlayer(e)?0:(e.id||0)*.37);
 const radius=(isPlayer(e)?52:34)*scale;
 return {x:e.x+Math.cos(angle)*radius,y:e.y-31*scale+Math.sin(angle)*radius*.48,depth:Math.sin(angle),angle};
}
function emit(e,id){let f=flashes.get(e);if(!f){f=new Map();flashes.set(e,f);}f.set(id,e.game.time||0);return origin(e,id);}
function flash(e,id){const t=flashes.get(e)?.get(id);return t===undefined?0:Math.max(0,1-((e.game.time||0)-t)/.18);}
function sprite(c,id,grade,col,size=1){
 const base=alias[id]||id,sides=Math.min(8,3+grade),radius=5+grade*.45;
 c.save();c.scale(size,size);c.fillStyle='#090f1c80';c.beginPath();c.ellipse(1,6,radius+2,3,0,0,TAU);c.fill();
 c.lineWidth=1.15;c.strokeStyle=col;c.fillStyle='#253343';c.beginPath();
 if(['cannon','rapid','hostile'].includes(base)){c.moveTo(-6,-5);c.lineTo(4,-5);c.lineTo(7,-2);c.lineTo(7,3);c.lineTo(2,6);c.lineTo(-6,4);}
 else for(let i=0;i<sides;i++){const a=i*TAU/sides-Math.PI/2;c[i?'lineTo':'moveTo'](Math.cos(a)*radius,Math.sin(a)*radius);}
 c.closePath();c.fill();c.stroke();c.fillStyle='#556477';c.beginPath();c.moveTo(-4,-4);c.lineTo(3,-4);c.lineTo(0,-1);c.lineTo(-4,1);c.fill();
 c.fillStyle=col;
 if(base==='rapid'){c.fillRect(2,-3,8,2);c.fillRect(2,1,8,2);c.fillRect(-3,-2,3,5);}
 else if(base==='cannon'){c.fillStyle='#66717d';c.fillRect(0,-3,10,6);c.fillStyle=col;c.fillRect(5,-2,4,4);c.fillStyle='#192334';c.fillRect(8,-1,2,2);}
 else if(base==='lightning'){c.beginPath();c.moveTo(1,-6);c.lineTo(-4,1);c.lineTo(0,1);c.lineTo(-1,6);c.lineTo(5,-1);c.lineTo(1,-1);c.fill();}
 else if(base==='lance'){c.beginPath();c.moveTo(-3,2);c.lineTo(7,-5);c.lineTo(3,4);c.closePath();c.fill();}
 else if(base==='rift'||base==='orbit'){c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.ellipse(0,0,4,3,-.5,0,TAU);c.stroke();c.fillStyle='#cfe7ff';c.fillRect(-1,-1,2,2);}
 else {const points=base==='glacier'?6:base==='burst'?3:4;c.beginPath();for(let i=0;i<points*2;i++){const a=i*Math.PI/points,r=i%2?2:5;c[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();}
 c.fillStyle='#f0dec2';for(let i=0;i<grade;i++)c.fillRect(-4+i*2,7,1,1.5);
 if(grade>=4){c.strokeStyle=col;c.lineWidth=.8;for(const s of [-1,1]){c.beginPath();c.moveTo(s*7,-5);c.lineTo(s*10,-1);c.lineTo(s*8,3);c.stroke();}}
 c.restore();
}
function hull(c,id,grade,col,size){
 const key=id+':'+grade+':'+col;let surface=cache.get(key);
 if(!surface&&typeof OffscreenCanvas!=='undefined'){
  surface=new OffscreenCanvas(64,64);const ctx=surface.getContext('2d');ctx.translate(32,32);sprite(ctx,id,grade,col,2);if(cache.size>=160)cache.delete(cache.keys().next().value);cache.set(key,surface);
 }
 if(surface)c.drawImage(surface,-16*size,-16*size,32*size,32*size);else sprite(c,id,grade,col,size);
}
function passive(e){
 if(isPlayer(e)){const d=N.Appearance.player(e),s=d.stats;
 return [{id:'vitality',grade:Math.max(s.armor,s.vitality,s.regen),values:[s.armor,s.vitality,s.regen]},
 {id:'mobility',grade:Math.max(s.speed,s.dash,s.pickup),values:[s.speed,s.dash,s.pickup]},
 {id:'focus',grade:Math.max(s.damage,s.haste,s.projectiles,s.critical,s.criticalPower,s.range,s.pierce),values:[s.damage,s.haste,s.projectiles,s.critical,s.criticalPower,s.range,s.pierce]}];}
 const grade=band(1+(e.level||1)/12),out=[];
 if(e.trait==='armored'||e.trait==='mending'||e.boss||e.elite)out.push({id:'vitality',grade,values:[e.trait==='armored'?grade:0,e.trait==='mending'?grade:0,e.guardian?.ward>0?grade:0]});
 if(e.trait==='swift'||e.terrified)out.push({id:'mobility',grade,values:[grade]});
 if(e.trait==='volatile'||e.tier==='veteran')out.push({id:'focus',grade,values:[grade]});
 return out;
}
function rings(c,e){
 const list=passive(e),scale=isPlayer(e)?1:Math.min(2,e.scale||1),crowded=e.game.quality==='low'||e.game.enemies.length>100;
 c.save();let i=0;for(const ring of list){if(!ring.grade)continue;
  const r=(24+i*5)*scale,grade=Math.min(5,ring.grade),col=color(ring.id,grade);c.lineWidth=(.7+grade*.16)*scale;c.strokeStyle=col+'88';
  c.beginPath();c.ellipse(e.x,e.y+2,r,r*.44,0,0,TAU);c.stroke();
  if(grade>=3&&!crowded){c.strokeStyle=col+'32';c.lineWidth=.7;c.beginPath();c.ellipse(e.x,e.y+2,r+2,r*.44+1,0,0,TAU);c.stroke();}
  // Distinct passive training marks live on their ring, never on the costume.
  ring.values.forEach((v,j)=>{if(!v)return;const a=-Math.PI*.85+j*TAU/Math.max(7,ring.values.length);c.fillStyle=color(ring.id,Math.min(5,v));c.save();c.translate(e.x+Math.cos(a)*r,e.y+2+Math.sin(a)*r*.44);c.rotate(a);c.fillRect(-1,-1,1+v*.7,1.5);c.restore();});
  i++;if(crowded&&!isPlayer(e)&&!e.boss)break;
 }
 if(isPlayer(e)){const q=e.progress,accent=q.activeOath?'#e3be87':N.COVENS[e.coven].color;let n=0;for(const value of Object.values(q.talents||{}))if(value>0)n++;n+=Object.values(e.relics).filter(Boolean).length;const r=41;c.fillStyle=accent;for(let j=0;j<Math.min(n,18);j++){const a=j*TAU/18;c.beginPath();c.arc(e.x+Math.cos(a)*r,e.y+2+Math.sin(a)*r*.44,1.1,0,TAU);c.fill();}}
 c.restore();
}
function satellites(c,e,front){
 const list=ids(e),player=isPlayer(e),s=player?1:Math.min(1.8,e.scale||1),low=e.game.quality==='low';
 const target=player?e.game.combat.nearest():e.game.player;
 for(const id of list){if(player&&id==='orbit')continue;const p=origin(e,id);if((p.depth>=0)!==front)continue;
 const grade=band(rank(e,id)),col=color(id,grade),f=flash(e,id);c.save();c.translate(p.x,p.y);
 const aim=target?Math.atan2(target.y-12-p.y,target.x-p.x):0;c.rotate(aim);
 // Muzzle recoil moves the hull only; its actual emission anchor stays exact.
 const recoil=e.game.reducedMotion?0:f*2;c.translate(-recoil,0);hull(c,id,grade,col,s);
 if(f>0){c.globalAlpha=f;c.strokeStyle=col;c.lineWidth=1.4;c.beginPath();c.moveTo(10*s,-3*s);c.lineTo((15+f*7)*s,0);c.lineTo(10*s,3*s);c.stroke();}
 if(player&&e.evolved(id)){c.fillStyle='#c7aa7a';for(const side of [-1,1]){c.beginPath();c.moveTo(-4*s,side*5*s);c.lineTo(-10*s,side*10*s);c.lineTo(2*s,side*7*s);c.closePath();c.fill();}}
 const mastery=player?Math.min(3,Math.floor(Math.log2(1+(e.progress.mastery[id]||0)))):0;for(let j=0;j<mastery;j++){c.fillStyle='#f8e9c9';c.fillRect((-3+j*3)*s,-10*s,s,s);}
 if(!low&&grade>=4){c.globalAlpha=.4;c.strokeStyle=col;c.lineWidth=.7;c.beginPath();c.arc(0,0,12*s,-1.1,1.1);c.stroke();}
 c.restore();
 }
}
N.Orbitals={ids,rank,band,color,preview(c,id,rankValue=1,size=2){const grade=band(rankValue);hull(c,id,grade,color(id,grade),size);},origin,emit,flash,passive,rings,satellites,cacheSize:()=>cache.size,
 wisp(c,p,x,y){c.save();c.translate(x,y);hull(c,'orbit',band(p.weapons.orbit),p.evolved('orbit')?'#f1b075':color('orbit',band(p.weapons.orbit)),.75);c.restore();},
 draw(c,e,front){if(!front)rings(c,e);satellites(c,e,front);}
};
})();
