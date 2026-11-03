/*
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade
This file is part of Nocturne. See the distribution's LICENSE and NOTICE files.
*/
/* Dedicated player feedback cannot be displaced by enemy damage-number pools. */
(() => {
  'use strict';
  const N=window.Nocturne;
  N.healthEvent=(p,amount)=>{
    if(!amount)return;
    const kind=amount>0?'heal':'hurt',last=p.healthEvents.at(-1);
    if(last?.kind===kind&&last.life>.95){last.amount+=Math.abs(amount);last.life=1.35;}
    else{if(p.healthEvents.length>=4)p.healthEvents.shift();p.healthEvents.push({kind,amount:Math.abs(amount),life:1.35});}
    p.healthVisible=2.5;
  };
  N.updateVitality=(p,dt)=>{
    p.healthVisible=Math.max(0,p.healthVisible-dt);
    p.healthTrail+=(p.hp-p.healthTrail)*(1-Math.exp(-4*dt));
    for(const e of p.healthEvents)e.life-=dt;
    p.healthEvents=p.healthEvents.filter(e=>e.life>0);
  };
  N.drawVitality=(p,c)=>{
    const low=p.hp/p.maxHp<=.3;
    if(p.healthVisible<=0&&!low)return;
    c.save();c.translate(p.x,p.y-116);c.textAlign='center';
    c.fillStyle='#07141dee';c.fillRect(-34,-5,68,8);
    c.fillStyle='#ecc2ae';c.fillRect(-32,-3,64*N.clamp(p.healthTrail/p.maxHp,0,1),4);
    c.fillStyle=low?'#ff5265':'#a8edc8';c.fillRect(-32,-3,64*N.clamp(p.hp/p.maxHp,0,1),4);
    c.font='bold 10px Arial';c.lineWidth=3;c.strokeStyle='#081015';
    if(low){c.fillStyle='#ff9a9f';c.strokeText('LOW VITALITY',0,-12);c.fillText('LOW VITALITY',0,-12);}
    for(let i=0;i<p.healthEvents.length;i++){
      const e=p.healthEvents[i],text=(e.kind==='heal'?'✚ +':'−')+N.fmt(Number(e.amount.toFixed(1))),y=-32-i*20;
      c.globalAlpha=Math.min(1,e.life/.25);c.font='bold 16px Arial';c.fillStyle=e.kind==='heal'?'#9cffc5':'#ff8894';
      c.strokeText(text,0,y);c.fillText(text,0,y);
    }
    c.restore();
  };
  N.drawLowHealth=(g,c)=>{
    if(!['playing','paused','levelup'].includes(g.state))return;
    const ratio=g.player.hp/g.player.maxHp,severity=N.clamp((.3-ratio)/.3,0,1);if(severity<=0)return;
    // A steady cue remains readable in low quality and reduced-motion modes.
    const r=Math.hypot(g.width,g.height)/2,gradient=c.createRadialGradient(g.width/2,g.height/2,r*.25,g.width/2,g.height/2,r);
    gradient.addColorStop(0,'rgba(160,0,22,0)');gradient.addColorStop(.65,`rgba(170,0,22,${.10+severity*.18})`);gradient.addColorStop(1,`rgba(215,0,30,${.25+severity*.5})`);
    c.save();c.fillStyle=gradient;c.fillRect(0,0,g.width,g.height);c.restore();
  };
})();
