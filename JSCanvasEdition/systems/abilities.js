/* Directed, charged specials and the temporary Demon Witch form. */
(() => {
  'use strict';
  const N=window.Nocturne;
  N.SPECIALS=Object.freeze({
    slash:{name:'Ult Slash',icon:'☽',unlock:1,cooldown:8,color:'#f3dcc4',text:'Sweep a directed arc. Hold right mouse up to 1.2s for more reach, angle and damage.'},
    frostfall:{name:'Winter Dominion',icon:'❅',unlock:8,cooldown:12,color:'#bce7ef',text:'Aim a frost detonation up to 420 units away. Charge enlarges the blast and freeze.'},
    soulstorm:{name:'Soulstorm',icon:'✹',unlock:16,cooldown:14,color:'#ebafce',text:'Release piercing soul lances in every direction. Charge increases their count and power.'}
  });
  N.mergeProgression=p=>{
    const defaults=N.newProgression(p),old=p.progress||{};
    p.progress={...defaults,...old,talents:{...defaults.talents,...old.talents},mastery:{...defaults.mastery,...old.mastery},arsenal:{...defaults.arsenal,...old.arsenal}};
    p.progress.equipped=N.SPELL_IDS.filter(id=>p.weapons[id]>0);
    if(p.level<N.SPECIALS[p.progress.special].unlock)p.progress.special='slash';
  };
  class Abilities {
    constructor(game){this.game=game;this.charging=false;this.charge=0;}
    aim(){const g=this.game,p=g.player,a=g.input.aim;return a?.active?{x:g.camera.x+(a.x-g.width/2)/g.zoom,y:g.camera.y+(a.y-g.height/2)/g.zoom}:{x:p.x+p.lastX*240,y:p.y+p.lastY*240};}
    begin(){if(this.game.state!=='playing'||this.game.player.progress.specialRemaining>0||this.charging)return false;this.charging=true;this.charge=0;return true;}
    cancel(){this.charging=false;this.charge=0;}
    cycle(){const p=this.game.player;if(this.game.state!=='playing')return;const ids=Object.keys(N.SPECIALS).filter(id=>p.level>=N.SPECIALS[id].unlock);p.progress.special=ids[(ids.indexOf(p.progress.special)+1)%ids.length];this.cancel();this.game.ui.toast(N.SPECIALS[p.progress.special].name);}
    select(id){const p=this.game.player;if(!N.SPECIALS[id]||p.level<N.SPECIALS[id].unlock)return false;p.progress.special=id;this.cancel();return true;}
    release(){
      const g=this.game,p=g.player,q=p.progress;if(!this.charging)return false;
      const charge=N.clamp(this.charge/1.2,0,1);this.cancel();if(g.state!=='playing'||q.specialRemaining>0)return false;
      const id=q.special,rank=q.arsenal[id],target=this.aim(),angle=Math.atan2(target.y-p.y,target.x-p.x),weight=1+charge*1.5,reach=170+rank*10+charge*110;
      q.specialRemaining=N.SPECIALS[id].cooldown/(1+.06*(rank-1));p.cast(target);g.shake=Math.max(g.shake,3+charge*3);
      if(id==='slash'){
        const sweep=Math.PI*(.65+charge*.55);
        g.combat.effect('slash',p.x,p.y,angle,sweep,reach,'#f6d4cf',.38);
        for(const e of g.enemies){if(!e.alive||e.spawnDelay>0||N.dist2(e,p)>(reach+e.radius)**2)continue;const a=Math.atan2(e.y-p.y,e.x-p.x),delta=Math.atan2(Math.sin(a-angle),Math.cos(a-angle));if(Math.abs(delta)<=sweep/2+Math.asin(Math.min(1,e.radius/(Math.hypot(e.x-p.x,e.y-p.y)||1))))g.combat.spellHit(e,(3.6+.4*rank)*weight,'slash');}
      }else if(id==='frostfall'){
        const d=Math.hypot(target.x-p.x,target.y-p.y)||1,range=Math.min(d,420),x=p.x+Math.cos(angle)*range,y=p.y+Math.sin(angle)*range,r=110+rank*8+charge*70;
        g.combat.effect('ring',x,y,0,0,r,'#bce7ef',.65);g.combat.burst(x,y,28,'#d2f1ff','frost');
        for(const e of g.enemies)if(e.alive&&e.spawnDelay<=0&&(e.x-x)**2+(e.y-y)**2<(r+e.radius)**2){g.combat.spellHit(e,(2.2+.3*rank)*weight,'frostfall');e.slow=3;e.frozen=e.boss?.15:1+charge;}
      }else{
        g.combat.launchVolley({angle,count:12+rank*2+Math.floor(charge*8),span:Math.PI*2,damage:(1.3+.2*rank)*weight,speed:p.projectileSpeed*.85,range:510+rank*12,pierce:2+rank,source:'soulstorm',color:'#e6afd3',closed:true});
        g.combat.effect('ring',p.x,p.y,0,0,150,'#e6afd3',.5);
      }
      g.stats.specials=(g.stats.specials||0)+1;g.combat.sound(id);return true;
    }
    shield(){
      const g=this.game,p=g.player,q=p.progress;
      if(g.state!=='playing'||q.aegisRemaining>0||q.aegisTime>0)return false;
      q.aegis=q.aegisMax=p.maxHp*.75+p.level*2;q.aegisTime=2.5;q.aegisRemaining=8;
      g.stats.shields=(g.stats.shields||0)+1;g.combat.effect('ring',p.x,p.y-20,0,0,58,'#a5e1ff',.35);g.combat.sound('lock');return true;
    }
    jewel(value=34){
      if(!Number.isFinite(value)||value<=0)return;
      const q=this.game.player.progress;q.essence=Math.min(Number.MAX_SAFE_INTEGER,q.essence+value);
    }
    preview(){
      const charges=Math.floor(this.game.player.progress.essence/100),bonus=charges>0?Math.log2(charges):0;
      return {charges,cost:charges*100,duration:12+8*Math.max(0,charges-1),power:1.8+.3*bonus,speed:1.45+.1*bonus};
    }
    transform(){
      const g=this.game,p=g.player,q=p.progress,boost=this.preview();
      if(g.state!=='playing'||q.demonTime>0||boost.charges<1)return false;
      q.essence-=boost.cost;q.demonTime=q.demonDuration=boost.duration;q.demonPower=boost.power;q.demonSpeed=boost.speed;
      g.stats.transformations=(g.stats.transformations||0)+1;
      g.ui.banner('DEMON WITCH',boost.charges+' ESSENCE CHARGE'+(boost.charges===1?'':'S')+' · '+N.fmt(boost.duration)+' SECONDS');
      g.combat.effect('ring',p.x,p.y,0,0,360,'#e9a0c9',.8);g.combat.sound('transform');return true;
    }
    update(dt){
      const q=this.game.player.progress;q.specialRemaining=Math.max(0,q.specialRemaining-dt);
      if(this.charging)this.charge=Math.min(1.2,this.charge+dt);
      q.demonTime=Math.max(0,q.demonTime-dt);
      q.aegisRemaining=Math.max(0,q.aegisRemaining-dt);q.aegisTime=Math.max(0,q.aegisTime-dt);if(q.aegisTime===0)q.aegis=0;
    }
    draw(c){const g=this.game,p=g.player,q=p.progress;if(g.state!=='playing'&&g.state!=='paused')return;
      if(q.aegisTime>0&&q.aegis>0){c.save();c.strokeStyle='#acddff';c.fillStyle='#8ed2ff14';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y-40,42,67,0,0,Math.PI*2);c.fill();c.stroke();c.restore();}
      if(q.demonTime>0){c.save();c.strokeStyle='#e5a6ce66';c.lineWidth=1.5;c.setLineDash([6,12]);c.beginPath();c.ellipse(p.x,p.y,360,280,0,0,Math.PI*2);c.stroke();c.restore();}
      if(!this.charging)return;const a=this.aim(),angle=Math.atan2(a.y-p.y,a.x-p.x),t=this.charge/1.2,id=q.special,r=170+q.arsenal[id]*10+t*110;
      c.save();c.strokeStyle=N.SPECIALS[id].color+'aa';c.fillStyle=N.SPECIALS[id].color+'12';c.lineWidth=2;
      c.beginPath();if(id==='slash'){c.moveTo(p.x,p.y);c.arc(p.x,p.y,r,angle-Math.PI*(.65+t*.55)/2,angle+Math.PI*(.65+t*.55)/2);c.closePath();}
      else if(id==='frostfall'){const d=Math.min(420,Math.hypot(a.x-p.x,a.y-p.y));c.arc(p.x+Math.cos(angle)*d,p.y+Math.sin(angle)*d,110+q.arsenal[id]*8+t*70,0,Math.PI*2);}
      else c.arc(p.x,p.y,75+t*30,0,Math.PI*2);c.fill();c.stroke();c.restore();
    }
  }
  N.Abilities=Abilities;
})();
