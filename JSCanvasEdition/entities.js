(() => {
  'use strict';
  const N = window.Nocturne;
  const DIRECTIONS = ['E','SE','S','SW','W','NW','N','NE'];

  class Player {
    constructor(game) {
      this.game=game;this.x=0;this.y=0;this.radius=13;this.facing='S';
      this.hp=100;this.maxHp=100;this.speed=195;this.damage=16;
      this.attackInterval=.56;this.projectileSpeed=510;this.projectileCount=1;
      this.critChance=.1;this.critMultiplier=1.85;this.pickupRadius=82;
      this.armor=0;this.regen=0;this.gold=0;this.kills=0;
      this.xp=0;this.xpNeeded=8;this.level=1;this.pendingLevels=0;
      this.invulnerable=0;this.walk=0;this.moving=false;this.upgrades=[];
    }
    update(dt) {
      const {x,y}=this.game.input.vector();
      this.moving=Math.hypot(x,y)>.05;
      if(this.moving){
        this.facing=DIRECTIONS[(Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8];
        this.x+=x*this.speed*dt;this.y+=y*this.speed*dt;this.walk+=dt*11;
      }
      this.invulnerable=Math.max(0,this.invulnerable-dt);
      this.hp=Math.min(this.maxHp,this.hp+this.regen*dt);
    }
    hurt(amount) {
      if(this.invulnerable>0 || this.game.state!=='playing')return;
      const damage=Math.max(1,amount*(1-this.armor));
      this.hp=Math.max(0,this.hp-damage);this.invulnerable=.85;
      this.game.shake=Math.max(this.game.shake,4);
      this.game.combat.burst(this.x,this.y-12,10,'#d6a99b');
      this.game.combat.number(this.x,this.y-49,`−${Math.ceil(damage)}`,'#e4ac9f');
      this.game.combat.sound('hurt');
      if(this.hp<=0)this.game.die();
    }
    draw(c) {
      c.save();c.fillStyle='#080e1066';c.beginPath();c.ellipse(this.x,this.y+3,23,9,0,0,Math.PI*2);c.fill();
      // Movement bob never changes the foot-level collision geometry.
      const bob=this.moving && !this.game.reducedMotion ? Math.sin(this.walk)*1.6:0;
      if(this.invulnerable>0 && Math.floor(this.invulnerable*16)%2===0)c.globalAlpha=.5;
      c.drawImage(this.game.images['witch_'+this.facing],this.x-40,this.y-99+bob,80,107);
      c.restore();
    }
  }

  const TYPES=Object.freeze({
    slime:{hp:25,speed:52,damage:11,radius:17,xp:1,gold:1,scale:.77},
    skeleton:{hp:19,speed:85,damage:9,radius:13,xp:1,gold:1,scale:.76},
    gargoyle:{hp:85,speed:46,damage:22,radius:23,xp:3,gold:3,scale:1.05}
  });
  class Enemy {
    constructor(game,type,x,y,id) {
      const t=TYPES[type],wave=game.wave-1;
      this.game=game;this.type=type;this.id=id;this.x=x;this.y=y;
      this.maxHp=t.hp*(1+.2*wave);this.hp=this.maxHp;
      this.speed=t.speed*(1+.025*wave);this.damage=t.damage*(1+.1*wave);
      this.radius=t.radius;this.scale=t.scale;this.xp=t.xp;this.gold=t.gold;
      this.alive=true;this.flash=0;this.knockX=0;this.knockY=0;this.phase=N.rand(0,Math.PI*2);
    }
    update(dt) {
      this.flash=Math.max(0,this.flash-dt);this.phase+=dt*5;
      const p=this.game.player,dx=p.x-this.x,dy=p.y-this.y;
      const len=Math.hypot(dx,dy)||1;
      this.x+=(dx/len*this.speed+this.knockX)*dt;
      this.y+=(dy/len*this.speed+this.knockY)*dt;
      this.knockX*=Math.exp(-10*dt);this.knockY*=Math.exp(-10*dt);
      if(N.dist2(this,p)<(this.radius+p.radius)**2)p.hurt(this.damage);
    }
    hit(damage,crit,vx,vy) {
      if(!this.alive)return;
      this.hp-=damage;this.flash=.1;
      this.knockX+=vx*85;this.knockY+=vy*85;
      const g=this.game;
      g.combat.burst(this.x,this.y-13,crit?13:7,'#fff9ee');
      g.combat.number(this.x,this.y-37,String(Math.round(damage)),crit?'#e5c88a':'#e4e0d5',crit);
      if(crit){g.shake=Math.max(g.shake,3);g.hitStop=.025;}
      if(this.hp<=0){
        this.alive=false;g.player.kills++;
        g.loot.push(new Loot(g,'xp',this.x+N.rand(-8,8),this.y+N.rand(-8,8),this.xp));
        g.loot.push(new Loot(g,'gold',this.x+N.rand(-14,14),this.y+N.rand(-14,14),this.gold));
        if(this.type==='gargoyle'){g.shake=Math.max(g.shake,5);g.combat.burst(this.x,this.y-10,18,'#bdb0cc');}
      }
    }
    draw(c) {
      c.save();c.fillStyle='#080e1066';c.beginPath();c.ellipse(this.x,this.y+2,this.radius+3,this.radius*.4,0,0,Math.PI*2);c.fill();
      const s=this.scale,bob=this.game.reducedMotion?0:Math.sin(this.phase)*1.5;
      if(this.flash>0)c.filter='brightness(2.8)';
      c.drawImage(this.game.images[this.type],this.x-40*s,this.y-79*s+bob,80*s,88*s);
      c.filter='none';
      if(this.hp<this.maxHp){
        c.fillStyle='#101617';c.fillRect(this.x-15,this.y-75*s,30,3);
        c.fillStyle='#b8a293';c.fillRect(this.x-15,this.y-75*s,30*Math.max(0,this.hp/this.maxHp),3);
      }
      c.restore();
    }
  }

  class Loot {
    constructor(game,type,x,y,value) {
      this.game=game;this.type=type;this.x=x;this.y=y;this.value=value;
      this.alive=true;this.age=0;this.magnet=false;this.phase=N.rand(0,6.28);
    }
    update(dt) {
      this.age+=dt;
      const p=this.game.player,dx=p.x-this.x,dy=p.y-this.y,d2=dx*dx+dy*dy;
      if(d2<p.pickupRadius**2)this.magnet=true;
      if(this.magnet){
        const d=Math.sqrt(d2)||1,speed=Math.min(d/dt,310+this.age*70);
        this.x+=dx/d*speed*dt;this.y+=dy/d*speed*dt;
      }
      if(d2<22**2){
        this.alive=false;
        if(this.type==='xp')this.game.addXP(this.value);else p.gold+=this.value;
      }
      // Consolidate very old, distant drops into the player. Keeps endless runs
      // bounded while preserving all earned currency and experience.
      if(this.alive && this.age>75){
        this.alive=false;if(this.type==='xp')this.game.addXP(this.value);else p.gold+=this.value;
      }
    }
    draw(c) {
      const xp=this.type==='xp',bob=this.game.reducedMotion?0:Math.sin(this.game.time*3+this.phase)*1.8;
      c.save();c.translate(this.x,this.y-4+bob);c.globalCompositeOperation='lighter';
      c.fillStyle=xp?'#b8a4df18':'#d7b87918';c.beginPath();c.arc(0,0,10,0,Math.PI*2);c.fill();
      c.fillStyle=xp?'#bfb2da':'#c9ad75';c.beginPath();c.moveTo(0,-5);c.lineTo(4,0);c.lineTo(0,5);c.lineTo(-4,0);c.closePath();c.fill();
      c.fillStyle=xp?'#eee4ff':'#f6dfaf';c.fillRect(-1,-3,1,3);c.restore();
    }
  }
  N.Player=Player;N.Enemy=Enemy;N.Loot=Loot;N.ENEMY_TYPES=TYPES;
})();
