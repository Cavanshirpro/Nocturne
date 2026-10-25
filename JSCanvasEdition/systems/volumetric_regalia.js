/* v5.2.3 appearance adapter: passive circles and active orbital emitters. */
(() => {
'use strict';const N=window.Nocturne,A=N.Appearance;
function wings(c,p,d){if(!d.demon)return;const frozen=p.game.reducedMotion,t=frozen?0:p.game.time,spread=34+d.demonStage*3,flap=Math.sin(t*3)*3;c.save();
for(const side of [-1,1]){c.fillStyle='#60314f';c.strokeStyle='#b5789b';c.lineWidth=1.2;c.beginPath();c.moveTo(p.x+side*7,p.y-49);c.lineTo(p.x+side*24,p.y-65-flap);c.lineTo(p.x+side*spread,p.y-81-flap);c.lineTo(p.x+side*(spread+5),p.y-40);c.lineTo(p.x+side*21,p.y-48);c.lineTo(p.x+side*14,p.y-31);c.closePath();c.fill();c.stroke();}c.restore();}
A.playerBack=function(c,p,d=this.player(p)){wings(c,p,d);N.Orbitals.draw(c,p,false);};
A.playerFront=function(c,p,d=this.player(p)){N.Orbitals.draw(c,p,true);const q=p.progress;c.save();
if(q.aegisTime>0&&q.aegis>0)this.wardMesh(c,p.x,p.y-40,42,67,q.aegis/q.aegisMax,'#aee9ff');
c.textAlign='center';c.font='bold 9px Arial';c.lineWidth=3;c.strokeStyle='#0c1622';c.fillStyle=N.COVENS[p.coven].color;const text='L'+N.fmt(p.level);c.strokeText(text,p.x,p.y+25);c.fillText(text,p.x,p.y+25);c.restore();};
A.enemyBack=function(c,e){N.Orbitals.draw(c,e,false);};
A.enemyFront=function(c,e){N.Orbitals.draw(c,e,true);const q=e.guardian;if(q?.ward>0)this.wardMesh(c,e.x,e.y-88,83,119,q.ward/q.wardMax,'#d9bfff');};
A.volumeVersion='5.2.3';
})();
