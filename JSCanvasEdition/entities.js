(() => {
  'use strict';
  const N=window.Nocturne;
  const DIRECTIONS=['E','SE','S','SW','W','NW','N','NE'];
  const COVENS=Object.freeze({
    ash:{name:'The Ashkeeper',icon:'ϟ',color:'#e1b58c',text:'110 vitality · 18 damage. A dependable arcane caster.',apply:p=>{p.maxHp=p.hp=110;p.damage=18;}},
    moon:{name:'The Moonweaver',icon:'☽',color:'#c7b5e0',text:'90 vitality · 14 damage. Starts with orbiting Moon Wisps.',apply:p=>{p.maxHp=p.hp=90;p.damage=14;p.weapons.orbit=1;p.pickupRadius=100;}},
    storm:{name:'The Stormcaller',icon:'ϟ',color:'#9ecbd4',text:'85 vitality · 14 damage. Starts with Chain Lightning.',apply:p=>{p.maxHp=p.hp=85;p.damage=14;p.weapons.lightning=1;p.attackInterval=.66;}}
  });
  N.drawWitch=(c,images,facing,frame,x,y,w=80,h=107)=>{
    const atlas=window.NOCTURNE_ATLAS,sheet=images['witch_atlas_'+facing];
    if(sheet){const index=frame>=0?atlas.clips.walk.start+frame:atlas.clips.idle.start;c.drawImage(sheet,index*atlas.width,0,atlas.width,atlas.height,x,y,w,h);}
    else c.drawImage(images['witch_'+facing],x,y,w,h);
  };
  class Player {
    constructor(game,coven='ash'){
      Object.assign(this,{game,x:0,y:0,radius:13,facing:'S',hp:100,maxHp:100,speed:195,damage:16,attackInterval:.56,projectileSpeed:510,projectileCount:1,critChance:.1,critMultiplier:1.85,pickupRadius:82,armor:0,regen:0,gold:0,kills:0,xp:0,xpNeeded:8,level:1,pendingLevels:0,invulnerable:0,walk:0,moving:false,dashCooldown:3.2,dashRemaining:0,dashTimer:0,dashX:0,dashY:1,pierce:0,lastX:0,lastY:1});
      this.upgrades=[];this.coven=COVENS[coven]?coven:'ash';
      this.weapons=Object.fromEntries(N.SPELL_IDS.map(id=>[id,id==='bolt'?1:0]));
      this.relics={cinder:false,conductor:false,permafrost:false,mirror:false,sunstone:false,soulchain:false,thornheart:false,voidglass:false,quicksilver:false,ironstar:false,bloodruby:false,iceheart:false};this.evolutions=new Set();
      this.animator=new N.SpriteAnimator();
      this.stepDistance=0;this.ghostClock=0;this.castTimer=0;
      this.healthEvents=[];this.healthVisible=0;this.healthTrail=100;this.regenPending=0;this.regenClock=0;
      COVENS[this.coven].apply(this);this.healthTrail=this.hp;this.progress=N.newProgression(this);
    }
    evolved(id){return (this.weapons[id]||0)>=4&&this.relics[N.WEAPONS[id]?.relic];}
    checkEvolutions(){
      for(const id of Object.keys(this.weapons))if(this.evolved(id)&&!this.evolutions.has(id)){
        this.evolutions.add(id);this.game.ui?.toast(`${N.WEAPONS[id].evolution} awakened`);this.game.unlock('evolution');
        this.game.combat.sound('evolve');this.game.combat.effect('rune',this.x,this.y-8,0,0,110,N.WEAPONS[id].color,.8);
      }
    }
    upgradeWeapon(id){if(!N.WEAPONS[id]||this.level<N.WEAPONS[id].unlock)return false;this.weapons[id]=(this.weapons[id]||0)+1;if(!this.progress.equipped.includes(id))this.progress.equipped.push(id);this.checkEvolutions();return true;}
    dash(){
      if(this.game.state!=='playing'||this.dashRemaining>0||this.dashTimer>0)return false;
      const v=this.game.input.vector(),len=Math.hypot(v.x,v.y);
      this.dashX=len>.05?v.x/len:this.lastX;this.dashY=len>.05?v.y/len:this.lastY;
      this.dashTimer=.2;this.dashRemaining=this.dashCooldown;this.invulnerable=Math.max(this.invulnerable,.28);
      if(this.progress.talents.veil)this.game.combat.veilBloom(this);
      this.ghostClock=0;this.animator.play('dash',{restart:true});
      this.game.stats.dashes++;this.game.combat.burst(this.x,this.y-10,10,COVENS[this.coven].color);this.game.combat.sound('dash');return true;
    }
    get walkFrame(){return this.moving&&!this.game.reducedMotion?Math.floor(this.walk/(Math.PI*2)*8)%8:-1;}
    cast(target=null){
      if(target&&!this.moving)this.facing=DIRECTIONS[(Math.round(Math.atan2(target.y-this.y,target.x-this.x)/(Math.PI/4))+8)%8];
      this.castTimer=.28;this.animator.play('cast',{restart:true});
    }
    update(dt){
      this.castTimer=Math.max(0,this.castTimer-dt);
      const {x,y}=this.game.input.vector(),speed=this.speed*(this.progress.demonTime>0?(this.progress.demonSpeed??1.45):1)*(this.progress.activeOath==='pilgrim'?1.08:1);this.moving=Math.hypot(x,y)>.05;
      if(this.moving){
        this.facing=DIRECTIONS[(Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8];
        const len=Math.hypot(x,y)||1;this.lastX=x/len;this.lastY=y/len;
      }
      if(this.dashTimer>0){
        this.ghostClock-=dt;if(this.ghostClock<=0){this.game.combat.ghost(this);this.ghostClock=.035;}
        this.x+=this.dashX*speed*3.4*dt;this.y+=this.dashY*speed*3.4*dt;this.dashTimer=Math.max(0,this.dashTimer-dt);
      }else{
        const distance=Math.hypot(x,y)*speed*dt;
        this.x+=x*speed*dt;this.y+=y*speed*dt;
        if(this.moving){
          this.walk=(this.walk+distance/88*Math.PI*2)%(Math.PI*2);this.stepDistance+=distance;
          if(this.stepDistance>=44){this.stepDistance%=44;this.game.combat.sound('step');this.game.combat.dust(this.x,this.y+3);}
        }else this.stepDistance=0;
      }
      this.animator.update(dt,this.moving,this.dashTimer>0,this.game.reducedMotion);
      // Match the locomotion clip to actual distance, rather than frame rate.
      if(this.animator.state==='walk')this.animator.time=this.walk/(Math.PI*2)*window.NOCTURNE_ATLAS.clips.walk.duration;
      this.dashRemaining=Math.max(0,this.dashRemaining-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);
      const restored=this.heal(this.regen*dt,false);this.regenPending+=restored;this.regenClock+=dt;
      if(this.regenClock>=.75){if(this.regenPending>0)N.healthEvent(this,this.regenPending);this.regenPending=0;this.regenClock=0;}
      N.updateVitality(this,dt);
    }
    heal(amount,feedback=true){
      if(!Number.isFinite(amount)||amount<=0||this.hp<=0)return 0;
      const actual=Math.max(0,Math.min(this.maxHp-this.hp,amount));this.hp+=actual;
      if(feedback&&actual>0)N.healthEvent(this,actual);return actual;
    }
    hurt(amount){
      if(this.invulnerable>0||this.game.state!=='playing')return;
      let damage=amount/(1+this.armor);
      let warded=0;const q=this.progress;
      if(q.aegisTime>0&&q.aegis>0){warded=Math.min(q.aegis,damage);q.aegis-=warded;damage-=warded;if(q.aegis===0)q.aegisTime=0;}
      const absorbed=Math.min(this.progress.shield,damage);this.progress.shield-=absorbed;damage-=absorbed;
      if(absorbed+warded>0)this.game.combat.effect('ring',this.x,this.y-10,0,0,38,'#d4dce5',.25);
      if(damage<=0){this.invulnerable=.4;this.game.combat.number(this.x,this.y-45,'BLOCK','#c7daee');this.game.combat.sound('lock');return;}
      const actual=Math.min(this.hp,damage);
      this.hp=Math.max(0,this.hp-damage);this.invulnerable=.85;
      N.healthEvent(this,-actual);
      this.game.stats.damageTaken+=actual;this.game.waveDamage+=actual;
      this.animator.play('hurt',{restart:true});
      this.game.hurtFlash=.25;
      this.game.shake=Math.max(this.game.shake,4);
      this.game.combat.burst(this.x,this.y-12,10,'#d6a99b');
      this.game.combat.sound('hurt');
      if(this.hp<=0)this.game.die();
    }
    draw(c){
      c.save();c.fillStyle='#080e1066';c.beginPath();c.ellipse(this.x,this.y+3,23,9,0,0,Math.PI*2);c.fill();
      c.strokeStyle=COVENS[this.coven].color+'77';c.lineWidth=1;c.beginPath();c.ellipse(this.x,this.y+2,23,11,0,0,Math.PI*2);c.stroke();
      if(this.castTimer>0){
        const t=1-this.castTimer/.28;c.save();c.globalCompositeOperation='lighter';c.strokeStyle=COVENS[this.coven].color+'77';c.lineWidth=1.2;
        c.beginPath();c.ellipse(this.x,this.y,26+8*t,12+4*t,0,0,Math.PI*2);c.stroke();
        for(let i=0;i<3;i++){const a=i*Math.PI*2/3+(this.game.reducedMotion?0:t*2);c.beginPath();c.arc(this.x+Math.cos(a)*30,this.y+Math.sin(a)*13,2,0,Math.PI*2);c.stroke();}c.restore();
      }
      if(this.invulnerable>0)c.globalAlpha=.86;
      const appearance=N.Appearance.player(this);
      // Rear cloth/equipment and front attachments share the model's facing rig.
      N.Appearance.playerBack(c,this,appearance);
      c.save();c.translate(this.x,this.y);
      this.animator.draw(c,this.game.images,this.facing,-40,-99,80,107,appearance.demon?'demon':'witch',null,this.game.quality,this);
      c.restore();N.Appearance.playerFront(c,this,appearance);c.restore();
    }
  }
  const TYPES=Object.freeze({
    slime:{hp:25,speed:52,damage:11,radius:17,xp:1,gold:1,scale:.77},
    skeleton:{hp:19,speed:85,damage:9,radius:13,xp:1,gold:1,scale:.76},
    gargoyle:{hp:85,speed:46,damage:22,radius:23,xp:3,gold:3,scale:1.05},
    hound:{hp:30,speed:95,damage:14,radius:15,xp:2,gold:2,scale:.84},
    cultist:{hp:42,speed:53,damage:13,radius:15,xp:2,gold:3,scale:.85},
    wraith:{hp:48,speed:76,damage:15,radius:16,xp:2,gold:2,scale:.91},
    reaper:{hp:105,speed:62,damage:23,radius:20,xp:4,gold:4,scale:1.06},
    overlord:{hp:1600,speed:58,damage:32,radius:45,xp:45,gold:75,scale:2.05},
    warden:{hp:760,speed:70,damage:25,radius:38,xp:24,gold:45,scale:1.8}
  });
  class Enemy {
    constructor(game,type,x,y,id,elite=false,encounter=null){
      const t=TYPES[type],wave=Math.max(0,game.wave-1);
      const level=encounter?.level||1,tier=encounter?.tier||'regular',trait=encounter?.trait||'none';
      Object.assign(this,{game,type,id,x,y,maxHp:t.hp*(1+.055*(level-1)),speed:t.speed*(1+.035*Math.sqrt(level-1)),damage:t.damage*(1+.027*(level-1)),radius:t.radius,scale:t.scale,xp:t.xp,gold:t.gold,alive:true,flash:0,knockX:0,knockY:0,phase:N.fxRand(0,Math.PI*2),gait:0,hitSquash:0,castTimer:0,elite,boss:type==='warden'||type==='overlord',slow:0,frozen:0,burn:0,burnTick:0,burnDamage:0,attackTimer:N.rand(1.5,3),windup:0,charge:0,chargeX:0,chargeY:0,attackCount:0,spawnDelay:0,level,tier,trait,exposed:0,lastHit:0,burnSource:'orbit',facing:'S',terrified:false,summonTimer:5});
      if(elite){this.maxHp*=2.4;this.speed*=1.12;this.damage*=1.25;this.scale*=1.15;this.xp*=3;this.gold*=3;}
      if(tier==='fodder')this.maxHp*=.8;
      if(this.boss)this.maxHp=t.hp*(1+.12*wave)*(1+.035*(level-1));
      if(trait==='swift'){this.speed*=1.18;this.maxHp*=.85;}if(trait==='armored')this.speed*=.9;
      if(tier==='veteran'){this.xp+=1;this.gold+=1;}
      if(encounter){this.xp=Math.max(1,Math.round(this.xp*(1+.035*(level-1))));this.gold=Math.max(1,Math.round(this.gold*(1+.025*(level-1))));}
      this.hp=this.maxHp;
    }
    update(dt){
      if(this.spawnDelay>0){this.spawnDelay=Math.max(0,this.spawnDelay-dt);return;}
      this.lastHit=Math.max(0,this.lastHit-dt);this.exposed=Math.max(0,this.exposed-dt);
      if(this.trait==='mending'&&this.lastHit<=0)this.hp=Math.min(this.maxHp,this.hp+this.maxHp*.012*dt);
      this.flash=Math.max(0,this.flash-dt);this.hitSquash=Math.max(0,this.hitSquash-dt);this.castTimer=Math.max(0,this.castTimer-dt);
      if(this.frozen<=0)this.phase+=dt*5;
      this.slow=Math.max(0,this.slow-dt);this.frozen=Math.max(0,this.frozen-dt);
      if(this.burn>0){
        this.burn-=dt;this.burnTick-=dt;
        if(this.burnTick<=0){this.burnTick=.4;this.hit(this.burnDamage,false,0,0,this.burnSource);if(!this.alive)return;}
      }
      const p=this.game.player,dx=p.x-this.x,dy=p.y-this.y,len=Math.hypot(dx,dy)||1;
      this.terrified=p.progress.demonTime>0&&!this.boss&&len<360;
      if(this.terrified){this.windup=this.charge=0;this.attackTimer=Math.max(this.attackTimer,.75);}
      let movement=this.slow>0?.48:1;if(this.frozen>0)movement=0;
      if((this.type==='cultist'||this.type==='wraith')&&this.frozen<=0&&!this.terrified){
        if(len<210)movement*=-.5;else if(len<310)movement=0;
        this.attackTimer-=dt;
        if(this.attackTimer<.65&&len<600)this.windup=Math.max(this.windup,.01);
        if(this.attackTimer<=0&&len<600){this.game.combat.enemyShot(this.x,this.y-24,p.x,p.y-12,175,this.damage,this,'hostile');this.attackTimer=2.7;this.windup=0;}
      }
      if(this.type==='hound'&&this.frozen<=0&&!this.terrified){
        this.attackTimer-=dt;
        if(this.windup>0){this.windup-=dt;movement=0;if(this.windup<=0){this.charge=.44;this.game.combat.dust(this.x,this.y);}}
        else if(this.charge>0){this.x+=this.chargeX*(370+this.level*3)*dt;this.y+=this.chargeY*(370+this.level*3)*dt;this.charge-=dt;movement=0;}
        else if(this.attackTimer<=0&&len<330){this.windup=.72;this.chargeX=dx/len;this.chargeY=dy/len;this.attackTimer=3.8;}
      }
      if(this.type==='reaper'&&!this.terrified&&this.frozen<=0){this.attackTimer-=dt;if(this.attackTimer<=0&&len<220){this.game.combat.hazard(p.x,p.y,66,.9,this.damage,.35);this.castTimer=.3;this.attackTimer=3.2;}}
      if(this.boss&&this.frozen<=0){
        if(!this.guardian){N.Warfare.tactics(this);this.tactics.releaseTime=Math.max(0,(this.tactics.releaseTime||0)-dt);N.Warfare.dodge(this.game,this,dt);}
        if(this.guardian)N.FinalGuardian.update(this.game,this,dt);else{
        if(this.type==='overlord'){this.summonTimer-=dt;if(this.summonTimer<=0){this.summonTimer=6;this.game.summonMinions(this);this.castTimer=.4;}}
        this.attackTimer-=dt;
        if(this.attackTimer<=0){
          const angry=this.hp<this.maxHp*.45;
          if(this.attackCount++%2===0){
            this.game.combat.hazard(p.x,p.y,90,1.1,this.damage,1.4);
            if(angry)this.game.combat.hazard(p.x+N.rand(-180,180),p.y+N.rand(-140,140),85,1.4,this.damage,1.1);
          }else{
            const angle=Math.atan2(dy,dx),count=angry?9:7;
            for(let i=0;i<count;i++)this.game.combat.enemyShot(this.x,this.y-25,this.x+Math.cos(angle+(i-(count-1)/2)*.19)*300,this.y-25+Math.sin(angle+(i-(count-1)/2)*.19)*300,angry?190:150,this.damage*.7,this,'salvo');
          }
          this.attackTimer=angry?1.7:2.6;this.game.shake=Math.max(this.game.shake,2);
          this.tactics.lastAction=this.attackCount%2?'meteors':'salvo';this.tactics.releaseTime=.55;
          this.castTimer=.3;
        }
        }
        if(len<190)movement*=.3;
        if(this.guardian?.windup>0||(this.guardian||this.tactics)?.dodgeTime>0||(this.guardian||this.tactics)?.dodgeWindup>0){movement=0;this.knockX=this.knockY=0;}
      }
      if(this.terrified)movement=-Math.abs(movement)*1.15;else if(this.boss&&p.progress.demonTime>0&&len<360)movement*=.9;
      const moveAngle=Math.atan2(dy*(this.terrified?-1:1),dx*(this.terrified?-1:1));this.facing=DIRECTIONS[(Math.round(moveAngle/(Math.PI/4))+8)%8];
      const ox=this.x,oy=this.y;
      const orbit=this.boss&&len<420&&len>130&&!(this.guardian?.windup>0)?Math.sin(this.phase*.27)*.42:0;
      this.x+=((dx/len-dy/len*orbit)*this.speed*movement+this.knockX)*dt;this.y+=((dy/len+dx/len*orbit)*this.speed*movement+this.knockY)*dt;
      this.moving=Math.hypot(this.x-ox,this.y-oy)>.01;
      if(this.frozen<=0)this.gait=(this.gait+Math.hypot(this.x-ox,this.y-oy)/76*Math.PI*2)%(Math.PI*2);
      this.knockX*=Math.exp(-10*dt);this.knockY*=Math.exp(-10*dt);
      if(!this.terrified&&N.segmentDistance2(ox,oy,this.x,this.y,p.x,p.y)<(this.radius+p.radius)**2){if(this.castTimer<=0)this.castTimer=.3;p.hurt(this.guardian?N.FinalGuardian.damage(this,1,.42):this.damage);}
    }
    hit(damage,crit=false,vx=0,vy=0,source='bolt'){
      if(!this.alive||this.spawnDelay>0)return;
      damage*=N.outgoingMultiplier(this.game.player,this,source);
      if(this.trait==='armored'&&!crit&&source!=='lance')damage*=.82;
      damage=N.FinalGuardian.absorb(this.game,this,damage);if(damage<=0)return;
      this.lastHit=2;
      const dealt=Math.min(this.hp,damage);this.game.stats.damage+=dealt;
      this.game.stats.weapons[source]=(this.game.stats.weapons[source]||0)+dealt;
      this.hp-=damage;this.flash=.1;this.hitSquash=.12;N.HostileVisuals.noteHit(this,crit,vx,vy);this.knockX+=vx*(this.boss?12:85);this.knockY+=vy*(this.boss?12:85);
      if(this.boss){this.knockX=N.clamp(this.knockX,-45,45);this.knockY=N.clamp(this.knockY,-45,45);}
      const g=this.game;
      g.combat.burst(this.x,this.y-13,crit?13:7,'#fff9ee');
      g.combat.number(this.x,this.y-37,String(Math.round(damage)),crit?'#e5c88a':'#e4e0d5',crit);
      g.combat.sound(crit?'crit':'hit',this.x);
      if(crit)g.combat.effect('impact',this.x,this.y-14,0,0,26,'#f1d5a1',.2);
      if(crit){g.shake=Math.max(g.shake,3);if(g.impactCooldown<=0){g.hitStop=.025;g.impactCooldown=.16;}}
      if(this.hp>0){if(source==='bolt'&&crit&&g.player.progress.talents.kindling)N.applyBurn(this,2,g.player.damage*(.04+.025*g.player.progress.talents.kindling),'bolt');return;}
      this.alive=false;g.player.kills++;g.waveKills++;
      const talents=g.player.progress.talents;
      if(talents.scavenger&&g.player.kills%10===0)g.earnGold(talents.scavenger);
      if(talents.bloodledger&&g.player.kills%20===0)g.player.heal(2*talents.bloodledger);
      if(this.trait==='volatile')g.combat.hazard(this.x,this.y,52,.9,this.damage*.7,.3);
      g.combat.remains(this);g.combat.sound(this.boss?'victory':'death',this.x);
      g.loot.push(new Loot(g,'xp',this.x+N.rand(-8,8),this.y+N.rand(-8,8),this.xp));
      g.loot.push(new Loot(g,'gold',this.x+N.rand(-14,14),this.y+N.rand(-14,14),this.gold));
      if(this.type==='gargoyle'){g.shake=Math.max(g.shake,5);g.combat.burst(this.x,this.y-10,18,'#bdb0cc');}
      if(this.elite){g.stats.elites++;g.loot.push(new Loot(g,'heal',this.x,this.y,12));g.unlock('elite');}
      if(this.boss||this.elite||Math.random()<.016)g.loot.push(new Loot(g,'jewel',this.x,this.y,this.boss?100:this.elite?50:34));
      if(this.boss&&!this.summonedBy){
        if(g.sanctum?.bossId===this.id)g.sanctum.phase='cleared';
        g.bossDefeated=true;g.stats.bosses++;g.save.data.profile.bosses++;g.unlock('warden');
        g.loot.push(new Loot(g,'heal',this.x,this.y,30));g.ui.banner('THE SEAL IS BROKEN',this.type==='overlord'?'OVERLORD BANISHED':'WARDEN BANISHED');
        g.shake=Math.max(g.shake,8);g.combat.burst(this.x,this.y-30,40,'#e7c990');
      }else if(Math.random()<.018)g.loot.push(new Loot(g,'heal',this.x,this.y,8));
    }
    draw(c){
      if(this.spawnDelay>0){
        c.save();c.strokeStyle=this.boss?'#e8b891aa':'#c3b2e699';c.fillStyle='#b4a3e612';c.lineWidth=2;
        const r=this.radius+16,t=N.clamp(1-this.spawnDelay/1.3,.05,1);c.beginPath();c.ellipse(this.x,this.y,r,r*.55,0,0,Math.PI*2);c.fill();c.stroke();
        c.beginPath();c.ellipse(this.x,this.y,r*t,r*.55*t,0,0,Math.PI*2);c.stroke();c.restore();return;
      }
      const appearance=N.Appearance.enemy(this);N.Appearance.enemyBack(c,this,appearance);
      c.save();N.HostileVisuals.shadow(c,this);
      if(this.elite||this.boss){c.strokeStyle=this.boss?'#cda57888':'#b8a17488';c.lineWidth=1.5;c.beginPath();c.ellipse(this.x,this.y+2,this.radius+5,this.radius*.5,0,0,Math.PI*2);c.stroke();}
      const s=this.scale,bob=this.game.reducedMotion?0:Math.sin(this.phase)*(this.type==='wraith'?.65:this.type==='overlord'?.3:0);
      c.save();const pose=N.EnemyMotion.pose(this);c.translate(this.x,this.y-pose.lift);c.rotate(pose.lean);c.scale(1+pose.stretch,1-pose.stretch);
      if(this.flash>0&&!this.game.reducedMotion&&this.game.quality!=='low')c.filter='brightness(1.15)';
      if(!window.NOCTURNE_ENEMY_ATLAS?.rows&&this.type==='hound'&&(this.windup>0||this.charge>0?this.chargeX<0:this.game.player.x<this.x))c.scale(-1,1);
      N.drawEnemy(c,this.game.images,this,-40*s,-99*s+bob,80*s,107*s);
      N.HostileVisuals.local(c,this);
      c.restore();
      N.Appearance.enemyFront(c,this,appearance);N.EnemyMotion.accents(c,this);N.FinalGuardian.draw(this.game,this,c);N.Warfare.drawDodge(c,this);
      if(this.castTimer>0){c.globalCompositeOperation='lighter';c.strokeStyle='#d3b3d288';c.beginPath();c.arc(this.x,this.y-35*s,12+this.castTimer*30,0,Math.PI*2);c.stroke();c.globalCompositeOperation='source-over';}
      if(this.hp<this.maxHp&&!this.boss&&(this.game.enemies.length<=100||N.dist2(this,this.game.player)<240**2)){
        c.fillStyle='#101617';c.fillRect(this.x-15,this.y-75*s,30,3);c.fillStyle=this.elite?'#d7b579':'#b8a293';c.fillRect(this.x-15,this.y-75*s,30*Math.max(0,this.hp/this.maxHp),3);
      }
      if(this.boss||this.elite||this.tier==='veteran'||this.game.enemies.length<80&&(this.hp<this.maxHp||N.dist2(this,this.game.player)<430**2)){
        const trait=N.ENEMY_TRAITS[this.trait];c.fillStyle=this.tier==='veteran'?'#ecd09e':this.tier==='fodder'?'#9ea99f':trait.color;c.textAlign='center';c.font='9px Arial';c.fillText(`L${N.fmt(this.level)}${trait.icon?' '+trait.icon:''}`,this.x,this.y-82*s);
      }
      if(this.terrified){c.fillStyle='#e8b0d6';c.font='bold 13px Georgia';c.textAlign='center';c.fillText('FEAR',this.x,this.y-105*s);}
      if(this.slow>0){c.strokeStyle='#b4deeb99';c.beginPath();c.arc(this.x,this.y-20,21,0,Math.PI*2);c.stroke();}
      if(this.burn>0){c.fillStyle='#e7a377';c.beginPath();c.arc(this.x+9,this.y-38,3,0,Math.PI*2);c.fill();}
      if(this.windup>0){
        if(this.type==='hound'){
          c.strokeStyle='#e3ae8c99';c.lineWidth=2;c.setLineDash([7,7]);c.beginPath();c.moveTo(this.x,this.y);c.lineTo(this.x+this.chargeX*185,this.y+this.chargeY*185);c.stroke();c.setLineDash([]);
        }
        c.fillStyle='#eec99f';c.font='bold 20px Georgia';c.textAlign='center';c.fillText('!',this.x,this.y-88*s);
      }
      c.restore();
    }
  }
  class Loot {
    constructor(game,type,x,y,value){Object.assign(this,{game,type,x,y,value,alive:true,age:0,magnet:false,phase:N.fxRand(0,6.28)});}
    collect(){
      if(!this.alive)return;this.alive=false;
      if(this.type==='xp')this.game.addXP(this.value);
      else if(this.type==='gold')this.game.earnGold(this.value);
      else if(this.type==='jewel')this.game.abilities.jewel(this.value);else this.game.player.heal(this.value);
      if(this.game.visible(this.x,this.y,30)){
        this.game.combat.sound(this.type==='xp'?'xp':this.type==='gold'?'gold':this.type==='jewel'?'jewel':'heal',this.x);
        this.game.combat.effect('pickup',this.x,this.y-5,this.game.player.x,this.game.player.y-20,this.type==='heal'?24:12,this.type==='xp'?'#d4bceb':this.type==='gold'?'#d4bc8b':this.type==='jewel'?'#f1a5d1':'#d9aaa0',.25);
      }
    }
    update(dt){
      this.age+=dt;const p=this.game.player,dx=p.x-this.x,dy=p.y-this.y,d2=dx*dx+dy*dy;
      if(d2<p.pickupRadius**2)this.magnet=true;
      if(this.magnet){const d=Math.sqrt(d2)||1,speed=Math.min(d/dt,310+this.age*70);this.x+=dx/d*speed*dt;this.y+=dy/d*speed*dt;}
      if(d2<22**2||this.age>75)this.collect();
    }
    draw(c){
      const color=this.type==='xp'?'#bfb2da':this.type==='gold'?'#c9ad75':this.type==='jewel'?'#f1a5d1':'#ba9f92';
      const bob=this.game.reducedMotion?0:Math.sin(this.game.time*3+this.phase)*1.8;
      c.save();c.translate(this.x,this.y-4+bob);c.globalCompositeOperation='lighter';
      c.fillStyle=color+'22';c.beginPath();c.arc(0,0,10,0,Math.PI*2);c.fill();c.fillStyle=color;
      if(this.type==='jewel'){c.rotate(this.game.reducedMotion?0:this.age*.8);c.strokeStyle='#ffdfef';c.lineWidth=1.5;c.beginPath();c.moveTo(0,-10);c.lineTo(7,-3);c.lineTo(5,6);c.lineTo(0,11);c.lineTo(-5,6);c.lineTo(-7,-3);c.closePath();c.fill();c.stroke();}
      else if(this.type==='heal'){c.fillRect(-2,-6,4,12);c.fillRect(-6,-2,12,4);}
      else{c.beginPath();c.moveTo(0,-5);c.lineTo(4,0);c.lineTo(0,5);c.lineTo(-4,0);c.closePath();c.fill();c.fillStyle='#f6efd9';c.fillRect(-1,-3,1,3);}
      c.restore();
    }
  }
  N.Player=Player;N.Enemy=Enemy;N.Loot=Loot;N.ENEMY_TYPES=TYPES;N.COVENS=COVENS;
})();
