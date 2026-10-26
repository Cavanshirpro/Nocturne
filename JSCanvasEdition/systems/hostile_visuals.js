/* Hostile identity and feedback. Pure state reads + bounded cosmetic caches.
 * No gameplay RNG, new attacks, save fields, simulation clocks or particles. */
(() => {
'use strict';const N=window.Nocturne,TAU=Math.PI*2,cache=new Map(),hits=new WeakMap(),frames=new WeakMap();
const facings={S:0,SW:1,W:2,NW:3,N:4,NE:5,E:6,SE:7},levels=[8,20,40,80,160];
const anatomy=Object.freeze({slime:{lean:.006,lift:.3,hit:.17},skeleton:{lean:.026,lift:.45,hit:.012},gargoyle:{lean:.018,lift:.25,hit:.008},hound:{lean:.025,lift:.45,hit:.03},cultist:{lean:.02,lift:.4,hit:.018},wraith:{lean:.012,lift:1.2,hit:.045},reaper:{lean:.035,lift:.45,hit:.012},warden:{lean:.01,lift:.18,hit:.005},overlord:{lean:.012,lift:.8,hit:.012}});
function facing(e){if(e.type==='hound'&&(e.windup>0||e.charge>0)&&Math.hypot(e.chargeX||0,e.chargeY||0)>.01)return ['E','SE','S','SW','W','NW','N','NE'][(Math.round(Math.atan2(e.chargeY,e.chargeX)/(Math.PI/4))+8)%8];return e.facing||'S';}
function grade(e){let v=0;for(const n of levels)if((e.level||1)>=n)v++;return v;}
function role(e){return e.guardian&&e.type==='overlord'?'sovereign':e.summonedBy?(e.type==='overlord'?'commander':'soldier'):e.boss?'boss':e.elite?'elite':e.tier==='veteran'?'veteran':'regular';}
function state(e){const q=e.guardian||e.tactics,action=q?.dodgeWindup>0||q?.dodgeTime>0?'riftstep':q?.action||((q?.releaseTime||0)>0?q.lastAction:null);let stage='normal';if(q?.dodgeTime>0)stage='activation';else if(q?.dodgeWindup>0)stage=q.dodgeWindup<.07?'imminent':'preparation';else if(q?.windup>0)stage=q.windup<Math.min(.25,(q.windupTotal||1)*.25)?'imminent':'preparation';else if(q?.releaseTime>.38)stage='activation';else if(q?.releaseTime>0)stage='recovery';else if(q?.ward>0)stage='defending';return {role:role(e),grade:grade(e),action,stage,enraged:!!e.boss&&e.hp/e.maxHp<(e.guardian?.4:.45),ward:q?.ward>0?N.clamp(q.ward/Math.max(1,q.wardMax),0,1):0};}
function noteHit(e,crit,vx,vy){let h=hits.get(e);if(!h){h={time:0,crit:false,vx:0,vy:0};hits.set(e,h);}h.time=e.game.time||0;h.crit=!!crit;const length=Math.hypot(vx,vy)||1;h.vx=vx/length;h.vy=vy/length;}
function pose(e){
 if(e.game.reducedMotion||e.frozen>0)return {lean:0,lift:0,stretch:0};const p=anatomy[e.type]||anatomy.cultist,walking=e.moving!==false&&e.spawnDelay<=0,phase=e.phase||0,gait=e.gait||0,hit=Math.max(0,Math.min(1,(e.hitSquash||0)/.12)),r=N.EnemyMotion.ritual(e),h=hits.get(e),direction=h?.vx||Math.sign(e.knockX||0)||1;
 let lean=(walking?Math.sin(gait)*p.lean:Math.sin(phase)*p.lean*.2)+hit*direction*(e.type==='skeleton'?.055:e.type==='hound'?.04:e.boss?.009:.025),lift=['wraith','overlord'].includes(e.type)?Math.sin(phase*.8)*p.lift:walking?Math.abs(Math.sin(gait*2))*p.lift:0,stretch=hit*p.hit;
 if(e.type==='slime')stretch+=Math.sin(phase)*.045;
 if(e.type==='hound'&&e.windup>0)stretch=-.035;
 if(e.type==='hound'&&e.charge>0){stretch=.065;lean=0;}
 if(r?.style==='sweep')lean+=Math.sin(r.t*TAU)*(e.type==='warden'?.035:.075);
 if(r?.style==='blink')stretch+=Math.sin(r.t*Math.PI)*.07;
 if(e.boss&&e.hp/e.maxHp<(e.guardian?.4:.45)){lean+=e.type==='warden'?.012:.006;if(e.type==='overlord'){lift+=.5;stretch-=.012;}}
 return {lean,lift,stretch};
}
function project(e,x,y,z,scale=1){const a=(facings[facing(e)]||0)*Math.PI/4;return [x*Math.cos(a)-y*Math.sin(a), (x*Math.sin(a)+y*Math.cos(a))*.46-z*.87];}
function paint(c,e,d){
 const a=(facings[facing(e)]||0)*Math.PI/4,co=Math.cos(a),si=Math.sin(a),small=e.type==='slime'||e.type==='hound',top=small?(e.type==='hound'?42:34):67;
 const p=(x,y,z)=>[56+x*co-y*si,132+(x*si+y*co)*.46-z*.87];
 const poly=(pts,fill,edge)=>{if(co<-.3&&pts.every(v=>v[1]>=9))return;c.beginPath();pts.forEach(v=>{const xy=p(...v);if(v===pts[0])c.moveTo(...xy);else c.lineTo(...xy);});c.closePath();c.fillStyle=fill;c.fill();if(edge){c.strokeStyle=edge+'99';c.lineWidth=.65;c.stroke();}};
 const line=(pts,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();pts.forEach((v,i)=>c[i?'lineTo':'moveTo'](...p(...v)));c.stroke();};
 const gem=(x,y,z,r,color)=>poly([[x-r,y,z],[x,y,z+r*1.3],[x+r,y,z],[x,y,z-r]],color,'#dccdb0');
 const spectral=e.type==='wraith',col=d.role==='sovereign'?'#d2a7c4':d.role==='commander'?'#87b9c4':e.elite?'#d8bb7d':'#8d9aab',g=d.grade;
 // Level bands add larger anatomical surfaces, never an unbounded badge count.
 if(g>=1){for(const side of [-1,1]){
  if(spectral)poly([[side*9,-2,69],[side*15,-6,77+g],[side*18,-5,57],[side*12,0,61]],'#426373a0',col);
  else if(small)poly([[side*7,3,top],[side*12,1,top+5+g],[side*16,5,top-1]],'#596071',col);
  else poly([[side*10,3,66],[side*(16+g),1,70+Math.min(3,g)],[side*(19+g*.5),6,62],[side*13,9,59]],'#495260',col);
 }}
 if(g>=3){for(const side of [-1,1]){if(small)line([[side*9,2,top],[side*16,-3,top+7],[side*18,-6,top+4]],col,1.7);else if(spectral)poly([[side*13,-5,55],[side*18,-8,58],[side*22,-7,29],[side*15,-2,36]],'#547b8e88',col);
 else poly([[side*12,7,58],[side*18,5,59],[side*19,7,46],[side*12,10,43]],'#565667',col);}}
 if(g>=5&&!small){for(const side of [-1,1])poly([[side*10,-1,94],[side*16,-3,102],[side*13,1,94]],'#615568',col);}
 if(e.trait==='armored')for(const side of [-1,1]){
  const z=small?top-3:61,x=small?11:10;poly([[side*(x-5),9,z+5],[side*(x+5),6,z+4],[side*(x+6),10,z-8],[side*(x-3),13,z-10]],'#636d76','#b9c1bd');line([[side*(x-3),13,z+1],[side*(x+3),11,z]],'#d5d6c4',1.1);
 }
 if(e.trait==='armored'&&co<-.3){poly([[-9,-12,small?top+2:63],[9,-12,small?top+2:63],[8,-14,small?top-8:48],[-8,-14,small?top-8:48]],'#5e6973','#b4c1bd');}
 if(e.trait==='swift')for(const side of [-1,1])poly([[side*8,-4,small?top:52],[side*19,-15,small?top+6:66],[side*15,-13,small?top-8:34]],'#3d5564','#87c5ce');
 if(e.trait==='mending')for(const side of [-1,1]){const x=side*(small?12:14),z=small?top:58;line([[x,-3,z-10],[x+side*4,-5,z],[x+side*2,-7,z+12]],'#86ae8c',1.8);poly([[x,-3,z],[x+side*9,-4,z+5],[x+side*3,-2,z+8]],'#547761','#acc6a3');gem(x+side*2,-7,z+10,1.8,'#b3d6ac');}
 if(e.trait==='volatile'){const z=small?top-7:58;gem(0,small?17:15,z,small?4:4.8,'#e5a26c');for(const side of [-1,1])line([[side*3,14,z+7],[side*7,13,z+2],[side*5,14,z-6]],'#dd966a',1);}
 if(e.elite){for(const side of [-1,1]){const z=small?top+7:98;poly([[side*6,-1,z-4],[side*10,-4,z+7],[side*13,-2,z]],'#a88a5b','#dfc58d');}}
 if(e.tier==='veteran'){const z=small?top-2:58;line([[-6,13,z+5],[-2,15,z],[2,14,z-3]],'#d1b99c',1.5);}
 if(d.role==='commander'){
  // A short, asymmetric pennant distinguishes command without a boss aura.
  line([[-16,-9,65],[-19,-10,98]],'#86aeb9',1.3);poly([[-19,-10,96],[-32,-10,91],[-25,-10,82],[-19,-10,86]],'#325967','#92c3cd');
  gem(0,10,98,2.5,'#a8d6df');
 }else if(d.role==='soldier')poly([[-5,12,small?top:62],[0,14,small?top+3:66],[5,12,small?top:62],[0,14,small?top-3:58]],'#5b8b94');
 if(d.role==='sovereign'){
  for(let i=-2;i<=2;i++){const z=100+(2-Math.abs(i))*3;poly([[i*4-1.5,3,95],[i*4,1,z+8],[i*4+1.5,4,95]],'#b38caa','#e6bfd1');}
  for(const side of [-1,1])poly([[side*14,-7,67],[side*24,-10,75],[side*27,-12,43],[side*17,-9,50]],'#4e304e','#b88aac');
 }else if(d.role==='boss'&&e.type==='overlord'){for(const side of [-1,1])gem(side*5,5,101,2.2,col);}
}
function simple(c,e,d){
 const s=e.scale||1,small=e.type==='hound'||e.type==='slime',z=small?28:49,colors={armored:'#a9b8bc',swift:'#8ec6d0',mending:'#a9ccaa',volatile:'#e6ac79'},col=colors[e.trait]||'#a8a2b8',a=(facings[facing(e)]||0)*Math.PI/4;
 c.save();c.strokeStyle=col;c.fillStyle=col;c.lineWidth=.9;for(const side of [-1,1]){const x=side*(small?12:14)*Math.cos(a)*.833*s,y=-2*s+side*(small?12:14)*Math.sin(a)*.384*s-z*.727*s;c.beginPath();if(e.trait==='swift'){c.moveTo(x,y);c.lineTo(x-side*4,y-7);c.lineTo(x+side*2,y-3);}else if(e.trait==='mending'){c.moveTo(x,y+4);c.lineTo(x+side*2,y-5);c.lineTo(x+side*5,y-3);}else{c.moveTo(x-2,y-3);c.lineTo(x+3,y-2);c.lineTo(x+2,y+3);c.lineTo(x-2,y+2);c.closePath();}c.stroke();}if(e.trait==='volatile'){c.beginPath();c.moveTo(0,-z*.727*s-4);c.lineTo(3,-z*.727*s);c.lineTo(0,-z*.727*s+4);c.lineTo(-3,-z*.727*s);c.closePath();c.fill();}c.restore();
}
function local(c,e){
 const d=state(e);if(d.grade===0&&e.trait==='none'&&!e.elite&&e.tier!=='veteran'&&['regular','boss'].includes(d.role))return;
 const prominent=e.boss||e.elite||e.tier==='veteran',crowded=e.game.enemies.length>100;if(crowded&&!prominent&&(e.game.quality==='low'||N.dist2(e,e.game.player)>300**2)){simple(c,e,d);return;}
 const shape=['slime','hound','wraith'].includes(e.type)?e.type:'humanoid',key=shape+':'+facing(e)+':'+d.grade+':'+e.trait+':'+Number(e.elite)+':'+e.tier+':'+d.role;let image=cache.get(key);
 if(!image&&typeof OffscreenCanvas!=='undefined'){if(crowded&&!prominent){let f=frames.get(e.game);if(!f||f.time!==e.game.time){f={time:e.game.time,admitted:0};frames.set(e.game,f);}if(f.admitted>=6){simple(c,e,d);return;}f.admitted++;}image=new OffscreenCanvas(112,144);paint(image.getContext('2d'),e,d);if(cache.size>=96)cache.delete(cache.keys().next().value);cache.set(key,image);}
 c.save();const s=e.scale||1;if(image)c.drawImage(image,-56*(80/96)*s,(-2.03125-132*(107/128))*s,112*(80/96)*s,144*(107/128)*s);else{c.scale(80/96*s,107/128*s);c.translate(-56,-134.4299);paint(c,e,d);}c.restore();
}
function rear(c,e){
 if(!e.boss||e.hp/e.maxHp>=(e.guardian?.4:.45))return;const s=e.scale||1,a=(facings[facing(e)]||0)*Math.PI/4,co=Math.cos(a),si=Math.sin(a),p=(x,y,z)=>[e.x+(x*co-y*si)*.833*s,e.y-2*s+(x*si+y*co)*.384*s-z*.727*s];c.save();c.lineWidth=.9;
 for(const side of [-1,1]){const pts=e.type==='overlord'?[[side*13,-10,65],[side*43,-20,91],[side*36,-17,49],[side*23,-12,43]]:[[side*12,-10,65],[side*25,-13,70],[side*25,-12,51],[side*16,-9,46]];c.beginPath();pts.forEach((v,i)=>c[i?'lineTo':'moveTo'](...p(...v)));c.closePath();c.fillStyle=e.type==='overlord'?'#542d4d':'#4b5960';c.strokeStyle=e.type==='overlord'?'#c28aaa':'#c1b09a';c.fill();c.stroke();const q=p(side*24,-13,64);c.strokeStyle='#dd9eaf';c.beginPath();c.moveTo(q[0]-2,q[1]-4);c.lineTo(q[0]+2,q[1]);c.lineTo(q[0],q[1]+4);c.stroke();}c.restore();
}
function feedback(c,e){
 const low=e.game.quality==='low'||(!e.boss&&!e.elite&&e.game.enemies.length>100),still=e.game.reducedMotion||e.frozen>0,s=e.scale||1,hit=hits.get(e),recent=hit?N.clamp(1-((e.game.time||0)-hit.time)/.18,0,1):0,top=['hound','slime'].includes(e.type)?25:47;
 c.save();c.translate(e.x,e.y);c.strokeStyle=e.type==='wraith'?'#a3d7df':e.trait==='armored'?'#d0d1bf':'#d9b9b1';c.lineWidth=1.2;
 if(e.hitSquash>0){const strength=Math.min(1,e.hitSquash/.12);c.globalAlpha=strength*.7;const dx=hit?.vx||1,x=dx*(e.type==='slime'?15:10)*s,y=-top*s;
  c.beginPath();if(e.type==='wraith'){c.moveTo(x-4,y-9);c.lineTo(x+1,y-3);c.moveTo(x-2,y+2);c.lineTo(x+4,y+8);}else if(e.trait==='armored'||e.boss){c.moveTo(x-4,y-5);c.lineTo(x+1,y-7);c.lineTo(x+5,y-2);}else{c.moveTo(x-2,y-6);c.lineTo(x+2,y+6);}c.stroke();
 }
 if(recent>0&&hit.crit){c.globalAlpha=recent;c.strokeStyle='#e8cc93';c.beginPath();const x=hit.vx*14*s,y=-top*s+hit.vy*4;for(let j=0;j<(low?2:3);j++){const a=(j-1)*.65;c.moveTo(x+Math.cos(a)*4,y+Math.sin(a)*4);c.lineTo(x+Math.cos(a)*10,y+Math.sin(a)*10);}c.stroke();}
 if(e.frozen>0){c.globalAlpha=.8;c.strokeStyle='#a4d6e6';for(const side of [-1,1]){c.beginPath();c.moveTo(side*10*s,-18*s);c.lineTo(side*16*s,-32*s);c.lineTo(side*18*s,-16*s);c.stroke();}}
 if(e.burn>0){c.globalAlpha=.8;c.fillStyle='#de9c70';const t=still?0:e.game.time;for(let i=0;i<(low?1:2);i++){const x=(i?8:-7)*s,y=-(26+i*8)*s,r=(2+Math.sin(t*7+i)*.5)*s;c.beginPath();c.moveTo(x-r,y);c.lineTo(x,y-r*3);c.lineTo(x+r,y);c.closePath();c.fill();}}
 if(e.trait==='mending'&&e.lastHit<=0&&e.hp<e.maxHp&&!low){const pulse=still?.5:.5+.5*Math.sin(e.game.time*2);c.globalAlpha=.25+pulse*.35;c.strokeStyle='#a6cba8';c.beginPath();c.moveTo(-3*s,-43*s);c.lineTo(3*s,-43*s);c.moveTo(0,-46*s);c.lineTo(0,-40*s);c.stroke();}
 const q=e.guardian||e.tactics;if(e.boss&&e.hp/e.maxHp<(e.guardian?.4:.45)){c.globalAlpha=.7;c.strokeStyle='#dd9aaf';c.lineWidth=1.1;for(const side of [-1,1]){c.beginPath();c.moveTo(side*6*s,-53*s);c.lineTo(side*10*s,-48*s);c.lineTo(side*7*s,-43*s);c.stroke();}}
 if(q?.ward>0){c.globalAlpha=.7;c.strokeStyle='#c8c2e1';c.beginPath();c.ellipse(0,-42*s,14*s,20*s,0,-Math.PI/2,-Math.PI/2+TAU*N.clamp(q.ward/Math.max(1,q.wardMax),0,1));c.stroke();}
 c.restore();
}
function shadow(c,e){
 const s=e.scale||1,type=e.type; c.save();c.fillStyle=type==='wraith'?'#080e122a':'#080e1259';c.beginPath();c.ellipse(e.x,e.y+2,type==='hound'?22*s:type==='slime'?24*s:e.radius+3,type==='hound'?10*s:type==='wraith'?6*s:e.radius*.35,0,0,TAU);c.fill();
 if(!['slime','wraith','overlord'].includes(type)&&e.game.quality!=='low'){const a=(facings[facing(e)]||0)*Math.PI/4,gait=Math.sin(e.gait||0);c.fillStyle='#080c1450';for(const side of [-1,1]){const x=side*8,y=gait*side*7;c.beginPath();c.ellipse(e.x+(x*Math.cos(a)-y*Math.sin(a))*.83*s,e.y+(x*Math.sin(a)+y*Math.cos(a))*.38*s,4*s,1.6*s,0,0,TAU);c.fill();}}
 c.restore();
}
function ritual(c,e){
 const r=N.EnemyMotion.ritual(e);if(!r)return;const q=e.guardian||e.tactics,d=state(e),s=e.scale||1,low=e.game.quality==='low',still=e.game.reducedMotion,t=still?.35:r.t,energy=d.stage==='imminent'?1:d.stage==='activation'?.9:d.stage==='recovery'?.35:.55,col=N.Orbitals.color(r.action,3);
 c.save();c.translate(e.x,e.y);c.globalAlpha=energy;c.strokeStyle=col;c.fillStyle=col;c.lineWidth=1.1;
 const point=(x,y,z)=>{const a=(facings[facing(e)]||0)*Math.PI/4;return [(x*Math.cos(a)-y*Math.sin(a))*.83*s,-2*s+(x*Math.sin(a)+y*Math.cos(a))*.38*s-z*.73*s];};
 const mark=(x,y,z,kind)=>{const p=point(x,y,z);c.save();c.translate(...p);if(kind==='meteor'){c.beginPath();c.moveTo(-3,-4);c.lineTo(3,-2);c.lineTo(1,4);c.lineTo(-3,2);c.closePath();c.fill();}else if(kind==='eye'){c.beginPath();c.moveTo(-6,0);c.quadraticCurveTo(0,-5,6,0);c.quadraticCurveTo(0,5,-6,0);c.stroke();c.fillRect(-1,-2,2,4);}else{c.beginPath();c.arc(0,0,3+energy*2,-1.8,1.2);c.stroke();}c.restore();};
 if(['meteors','starfall'].includes(r.action)){for(let j=0;j<(r.action==='starfall'?1:3);j++)mark((j-1)*12,5,94+Math.sin(t*Math.PI)*4,'meteor');}
 else if(r.action==='voidseal')mark(0,16,82,'eye');
 else if(r.action==='crossfire'){for(const side of [-1,1])mark(side*25,8,67+side*8*Math.sin(t*Math.PI),'portal');}
 else if(r.action==='soulring'){const count=low?4:6;for(let i=0;i<count;i++){const a=i*TAU/count+(still?0:t*.8);mark(Math.cos(a)*25,3,75+Math.sin(a)*13,'orb');}}
 else if(r.action==='slash'){const p=point(19,13,62);c.beginPath();c.arc(p[0],p[1],12*s,-2.3+t*.5,-.25+t*.5);c.stroke();}
 else if(r.action==='shockwave'){for(const side of [-1,1]){const p=point(side*20,14,40);c.beginPath();c.moveTo(p[0],p[1]-5);c.lineTo(p[0],p[1]+5);c.lineTo(p[0]-3,p[1]+2);c.stroke();}}
 else if(r.action==='riftstep'){for(const side of [-1,1]){const p=point(side*17,-4,66);c.beginPath();c.moveTo(p[0],p[1]-9);c.lineTo(p[0]+side*3,p[1]+8);c.stroke();}}
 else if(r.action==='aegis'){for(const side of [-1,1])mark(side*8,18,65,'shield');}
 else if(r.action==='lances'){const o=N.Orbitals.origin(e,'lances');c.beginPath();c.moveTo(o.x-e.x-4,o.y-e.y);c.lineTo(o.x-e.x+4,o.y-e.y);c.stroke();}
 else {const o=N.Orbitals.origin(e,'salvo');c.beginPath();c.arc(o.x-e.x,o.y-e.y,4,0,TAU);c.stroke();}
 c.restore();
}
function summonProgress(e){if(e.type!=='overlord'||!e.alive)return -1;let delay=0;for(const child of e.game.enemies)if(child.summonedBy===e.id&&child.spawnDelay>delay)delay=child.spawnDelay;return delay>0?1-N.clamp(delay/1.15,0,1):-1;}
function summoning(c,e){
 if(e.type!=='overlord'||!e.alive)return;c.save();c.strokeStyle='#88aebd66';c.lineWidth=1;let count=0;for(const child of e.game.enemies){if(child.summonedBy!==e.id||child.spawnDelay<=0)continue;c.beginPath();c.moveTo(e.x,e.y-40);c.quadraticCurveTo((e.x+child.x)/2,(e.y+child.y)/2-35,child.x,child.y-12);c.stroke();if(++count>=6)break;}if(count){c.fillStyle='#a9c7d0';c.font='bold 8px Arial';c.textAlign='center';c.fillText('SUMMONING',e.x,e.y-94*(e.scale||1));}c.restore();
}
function defeat(c,r,t,g){if(!['warden','overlord','wraith'].includes(r.type)||g.reducedMotion)return;c.save();c.globalAlpha*=t*.7;c.fillStyle=r.type==='wraith'?'#88b7c2':'#ba9eaf';const elapsed=1-t,count=g.quality==='low'?2:r.scale>=2.15?6:3;for(let i=0;i<count;i++){const a=i*TAU/count,x=r.x+Math.cos(a)*elapsed*16*r.scale,y=r.y-25*r.scale*t+Math.sin(a)*elapsed*7;c.beginPath();c.moveTo(x,y-3);c.lineTo(x+2,y);c.lineTo(x,y+3);c.lineTo(x-2,y);c.closePath();c.fill();}c.restore();}
N.HostileVisuals={anatomy,facing,grade,role,state,noteHit,pose,local,rear,feedback,shadow,ritual,summonProgress,summoning,defeat,cacheSize:()=>cache.size};
})();
