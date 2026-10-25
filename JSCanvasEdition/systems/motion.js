/* Display-only motion. Six atlas bands at most, two on low; no live mesh. */
(() => {
'use strict';const N=window.Nocturne;
N.Motion={
 profile(e){
  const g=e.game,player=!!e.weapons,moving=e.moving||e.dashTimer>0;
  if(g.reducedMotion||e.frozen>0||!moving)return {strength:0,phase:0,wind:0};
  const boost=player?(e.progress.demonTime>0?e.progress.demonSpeed||1.45:1)*(e.progress.activeOath==='pilgrim'?1.08:1):e.slow>0?.48:1;
  const speed=Math.max(0,e.speed*boost*(e.dashTimer>0?3.4:1)),energy=Math.min(3,Math.log2(1+speed/(player?195:80)));
  return {strength:.65+energy*.9,phase:(g.time||0)*(6+Math.min(5,energy*2))+(player?e.walk:e.gait||0),wind:player?e.lastX||0:Math.cos((e.phase||0)*.2)};
 },
 draw(c,sheet,sx,sy,sw,sh,x,y,w,h,e){
  const cloth=!!e.weapons||['cultist','wraith','reaper','warden','overlord'].includes(e.type);
  const crowd=!e.weapons&&!e.boss&&e.game.enemies.length>60;
  if(!cloth||crowd&&e.game.quality==='low'){c.drawImage(sheet,sx,sy,sw,sh,x,y,w,h);return;}
  const m=this.profile(e);
  if(m.strength===0){c.drawImage(sheet,sx,sy,sw,sh,x,y,w,h);return;}
  const cheap=e.game.quality==='low'||crowd;
  const cuts=cheap?[0,75,128]:[0,64,78,92,106,118,128];
  for(let i=0;i<cuts.length-1;i++){
   const top=cuts[i]/128,bottom=cuts[i+1]/128,weight=Math.max(0,(top-.43)/.57);
   const shift=(Math.sin(m.phase-top*6)*m.strength-m.wind*m.strength*1.2)*weight;
   c.drawImage(sheet,sx,sy+sh*top,sw,sh*(bottom-top),x+shift,y+h*top,w,h*(bottom-top)+.2);
  }
 }
};
})();
