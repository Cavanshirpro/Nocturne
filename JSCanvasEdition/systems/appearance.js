/* Read-only costume composition. No simulation clocks, randomness or save fields. */
(() => {
  'use strict';const N=window.Nocturne,TAU=Math.PI*2;
  const stages=[8,20,40,80,160],facings={S:0,SW:1,W:2,NW:3,N:4,NE:5,E:6,SE:7};
  const band=x=>Math.min(5,Math.max(0,Math.floor(Math.log2(1+Math.max(0,x)))));
  const slots={bolt:[24,6,90],orbit:[-12,1,99],lightning:[-13,-7,69],nova:[0,12,20],meteor:[-17,1,62],lance:[-21,8,43],thorn:[-12,9,37],rift:[-25,-10,61],rapid:[21,8,44],cannon:[17,0,65],burst:[9,11,40],glacier:[12,-8,76]};
  const colors={bolt:'#e5d5ff',orbit:'#f0d1a0',lightning:'#9fe9ee',nova:'#b8e3fa',meteor:'#ffc38c',lance:'#dfb8ff',thorn:'#b5dcaa',rift:'#b6acff',rapid:'#efddc0',cannon:'#e6b27f',burst:'#f3a9b0',glacier:'#b7ecff'};
  const statSpec={damage:p=>p.damage/18,haste:p=>.56/p.attackInterval,projectiles:p=>p.projectileCount,critical:p=>p.critChance*10,criticalPower:p=>p.critMultiplier-1,range:p=>p.projectileSpeed/510,armor:p=>p.armor,vitality:p=>p.maxHp/110,regen:p=>p.regen*4,speed:p=>p.speed/195,dash:p=>3.2/p.dashCooldown,pickup:p=>p.pickupRadius/82,pierce:p=>p.pierce};
  function rig(e,player=false){
    const scale=player?1:e.scale||1,a=(facings[e.facing]??0)*Math.PI/4;
    const clock=e.game.reducedMotion||e.frozen>0?0:player?e.game.time:e.phase||0;
    const gait=e.game.reducedMotion||e.frozen>0?0:Math.sin(player?e.walk:e.gait||0);
    const p=(x,y,z)=>({x:e.x+(x*Math.cos(a)-y*Math.sin(a))*.833333*scale,y:e.y-2*scale+(x*Math.sin(a)+y*Math.cos(a))*.401*scale-z*.744*scale});
    return {scale,a,clock,gait,p,depth:(x,y)=>x*Math.sin(a)+y*Math.cos(a)};
  }
  function brush(c,r){return {
    line(pts,color,width=1){c.strokeStyle=color;c.lineWidth=width*r.scale;c.beginPath();for(let i=0;i<pts.length;i++){const v=r.p(...pts[i]);c[i?'lineTo':'moveTo'](v.x,v.y);}c.stroke();},
    poly(pts,fill,stroke=null){c.fillStyle=fill;c.beginPath();for(let i=0;i<pts.length;i++){const v=r.p(...pts[i]);c[i?'lineTo':'moveTo'](v.x,v.y);}c.closePath();c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.8*r.scale;c.stroke();}},
    gem(x,y,z,size,color){this.poly([[x,y,z+size],[x+size*.65,y,z],[x,y,z-size],[x-size*.65,y,z]],'#192333',color);this.line([[x,y,z+size],[x,y,z-size]],color,.7);},
    orb(x,y,z,size,color){const v=r.p(x,y,z);c.fillStyle=color;c.beginPath();c.arc(v.x,v.y,size*r.scale,0,TAU);c.fill();},
    ring(x,y,z,size,color){const v=r.p(x,y,z);c.strokeStyle=color;c.lineWidth=r.scale;c.beginPath();c.ellipse(v.x,v.y,size*r.scale,size*r.scale*.55,0,0,TAU);c.stroke();}
  };}
  function adorn(b,id,x,y,z,rank,color,phase=0){
    const m=.78+Math.min(5,rank)*.045;
    const line=(pts,w=1)=>b.line(pts.map(([a,c,d])=>[x+a*m,y+c*m,z+d*m]),color+'c0',w*.85);
    const gem=(a,c,d,size=3)=>b.gem(x+a*m,y+c*m,z+d*m,size*m,color);
    if(id==='bolt'){gem(0,0,0,5);for(const s of [-1,1])line([[0,0,-6],[s*6,0,0],[s*4,0,8]],1.2);}
    else if(id==='orbit'){line([[-5,0,0],[0,0,6],[5,0,0],[0,0,-3]],1.5);gem(-4,0,-4,2);}
    else if(id==='lightning'){for(const s of [-1,1])line([[s*5,-2,-10],[s*8,-2,3],[s*4,-2,12],[s*10,-2,21]],1.8);line([[-8,-2,7],[0,-3,13],[8,-2,7]],.8);}
    else if(id==='nova'){for(let i=0;i<6;i++){const a=i*TAU/6;line([[0,0,0],[Math.cos(a)*10,Math.sin(a)*4,Math.sin(a)*8]],1.2);}gem(0,1,0,3);}
    else if(id==='meteor'){b.poly([[x-7,y,z-5],[x+7,y,z-5],[x+6,y,z+5],[x,y,z+13],[x-6,y,z+5]],'#4c2f37',color);for(const s of [-1,1])line([[s*4,1,-3],[s*2,1,5],[0,1,9]],1);gem(0,2,2,4);}
    else if(id==='lance'){b.poly([[x-2.5,y,z-9],[x+2.5,y,z-9],[x+3,y,z+4],[x,y,z+15],[x-3,y,z+4]],'#545064',color+'b0');line([[0,1,-7],[0,1,12]],1);}
    else if(id==='thorn'){for(const s of [-1,1]){line([[s*2,1,-8],[s*5,2,-2],[s*3,2,5],[s*6,1,11]],1.6);gem(s*6,1,2,2);}gem(0,2,0,3);}
    else if(id==='rift'){b.ring(x,y,z,10,color);b.ring(x,y,z,6,'#e5dcff');b.orb(x,y,z,4,'#101527');for(const s of [-1,1])gem(s*10,0,0,3);}
    else if(id==='rapid'){for(const s of [-1,0,1]){line([[s*3,1,-6],[s*3,1,9]],2.4);gem(s*3,1,11,1.6);}line([[-6,1,-5],[6,1,-5]],1);}
    else if(id==='cannon'){b.poly([[x-6,y,z-6],[x+6,y,z-6],[x+8,y,z+4],[x,y,z+12],[x-8,y,z+4]],'#4b3c3c',color);b.ring(x,y+2,z+5,5,color);b.orb(x,y+2,z+5,2,'#fff1cf');}
    else if(id==='burst'){for(const s of [-1,0,1])line([[s*2,0,-5],[s*6,0,7],[s*7,0,10]],2);gem(0,1,0,3);}
    else if(id==='glacier'){for(const s of [-1,0,1]){gem(s*5,-1,5-Math.abs(s)*5,3.6);line([[s*5,-1,-7],[s*5,-1,9]],.8);}}
  }
  N.Appearance={
    colors,slots,
    player(p){
      const q=p.progress||{},stage=stages.filter(n=>p.level>=n).length;
      return {stage,level:p.level,coven:p.coven,demon:q.demonTime>0,demonStage:Math.min(5,Math.max(1,1+Math.round(((q.demonPower||1.8)-1.8)/.3))),
        spells:N.SPELL_IDS.filter(id=>p.weapons[id]>0).map(id=>({id,rank:p.weapons[id],band:band(p.weapons[id]),mastery:band(q.mastery?.[id]||0),evolved:!!p.evolved(id),color:colors[id],slot:slots[id]})),
        stats:Object.fromEntries(Object.entries(statSpec).map(([id,fn])=>[id,band(fn(p))])),
        talents:Object.keys(N.TALENTS).filter(id=>q.talents?.[id]>0).map(id=>({id,band:band(q.talents[id])})),
        relics:Object.entries(p.relics).filter(([,owned])=>owned).map(([id])=>id),
        specials:Object.entries(N.SPECIALS).filter(([,s])=>p.level>=s.unlock).map(([id])=>({id,selected:q.special===id,band:band(q.arsenal?.[id]||1)})),oath:q.activeOath,essence:band((q.essence||0)/100)};
    },
    enemy(e){return {stage:stages.filter(n=>e.level>=n).length,level:eLevel(e),trait:e.trait||'none',elite:!!e.elite,tier:e.guardian?.tier||0,role:e.guardian?'sovereign':e.type==='overlord'?(e.summonedBy?'commander':'overlord'):e.summonedBy?'soldier':e.boss?'warden':'creature',enraged:!!e.guardian&&e.hp<e.maxHp*.4};},
    playerBack(c,p,d=this.player(p)){
      const r=rig(p,true),b=brush(c,r),col=N.COVENS[p.coven].color;
      c.save();
      // Coven-specific mantle, stitched level bands and a complete Demon wing rig.
      for(const side of [-1,1]){
        const sway=Math.sin(r.clock*2+side)*3+(p.dashTimer>0?8:0);
        b.poly([[side*8,-8,66],[side*(19+d.stage),-12,47],[side*(25+d.stage*2)+sway,-15,9],[side*13,-13,19]],p.coven==='ash'?'#56343bdc':p.coven==='moon'?'#484164dc':'#294956dc',col);
        for(let j=0;j<d.stage;j++)b.gem(side*(19+j*.7)+sway*.5,-15,17+j*7,1.8,col);
      }
      if(d.demon){
        for(const side of [-1,1]){
          const flap=Math.sin(r.clock*6)*(.8+d.demonStage*.3),wide=35+d.demonStage*5;
          const root=[side*9,-9,65],elbow=[side*(wide*.65),-17,94+flap*4],tip=[side*wide,-19,105+flap*6];
          b.poly([root,elbow,tip,[side*(wide+8),-14,60+flap*2],[side*(wide*.72),-13,66],[side*(wide*.53),-13,45],[side*14,-10,55]],'#512a4ce0','#de9fc0');
          for(let j=0;j<4;j++){const x=wide*(.5+j*.15);b.line([root,[side*x,-17,80-j*5+flap*2],[side*(x+7),-14,54-j*2]],'#bd7fa9',1);}
          b.line([root,elbow,tip],'#f1b7cf',1.7);b.gem(...elbow,3.4,'#ffdbf0');
          if(d.demonStage>=3)b.poly([[side*12,-12,58],[side*39,-21,42],[side*33,-19,23],[side*22,-15,36]],'#7a3f62ad','#e2a7bf');
        }
      }
      for(const part of d.spells)if(r.depth(part.slot[0],part.slot[1])<0)this.spellPart(c,b,r,part);
      c.restore();
    },
    spellPart(c,b,r,part){
      let [x,y,z]=part.slot;
      if(['rapid','lance'].includes(part.id)){y+=r.gait*(part.id==='rapid'?3:-4);z+=Math.sin(r.clock*2)*.35;}
      adorn(b,part.id,x,y,z,part.band,part.color,r.clock);
      if(part.evolved){b.gem(x,y+1,z+7,2,'#fff2cd');b.line([[x-7,y,z-8],[x-10,y,z],[x-7,y,z+8]],part.color,1.3);}
      for(let i=0;i<part.mastery;i++)b.orb(x-4+i*2,y+2,z-7,.65,'#fff5d5');
    },
    playerFront(c,p,d=this.player(p)){
      const r=rig(p,true),b=brush(c,r),col=N.COVENS[p.coven].color,q=p.progress;
      c.save();
      for(const part of d.spells)if(r.depth(part.slot[0],part.slot[1])>=0)this.spellPart(c,b,r,part);
      // Visible stat equipment: armor plates, cuffs, boots, optics and consumable kit.
      for(const side of [-1,1]){
        for(let i=0;i<d.stats.armor;i++)b.poly([[side*10,5,59-i*3],[side*(17+i*.5),3,58-i*3],[side*16,7,54-i*3]],'#3f4554',col+'90');
        for(let i=0;i<d.stats.speed;i++)b.line([[side*8-3,6,8+i*2],[side*8+3,6,8+i*2]],col,.75);
        if(d.stats.dash>1)b.poly([[side*8,3,15],[side*16,-1,21+d.stats.dash],[side*11,4,10]],'#62757a',col);
      }
      for(let j=0;j<d.stats.vitality;j++)b.gem(-5+j*2.5,10,55,1.4,'#bfe8bd');
      for(let j=0;j<d.stats.projectiles;j++)b.gem(22+(j%2)*2,6,68+Math.floor(j/2)*3,1,'#e9d6ff');
      for(let j=0;j<d.stats.haste;j++)b.line([[19,8,35+j*2],[24,8,35+j*2]],'#e6d6b7',.8);
      for(let j=0;j<d.stats.damage;j++)b.gem(22,6,49+j*2.5,1.1,'#f4bd91');
      for(let j=0;j<d.stats.range;j++)b.line([[22,6,79+j*1.5],[25,6,79+j*1.5]],'#b9e9ec',.6);
      if(d.stats.critical>1)b.gem(-5,9,80,2+d.stats.critical*.2,'#f5d38a');
      for(let j=0;j<d.stats.criticalPower;j++)b.orb(-8+j*2,9,84,.7,'#f5d38a');
      for(let j=0;j<d.stats.pierce;j++)b.poly([[25,6,53+j*2.4],[28,6,56+j*2.4],[25,6,55+j*2.4]],'#95839f','#d5b8e0');
      if(d.stats.regen)b.gem(-11,12,40,2+d.stats.regen*.4,'#b7e8b8');
      if(d.stats.pickup>1)b.ring(11,12,38,3+d.stats.pickup,'#e2c78b');
      const talentSlots={scavenger:[-12,11,34],kindling:[-23,7,45],veil:[8,5,15],frostbite:[0,11,62],bloodledger:[12,12,32],focus:[5,9,79]};
      for(const t of d.talents){const [x,y,z]=talentSlots[t.id];if(t.id==='kindling'){b.gem(x,y,z,3,'#ffb38f');b.line([[x-2,y,z+3],[x,y,z+7],[x+2,y,z+3]],'#ffcd96',.7);}else if(t.id==='veil'){for(const side of [-1,1])b.poly([[x,y,z],[x+side*5,y-2,z+5],[x+side*3,y,z-2]],'#476b69','#b9e6df');}else if(t.id==='focus')b.ring(x,y,z,3+t.band*.3,'#f0d49d');else if(t.id==='frostbite')adorn(b,'glacier',x,y,z,t.band,'#bdedfa');else b.gem(x,y,z,2.3+t.band*.3,t.id==='bloodledger'?'#ff9cae':'#f3d594');}
      d.relics.forEach((id,i)=>{const spell=Object.entries(N.WEAPONS).find(([,w])=>w.relic===id)?.[0];b.gem(-11+(i%6)*4.2,12,46-Math.floor(i/6)*5,1.6,colors[spell]||'#e6cb9b');});
      for(const special of d.specials){const x=special.id==='slash'?-16:special.id==='frostfall'?0:16;b.gem(x,9,69,special.selected?3.8:2.5,special.id==='slash'?'#f2d0a8':special.id==='frostfall'?'#b6eaff':'#e6b8ed');if(special.selected)b.ring(x,9,69,5,'#f4e5c4');}
      if(d.oath)b.gem(0,12,34,4,({ember:'#ffc195',stone:'#d7d8db',wisdom:'#c9bded',pilgrim:'#b9e8e0',fortune:'#e6c789'})[d.oath]);
      for(let i=0;i<d.essence;i++)b.gem(-17,11,28+i*3,1.3,'#e3a7e3');
      // Level crown becomes an antlered sovereign diadem in Demon form.
      for(let i=0;i<d.stage;i++){const x=(i-(d.stage-1)/2)*4;b.gem(x,3,d.demon?99:105,2.1,col);}
      if(d.demon)for(const side of [-1,1]){
        b.poly([[side*9,1,86],[side*17,-1,94+d.demonStage*3],[side*(23+d.demonStage*2),-4,104+d.demonStage*2],[side*18,-1,89]],'#57304b','#efb4cf');
        b.poly([[side*10,5,61],[side*(19+d.demonStage),5,67],[side*23,6,54],[side*15,9,52]],'#713a58','#e7adc3');
        for(let i=0;i<d.demonStage;i++)b.gem(side*(15+i*2),5,70+i*4,1.6,'#ffe0ed');
      }
      if(q.aegisTime>0&&q.aegis>0)this.wardMesh(c,p.x,p.y-40,42,67,q.aegis/q.aegisMax,'#aee9ff');
      c.textAlign='center';c.font='bold 9px Arial';c.lineWidth=3;c.strokeStyle='#0c1622';c.fillStyle=col;const text='L'+N.fmt(p.level);c.strokeText(text,p.x,p.y+21);c.fillText(text,p.x,p.y+21);
      c.restore();
    },
    enemyBack(c,e,d=this.enemy(e)){
      const r=rig(e),b=brush(c,r);c.save();
      if(['hound','slime'].includes(e.type)){
        for(let j=0;j<d.stage;j++)for(const side of [-1,1])b.poly([[side*(6+j*3),-5,30],[side*(12+j*3),-7,46+j*2],[side*(15+j*3),-4,29]],'#536175','#bacdd8');
        c.restore();return;
      }
      if(d.stage>=2||d.elite||e.boss){
        const color=d.role==='sovereign'?'#e4b2cc':d.elite?'#f3d18e':'#aaa1c3';
        for(const side of [-1,1]){
          if(e.boss||d.stage>=3)b.poly([[side*9,-7,65],[side*(22+d.stage),-13,58],[side*(28+d.stage)+Math.sin(r.clock+side)*3,-16,14],[side*16,-10,30]],'#302c48b8',color);
          if(d.role==='sovereign'){
            const reach=38+d.tier*6,flap=Math.sin(r.clock*1.1)*4;
            b.poly([[side*12,-11,62],[side*reach,-18,104+flap],[side*(reach+7),-14,72],[side*(reach-8),-14,76],[side*27,-13,48]],'#4a2a4be0',color+'b0');
            b.poly([[side*12,-11,62],[side*(reach*.7),-17,86+flap],[side*(reach-8),-14,76],[side*27,-13,48]],'#59364fe0');
            for(let j=0;j<3+d.tier;j++){const x=side*(25+j*5);b.line([[side*12,-11,63],[x*.85,-16,80+flap+j*2],[x+side*4,-14,57+j*2]],color+'b0',.65);}
          }
        }
      }
      c.restore();
    },
    enemyFront(c,e,d=this.enemy(e)){
      const r=rig(e),b=brush(c,r),small=['hound','slime'].includes(e.type),top=small?43:70,color=d.role==='sovereign'?'#f0b6d4':d.elite?'#f4cc87':'#b7c8d0';c.save();
      for(let i=0;i<d.stage;i++){const x=(i-(d.stage-1)/2)*4;b.gem(x,small?18:10,small?44:70,1.8,color);}
      if(d.stage>=1)for(const side of [-1,1])b.poly([[side*8,2,top-3],[side*(13+d.stage),3,top+2],[side*(17+d.stage),5,top-8],[side*10,8,top-11]],'#46505b',color);
      if(d.elite)for(const side of [-1,1])b.poly([[side*8,0,top+14],[side*16,-1,top+30],[side*13,3,top+9]],'#9e8363','#ffe0a3');
      if(d.trait==='armored')for(const side of [-1,1]){b.poly([[side*7,8,top-10],[side*18,7,top-12],[side*17,10,top-26],[side*8,11,top-28]],'#778491','#d7e0e3');for(let j=0;j<3;j++)b.orb(side*13,11,top-15-j*4,.8,'#e4cfa7');}
      if(d.trait==='swift')for(const side of [-1,1])b.poly([[side*10,0,top-30],[side*22,-5,top-24],[side*16,3,top-37]],'#668e99','#baeff3');
      if(d.trait==='mending'){adorn(b,'thorn',0,12,top-15,2,'#b8e9b7');b.gem(0,14,top-15,4,'#e2f5ca');}
      if(d.trait==='volatile'){b.gem(0,12,top-14,6,'#ffb188');for(const side of [-1,1])b.line([[side*3,12,top-9],[side*9,12,top-16],[side*6,12,top-27]],'#ee916f',1.4);}
      if(e.boss){
        const crown=96+(d.role==='sovereign'?10:0),teeth=d.role==='sovereign'?5+d.tier:3;
        for(let i=0;i<teeth;i++){const x=(i-(teeth-1)/2)*4;b.poly([[x-2,1,crown],[x,1,crown+9+Math.max(0,3-Math.abs(x)/4)],[x+2,1,crown]],'#a37d9e',color);}
        if(d.role==='commander')b.poly([[-9,-5,74],[-20,-8,90],[-11,-7,84]],'#477287','#b9e6ed');
        if(d.role==='sovereign'){
          const action=e.guardian.action||e.guardian.lastAction,orbColor=({meteors:'#ffc093',starfall:'#ffc093',voidseal:'#d3b0ff',crossfire:'#aeeafa',aegis:'#c7d9ff',shockwave:'#e1cb93'})[action]||color;
          b.gem(0,13,58,7+d.tier,orbColor);for(let j=0;j<d.tier;j++)for(const side of [-1,1])b.gem(side*(20+j*4),-4,76+j*6,2.2,color);
          if(d.enraged)for(const side of [-1,1])for(let j=0;j<3;j++)b.line([[side*4,12,62-j*7],[side*12,12,65-j*7],[side*9,12,57-j*7]],'#ffbf91',1.2);
          this.bossPower(c,e,r,b);
          if(e.guardian.ward>0)this.wardMesh(c,e.x,e.y-88,83,119,e.guardian.ward/e.guardian.wardMax,'#d9bfff');
        }
      }
      c.restore();
    },
    wardMesh(c,x,y,rx,ry,fraction,color){
      c.save();c.strokeStyle=color;c.fillStyle=color+'0c';c.lineWidth=1;
      const count=Math.ceil(N.clamp(fraction,0,1)*8);
      for(let i=0;i<count;i++){const a=i*TAU/8,b=(i+1)*TAU/8;c.beginPath();c.moveTo(x+Math.cos(a)*rx,y+Math.sin(a)*ry);c.lineTo(x+Math.cos(b)*rx,y+Math.sin(b)*ry);c.lineTo(x+Math.cos((a+b)/2)*rx*.75,y+Math.sin((a+b)/2)*ry*.75);c.closePath();c.fill();c.stroke();}c.restore();
    },
    bossPower(c,e,r,b){
      const pose=N.EnemyMotion.ritual(e);if(!pose)return;
      const t=pose.t,pulse=e.game.reducedMotion?0:Math.sin(t*Math.PI),action=pose.action;
      if(action==='salvo'||action==='lances'){
        for(let i=-1;i<=1;i++){const z=64+i*7;b.line([[20,5,z],[32,14+10*pulse,z+i*2]],action==='salvo'?'#ffd0a9':'#f2c7f1',2);b.gem(31,13,z,2.5,'#fff1d5');}
      }else if(action==='meteors'||action==='starfall'){
        for(let i=0;i<3;i++){const x=(i-1)*18,z=97+Math.sin(i+t*2)*7;b.gem(x,3,z,5,'#ffc291');b.line([[x-3,2,z+5],[x-8,0,z+16],[x-1,2,z+10]],'#e5947f',1);}
      }else if(action==='slash'){
        const v=r.p(-15,10,65);c.strokeStyle='#f8c8c4';c.lineWidth=3*r.scale;c.beginPath();c.arc(v.x,v.y,(16+pulse*12)*r.scale,-2.4+t*.6,-.2+t*.6);c.stroke();
      }else if(action==='soulring'){
        for(let i=0;i<8;i++){const a=i*TAU/8+(e.game.reducedMotion?0:t*1.6);b.gem(Math.cos(a)*31,-3,80+Math.sin(a)*18,2.4,'#efc9ff');}
      }else if(action==='crossfire'){
        for(const s of [-1,1]){b.ring(s*30,7,68+s*pulse*13,8,'#a7f0ed');b.gem(s*30,7,68+s*pulse*13,3,'#e2ffff');}
      }else if(action==='voidseal'){
        b.ring(0,16,77,13,'#d9b1ff');b.gem(0,17,77,5,'#f6d5ff');b.line([[-13,16,77],[0,17,83],[13,16,77],[0,17,71],[-13,16,77]],'#bb8be6',1);
      }else if(action==='riftstep'){
        for(const s of [-1,1]){b.line([[s*22,-5,91],[s*(28+pulse*8),-8,64],[s*18,-4,40]],'#bca7fb',2);b.gem(s*(28+pulse*8),-8,64,3,'#e3d5ff');}
      }else if(action==='shockwave'){
        for(let i=0;i<3;i++)b.ring(0,0,30-i*10,18+i*8,'#ecd3a7');
      }else if(action==='aegis'){
        for(const s of [-1,1])b.poly([[s*8,17,73],[s*23,16,67],[s*19,18,51],[s*7,19,55]],'#7895b233','#d4e6ff');
      }
    },
    projectile(c,shot,g,hostile=false){
      const id=hostile?'hostile':shot.source||'bolt',color=hostile?'#ffbd9b':colors[id]||'#e3bcec';
      c.save();c.translate(shot.x,shot.y);c.rotate(Math.atan2(shot.vy,shot.vx));c.fillStyle=color;c.strokeStyle=color;c.lineWidth=1.2;
      if(['rapid','lance','soulstorm'].includes(id)){c.beginPath();c.moveTo(12,0);c.lineTo(-7,-2.6);c.lineTo(-4,0);c.lineTo(-7,2.6);c.closePath();c.fill();}
      else if(id==='burst'||id==='hostile'){c.beginPath();c.moveTo(9,0);c.lineTo(-2,-4);c.lineTo(-7,0);c.lineTo(-2,4);c.closePath();c.fill();c.strokeStyle='#fff0d7';c.beginPath();c.moveTo(5,0);c.lineTo(-3,0);c.stroke();}
      else if(id==='cannon'){c.fillStyle='#6d4f4a';c.beginPath();c.arc(0,0,8,0,TAU);c.fill();c.beginPath();c.arc(0,0,6,0,TAU);c.stroke();c.fillStyle='#fff0c9';c.beginPath();c.arc(1,0,3,0,TAU);c.fill();}
      else{const count=id==='glacier'?6:4;c.beginPath();for(let i=0;i<=count;i++){const a=i*TAU/count;c[i?'lineTo':'moveTo'](Math.cos(a)*7,Math.sin(a)*(id==='glacier'?7:5));}c.closePath();c.fill();c.fillStyle='#fff5e5';c.beginPath();c.arc(1,0,2,0,TAU);c.fill();}
      if(g.quality!=='low'){c.globalAlpha=.4;c.beginPath();c.moveTo(-10,-2);c.lineTo(-18,0);c.lineTo(-10,2);c.stroke();}c.restore();
    }
  };
  function eLevel(e){return e.level||1;}
})();
