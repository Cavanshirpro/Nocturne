(() => {
  'use strict';
  const N=window.Nocturne;
  class Pool {
    constructor(factory,limit){this.factory=factory;this.limit=limit;this.free=[];this.active=[];this.created=0;}
    acquire(){
      let item=this.free.pop();
      if(!item){if(this.created>=this.limit)return null;item=this.factory();this.created++;}
      this.active.push(item);return item;
    }
    release(index){
      const a=this.active,item=a[index];
      a[index]=a[a.length-1];a.pop();this.free.push(item);
    }
    clear(){while(this.active.length)this.free.push(this.active.pop());}
  }
  class Projectile {
    constructor(){this.trailX=new Float32Array(5);this.trailY=new Float32Array(5);}
    reset(x,y,vx,vy,damage,crit){
      this.x=x;this.y=y;this.vx=vx;this.vy=vy;this.damage=damage;this.crit=crit;
      this.life=2.6;this.radius=6;this.trailCount=0;
      this.trailX.fill(x);this.trailY.fill(y);
    }
  }
  class Combat {
    constructor(game){
      this.game=game;this.cooldown=0;this.candidates=[];
      this.projectiles=new Pool(()=>new Projectile(),240);
      this.particles=new Pool(()=>({}),650);this.numbers=new Pool(()=>({}),55);
      this.audio=null;this.soundEnabled=false;this.lastSound=0;
    }
    clear(){this.projectiles.clear();this.particles.clear();this.numbers.clear();}
    enableAudio(){
      try{
        const Audio=window.AudioContext||window.webkitAudioContext;
        if(!Audio)return;
        this.audio ||= new Audio();
        this.audio.resume().catch(()=>{});
      }catch(error){console.warn('Audio unavailable:',error.message);}
    }
    sound(kind){
      if(!this.soundEnabled||!this.audio||this.audio.state!=='running')return;
      const a=this.audio,t=a.currentTime;
      if(t-this.lastSound<.065)return;
      this.lastSound=t;
      const osc=a.createOscillator(),gain=a.createGain();
      osc.type=kind==='hurt'?'triangle':'sine';
      osc.frequency.setValueAtTime(kind==='hurt'?130:620,t);
      osc.frequency.exponentialRampToValueAtTime(kind==='hurt'?55:270,t+.12);
      gain.gain.setValueAtTime(.025,t);gain.gain.exponentialRampToValueAtTime(.001,t+.13);
      osc.connect(gain);gain.connect(a.destination);osc.start(t);osc.stop(t+.14);
      osc.onended=()=>{osc.disconnect();gain.disconnect();};
    }
    nearest(){
      const p=this.game.player;let nearest=null,best=Infinity;
      for(const e of this.game.enemies){
        if(!e.alive)continue;
        const d=N.dist2(p,e);
        if(d<best){best=d;nearest=e;}
      }
      return nearest;
    }
    fire(target){
      const p=this.game.player,ox=p.x,oy=p.y-18;
      const angle=Math.atan2(target.y-12-oy,target.x-ox),count=p.projectileCount;
      for(let i=0;i<count;i++){
        const bullet=this.projectiles.acquire();if(!bullet)break;
        const theta=angle+(i-(count-1)/2)*.105;
        const crit=Math.random()<p.critChance;
        bullet.reset(ox,oy,Math.cos(theta)*p.projectileSpeed,Math.sin(theta)*p.projectileSpeed,p.damage*(crit?p.critMultiplier:1),crit);
      }
      this.sound('fire');
    }
    burst(x,y,count,color){
      if(this.game.reducedMotion)count=Math.ceil(count*.4);
      for(let i=0;i<count;i++){
        const part=this.particles.acquire();if(!part)break;
        const a=N.rand(0,Math.PI*2),speed=N.rand(35,190);
        Object.assign(part,{x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:.3,total:.3,radius:N.rand(1,3.3),color});
      }
    }
    number(x,y,text,color,crit=false){
      const n=this.numbers.acquire();if(!n)return;
      Object.assign(n,{x:x+N.rand(-9,9),y,text,color,crit,life:.65,total:.65});
    }
    update(dt){
      this.cooldown-=dt;
      if(this.cooldown<=0){
        const target=this.nearest();
        if(target){this.fire(target);this.cooldown=Math.max(.12,this.game.player.attackInterval);}
        else this.cooldown=0;
      }
      const active=this.projectiles.active;
      for(let i=active.length-1;i>=0;i--){
        const b=active[i];
        for(let j=4;j>0;j--){b.trailX[j]=b.trailX[j-1];b.trailY[j]=b.trailY[j-1];}
        b.trailX[0]=b.x;b.trailY[0]=b.y;b.trailCount=Math.min(5,b.trailCount+1);
        const ox=b.x,oy=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
        // Query the swept bounding box, enlarged by the largest enemy radius.
        // The circle/segment test prevents tunnelling at high projectile speeds.
        this.game.hash.query(Math.min(ox,b.x)-32,Math.min(oy,b.y)-32,Math.max(ox,b.x)+32,Math.max(oy,b.y)+32,this.candidates);
        let hit=null,first=Infinity;
        const dx=b.x-ox,dy=b.y-oy,len=dx*dx+dy*dy||1;
        for(const e of this.candidates){
          if(N.segmentDistance2(ox,oy,b.x,b.y,e.x,e.y-12)<=(e.radius+b.radius)**2){
            const t=N.clamp(((e.x-ox)*dx+(e.y-12-oy)*dy)/len,0,1);
            if(t<first){first=t;hit=e;}
          }
        }
        if(hit){
          const speed=Math.hypot(b.vx,b.vy)||1;
          hit.hit(b.damage,b.crit,b.vx/speed,b.vy/speed);this.projectiles.release(i);
        }else if(b.life<=0)this.projectiles.release(i);
      }
      for(let i=this.particles.active.length-1;i>=0;i--){
        const p=this.particles.active[i];p.life-=dt;
        if(p.life<=0){this.particles.release(i);continue;}
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-5*dt);p.vy*=Math.exp(-5*dt);
      }
      for(let i=this.numbers.active.length-1;i>=0;i--){
        const n=this.numbers.active[i];n.life-=dt;n.y-=dt*27;if(n.life<=0)this.numbers.release(i);
      }
    }
    draw(c){
      c.save();c.globalCompositeOperation='lighter';
      for(const b of this.projectiles.active){
        if(!this.game.visible(b.x,b.y,50))continue;
        for(let i=b.trailCount-1;i>=0;i--){
          c.globalAlpha=(1-i/5)*.38;c.strokeStyle='#e9e2ff';c.lineWidth=Math.max(.8,4-i*.65);
          c.beginPath();c.moveTo(b.trailX[i],b.trailY[i]);
          c.lineTo(i?b.trailX[i-1]:b.x,i?b.trailY[i-1]:b.y);c.stroke();
        }
        c.globalAlpha=1;c.drawImage(this.game.images.orb,b.x-19,b.y-19,38,38);
      }
      for(const p of this.particles.active){
        const t=Math.max(0,p.life/p.total);
        c.globalAlpha=t;c.fillStyle=p.color;c.beginPath();c.arc(p.x,p.y,p.radius*t,0,Math.PI*2);c.fill();
      }
      c.restore();c.save();c.textAlign='center';
      for(const n of this.numbers.active){
        c.globalAlpha=Math.min(1,n.life/.25);c.fillStyle=n.color;c.font=n.crit?'bold 17px Georgia':'12px Arial';
        c.fillText(n.text,n.x,n.y);
      }
      c.restore();
    }
  }
  N.Pool=Pool;N.Projectile=Projectile;N.Combat=Combat;
})();
