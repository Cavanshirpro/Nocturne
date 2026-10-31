/*
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade
This file is part of Nocturne. See the distribution's LICENSE and NOTICE files.
*/
/* Shared 2.5D emitter/ring system. Derived from actor state and world time.
 * Simulation and renderer use exactly the same origins, independent of quality.
 * Transient muzzle feedback is weakly owned and never enters a save. */
(() => {
'use strict';const N=window.Nocturne,TAU=Math.PI*2;
const schools=['bolt','orbit','lightning','nova','meteor','lance','thorn','rift','rapid','cannon','burst','glacier'];
const powers=['salvo','meteors','slash','aegis','soulring','riftstep','lances','starfall','crossfire','shockwave','voidseal'];
const palette={bolt:'#ba9ce8',orbit:'#b8a2dd',lightning:'#78d2df',nova:'#90c8f2',meteor:'#f59a66',lance:'#cea5f0',thorn:'#91bf85',rift:'#9987e0',rapid:'#e5ca91',cannon:'#dc9272',burst:'#df8caa',glacier:'#91dbe4',hostile:'#e3a190',vitality:'#89c6a4',mobility:'#73b7ce',focus:'#c6a2db'};
const alias={salvo:'rapid',meteors:'meteor',slash:'lance',aegis:'nova',soulring:'orbit',riftstep:'rift',lances:'lance',starfall:'meteor',crossfire:'burst',shockwave:'cannon',voidseal:'rift'};
const behaviours=Object.freeze({
 bolt:{mode:'crystal',rate:1.3,bob:1.4,radial:1.2,recoil:1.5},
 orbit:{mode:'comet',rate:2.3,bob:1,radial:1,recoil:0},
 lightning:{mode:'coil',rate:4.6,bob:1,radial:1.7,recoil:1},
 nova:{mode:'petals',rate:.85,bob:2.1,radial:1.4,recoil:1},
 meteor:{mode:'embers',rate:1.1,bob:2.4,radial:.7,recoil:2},
 lance:{mode:'rail',rate:1.7,bob:.6,radial:1.1,recoil:2.8},
 thorn:{mode:'leaves',rate:1.4,bob:1.5,radial:1.8,recoil:.8},
 rift:{mode:'iris',rate:-.9,bob:1.9,radial:2,recoil:.5},
 rapid:{mode:'rotor',rate:7,bob:.7,radial:.6,recoil:2.4},
 cannon:{mode:'piston',rate:.6,bob:.5,radial:1,recoil:4.5},
 burst:{mode:'triad',rate:2.5,bob:1.1,radial:1.3,recoil:2},
 glacier:{mode:'shards',rate:.75,bob:1.8,radial:1.2,recoil:1.2},
 hostile:{mode:'eye',rate:1.1,bob:1.2,radial:.8,recoil:2}
});
const behaviour=id=>behaviours[alias[id]||id]||behaviours.bolt;
function animation(e,id,grade,f=0){const b=behaviour(id),t=e.game.reducedMotion?0:e.game.time||0;return {mode:b.mode,phase:t===0?0:t*b.rate,breath:.5+.5*Math.sin(t*b.rate*2),recoil:e.game.reducedMotion?0:f*b.recoil,grade};}
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
 const b=behaviour(id),radius=((isPlayer(e)?52:34)+Math.sin(clock*b.rate+i)*b.radial)*scale;
 const hover=Math.sin(clock*b.rate*1.3+i)*b.bob*scale;
 return {x:e.x+Math.cos(angle)*radius,y:e.y-31*scale+Math.sin(angle)*radius*.48+hover,depth:Math.sin(angle),angle};
}
function emit(e,id){let f=flashes.get(e);if(!f){f=new Map();flashes.set(e,f);}f.set(id,e.game.time||0);return origin(e,id);}
function flash(e,id){const t=flashes.get(e)?.get(id);return t===undefined?0:Math.min(1,Math.max(0,1-((e.game.time||0)-t)/.18));}
function sprite(c,id,grade,col,size=1){
 const base=id==='spectral_hostile'?'hostile':alias[id]||id,r=4.8+grade*.34,enemy=powers.includes(id)||base==='hostile';
 c.save();c.scale(size,size);c.lineWidth=.9;c.strokeStyle=col;c.fillStyle=enemy?'#3e283b':'#273341';
 const poly=(pts,fill,stroke=true)=>{c.fillStyle=fill;c.beginPath();pts.forEach(([x,y],i)=>c[i?'lineTo':'moveTo'](x,y));c.closePath();c.fill();if(stroke)c.stroke();};
 const diamond=(x,y,rx,ry,fill)=>poly([[x-rx,y],[x,y-ry],[x+rx,y],[x,y+ry]],fill);
 c.fillStyle='#060b1455';c.beginPath();c.ellipse(0,7,r+2,2.3,0,0,TAU);c.fill();
 // Each school owns a silhouette: these are structures, not the same badge.
 if(id==='spectral_hostile'){poly([[-6,-8],[-2,-4],[-4,2],[0,7],[-5,5],[-8,-1]],'#315566');poly([[3,-7],[7,-3],[6,5],[2,8],[3,2]],col);diamond(0,0,2.2,4,'#cde6eb');}
 else if(base==='bolt'){diamond(0,0,r*.75,r*1.45,'#514664');poly([[-r*.75,0],[0,-r*1.45],[0,r*.8]],col,false);poly([[0,-r*1.45],[r*.75,0],[0,-1]],'#eee0f8',false);}
 else if(base==='orbit'){poly([[-7,-4],[-1,-6],[6,-1],[7,3],[0,5],[-5,1]],'#413b58');diamond(1,0,3,3,col);}
 else if(base==='lightning'){poly([[-6,-6],[-3,-6],[-2,3],[3,3],[4,-6],[7,-5],[6,6],[-6,6]],'#50606b');c.fillStyle=col;c.fillRect(-5,-6,2,4);c.fillRect(4,-6,2,4);diamond(0,1,2,3,'#d4f8f6');}
 else if(base==='nova'){for(let j=0;j<4;j++){c.save();c.rotate(j*TAU/4);diamond(0,-5,2.8,4,'#7387a8');c.restore();}diamond(0,0,3,3,col);}
 else if(base==='meteor'){poly([[-6,4],[-7,-3],[-3,-7],[2,-6],[6,-2],[5,5],[0,7]],'#634548');poly([[-5,1],[-2,-5],[3,-3],[1,4]],'#f0a166',false);diamond(0,0,2,3,'#ffe0a7');}
 else if(base==='lance'){poly([[-9,3],[-5,-3],[7,-2],[10,0],[7,2],[-5,3]],'#777183');poly([[-5,-2],[8,-1],[11,0],[-4,0]],col,false);}
 else if(base==='thorn'){poly([[-7,3],[-5,-2],[0,-6],[4,-2],[7,-5],[6,3],[1,6]],'#34493d');for(const side of [-1,1])poly([[-3,side*2],[0,side*8],[5,side*4],[1,0]],col);diamond(0,0,1.5,3,'#c7e6b0');}
 else if(base==='rift'){c.lineWidth=2;c.strokeStyle='#78728f';c.beginPath();c.ellipse(0,0,6,7,0,0,TAU);c.stroke();c.lineWidth=.8;c.strokeStyle=col;for(const side of [-1,1])poly([[side*4,-7],[side*8,-2],[side*6,6],[side*4,2]],'#4b3b66');c.fillStyle='#090d18';c.beginPath();c.ellipse(0,0,3.7,5,0,0,TAU);c.fill();}
 else if(base==='rapid'){poly([[-7,-5],[0,-5],[4,-3],[4,4],[-3,5],[-7,2]],'#5c6266');c.fillStyle=col;c.fillRect(1,-3,9,2);c.fillRect(1,1,9,2);c.fillStyle='#1b2630';c.fillRect(-6,-2,5,3);}
 else if(base==='cannon'){poly([[-9,-6],[0,-7],[5,-4],[5,5],[-4,7],[-9,3]],'#67514d');c.fillStyle='#92908c';c.fillRect(-1,-4,11,8);c.fillStyle='#303238';c.fillRect(7,-3,3,6);c.fillStyle=col;c.fillRect(0,-2,6,4);}
 else if(base==='burst'){poly([[-7,-5],[-1,-6],[3,0],[-1,6],[-7,4]],'#604759');for(let j=-1;j<=1;j++){c.save();c.rotate(j*.42);poly([[-2,-1],[10,-1],[10,1],[-2,1]],col);c.restore();}}
 else if(base==='glacier'){for(let j=0;j<3;j++){c.save();c.rotate((j-1)*.8);diamond(0,-3,2.8,6,j===1?'#def1f4':col);c.restore();}}
 else{poly([[-7,0],[-3,-5],[3,-5],[8,0],[3,5],[-3,5]],'#4d2e3b');diamond(1,0,4,2.4,col);c.fillStyle='#201a2b';c.fillRect(0,-2,1.5,4);}
 // Five structural grades: collars -> side armor -> paired fins -> open crown.
 if(grade>=2){c.strokeStyle='#ad9c85';c.lineWidth=1.4;c.beginPath();c.arc(-3,0,3.5,Math.PI*.45,Math.PI*1.55);c.stroke();}
 if(grade>=3)for(const side of [-1,1])poly([[-6,side*3],[-10,side*6],[-7,side*8],[-4,side*5]],'#736779');
 if(grade>=4)for(const side of [-1,1])poly([[-3,side*5],[1,side*11],[4,side*8],[2,side*4]],col);
 if(grade>=5){c.lineWidth=.8;c.strokeStyle='#ead9bc';c.beginPath();c.arc(-3,0,11,Math.PI*.6,Math.PI*1.4);c.stroke();diamond(-11,0,1.4,2.3,'#f2e1bd');}
 if(enemy){c.strokeStyle='#ee8d98';for(const side of [-1,1])poly([[-5,side*4],[-9,side*9],[-2,side*6]],'#613544');}
 c.restore();
}
function hull(c,id,grade,col,size){
 const key=id+':'+grade+':'+col;let surface=cache.get(key);
 if(!surface&&typeof OffscreenCanvas!=='undefined'){
  surface=new OffscreenCanvas(64,64);const ctx=surface.getContext('2d');ctx.translate(32,32);sprite(ctx,id,grade,col,2);if(cache.size>=160)cache.delete(cache.keys().next().value);cache.set(key,surface);
 }
 if(surface)c.drawImage(surface,-16*size,-16*size,32*size,32*size);else sprite(c,id,grade,col,size);
}
function mechanism(c,e,id,grade,col,f,low){
 const a=animation(e,id,grade,f),t=a.phase,b=a.breath;c.save();c.strokeStyle=col;c.fillStyle=col;c.lineWidth=.9;
 // Tiny enemy modules use only their activation feedback in low/crowded scenes.
 if(low){if(f>0)c.fillRect(7,-1,3+f*3,2);else if(isPlayer(e)){c.globalAlpha=.4+.4*b;c.fillRect(-1,-1,2,2);}c.restore();return;}
 if(a.mode==='rotor'){c.save();c.translate(-5,0);c.rotate(t);for(let j=0;j<3;j++){c.rotate(TAU/3);c.fillRect(0,-.6,4,1.2);}c.restore();c.fillStyle='#fff0cb';c.fillRect(7,(Math.floor(t*3)%2?1:-3),2+f*3,1.2);}
 else if(a.mode==='piston'){c.fillStyle='#7d8b92';c.fillRect(2-f*2,-3,7,6);c.fillStyle=col;c.fillRect(7-f*2,-2,2,4);for(let j=0;j<3;j++)c.fillRect(-5+j*2,-3,1,6);c.globalAlpha=.25+.45*b;c.fillRect(0,-1,3,2);}
 else if(a.mode==='coil'){for(let j=0;j<2;j++){const offset=(j?1:-1)*(5+b*1.5);c.beginPath();c.moveTo(-4,offset);c.lineTo(-1,offset-1.5);c.lineTo(1,offset+((Math.floor(t*2)+j)%2?2:-2));c.lineTo(4,offset);c.stroke();}}
 else if(a.mode==='iris'){for(let j=0;j<2;j++){c.beginPath();c.ellipse(0,0,5+j*2,3+j,t*(j?-1:1),.2,Math.PI*1.5);c.stroke();}c.fillStyle='#101727';c.beginPath();c.arc(0,0,1.5+b,0,TAU);c.fill();}
 else if(a.mode==='embers'){for(let j=0;j<3;j++){const q=((Math.abs(t)*.4+j/3)%1);c.globalAlpha=1-q;c.fillRect(-2+j*2,-5-q*7,1.2,2.5);} }
 else if(a.mode==='petals'){for(let j=0;j<4;j++){const an=j*TAU/4+t*.2,r=6+b*2;c.beginPath();c.arc(Math.cos(an)*r,Math.sin(an)*r,2,an-.6,an+.6);c.stroke();}}
 else if(a.mode==='leaves'){for(const side of [-1,1]){const sway=Math.sin(t+side)*1.5;c.beginPath();c.moveTo(-3,side*4);c.quadraticCurveTo(2+sway,side*10,6,side*5);c.quadraticCurveTo(0,side*6,-3,side*4);c.stroke();}}
 else if(a.mode==='rail'){c.globalAlpha=.35+.65*b;c.beginPath();c.moveTo(-1,3);c.lineTo(5+b*3,-4-b);c.stroke();c.fillRect(-4,-1,1+b,2);}
 else if(a.mode==='triad'){for(let j=0;j<3;j++){const an=(j-1)*.48,r=7+Math.sin(t+j)*1.4;c.beginPath();c.moveTo(Math.cos(an)*r,Math.sin(an)*r);c.lineTo(Math.cos(an)*(r+2+f*3),Math.sin(an)*(r+2+f*3));c.stroke();}}
 else if(a.mode==='shards'){for(let j=0;j<3;j++){const an=t*.3+j*TAU/3,x=Math.cos(an)*7,y=Math.sin(an)*5;c.globalAlpha=.4+.6*Math.max(0,Math.sin(t+j));c.beginPath();c.moveTo(x,y-2);c.lineTo(x+1.5,y);c.lineTo(x,y+2);c.stroke();}}
 else if(a.mode==='eye'){c.globalAlpha=.4+.5*b;c.beginPath();c.ellipse(0,0,4,1.2+b,0,0,TAU);c.stroke();c.fillRect(Math.sin(t)*1.5,-.8,1.5,1.5);}
 else{c.globalAlpha=.4+.6*b;c.save();c.rotate(t*.5);c.beginPath();c.moveTo(0,-4);c.lineTo(2,0);c.lineTo(0,4);c.lineTo(-2,0);c.closePath();c.stroke();c.restore();}
 c.restore();
}
function ringMotion(c,e,ring,r,col,low){
 if(low&&!isPlayer(e)&&!e.boss)return;
 const frozen=e.game.reducedMotion||e.frozen>0,t=frozen?0:e.game.time||0,player=isPlayer(e);c.save();c.strokeStyle=col;c.lineWidth=.9;
 const arc=(a,b,rr=r)=>{c.beginPath();c.ellipse(e.x,e.y+2,rr,rr*.44,0,a,b);c.stroke();};
 if(ring.id==='vitality'){
  const hit=player?e.invulnerable>0:e.lastHit>0;c.globalAlpha=hit?.9:.22;const count=low?3:5;
  for(let j=0;j<count;j++){const a=j*TAU/count+.08;arc(a,a+.32,r+1.4);}
  if(!low&&(player?ring.values[2]:ring.values[1])>0&&e.hp<e.maxHp){c.globalAlpha=.5;arc(t*.6,t*.6+.5,r-2);}
 }else if(ring.id==='mobility'){
  const direction=player?Math.atan2(e.lastY??0,e.lastX??1):({E:0,SE:Math.PI/4,S:Math.PI/2,SW:Math.PI*.75,W:Math.PI,NW:-Math.PI*.75,N:-Math.PI/2,NE:-Math.PI/4}[N.HostileVisuals?N.HostileVisuals.facing(e):e.facing]||0);
  c.globalAlpha=e.dashTimer>0?.9:e.moving?.55:.15;const run=frozen?0:t*(e.dashTimer>0?5:2);
  arc(direction+Math.PI+Math.sin(run)*.2-.45,direction+Math.PI+Math.sin(run)*.2+.45,r+1.5);
  if(!low){const q=player?1-Math.min(1,(e.dashRemaining||0)/Math.max(.01,e.dashCooldown)): .5;arc(direction-.2,direction-.2+q*.6,r-2);}
 }else{
  const charge=player&&e.game.abilities?.charging?e.game.abilities.charge/1.2:0;
  c.globalAlpha=charge>0?.9:.22;c.lineWidth=charge>0?1.8:.8;
  const phase=-t*.4;arc(phase,phase+.55+charge*1.5,r+1.5);if(!low)arc(phase+Math.PI,phase+Math.PI+.55,r+1.5);
 }
 c.restore();
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
  const r=(24+i*5)*scale,grade=Math.min(5,ring.grade),col=color(ring.id,grade);c.lineWidth=(.7+grade*.16)*scale;c.strokeStyle=col+'52';
  c.beginPath();c.ellipse(e.x,e.y+2,r,r*.44,0,0,TAU);c.stroke();
  if(grade>=3&&!crowded){c.strokeStyle=col+'32';c.lineWidth=.7;c.beginPath();c.ellipse(e.x,e.y+2,r+2,r*.44+1,0,0,TAU);c.stroke();}
  ringMotion(c,e,ring,r,col,crowded);
  // Distinct passive training marks live on their ring, never on the costume.
  ring.values.forEach((v,j)=>{if(!v)return;const a=-Math.PI*.85+j*TAU/Math.max(7,ring.values.length);c.fillStyle=color(ring.id,Math.min(5,v));c.save();c.translate(e.x+Math.cos(a)*r,e.y+2+Math.sin(a)*r*.44);c.rotate(a);c.fillRect(-1,-1,1+v*.7,1.5);c.restore();});
  i++;if(crowded&&!isPlayer(e)&&!e.boss)break;
 }
 if(isPlayer(e)){const q=e.progress,accent=q.activeOath?'#e3be87':N.COVENS[e.coven].color;let n=0;for(const value of Object.values(q.talents||{}))if(value>0)n++;n+=Object.values(e.relics).filter(Boolean).length;const r=41;c.fillStyle=accent;for(let j=0;j<Math.min(n,18);j++){const a=j*TAU/18;c.beginPath();c.arc(e.x+Math.cos(a)*r,e.y+2+Math.sin(a)*r*.44,1.1,0,TAU);c.fill();}}
 c.restore();
}
function satellites(c,e,front){
 const list=ids(e),player=isPlayer(e),s=player?1:Math.min(1.8,e.scale||1),low=e.game.quality==='low'||(!player&&!e.boss&&e.game.enemies.length>80);
 const target=player?e.game.combat.nearest():e.game.player;
 for(const id of list){if(player&&id==='orbit')continue;const p=origin(e,id);if((p.depth>=0)!==front)continue;
 const grade=band(rank(e,id)),col=id==='hostile'&&e.type==='wraith'?'#9ccbd6':color(id,grade),f=flash(e,id);c.save();c.translate(p.x,p.y);
 const aim=target?Math.atan2(target.y-12-p.y,target.x-p.x):p.angle;
 const q=e.guardian||e.tactics,awake=player||!e.boss||q?.action===id||(q?.releaseTime>0&&q.lastAction===id)||f>.03;
 const visualScale=s*(player?.68+.18*(p.depth+1)/2:.82)*(awake?1:.44);if(!front)c.globalAlpha*=.72;if(!awake)c.globalAlpha*=.28;
 moduleDraw(c,e,id,grade,col,visualScale,aim,f,low||!awake,player&&e.evolved(id),player?e.progress.mastery[id]||0:0);

 c.restore();
 }
}
function moduleDraw(c,e,id,grade,col,s,aim,f,low,evolved=false,mastery=0){
 c.save();c.rotate(aim);
 const anim=animation(e,id,grade,f),recoil=anim.recoil;
 // The emitter centre is the gameplay muzzle. Only the breech slides back.
 c.save();c.translate(-10*s-recoil,0);hull(c,id==='hostile'&&e.type==='wraith'?'spectral_hostile':id,grade,col,s);c.restore();
 c.save();c.translate(-10*s,0);c.scale(s,s);mechanism(c,e,id,grade,col,f,low);c.restore();
 c.strokeStyle=col;c.lineWidth=1.1;c.beginPath();c.moveTo(-5*s,0);c.lineTo(0,0);c.stroke();
 c.fillStyle=f>0?'#fff0d3':col;c.fillRect(-s,-1.1*s,2*s,2.2*s);
 if(!low){const t=anim.phase,mode=anim.mode;c.globalAlpha=.2+.15*anim.breath;c.strokeStyle=col;c.lineWidth=.8;
  if(['iris','comet','embers'].includes(mode)){const lag=mode==='iris'?-1:1;c.beginPath();c.moveTo(-18*s,-2*s);c.quadraticCurveTo(-24*s,-(3+Math.sin(t)*2)*s,-(27+anim.breath*3)*s,lag*3*s);c.stroke();}
  c.globalAlpha=1;
 }
 if(evolved){c.fillStyle='#c7aa7a';for(const side of [-1,1]){c.beginPath();c.moveTo(-14*s,side*5*s);c.lineTo(-23*s,side*10*s);c.lineTo(-8*s,side*7*s);c.closePath();c.fill();}}
 for(let j=0;j<Math.min(3,Math.floor(Math.log2(1+mastery)));j++){c.fillStyle='#f8e9c9';c.fillRect((-13+j*3)*s,-10*s,s,s);}
 if(f>0){c.globalAlpha=f;c.strokeStyle=col;c.lineWidth=id==='cannon'?2.2:1.2;c.beginPath();c.moveTo(0,-2*s);c.lineTo((3+f*6)*s,0);c.lineTo(0,2*s);c.stroke();}
 c.restore();
}
N.Orbitals={ids,rank,band,color,behaviours,behaviour,animation,preview(c,id,rankValue=1,size=2){const grade=band(rankValue);hull(c,id,grade,color(id,grade),size);},inspect(c,e,id,rankValue=1,size=2,evolved=false,mastery=0){if(id==='orbit'){const a=(e.game.time||0)*2.3,p=Object.assign(Object.create(e),{x:-Math.cos(a)*70,y:12-Math.sin(a)*70*.78,weapons:{...e.weapons,orbit:rankValue},progress:{...e.progress,mastery:{...e.progress.mastery,orbit:mastery}},evolved:()=>evolved});c.save();c.scale(size/.75,size/.75);this.wisp(c,p,0,0);c.restore();return;}const grade=band(rankValue);moduleDraw(c,e,id,grade,color(id,grade),size,0,flash(e,id),e.game.quality==='low',evolved,mastery);},origin,emit,flash,passive,rings,satellites,cacheSize:()=>cache.size,
 wisp(c,p,x,y){c.save();c.translate(x,y);const col=p.evolved('orbit')?'#f1b075':color('orbit',band(p.weapons.orbit));c.rotate(Math.atan2(y-p.y+12,x-p.x)+Math.PI/2);hull(c,'orbit',band(p.weapons.orbit),col,.75);if(p.evolved('orbit')){c.fillStyle='#d6b47e';for(const side of [-1,1]){c.beginPath();c.moveTo(side*3,1);c.lineTo(side*7,7);c.lineTo(side*2,5);c.closePath();c.fill();}}for(let j=0;j<Math.min(3,Math.floor(Math.log2(1+(p.progress.mastery.orbit||0))));j++){c.fillStyle='#f4e1b7';c.fillRect(-3+j*2,-7,.8,.8);}if(p.game.quality!=='low'){c.strokeStyle=col+'77';c.lineWidth=.8;c.beginPath();c.moveTo(-2,4);c.quadraticCurveTo(-5,8,-2,12);c.stroke();}c.restore();},
 draw(c,e,front){if(!front)rings(c,e);satellites(c,e,front);}
};
})();
