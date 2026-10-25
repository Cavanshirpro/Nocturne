/* v5.2.2 — solid fitted equipment. Reads progression, never saves or RNG. */
(() => {
'use strict';const N=window.Nocturne,A=N.Appearance,TAU=Math.PI*2;
const facings={S:0,SW:1,W:2,NW:3,N:4,NE:5,E:6,SE:7};
function rig(p){const a=(facings[p.facing]??0)*Math.PI/4,co=Math.cos(a),si=Math.sin(a),f=p.game.reducedMotion||p.frozen>0;
return {a,scale:1,clock:f?0:p.game.time||0,gait:f?0:Math.sin(p.walk||0),depth:(x,y)=>x*si+y*co,p(x,y,z){return {x:p.x+(x*co-y*si)*5/6,y:p.y-2+(x*si+y*co)*.38453-z*.71055};}};}
function brush(c,r){return {
poly(pts,fill,stroke=null){c.beginPath();pts.forEach((v,i)=>{const p=r.p(...v);c[i?'lineTo':'moveTo'](p.x,p.y);});c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.55;c.stroke();}},
line(pts,col,w=1){c.beginPath();pts.forEach((v,i)=>{const p=r.p(...v);c[i?'lineTo':'moveTo'](p.x,p.y);});c.strokeStyle=col;c.lineWidth=w;c.stroke();},
orb(x,y,z,s,col){const p=r.p(x,y,z);c.fillStyle=col;c.beginPath();c.arc(p.x,p.y,s,0,TAU);c.fill();},
ring(x,y,z,s,col){const p=r.p(x,y,z);c.strokeStyle=col;c.lineWidth=1.25;c.beginPath();c.ellipse(p.x,p.y,s,s*.58,0,0,TAU);c.stroke();},
gem(x,y,z,s,col){this.poly([[x-s*.7,y,z],[x,y,z+s],[x+s*.7,y,z],[x,y,z-s]],'#293347');this.poly([[x-s*.7,y,z],[x,y,z+s],[x,y+.8,z]],col);this.poly([[x,y+.8,z],[x,y,z+s],[x+s*.7,y,z]],'#eef3e6');this.poly([[x-s*.7,y,z],[x,y+.8,z],[x,y,z-s]],'#68758e');},
plate(x,y,z,w,h,col){this.poly([[x-w,y,z+h],[x+w,y,z+h],[x+w,y+2,z+h-2],[x-w,y+2,z+h-2]],'#adb6b5');this.poly([[x-w,y,z-h],[x-w,y,z+h],[x-w,y+2,z+h-2],[x-w,y+2,z-h+2]],'#273247');this.poly([[x-w,y+2,z+h-2],[x+w,y+2,z+h-2],[x+w*.8,y+2,z-h],[x-w*.8,y+2,z-h]],col);}
};}
A.spellPart=function(c,b,r,part){let [x,y,z]=part.slot;const col=part.color,s=2.1+part.band*.24;
if(part.id==='rapid'||part.id==='lance')y+=r.gait*(part.id==='rapid'?2:-2);
switch(part.id){
case 'bolt':b.gem(x,y,z,s+1.5,col);b.plate(x,y-1,z-5,2.5,3,'#75648b');break;
case 'orbit':b.ring(x,y,z,s+2,col);b.gem(x+3,y+1,z+3,2.2,col);break;
case 'lightning':for(const side of [-1,1])b.poly([[x+side*2,y,z-5],[x+side*5,y,z+7],[x+side,y,z+3],[x+side*2,y,z+12]],col);break;
case 'nova':for(let i=0;i<4;i++){const a=i*TAU/4;b.gem(x+Math.cos(a)*4,y,z+Math.sin(a)*4,2,col);}break;
case 'meteor':b.plate(x,y,z,6,6,'#88563f');b.gem(x,y+3,z,3.4,col);break;
case 'lance':b.poly([[x-3,y,z-6],[x+3,y,z-6],[x+2,y,z+5],[x,y,z+12],[x-2,y,z+5]],'#8e86a8');b.gem(x,y+1,z+2,2,col);break;
case 'thorn':for(const side of [-1,1])b.poly([[x,y,z-5],[x+side*6,y,z],[x+side*3,y,z+6],[x,y,z+2]],'#719f7a');b.gem(x,y+1,z,2,col);break;
case 'rift':b.plate(x,y,z,6,7,'#484762');b.ring(x,y+3,z,4,col);b.orb(x,y+3,z,2,'#111c2a');break;
case 'rapid':b.plate(x,y,z,4,6,'#77757c');for(const side of [-1,1])b.plate(x+side*2,y+2,z+2,1,5,col);break;
case 'cannon':b.plate(x,y,z,6,7,'#756054');b.ring(x,y+3,z+2,4,col);b.gem(x,y+4,z+2,2,col);break;
case 'burst':b.plate(x,y,z,5,4,'#724659');for(const side of [-1,0,1])b.gem(x+side*3,y+3,z+3,2,col);break;
case 'glacier':for(const side of [-1,0,1])b.gem(x+side*4,y,z+2-Math.abs(side)*2,4,col);break;
}
if(part.evolved)b.gem(x,y+2,z+8,1.8,'#ffe0a2');
for(let i=0;i<Math.min(part.mastery,5);i++)b.orb(x-3+i*1.5,y+3,z-5,.55,'#fff0ce');};
function spells(c,p,d,r,front){const b=brush(c,r);for(const part of d.spells)if((r.depth(...part.slot)>=0)===front)A.spellPart(c,b,r,part);}
A.playerBack=function(c,p,d=this.player(p)){const r=rig(p),b=brush(c,r),col=N.COVENS[p.coven].color;c.save();
if(d.demon){const spread=33+d.demonStage*3,flap=Math.sin(r.clock*3)*3;for(const side of [-1,1]){const root=[side*9,-12,64],elbow=[side*26,-17,83+flap],tip=[side*spread,-18,97+flap];b.poly([root,elbow,tip,[side*(spread+6),-15,58],[side*28,-14,64],[side*20,-12,45]],'#60314f');b.poly([root,elbow,[side*28,-14,64],[side*20,-12,45]],'#8d4a6c');b.line([root,elbow,tip],'#dda0be',1.6);b.line([elbow,[side*(spread+6),-15,58]],'#b7789c',1);}}
if(r.depth(0,-12)>0&&d.stage){b.plate(0,-13,58,4,5,'#665d80');b.gem(0,-14,59,2.1,col);}spells(c,p,d,r,false);c.restore();};
A.playerFront=function(c,p,d=this.player(p)){const r=rig(p),b=brush(c,r),col=N.COVENS[p.coven].color,st=d.stats;c.save();
if(r.depth(0,12)>-1){const defense=Math.max(st.armor,st.vitality,st.regen),offense=Math.max(st.damage,st.haste,st.projectiles,st.critical,st.criticalPower,st.range,st.pierce),mobility=Math.max(st.speed,st.dash,st.pickup);
if(defense){b.plate(0,11,55,6+st.armor*.45,5+defense*.3,'#526b76');b.gem(0,14,55,1.6+st.vitality*.35,'#b6dfc1');if(st.regen)b.gem(-5,14,52,1+st.regen*.2,'#80c7a0');}
if(offense){b.plate(19,7,46,3+st.damage*.3,4,'#70617c');b.gem(19,10,47,1.5+st.criticalPower*.3,'#eac38c');
for(let i=0;i<Math.ceil(st.haste/2);i++)b.line([[17,10,43+i*2],[21,10,43+i*2]],'#d5bc91',.7);
if(st.projectiles>1)for(const side of [-1,1])b.gem(23+side*3,6,85,1+st.projectiles*.15,'#d9c5eb');
if(st.critical>1)b.gem(-4,12,98,1+st.critical*.2,'#efc58c');
if(st.range>1)b.plate(23,5,80,1.7,1+st.range*.4,'#9c8ca5');
if(st.pierce)b.poly([[25,5,91],[28,5,95+st.pierce],[25,5,94]],'#c6afd9');}

if(mobility>1)for(const side of [-1,1]){b.plate(side*8,7,13,2+st.speed*.3,3+mobility*.3,'#4c777e');b.gem(side*8,10,14,1.5,col);if(st.dash>1)b.poly([[side*9,7,12],[side*15,2,15+st.dash],[side*11,6,9]],'#719eaa');}
if(st.pickup>1)b.ring(10,12,36,1.8+st.pickup*.3,'#bba26e');
for(const t of d.talents){const spec={scavenger:[-9,11,37],kindling:[-13,8,55],veil:[9,7,17],frostbite:[-4,12,61],bloodledger:[10,11,36],focus:[4,12,62]}[t.id];if(spec)b.gem(...spec,1.4+Math.min(3,t.band)*.2,col);}
d.relics.forEach((id,i)=>{const spell=Object.entries(N.WEAPONS).find(([,w])=>w.relic===id)?.[0];b.gem(-9+(i%6)*3.5,12,41-Math.floor(i/6)*3,1.2,A.colors[spell]||col);});
for(const s of d.specials)b.gem({slash:-9,frostfall:0,soulstorm:9}[s.id],9,67,s.selected?2.8:1.8,N.SPECIALS[s.id].color);
if(d.oath)b.gem(0,13,34,2.8,'#e1c19a');if(d.essence)b.gem(-14,9,34,1.5+d.essence*.25,'#db9fc6');
for(let i=0;i<d.stage;i++)b.gem((i-(d.stage-1)/2)*3.3,12,d.demon?91:99,1.4,col);
}
spells(c,p,d,r,true);const q=p.progress;if(q.aegisTime>0&&q.aegis>0)this.wardMesh(c,p.x,p.y-40,42,67,q.aegis/q.aegisMax,'#aee9ff');
c.textAlign='center';c.font='bold 9px Arial';c.lineWidth=3;c.strokeStyle='#0c1622';c.fillStyle=col;const text='L'+N.fmt(p.level);c.strokeText(text,p.x,p.y+21);c.fillText(text,p.x,p.y+21);c.restore();};
A.volumeVersion='5.2.2';
})();
