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
      const outside=s.phase==='fighting'&&N.dist2(g.player,s)>(s.radius+65)**2;
      const col=s.phase==='cleared'?'#95c7ae':outside?'#dac09a':'#a5a796';
      // Architecture, not an attack circle: no red floor wash or countdown.
      c.save();c.translate(s.x,s.y);c.lineWidth=2;c.strokeStyle=col+'90';
      for(let i=0;i<12;i++){const a=i*Math.PI/6+.035,b=(i+1)*Math.PI/6-.035;c.beginPath();c.arc(0,0,s.radius,a,b);c.stroke();}
      c.lineWidth=.8;c.strokeStyle=col+'30';c.beginPath();c.arc(0,0,s.radius-12,0,Math.PI*2);c.stroke();
      for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.cos(a)*(s.radius+6),y=Math.sin(a)*(s.radius+6);c.save();c.translate(x,y);c.rotate(a);c.fillStyle='#293136';c.strokeStyle=col+'88';c.fillRect(-6,-5,12,10);c.strokeRect(-6,-5,12,10);c.fillStyle=col;c.fillRect(-1,-3,2,6);c.restore();}
      if(s.phase!=='fighting'){c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.moveTo(0,-18);c.lineTo(13,0);c.lineTo(0,18);c.lineTo(-13,0);c.closePath();c.stroke();}
      c.textAlign='center';c.fillStyle=col;c.font='bold 11px Arial';
      c.fillText(s.phase==='waiting'?'BOSS ARENA · ENTER TO SUMMON':s.phase==='cleared'?'SEAL BROKEN':outside?'RETURN INSIDE · BOSS GUARDED':'BOSS ARENA',0,-Math.min(s.radius-30,100));c.restore();
    }
  };
  // Fixed local scale: a distant objective no longer shrinks nearby threats.
  N.radarLayout=g=>{
    const compact=g.width<701,short=g.height<520,size=short?96:compact?120:176;
    const range=compact||short?950:1200;
    let x=g.width-size-(compact?14:28),y=short?104:compact?150:136;
    if(compact&&g.height<720&&window.matchMedia?.('(pointer:coarse)').matches){x=20;y=150;}
    // HUD panels have different heights in portrait, landscape and small windows.
    // Read their existing layout; never move gameplay state or persist UI geometry.
    const rect=id=>{const el=document.getElementById(id);if(!el||el.hidden)return null;const r=el.getBoundingClientRect?.();return r&&Number.isFinite(r.top)&&Number.isFinite(r.bottom)?r:null;};
    const power=rect('power-hud'),boss=rect('boss-hud');
    if(power&&x+size+6>power.left&&x-6<power.right&&y+size+42>power.top&&y-25<power.bottom){
      if(!compact)x=Math.max(14,power.left-size-20);
      else y=Math.max(y,150);
    }
    if(boss&&x+size+6>boss.left&&x-6<boss.right&&y-25<boss.bottom&&y+size+42>boss.top)y=boss.bottom+35;
    return {size,x,y,range,scale:(size/2-20)/range};
  };
  N.radarPoint=(g,point,layout=N.radarLayout(g))=>{
    const dx=point.x-g.player.x,dy=point.y-g.player.y,distance=Math.hypot(dx,dy),radius=layout.size/2-20;
    const factor=distance>layout.range?radius/distance:layout.scale;
    return {x:layout.x+layout.size/2+dx*factor,y:layout.y+layout.size/2+dy*factor,distance,angle:Math.atan2(dy,dx),offscreen:distance>layout.range};
  };
  N.drawRadar=(g,c)=>{
    if(!['playing','paused','levelup'].includes(g.state))return;
    const l=N.radarLayout(g),{size,x,y,range,scale}=l,cx=x+size/2,cy=y+size/2,r=size/2-7,small=size<140;
    const circle=(px,py,rr,fill,stroke=null)=>{c.beginPath();c.arc(px,py,rr,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}};
    const diamond=(px,py,rr,col)=>{c.beginPath();c.moveTo(px,py-rr);c.lineTo(px+rr,py);c.lineTo(px,py+rr);c.lineTo(px-rr,py);c.closePath();c.fillStyle=col;c.fill();};
    const objective=g.sanctum|| (g.boss?.alive?g.boss:null);
    c.save();c.fillStyle='#0a151deb';c.fillRect(x-6,y-25,size+12,size+67);c.strokeStyle='#bca07166';c.lineWidth=1;c.strokeRect(x-6,y-25,size+12,size+67);
    c.textAlign='left';c.font='bold 9px Arial';c.fillStyle='#dfc899';c.fillText(['HOLLOW','EMBER','MOONLIT'][Math.floor(Math.max(0,g.wave-1)/3)%3]+' · '+Math.round(range)+'u',x+3,y-10);
    c.lineWidth=1;circle(cx,cy,r,'#152b30','#7d928777');circle(cx,cy,r-4,null,'#d3b88c40');
    c.save();c.beginPath();c.arc(cx,cy,r-5,0,Math.PI*2);c.clip();
    // Local world grid with a bounded number of lines even at extreme origins.
    const grid=500,step=grid*scale;c.strokeStyle='#9fb8a51c';
    for(let i=-3;i<=3;i++){const gx=cx+i*step-(g.player.x%grid)*scale,gy=cy+i*step-(g.player.y%grid)*scale;c.beginPath();c.moveTo(gx,y);c.lineTo(gx,y+size);c.moveTo(x,gy);c.lineTo(x+size,gy);c.stroke();}
    circle(cx,cy,r*.5,null,'#91b6a125');
    // Camera footprint is distinct from radar range and responds only to zoom.
    c.strokeStyle='#c6e7dc30';c.strokeRect(cx-g.viewWidth*scale/2,cy-g.viewHeight*scale/2,g.viewWidth*scale,g.viewHeight*scale);
    let markers=0;
    for(const prop of g.landmarks?.values?.()||[]){const p=N.radarPoint(g,prop,l);if(p.offscreen)continue;c.fillStyle='#83948955';c.fillRect(p.x-1.5,p.y-1.5,3,3);if(++markers>=80)break;}
    for(const drop of g.loot){if(drop.type!=='jewel'&&drop.type!=='heal')continue;const p=N.radarPoint(g,drop,l);if(p.offscreen)continue;if(drop.type==='jewel')diamond(p.x,p.y,2.3,'#e6a0cd');else{c.fillStyle='#b9e2bc';c.fillRect(p.x-2,p.y-.7,4,1.4);c.fillRect(p.x-.7,p.y-2,1.4,4);}if(++markers>=120)break;}
    // One marker per screen cell for ordinary swarms, bounded canvas work.
    const cells=new Set();let ordinary=0;
    for(const e of g.enemies){if(!e.alive||e.boss||e.elite||e.tier==='veteran')continue;const p=N.radarPoint(g,e,l);if(p.offscreen)continue;const key=Math.floor(p.x/4)+','+Math.floor(p.y/4);if(cells.has(key))continue;cells.add(key);circle(p.x,p.y,1.35,'#ce8f80');if(++ordinary>=180)break;}
    // Priority markers draw after the swarm; bosses off radar get edge arrows.
    for(const e of g.enemies){if(!e.alive||(!e.boss&&!e.elite&&e.tier!=='veteran'))continue;const p=N.radarPoint(g,e,l);if(p.offscreen&&!e.boss)continue;diamond(p.x,p.y,e.boss?4:2.7,e.boss?'#ffd084':'#ecaccd');if(e.boss)circle(p.x,p.y,6,null,'#ffd08488');}
    if(g.sanctum){const s=g.sanctum,p=N.radarPoint(g,s,l),color=s.phase==='cleared'?'#a1dec1':s.phase==='fighting'?'#ffbb80':'#f59ba7';
      if(!p.offscreen){c.strokeStyle=color+'55';c.beginPath();c.arc(p.x,p.y,Math.min(r*2,s.radius*scale),0,Math.PI*2);c.stroke();}
      diamond(p.x,p.y,5,color);circle(p.x,p.y,7.5,null,color+'66');
      if(p.offscreen){c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.fillStyle=color;c.beginPath();c.moveTo(6,0);c.lineTo(-3,-3);c.lineTo(-3,3);c.closePath();c.fill();c.restore();}
    }
    c.restore();
    // Fixed north-up compass, with a separate player heading needle.
    c.font='bold 8px Arial';c.textAlign='center';c.fillStyle='#d3c49f';c.fillText('N',cx,y+9);
    const heading={S:Math.PI/2,SW:Math.PI*.75,W:Math.PI,NW:-Math.PI*.75,N:-Math.PI/2,NE:-Math.PI*.25,E:0,SE:Math.PI*.25}[g.player.facing]??0;
    c.save();c.translate(cx,cy);c.rotate(heading);c.fillStyle='#d6fff1';c.strokeStyle='#143b3c';c.lineWidth=1.5;c.beginPath();c.moveTo(6,0);c.lineTo(-4,-3.5);c.lineTo(-2,0);c.lineTo(-4,3.5);c.closePath();c.fill();c.stroke();c.restore();
    c.textAlign='left';c.font=(small?'8':'9')+'px Arial';c.fillStyle='#d6dfcd';
    const target=objective?N.radarPoint(g,objective,l):null;
    c.fillText(target?(g.sanctum?.phase==='cleared'?'SEAL BROKEN':g.sanctum?.phase==='fighting'?'SOVEREIGN':'SANCTUM')+' · '+N.fmt(Math.round(target.distance))+'u':'SURVIVE · FIND THE SEAL',x+2,y+size+13);
    c.fillStyle='#9daea6';c.font='8px Arial';c.fillText(small?'◆ TARGET  ·  ● FOE':'◆ TARGET   ● FOE   + VITALITY',x+2,y+size+28);
    c.restore();
  };
})();
