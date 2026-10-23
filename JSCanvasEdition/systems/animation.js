/* State clips reference packed sprite-atlas rectangles; simulation owns the clock. */
(() => {
  'use strict';
  const N=window.Nocturne;
  class SpriteAnimator {
    constructor(){this.state='idle';this.time=0;this.priority=0;this.finished=false;}
    play(state,{restart=false}={}){
      const clip=window.NOCTURNE_ATLAS.clips[state];if(!clip)return false;
      if(!this.finished&&this.priority>clip.priority)return false;
      if(this.state===state&&!restart)return true;
      this.state=state;this.time=0;this.priority=clip.priority;this.finished=false;return true;
    }
    update(dt,moving,dash,reduced=false){
      this.time+=dt;const clip=window.NOCTURNE_ATLAS.clips[this.state];
      if(!clip.loop&&this.time>=clip.duration){this.finished=true;this.priority=0;}
      if(this.finished||this.priority===0){const target=dash?'dash':moving?'walk':'idle';if(target!==this.state||this.finished)this.play(target,{restart:true});}
      this.reduced=reduced;
    }
    get frame(){const c=window.NOCTURNE_ATLAS.clips[this.state];if(this.reduced)return c.start+(this.state==='cast'?2:0);return c.start+Math.min(c.frames-1,Math.floor((c.loop?this.time%c.duration:Math.min(this.time,c.duration-.00001))/c.duration*c.frames));}
    draw(c,images,facing,x,y,w=80,h=107){const a=window.NOCTURNE_ATLAS;c.drawImage(images['witch_atlas_'+facing],this.frame*a.width,0,a.width,a.height,x,y,w,h);}
  }
  N.EnemyMotion={
    pose(e){
      if(e.game.reducedMotion||e.frozen>0)return {lean:0,lift:0,stretch:0};
      const cycle=e.phase||0,walking=e.moving!==false&&e.spawnDelay<=0;
      return {lean:walking?Math.sin(e.gait||0)*(e.boss?.025:.035):Math.sin(cycle)*.008,
        lift:e.type==='wraith'||e.type==='overlord'?Math.sin(cycle*.8)*3:walking?Math.abs(Math.sin(e.gait||0))*.8:0,
        stretch:e.type==='slime'?Math.sin(cycle)*.035:e.charge>0?.045:0};
    },
    accents(c,e){
      if(!e.boss&&e.type!=='wraith')return;
      const g=e.game,phase=g.reducedMotion?0:e.phase,s=e.scale;
      c.save();c.strokeStyle=e.type==='overlord'?'#e6a5c06b':'#b8cce07a';c.fillStyle=e.type==='overlord'?'#f0b6d0':'#c9e4ed';c.lineWidth=1;
      const count=g.quality==='low'?2:4;
      for(let i=0;i<count;i++){
        const a=phase*.55+i*Math.PI*2/count,x=e.x+Math.cos(a)*25*s,y=e.y-45*s+Math.sin(a)*10*s;
        c.beginPath();c.arc(x,y,1.5,0,Math.PI*2);c.fill();
        if(g.quality!=='low'){c.beginPath();c.moveTo(x,y);c.lineTo(x-Math.cos(a-.3)*4,y-Math.sin(a-.3)*4);c.stroke();}
      }
      c.restore();
    }
  };
  N.drawEnemy=(c,images,enemy,x,y,w,h,state=null,progress=null)=>{
    const atlas=window.NOCTURNE_ENEMY_ATLAS,sheet=images['enemy_atlas_'+enemy.type];
    if(!sheet||!atlas){c.drawImage(images[enemy.type],x,y,w,h);return;}
    const q=enemy.guardian;
    if(!state){state=enemy.hitSquash>0?'hurt':enemy.terrified?'fear':q?.windup>0||q?.salvo>0||enemy.windup>0||enemy.charge>0||enemy.castTimer>0?'attack':enemy.frozen>0||enemy.moving===false?'idle':'walk';}
    const clip=atlas.clips[state];let t=progress;
    if(t===null){
      if(state==='hurt')t=1-enemy.hitSquash/.12;
      else if(state==='attack')t=q?.windup>0?.42*(1-Math.min(1,q.windup/1.15)):q?.salvo>0?.5+.5*(q.shotIndex%6)/6:enemy.windup>0?.42*(1-Math.min(1,enemy.windup/.72)):.42+.58*(1-Math.min(1,(enemy.castTimer||enemy.charge)/.44));
      else t=(((state==='idle'||state==='fear'?enemy.phase:enemy.gait)||0)+(enemy.type==='gargoyle'?(enemy.phase||0)*.65:0))/(Math.PI*2)%1;
    }
    t=N.clamp(t,0,.999999);const position=t*clip.frames,index=Math.floor(position);
    const row=atlas.rows?Math.max(0,atlas.directions.indexOf(enemy.facing||'S')):0;
    const draw=i=>c.drawImage(sheet,(clip.start+i)*atlas.width,row*atlas.height,atlas.width,atlas.height,x,y,w,h);
    if(enemy.game.reducedMotion){draw(0);return;}
    draw(index);
    // Only prominent/uncrowded actors blend; low quality keeps a single atlas draw.
    if(progress===null&&enemy.game.quality!=='low'&&(enemy.boss||(enemy.game.enemies?.length||0)<60)&&enemy.frozen<=0){
      const next=['walk','idle','fear'].includes(state)?(index+1)%clip.frames:Math.min(index+1,clip.frames-1);
      if(next!==index){c.save();c.globalAlpha*=position-index;draw(next);c.restore();}
    }
  };
  N.SpriteAnimator=SpriteAnimator;
})();
