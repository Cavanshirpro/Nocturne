/* Shared orbital adapter. Wing membranes are layered 2D panels, not WebGL. */
(() => {
'use strict';const N=window.Nocturne,A=N.Appearance,TAU=Math.PI*2;
function wings(c,p,d,front){
 if(!d.demon)return;const t=p.game.reducedMotion?0:p.game.time,angle=({S:0,SW:1,W:2,NW:3,N:4,NE:5,E:6,SE:7}[p.facing]||0)*Math.PI/4,co=Math.cos(angle),si=Math.sin(angle),wide=33+d.demonStage*2;
 const proj=(x,y,z)=>[p.x+(x*co-y*si)*.83,p.y+(x*si+y*co)*.4-z*.75];
 const poly=(pts,fill,stroke='#b5789b')=>{c.beginPath();pts.forEach(([x,y],i)=>c[i?'lineTo':'moveTo'](x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.85;c.stroke();}};
 c.save();
 for(const side of [-1,1]){
  if((side*si>.3)!==front)continue;
  const flap=Math.sin(t*2.5+side*.18)*2,root=proj(side*8,-10,65),joint=proj(side*22,-15,83+flap),tip=proj(side*wide,-20,100+flap*1.5),mid=proj(side*(wide+4),-15,57),low=proj(side*21,-12,43),fold=proj(side*13,-11,51);
  poly([root,joint,tip,mid,low,fold],'#45243f');
  poly([root,joint,tip,proj(side*28,-16,65)],'#713c61');
  poly([root,proj(side*28,-16,65),mid,low],'#542b4c');
  poly([root,low,fold],'#814569');
  poly([joint,tip,proj(side*wide,-22,98+flap*1.5),proj(side*22,-17,81+flap)],'#c087a5');
  c.strokeStyle='#d9a1bc';c.lineWidth=1.8;c.beginPath();c.moveTo(...root);c.lineTo(...joint);c.lineTo(...tip);c.stroke();
  for(const end of [mid,low,fold]){c.strokeStyle='#b87c9f';c.lineWidth=1;c.beginPath();c.moveTo(...root);c.quadraticCurveTo(joint[0]*.4+root[0]*.6,joint[1]*.3+root[1]*.7,...end);c.stroke();}
  c.fillStyle='#f1c5d5';c.beginPath();c.arc(joint[0],joint[1],2,0,TAU);c.fill();
 }
 c.restore();
}
A.playerBack=function(c,p,d=this.player(p)){N.Presentation.form(c,p);wings(c,p,d,false);N.Orbitals.draw(c,p,false);};
A.playerFront=function(c,p,d=this.player(p)){wings(c,p,d,true);N.Orbitals.draw(c,p,true);const q=p.progress;c.save();
if(q.aegisTime>0&&q.aegis>0)this.wardMesh(c,p.x,p.y-40,42,67,q.aegis/q.aegisMax,'#aee9ff');
// An unobtrusive shoulder edge activates only during deliberate power/hurt.
if((p.castTimer>0||p.animator.state==='hurt')&&p.game.quality!=='low'){c.strokeStyle=N.COVENS[p.coven].color+'b0';c.lineWidth=1.3;c.beginPath();c.moveTo(p.x-14,p.y-54);c.quadraticCurveTo(p.x-16,p.y-61,p.x-7,p.y-63);c.stroke();}
c.textAlign='center';c.font='bold 9px Arial';c.lineWidth=3;c.strokeStyle='#0c1622';c.fillStyle=N.COVENS[p.coven].color;const text='L'+N.fmt(p.level);c.strokeText(text,p.x,p.y+25);c.fillText(text,p.x,p.y+25);c.restore();};
A.enemyBack=function(c,e){N.HostileVisuals.rear(c,e);N.Orbitals.draw(c,e,false);};
A.enemyFront=function(c,e){N.Orbitals.draw(c,e,true);const q=e.guardian;if(q?.ward>0)this.wardMesh(c,e.x,e.y-88,83,119,q.ward/q.wardMax,'#d9bfff');N.HostileVisuals.feedback(c,e);N.HostileVisuals.summoning(c,e);};
A.volumeVersion='0.7.6';
})();
