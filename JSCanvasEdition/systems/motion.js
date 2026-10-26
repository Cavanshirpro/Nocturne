/* Isolated visible cloth masks, baked with the mesh. No anatomy deformation.
 * 24 lazy frame entries, at most four 96x128 surfaces each (~4.5 MiB pixels).
 * Cosmetic momentum is weakly owned and never stored in gameplay/saves. */
(() => {
'use strict';const N=window.Nocturne,history=new WeakMap(),tiles=new Map();
function surface(w,h){return typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):null;}
function pieces(sheet,key,frame){
 const name=key+':'+frame;let entry=tiles.get(name);if(entry)return entry;
 const runs=window.NOCTURNE_CLOTH?.[key]?.[frame];if(!runs)return null;
 const rigid=surface(96,128);if(!rigid)return null;const rc=rigid.getContext('2d');rc.drawImage(sheet,frame*96,0,96,128,0,0,96,128);
 const cloth=[];
 for(const group of runs){const canvas=surface(96,128),c=canvas.getContext('2d');c.drawImage(sheet,frame*96,0,96,128,0,0,96,128);c.globalCompositeOperation='destination-in';c.beginPath();for(let i=0;i<group.length;i+=3)c.rect(group[i],group[i+1],group[i+2],1);c.fill();rc.globalCompositeOperation='destination-out';rc.drawImage(canvas,0,0);cloth.push(canvas);}
 entry={rigid,cloth};if(tiles.size>=24)tiles.delete(tiles.keys().next().value);tiles.set(name,entry);return entry;
}
function profile(e){
 const g=e.game,player=!!e.weapons,moving=e.moving||e.dashTimer>0;
 if(g.reducedMotion||e.frozen>0)return {strength:0,phase:0,wind:0,windY:0,trail:0,turn:0};
 const boost=player?(e.progress.demonTime>0?e.progress.demonSpeed||1.45:1)*(e.progress.activeOath==='pilgrim'?1.08:1):e.slow>0?.48:1;
 const speed=Math.max(0,(e.speed||0)*boost*(e.dashTimer>0?3.4:1)),energy=Math.min(3,Math.log2(1+speed/(player?195:80))),time=g.time||0;
 let h=history.get(e);if(!h||time<h.time||time-h.time>.3){h={time,x:e.x,y:e.y,wind:moving?(e.lastX||0):0,windY:moving?(e.lastY||0):0,strength:moving?.65+energy*.9:0,turn:0};history.set(e,h);}
 const dt=time-h.time;
 if(dt>0){const vx=(e.x-h.x)/dt,vy=(e.y-h.y)/dt,vTarget=moving?N.clamp(vx/Math.max(1,speed),-1,1):0,yTarget=moving?N.clamp(vy/Math.max(1,speed),-1,1):0,lag=1-Math.exp(-dt*8),old=h.wind;h.wind+=(vTarget-h.wind)*lag;h.windY+=(yTarget-h.windY)*lag;h.turn+=(vTarget-old-h.turn)*(1-Math.exp(-dt*12));h.strength+=((moving?.65+energy*.9:0)-h.strength)*(1-Math.exp(-dt*(moving?10:6)));h.time=time;h.x=e.x;h.y=e.y;}
 return {strength:h.strength<.025?0:h.strength,phase:time*(6+Math.min(5,energy*2))+(player?e.walk:e.gait||0),wind:h.wind,windY:h.windY,trail:Math.min(3.5,h.strength*1.1),turn:h.turn};
}
N.Motion={profile,cacheSize:()=>tiles.size,
 draw(c,sheet,sx,sy,sw,sh,x,y,w,h,e){
  // Enemy cloth is already articulated offline. A cheap intact sprite is safer
  // than moving horizontal bands across the staff, arms, legs or armor.
  if(!e.weapons||e.game.reducedMotion||e.frozen>0||e.game.quality==='low'){c.drawImage(sheet,sx,sy,sw,sh,x,y,w,h);return;}
  const m=profile(e);if(m.strength===0){c.drawImage(sheet,sx,sy,sw,sh,x,y,w,h);return;}
  const key=(e.progress.demonTime>0?'demon':'witch')+'_atlas_'+e.facing,entry=pieces(sheet,key,Math.round(sx/sw));
  if(!entry){c.drawImage(sheet,sx,sy,sw,sh,x,y,w,h);return;}
  const amounts=[.9,.48,.35],anchors=[.55,.65,.64];
  entry.cloth.forEach((part,i)=>{const split=anchors[i],shift=N.clamp((-m.wind*m.trail+Math.sin(m.phase-i*1.7)*m.strength*.48+m.turn*1.5)*amounts[i],-3.6,3.6)*(w/80);
   c.drawImage(part,0,0,96,128*split,x,y,w,h*split);
   c.drawImage(part,0,128*split,96,128*(1-split),x+shift,y+h*split-.35-N.clamp(m.windY*m.trail*.25*amounts[i],-.8,.8)*(h/107),w,h*(1-split)+.35);
  });
  c.drawImage(entry.rigid,x,y,w,h);
 }
};
})();
