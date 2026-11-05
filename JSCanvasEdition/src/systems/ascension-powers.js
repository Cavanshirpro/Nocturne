/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
(() => {
  'use strict';const N=window.Nocturne;
  N.AscensionPower={
    profile(p){return N.Ascension.tier(p).power;},
    order(p){return N.Ascension.tier(p).order;},
    outgoing(p,e,source){
      const order=this.order(p);let value=this.profile(p).damage;
      if(order>=4&&(e.slow>0||e.frozen>0||e.exposed>0))value*=1.2;
      if(order>=5&&N.WEAPONS[source]&&(p.evolved(source)||(p.progress.mastery[source]||0)>0))value*=1.25;
      if(order>=10&&(e.boss||e.elite))value*=1.2;
      if(order>=13&&N.SPECIALS[source])value*=1.25;
      return value;
    },
    combat(g){return g.state==='playing'&&!N.WaveCycle.preparing(g)&&!g.player.ascension.pendingTrial;},
    pulse(g,radius,weight,{expose=0,slow=0,freeze=0,ordinaryOnly=false}={}){
      const p=g.player;
      // One event on existing actions, no new projectiles, timers or area pools.
      g.combat.effect('ring',p.x,p.y,0,0,radius,N.Ascension.tier(p).palette.primary,.35);
      for(const e of g.enemies){
        if(!e.alive||e.spawnDelay>0||ordinaryOnly&&e.boss||N.dist2(p,e)>(radius+e.radius)**2)continue;
        if(weight>0)e.hit(p.damage*weight,false,0,0,'ascension');
        if(!e.alive)continue;
        e.exposed=Math.max(e.exposed,expose);e.slow=Math.max(e.slow,slow);
        if(!e.boss)e.frozen=Math.max(e.frozen,freeze);
      }
    },
    dash(g){
      const p=g.player,order=this.order(p);if(!this.combat(g)||order<2)return;
      this.pulse(g,order>=13?180:90,1+order*.08,{expose:order>=6?2:0,slow:order>=8?2:0,freeze:order>=8?.25:0});
      if(order>=7)p.progress.specialRemaining=Math.max(0,p.progress.specialRemaining-2);
    },
    ritual(g){
      if(!this.combat(g))return;const order=this.order(g.player);
      if(order>=15)this.pulse(g,260,2,{expose:4,slow:2});
      else if(order>=12)this.pulse(g,220,0,{slow:2,ordinaryOnly:true});
    },
    shield(p){if(this.order(p)>=14){p.progress.silenceTime=0;p.progress.silenceGrace=Math.max(p.progress.silenceGrace,2);}},
    defeated(g,e){
      if(!this.combat(g)||this.order(g.player)<11||!(e.elite||e.boss&&!e.summonedBy))return;
      g.player.heal(g.player.maxHp*.03);g.player.progress.aegisRemaining=Math.max(0,g.player.progress.aegisRemaining-2);
    }
  };
})();
