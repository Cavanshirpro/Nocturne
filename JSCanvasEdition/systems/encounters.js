/* Wave-end sanctums and a world-space radar. No camera zoom changes gameplay. */
(() => {
  'use strict';
  const N=window.Nocturne;
  N.Sanctum={
    create(g){
      if(g.sanctum)return;
      const radius=N.Warfare.arena(g),angle=N.rand(0,Math.PI*2),distance=Math.max(1050,radius+350);
      g.sanctum={x:g.player.x+Math.cos(angle)*distance,y:g.player.y+Math.sin(angle)*distance,radius,phase:'waiting',bossId:null};
      g.ui.banner('THE FINAL SANCTUM','FOLLOW THE CRIMSON DIAMOND ON YOUR MINIMAP');
      g.combat.sound('warning');
    },
    update(g){
      if(g.waveTime<g.waveDuration)return;
      this.create(g);
      const s=g.sanctum;
      if(s.phase==='waiting'&&N.dist2(g.player,s)<=s.radius**2){
        // A surviving invasion boss becomes the final guardian; never duplicate it.
        if(!g.boss?.alive)g.spawnBoss(g.wave%5===0,true);
        const b=g.boss;N.FinalGuardian.promote(g,b);b.x=s.x;b.y=s.y;b.spawnDelay=1.2;
        b.windup=b.charge=b.knockX=b.knockY=0;
        s.bossId=b.id;s.phase='fighting';g.bossSpawned=true;g.bossDefeated=false;
        g.ui.banner('BREAK THE FINAL SEAL','THE FINAL SOVEREIGN · E TO RAISE YOUR AEGIS');
      }
      if(s.phase==='fighting'){
        const b=g.enemies.find(e=>e.id===s.bossId);
        if(b&&!b.alive)s.phase='cleared';
      }
    },
    leash(g,e){
      const s=g.sanctum;if(!s||s.bossId!==e.id)return;
      const dx=e.x-s.x,dy=e.y-s.y,d=Math.hypot(dx,dy),r=s.radius-45;
      if(d>r){e.x=s.x+dx/d*r;e.y=s.y+dy/d*r;e.knockX=e.knockY=0;}
    },
    draw(g,c){
      const s=g.sanctum;if(!s||!g.visible(s.x,s.y,s.radius+80))return;
      const active=s.phase==='fighting',outside=active&&N.dist2(g.player,s)>(s.radius+65)**2,color=s.phase==='cleared'?'#95dbbe':outside?'#b7a2f5':'#ec9c99';
      c.save();c.translate(s.x,s.y);c.fillStyle=active?'#9b313d13':'#a35a7210';c.strokeStyle=color+'88';c.lineWidth=2;
      c.beginPath();c.arc(0,0,s.radius,0,Math.PI*2);c.fill();c.stroke();
      c.strokeStyle=color+'44';c.beginPath();c.arc(0,0,s.radius-22,0,Math.PI*2);c.stroke();
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6,x=Math.cos(a)*(s.radius+12),y=Math.sin(a)*(s.radius+12);
        c.fillStyle='#1a2227';c.strokeStyle=color+'88';c.fillRect(x-8,y-16,16,28);c.strokeRect(x-8,y-16,16,28);
        c.fillStyle=color;c.fillRect(x-1,y-10,2,9);
      }
      c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.moveTo(0,-35);c.lineTo(24,0);c.lineTo(0,35);c.lineTo(-24,0);c.closePath();c.stroke();
      c.textAlign='center';c.fillStyle='#f1d5ca';c.font='bold 13px Arial';
      c.fillText(s.phase==='waiting'?'ENTER TO SUMMON THE GUARDIAN':s.phase==='cleared'?'SEAL BROKEN':outside?'OUTER SEAL · 90% PROTECTION':'FINAL SANCTUM',0,-65);
      c.restore();
    }
  };
  N.radarLayout=g=>{
    const size=g.width<701?108:160,s=g.sanctum;
    const range=Math.max(850,s?Math.hypot(s.x-g.player.x,s.y-g.player.y)+400:0);
    return {size,x:g.width-size-(g.width<701?14:36),y:g.width<701?166:140,range,scale:(size/2-12)/range};
  };
  N.drawRadar=(g,c)=>{
    if(!['playing','paused','levelup'].includes(g.state))return;
    const {size,x,y,range,scale}=N.radarLayout(g),cx=x+size/2,cy=y+size/2;
    c.save();c.fillStyle='#111d23ed';c.fillRect(x,y,size,size);c.strokeStyle='#a6bba055';c.lineWidth=1;c.strokeRect(x,y,size,size);
    c.beginPath();c.rect(x+2,y+2,size-4,size-4);c.clip();
    const grid=500*Math.max(1,2**Math.ceil(Math.log2(range/1000))),step=grid*scale;c.strokeStyle='#8eaa9b20';
    for(let i=-Math.ceil(size/step);i<=Math.ceil(size/step);i++){
      const gx=cx+i*step-(g.player.x%grid)*scale,gy=cy+i*step-(g.player.y%grid)*scale;
      c.beginPath();c.moveTo(gx,y);c.lineTo(gx,y+size);c.moveTo(x,gy);c.lineTo(x+size,gy);c.stroke();
    }
    c.strokeStyle='#c3d0bb33';c.strokeRect(cx-g.viewWidth*scale/2,cy-g.viewHeight*scale/2,g.viewWidth*scale,g.viewHeight*scale);
    for(const e of g.enemies)if(e.alive){
      const px=cx+(e.x-g.player.x)*scale,py=cy+(e.y-g.player.y)*scale;
      c.fillStyle=e.boss?'#ffd17f':e.tier==='veteran'?'#efa1be':'#b8a597';c.beginPath();c.arc(px,py,e.boss?3.5:1.3,0,Math.PI*2);c.fill();
    }
    if(g.sanctum){
      const s=g.sanctum,px=cx+(s.x-g.player.x)*scale,py=cy+(s.y-g.player.y)*scale;
      c.strokeStyle='#ff919c';c.lineWidth=2;c.beginPath();c.moveTo(px,py-6);c.lineTo(px+5,py);c.lineTo(px,py+6);c.lineTo(px-5,py);c.closePath();c.stroke();
    }
    c.fillStyle='#b9f3e4';c.beginPath();c.arc(cx,cy,3,0,Math.PI*2);c.fill();
    c.restore();c.save();c.textAlign='left';c.fillStyle='#cbd9c9';c.font='9px Arial';c.fillText('N ↑  ·  HOLLOW MAP',x,y-8);
    c.fillStyle='#e7c0b7';c.font='9px Arial';c.fillText(g.sanctum?'◆ SANCTUM · '+N.fmt(Math.round(Math.sqrt(N.dist2(g.player,g.sanctum))))+'u':'◆ SANCTUM AT WAVE END',x,y+size+14);
    c.restore();
  };
})();
