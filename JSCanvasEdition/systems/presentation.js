/*
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade
This file is part of Nocturne. See the distribution's LICENSE and NOTICE files.
*/
/* Read-only combat art: fixed small paths, no particles or gameplay randomness. */
(() => {
'use strict';const N=window.Nocturne,TAU=Math.PI*2,forms=new WeakMap();
function polygon(c,pts,fill,stroke){c.beginPath();pts.forEach(([x,y],i)=>c[i?'lineTo':'moveTo'](x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.stroke();}}
function projectile(c,b,g,hostile=false){
 const id=hostile?'hostile':b.source||'bolt',color=hostile?'#fba78e':N.Orbitals.color(id,2),low=g.quality==='low';c.save();c.translate(b.x,b.y);c.rotate(Math.atan2(b.vy,b.vx));c.lineWidth=1;
 if(id==='rapid'){polygon(c,[[7,0],[-4,-1.7],[-5,1.7]],'#f3d7a0');if(!low){c.strokeStyle='#c69b6c88';c.beginPath();c.moveTo(-6,0);c.lineTo(-13,0);c.stroke();}}
 else if(id==='cannon'){c.fillStyle='#453b42';c.beginPath();c.arc(0,0,7,0,TAU);c.fill();c.strokeStyle='#dca183';c.lineWidth=1.6;c.stroke();c.fillStyle='#f3d1a1';c.fillRect(1,-2,3,4);if(!low)for(const side of [-1,1]){c.strokeStyle='#bf775777';c.beginPath();c.moveTo(-3,side*4);c.lineTo(-9,side*3);c.stroke();}}
 else if(['glacier','frostfall'].includes(id)){polygon(c,[[8,0],[-1,-5],[-6,-2],[-6,2],[-1,5]],'#91c9de','#d9f4f4');polygon(c,[[8,0],[-3,0],[-1,-4]],'#dceff4');}
 else if(id==='burst'){polygon(c,[[8,0],[-2,-4],[-7,0],[-2,4]],'#98677f',color);c.strokeStyle='#ffe5df';c.beginPath();c.moveTo(-3,-1);c.lineTo(4,0);c.lineTo(-3,1);c.stroke();}
 else if(hostile){polygon(c,[[8,0],[-1,-4],[-6,-2],[-3,0],[-6,2],[-1,4]],'#713f4b','#f3a29a');c.fillStyle='#ffe0bc';c.fillRect(0,-1,3,2);}
 else{polygon(c,[[8,0],[0,-4],[-7,0],[0,4]],color);polygon(c,[[7,0],[-2,-.8],[-1,-3]],'#f0e6fc');if(b.evolved&&!low){c.strokeStyle='#e7c799';c.beginPath();c.moveTo(-5,-5);c.lineTo(-9,0);c.lineTo(-5,5);c.stroke();}}
 if(b.crit&&!low){c.strokeStyle='#ffe3ae99';c.beginPath();c.moveTo(-1,-6);c.lineTo(2,-8);c.stroke();}
 c.restore();
}
function effect(c,e,g){
 const t=1-e.life/e.total,low=g.quality==='low',still=g.reducedMotion;
 if(e.kind==='muzzle'){c.save();c.translate(e.x,e.y);c.strokeStyle=e.color;c.lineWidth=1.1;const r=2+(still?0:t*4);c.beginPath();c.moveTo(-r,0);c.lineTo(r,0);c.moveTo(0,-r);c.lineTo(0,r);c.stroke();c.restore();return true;}
 if(e.kind==='impact'){
  c.save();c.translate(e.x,e.y);const r=Math.min(22,Math.max(3,e.radius))*(.3+t*.7);c.strokeStyle=e.color;c.lineWidth=low?1.3:1.8;c.beginPath();for(let i=0;i<(low?3:5);i++){const a=i*TAU/(low?3:5)+(e.seed||0),inner=r*(.35+t*.2);c.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.stroke();if(t<.3){c.fillStyle='#f1dfd0';c.fillRect(-1,-1,2,2);}c.restore();return true;
 }
 if(e.kind==='delivery'){
  const q=still?1:t,x=e.x+(e.x2-e.x)*q,y=e.y+(e.y2-e.y)*q-(still?0:Math.sin(q*Math.PI)*26);c.fillStyle=e.color;polygon(c,[[x,y-4],[x+3,y],[x,y+4],[x-3,y]],e.color);if(!low&&!still){c.strokeStyle=e.color;c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.lineTo(x-(e.x2-e.x)*.07,y-(e.y2-e.y)*.07);c.stroke();}return true;
 }
 return false;
}
function boss(c,e){
 const q=e.guardian||e.tactics,ritual=N.EnemyMotion.ritual(e),over=e.type==='overlord',s=Math.min(2.2,e.scale||1),a=({S:0,SW:1,W:2,NW:3,N:4,NE:5,E:6,SE:7}[e.facing]||0)*Math.PI/4,co=Math.cos(a),si=Math.sin(a),p=(x,y,z)=>[e.x+(x*co-y*si)*.83*s,e.y+(x*si+y*co)*.4*s-z*.75*s],enraged=e.hp<e.maxHp*.4,col=over?'#c58aab':'#b9b9a6';
 c.save();c.lineWidth=.8*s;
 for(const side of [-1,1]){polygon(c,[p(side*10,3,67),p(side*24,0,68),p(side*25,3,58),p(side*15,8,56)],over?'#624259':'#4c5b60',col);polygon(c,[p(side*12,4,67),p(side*22,2,66),p(side*19,5,63)],over?'#9b718a':'#7e8b8d');if(enraged){c.strokeStyle='#e8a0aa';c.lineWidth=1.2;c.beginPath();c.moveTo(...p(side*15,8,64));c.lineTo(...p(side*18,8,61));c.lineTo(...p(side*15,8,58));c.stroke();}}
 if(q?.ward>0){c.strokeStyle='#d8c8f4';c.lineWidth=1.5;c.beginPath();for(let i=0;i<3;i++){const [x,y]=p(0,13,59-i*7);c.moveTo(x-4*s,y);c.lineTo(x+4*s,y);}c.stroke();}
 if(ritual){const release=q?.releaseTime>0,power=release?Math.min(1,q.releaseTime/.55):Math.sin(ritual.t*Math.PI),color=N.Orbitals.color(ritual.action,3);c.strokeStyle=color;c.lineWidth=1.2;for(const side of [-1,1]){const [x,y]=p(side*20,12,ritual.style==='channel'?78:60);c.globalAlpha=.35+.5*power;c.beginPath();c.arc(x,y,(3+power*3)*s,-1.8,.8);c.stroke();} }
 c.restore();
}
function form(c,p){
 const active=p.progress.demonTime>0,time=p.game.time||0;let entry=forms.get(p);if(!entry){entry={active,time:-1};forms.set(p,entry);}if(entry.active!==active){entry.active=active;entry.time=time;}
 const age=time-entry.time;if(p.game.reducedMotion||entry.time<0||age<0||age>.36)return;
 c.save();c.globalAlpha*=1-age/.36;c.strokeStyle=active?'#e3a0c8':'#c6b2e1';c.lineWidth=1.4;for(let i=0;i<6;i++){const a=i*TAU/6,rr=20+age*34;c.beginPath();c.moveTo(p.x+Math.cos(a)*rr,p.y-40+Math.sin(a)*rr*.6);c.lineTo(p.x+Math.cos(a)*(rr+5),p.y-40+Math.sin(a)*(rr+5)*.6);c.stroke();}c.restore();
}
N.Presentation={projectile,effect,boss,form};N.Appearance.projectile=projectile;
})();
