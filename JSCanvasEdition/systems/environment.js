/*
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade
This file is part of Nocturne. See the distribution's LICENSE and NOTICE files.
*/
/* Quiet biome materials and architecture. Visual hash only, stable after rebase.
 * 3 patterns, <=48 props/frame (24 low), <=96 cached landmark records. */
(() => {
'use strict';const N=window.Nocturne,TAU=Math.PI*2,patterns=new WeakMap();
const themes=[{ground:'ground',props:['tomb','tree','arch','wall'],mist:'#92abb4',accent:'#9bb1a6'},{ground:'ground_ember',props:['charred','wall','brazier','charred'],mist:'#c69878',accent:'#be8868'},{ground:'ground_moon',props:['obelisk','arch','wall','obelisk'],mist:'#9597d0',accent:'#aeadd2'}];
const index=g=>Math.floor(Math.max(0,g.wave-1)/3)%3;
function hash(x,y){const n=Math.sin(x*213.31+y*179.17+81.6)*41971.321;return n-Math.floor(n);}
function ground(g,c){
 const theme=themes[index(g)];let list=patterns.get(g);if(!list){list=new Map();patterns.set(g,list);}let pattern=list.get(theme.ground);if(!pattern){pattern=c.createPattern(g.images[theme.ground]||g.images.ground,'repeat');list.set(theme.ground,pattern);}
 const x=g.camera.x-g.viewWidth/2-20,y=g.camera.y-g.viewHeight/2-20;c.fillStyle=pattern;c.fillRect(x,y,g.viewWidth+40,g.viewHeight+40);
 // A few low relief slabs instead of identical rocks at every grid cell.
 const step=280,ox=g.worldOrigin?.x||0,oy=g.worldOrigin?.y||0,sx=Math.floor((x+ox)/step),sy=Math.floor((y+oy)/step),nx=Math.min(18,Math.ceil(g.viewWidth/step)+2),ny=Math.min(14,Math.ceil(g.viewHeight/step)+2);
 c.save();for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const gx=sx+i,gy=sy+j,h=hash(gx,gy),px=gx*step+h*150-ox,py=gy*step+hash(gy,gx)*130-oy;c.fillStyle='#11151d44';c.beginPath();c.moveTo(px-17,py);c.lineTo(px-9,py-12);c.lineTo(px+14,py-9);c.lineTo(px+20,py+2);c.closePath();c.fill();c.strokeStyle=theme.accent+'20';c.lineWidth=1;c.beginPath();c.moveTo(px-14,py);c.lineTo(px-8,py-10);c.lineTo(px+12,py-8);c.stroke();}
 // Starting inscription is architecture, not a coloured area-of-effect field.
 if(g.visible(-ox,-oy,170)){c.strokeStyle='#938c6e28';for(let i=0;i<8;i++){const a=i*TAU/8,px=-ox+Math.cos(a)*124,py=-oy+Math.sin(a)*88;c.strokeRect(px-4,py-4,8,8);}c.beginPath();c.ellipse(-ox,-oy,118,82,0,0,TAU);c.stroke();}c.restore();
}
function gather(g,list){
 const step=480,ox=g.worldOrigin?.x||0,oy=g.worldOrigin?.y||0,cx=Math.floor((g.camera.x+ox)/step),cy=Math.floor((g.camera.y+oy)/step),rx=Math.min(8,Math.ceil(g.viewWidth/step/2)+1),ry=Math.min(7,Math.ceil(g.viewHeight/step/2)+1),theme=themes[index(g)],candidates=[];
 for(let dx=-rx;dx<=rx;dx++)for(let dy=-ry;dy<=ry;dy++){const gx=cx+dx,gy=cy+dy,n=hash(gx,gy),x=gx*step+60+n*280-ox,y=gy*step+70+hash(gy,gx)*260-oy;if(g.sanctum&&N.dist2({x,y},g.sanctum)<(g.sanctum.radius+110)**2||!g.visible(x,y,180))continue;candidates.push({gx,gy,n,x,y,d:(x-g.camera.x)**2+(y-g.camera.y)**2});}
 candidates.sort((a,b)=>a.d-b.d);const budget=g.quality==='low'?24:48;
 for(const q of candidates.slice(0,budget)){const key=index(g)+':'+q.gx+','+q.gy;let prop=g.landmarks.get(key);if(!prop){const kind=theme.props[Math.floor(q.n*theme.props.length)],scale=kind==='tree'?.95:kind==='wall'?.7:.78;
  prop={x:q.x,y:q.y,draw(c){let occluded=Math.abs(g.player.x-prop.x)<75*scale&&g.player.y>prop.y-160*scale&&g.player.y<prop.y+15;if(!occluded)for(const e of g.enemies)if(e.alive&&Math.abs(e.x-prop.x)<60*scale&&e.y>prop.y-145*scale&&e.y<prop.y+12){occluded=true;break;}
   c.save();c.globalAlpha=occluded?.22:.78;c.drawImage(g.images['prop_'+kind]||g.images.prop_tomb,prop.x-80*scale,prop.y-187*scale,160*scale,200*scale);c.restore();}};
  if(g.landmarks.size>=96)g.landmarks.delete(g.landmarks.keys().next().value);g.landmarks.set(key,prop);}
 list.push(prop);}
}
function ambient(g,c){
 if(g.quality==='low'||g.reducedMotion)return;const theme=themes[index(g)],count=10;c.save();c.fillStyle=theme.mist;
 for(let i=0;i<count;i++){const phase=g.time*(index(g)===1?.22:.08)+i*2.39996,x=g.camera.x+Math.sin(phase)*g.viewWidth*.52,y=g.camera.y+Math.cos(phase*.77+i)*g.viewHeight*.48;c.globalAlpha=.12+.1*Math.sin(phase+i)**2;c.beginPath();if(index(g)===1)c.arc(x,y,1,0,TAU);else c.ellipse(x,y,10+i%3*5,1.4,0,0,TAU);c.fill();}c.restore();
}
N.Environment={themes,index,hash,ground,gather,ambient};
})();
