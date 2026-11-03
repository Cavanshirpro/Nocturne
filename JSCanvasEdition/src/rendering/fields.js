/*
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade
This file is part of Nocturne. See the distribution's LICENSE and NOTICE files.
*/
/* Field language: ownership + shape + timing. Rendering only; no area mutation.
 * Hostile hit outlines use the same circle/annulus geometry as collision.
 * Friendly clutter is sampled/grouped with bounded detail; hazards are never skipped. */
(() => {
'use strict';const N=window.Nocturne,TAU=Math.PI*2;
const styles=Object.freeze({
 thorn:{name:'THORN',team:'ALLY',effect:'DAMAGE + SLOW',color:'#8fcd9e',glyph:'leaf'},
 veil:{name:'VEIL',team:'ALLY',effect:'SLOW ONLY',color:'#86d6df',glyph:'feather'},
 rift:{name:'RIFT',team:'ALLY',effect:'PULL + DAMAGE',color:'#b9a4ec',glyph:'spiral'},
 meteor:{name:'METEOR',team:'ALLY',effect:'IMPACT',color:'#e8bc82',glyph:'crater'},
 circle:{name:'IMPACT',team:'DANGER',effect:'MOVE OUT',color:'#ef8f82',glyph:'triangle'},
 ring:{name:'SHOCK RING',team:'DANGER',effect:'USE THE GAP',color:'#f2ac80',glyph:'gap'},
 seal:{name:'VOID SEAL',team:'DANGER',effect:'SILENCE',color:'#e19ac8',glyph:'lock'}
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function phase(a){return a.age<a.delay?'warning':a.age<a.delay+a.duration?'active':'expired';}
function info(a,hostile=false){const type=hostile?(a.kind==='ring'?'ring':a.kind==='seal'?'seal':'circle'):a.kind;return {...(styles[type]||styles.veil),type,phase:phase(a),remaining:Math.max(0,a.delay-a.age),radius:a.radius,inner:a.inner||0};}
function contains(h,p){const d=Math.hypot(p.x-h.x,p.y-h.y),a=Math.atan2(p.y-h.y,p.x-h.x),delta=Math.abs(Math.atan2(Math.sin(a-(h.angle||0)),Math.cos(a-(h.angle||0))));return d<h.radius+p.radius&&(h.kind!=='ring'||d+p.radius>h.inner&&delta>h.gap/2);}
function stage(a){const p=phase(a);return p==='warning'&&a.delay-a.age<=Math.min(.28,a.delay*.25)?'imminent':p==='active'&&a.delay+a.duration-a.age<Math.min(.12,a.duration*.25)?'expiring':p;}
function plan(g){
 // Inspect every field, but retain at most 32 nearest candidates per school.
 // A max-heap prevents thousands of distant fields hiding a near-player field.
 const source=g.combat.areas.active,buckets=new Map(),limit=32;
 const score=a=>Math.max(0,Math.hypot(a.x-g.player.x,a.y-g.player.y)-a.radius)+(phase(a)==='warning'?4:0);
 const worse=(a,b)=>a.score>b.score||a.score===b.score&&a.area.age>b.area.age;
 for(const a of source){if(phase(a)==='expired'||!g.visible(a.x,a.y,a.radius))continue;
  const item={area:a,score:score(a)},heap=buckets.get(a.kind)||[];if(!buckets.has(a.kind))buckets.set(a.kind,heap);
  if(heap.length<limit){heap.push(item);let i=heap.length-1;while(i){const p=(i-1)>>1;if(!worse(heap[i],heap[p]))break;[heap[i],heap[p]]=[heap[p],heap[i]];i=p;}}
  else if(worse(heap[0],item)){heap[0]=item;let i=0;for(;;){const l=i*2+1,r=l+1;if(l>=heap.length)break;const j=r<heap.length&&worse(heap[r],heap[l])?r:l;if(!worse(heap[j],heap[i]))break;[heap[i],heap[j]]=[heap[j],heap[i]];i=j;}}
 }
 const map=new Map();
 for(const heap of buckets.values())for(const {area:a,score} of heap){const key=a.kind+':'+Math.round(a.x/24)+':'+Math.round(a.y/24)+':'+Math.round(a.radius/8),entry=map.get(key);
  if(entry){entry.count++;if(a.age<entry.area.age)entry.area=a;}else map.set(key,{area:a,count:1,sampled:source.length>32,score});
 }
 const boss=g.boss?.alive||g.sanctum?.phase==='fighting',budget=g.quality==='low'?(boss?4:6):(boss?8:12),sorted=[...map.values()].sort((a,b)=>a.score-b.score),out=[],kinds=new Set();
 // At least one nearby representative of each school before filling duplicates.
 for(const item of sorted)if(!kinds.has(item.area.kind)){kinds.add(item.area.kind);out.push(item);if(out.length>=budget)return out;}
 for(const item of sorted)if(!out.includes(item)){out.push(item);if(out.length>=budget)break;}
 return out.sort((a,b)=>b.score-a.score);
}
function badge(c,x,y,text,color,small=false,scale=1){
 const width=Math.min(240,text.length*(small?4.6:5.1)+14)*scale;c.save();c.fillStyle='#111b23ed';c.fillRect(x-width/2,y-10*scale,width,16*scale);c.strokeStyle=color+'88';c.lineWidth=.7*scale;c.strokeRect(x-width/2,y-10*scale,width,16*scale);c.textAlign='center';c.font=(small?8:9)*scale+'px Arial';c.fillStyle=color;c.fillText(text,x,y+scale);c.restore();
}
function outline(c,a){
 c.beginPath();if(a.kind==='ring'){const start=(a.angle||0)+a.gap/2,end=(a.angle||0)+TAU-a.gap/2;c.arc(a.x,a.y,a.radius,start,end);c.arc(a.x,a.y,a.inner,end,start,true);c.closePath();}else c.arc(a.x,a.y,a.radius,0,TAU);
}
function symbol(c,x,y,type,color,size=7){
 c.save();c.translate(x,y);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=1.4;c.beginPath();
 if(type==='leaf'){c.moveTo(-size,3);c.quadraticCurveTo(0,-size,7,0);c.quadraticCurveTo(2,size,-size,3);c.stroke();c.beginPath();c.moveTo(-6,3);c.lineTo(5,0);c.stroke();}
 else if(type==='lock'){c.strokeRect(-5,-1,10,8);c.beginPath();c.arc(0,-1,4,Math.PI,0);c.stroke();c.fillRect(-.6,2,1.2,3);}
 else if(type==='triangle'){c.moveTo(0,-size);c.lineTo(size,5);c.lineTo(-size,5);c.closePath();c.stroke();c.fillRect(-.7,-3,1.4,4);c.fillRect(-.7,3,1.4,1.4);}
 else if(type==='feather'){c.moveTo(-6,5);c.lineTo(5,-5);c.moveTo(-3,2);c.lineTo(-5,-2);c.moveTo(0,-1);c.lineTo(-1,-5);c.moveTo(1,-1);c.lineTo(5,0);c.stroke();}
 else if(type==='spiral'){c.arc(0,0,6,0,Math.PI*1.6);c.stroke();c.beginPath();c.arc(0,0,3,Math.PI,TAU*1.3);c.stroke();}
 else {c.ellipse(0,2,7,3,0,0,TAU);c.moveTo(-4,-6);c.lineTo(2,1);c.stroke();}
 c.restore();
}
function allied(c,g,a,count,busy,label){
 const d=info(a),color=d.color,r=Math.max(1,a.radius),frozen=g.reducedMotion,t=frozen?0:(g.time||0),life=clamp((a.age-a.delay)/Math.max(.01,a.duration),0,1),pre=d.phase==='warning';
 if(d.phase==='expired')return;
 c.save();c.strokeStyle=color+(pre?'66':'99');c.lineWidth=1;c.fillStyle=color+(busy?'03':'07');c.beginPath();c.arc(a.x,a.y,r,0,TAU);c.fill();
 // Friendly circles use open dotted borders, never the solid hostile double rim.
 c.setLineDash(d.type==='veil'?[3,10]:[2,7]);c.stroke();c.setLineDash([]);
 const bits=busy?3:6,growth=clamp((a.age-a.delay)/.28,0,1),fade=1-clamp((life-.8)/.2,0,1);
 c.globalAlpha=pre?.45:.45+.55*fade;
 if(d.type==='thorn'){
  for(let i=0;i<bits;i++){const an=i*TAU/bits,rad=r*(.55+.04*Math.sin(t*1.6+i)),x=a.x+Math.cos(an)*rad,y=a.y+Math.sin(an)*rad;c.strokeStyle=color+'70';c.beginPath();c.moveTo(x-5,y+3);c.quadraticCurveTo(x-3,y-9*growth,x+3,y-12*growth);c.moveTo(x-3,y-3*growth);c.lineTo(x-9,y-7*growth);c.moveTo(x,y-7*growth);c.lineTo(x+5,y-9*growth);c.stroke();if(!busy){c.fillStyle=color+'66';c.beginPath();c.moveTo(x-2,y-5);c.quadraticCurveTo(x-12,y-14*growth,x-8,y-3);c.quadraticCurveTo(x-4,y,x-2,y-5);c.fill();}}
 }else if(d.type==='rift'){
  c.strokeStyle=color+'90';for(let i=0;i<(busy?2:3);i++){const an=i*TAU/3-t*.55;c.beginPath();c.arc(a.x,a.y,r*(.22+i*.16),an,an+Math.PI*1.2);c.stroke();}if(!busy){for(let j=0;j<3;j++){const q=frozen?.6:(t*.4+j/3)%1,an=j*TAU/3-t*.55,rr=r*(.75-q*.6);c.fillStyle=color+'77';c.beginPath();c.arc(a.x+Math.cos(an)*rr,a.y+Math.sin(an)*rr,1.5,0,TAU);c.fill();}}c.fillStyle='#090e18e0';c.beginPath();c.ellipse(a.x,a.y,r*.12,r*.08,0,0,TAU);c.fill();
 }else if(d.type==='meteor'){
  if(pre){const progress=clamp(a.age/Math.max(.01,a.delay),0,1);c.strokeStyle=color;c.beginPath();c.arc(a.x,a.y,r*.68,-Math.PI/2,-Math.PI/2+progress*TAU);c.stroke();c.beginPath();const fx=a.x+22*(1-progress),fy=a.y-65*(1-progress);c.moveTo(fx,fy);c.lineTo(a.x,a.y);c.stroke();c.fillStyle='#f0c297';c.beginPath();c.moveTo(fx-4,fy-5);c.lineTo(fx+4,fy-2);c.lineTo(fx+2,fy+4);c.lineTo(fx-3,fy+3);c.closePath();c.fill();}
  else{c.strokeStyle=color+'66';for(let i=0;i<bits;i++){const an=i*TAU/bits;c.beginPath();c.moveTo(a.x+Math.cos(an)*r*.25,a.y+Math.sin(an)*r*.25);c.lineTo(a.x+Math.cos(an+.1)*r*.7,a.y+Math.sin(an+.1)*r*.7);c.stroke();}}
 }else{
  if(!busy){c.strokeStyle=color+'25';c.lineWidth=5;for(let j=0;j<2;j++){const k=frozen?.5:(t*.25+j*.5)%1;c.beginPath();c.ellipse(a.x+(k-.5)*r*.5,a.y+j*12-6,r*.55,r*.16,-.15,0,Math.PI);c.stroke();}}c.globalAlpha=.8*(1-life);for(let i=0;i<(busy?2:4);i++){const an=i*TAU/4+t*.2;symbol(c,a.x+Math.cos(an)*r*.5,a.y+Math.sin(an)*r*.5,'feather',color,5);}
 }
 c.globalAlpha=1;symbol(c,a.x,a.y,d.glyph,color,6);
 if(label){let ly=a.y-r*.6;if(Math.hypot(a.x-g.player.x,ly-g.player.y)<65)ly=a.y+r*.72;badge(c,a.x,ly,'ALLY · '+d.name+(count>1?' ×'+count:count===0?' · STACKED':'')+(pre?' · READYING':''),color,true,1/Math.max(.5,g.zoom||1));}
 c.restore();
}
function hostile(c,g,h,label){
 const d=info(h,true);if(d.phase==='expired')return;const pre=d.phase==='warning',imminent=stage(h)==='imminent',color=d.color,r=Math.max(1,h.radius),low=g.quality==='low',progress=clamp(h.age/Math.max(.001,h.delay),0,1);
 c.save();c.lineWidth=imminent?3.1:pre?1.8:2.8;c.strokeStyle=color;c.fillStyle=imminent?'#d65c5422':pre?'#ba534e0d':h.kind==='seal'?'#be55952c':'#d65c5429';outline(c,h);c.fill();c.stroke();
 // Hatch only the dangerous geometry. The annulus opening stays truly empty.
 c.save();outline(c,h);c.clip();c.strokeStyle=color+(pre?'35':'65');c.lineWidth=1;const spacing=Math.max(18,r*.22);
 c.beginPath();for(let i=-(low?3:5);i<=(low?3:5);i++){const v=i*spacing;c.moveTo(h.x-r,h.y+v-r);c.lineTo(h.x+r,h.y+v+r);}c.stroke();c.restore();
 if(h.kind==='ring'){
  const an=h.angle||0,inner=h.inner;for(const side of [-1,1]){const angle=an+side*h.gap/2;c.strokeStyle='#9cdbd2';c.lineWidth=2;c.beginPath();c.moveTo(h.x+Math.cos(angle)*inner,h.y+Math.sin(angle)*inner);c.lineTo(h.x+Math.cos(angle)*(r+12),h.y+Math.sin(angle)*(r+12));c.stroke();}
  const mid=(inner+r)/2,x=h.x+Math.cos(an)*mid,y=h.y+Math.sin(an)*mid;symbol(c,x,y,'feather','#b5f1df');if(label)badge(c,x,y+17,'OPEN GAP','#b5f1df',true,1/Math.max(.5,g.zoom||1));
 }else{
  if(pre){c.strokeStyle=color+'99';c.lineWidth=2;c.beginPath();c.arc(h.x,h.y,r*.78,-Math.PI/2,-Math.PI/2+progress*TAU);c.stroke();}
  if(!low){c.strokeStyle='#201e2b';c.lineWidth=1;c.beginPath();c.arc(h.x,h.y,Math.max(1,r-5),0,TAU);c.stroke();}
  symbol(c,h.x,h.y,d.glyph,color,imminent?10:8);if(!pre){c.strokeStyle=color+'bb';c.lineWidth=1;c.beginPath();c.arc(h.x,h.y,Math.max(1,r-9),0,TAU);c.stroke();}
 }
 if(label){const text=d.name+' · '+(pre?d.remaining.toFixed(1)+'s':d.effect),an=(h.angle||0)+Math.PI,mid=(h.inner+r)/2,lx=h.kind==='ring'?h.x+Math.cos(an)*mid:h.x,ly=h.kind==='ring'?h.y+Math.sin(an)*mid+18:h.y+r*.65+18;badge(c,lx,ly,text,color,false,1/Math.max(.5,g.zoom||1));}
 c.restore();
}
function draw(g,c){
 const groups=plan(g),busy=g.combat.areas.active.length>16||g.quality==='low',seen=new Set(),allyLabels=new Set();
 for(const item of [...groups].sort((a,b)=>a.score-b.score))if(!seen.has(item.area.kind)&&seen.size<3){seen.add(item.area.kind);allyLabels.add(item);}
 for(const item of groups)allied(c,g,item.area,item.sampled?0:item.count,busy,allyLabels.has(item));
 const hazards=g.combat.hazards.active.filter(h=>phase(h)!=='expired'&&g.visible(h.x,h.y,h.radius));
 const labels=new Set([...hazards].sort((a,b)=>(contains(a,g.player)?-1:1)-(contains(b,g.player)?-1:1)||Math.hypot(a.x-g.player.x,a.y-g.player.y)-Math.hypot(b.x-g.player.x,b.y-g.player.y)).slice(0,2));
 for(const h of hazards)hostile(c,g,h,labels.has(h));
}
function foreground(g,c){
 // Redraw exact dangerous rims after projectiles/particles so urgent geometry
 // cannot be buried by allied effects. No fill is added over a safe gap.
 c.save();for(const h of g.combat.hazards.active){if(phase(h)==='expired'||!g.visible(h.x,h.y,h.radius))continue;const d=info(h,true);c.strokeStyle='#10131ccc';c.lineWidth=4.5;outline(c,h);c.stroke();c.strokeStyle=d.color;c.lineWidth=stage(h)==='imminent'?2.6:1.4;outline(c,h);c.stroke();}c.restore();
}
function statusLayout(g){
 const width=Math.min(300,g.width-36),touch=window.matchMedia?.('(pointer:coarse)').matches,short=g.height<520;let x=g.width/2,y=g.height-(g.width<701?95:115);
 if(short&&touch){const panel=document.getElementById('power-hud'),rect=panel?.getBoundingClientRect?.();if(rect&&rect.left>g.width/2)x=rect.left-width/2-16;}
 return {x,y,width};
}
function hud(g,c){
 if(!['playing','paused'].includes(g.state))return;
 let threat=null;for(const h of g.combat.hazards.active){if(phase(h)==='expired'||!contains(h,g.player))continue;if(!threat||Math.max(0,h.delay-h.age)<Math.max(0,threat.delay-threat.age))threat=h;}
 if(!threat)return;const d=info(threat,true),text=d.name+' · '+(d.phase==='warning'?d.remaining.toFixed(1)+'s · ':'')+d.effect;
 const {width,x,y}=statusLayout(g);c.save();c.fillStyle='#201822f0';c.fillRect(x-width/2,y-13,width,26);c.strokeStyle=d.color;c.lineWidth=1;c.strokeRect(x-width/2,y-13,width,26);c.fillStyle=d.color;c.textAlign='center';c.font='bold 10px Arial';c.fillText(text,x,y+3,width-12);c.restore();
}
N.Fields={styles,info,phase,stage,contains,plan,allied,hostile,draw,foreground,statusLayout,hud};
})();
