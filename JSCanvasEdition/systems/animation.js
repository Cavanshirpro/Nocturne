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
  N.drawEnemy=(c,images,enemy,x,y,w,h,state=null,progress=null)=>{
    const atlas=window.NOCTURNE_ENEMY_ATLAS,sheet=images['enemy_atlas_'+enemy.type];
    if(!sheet||!atlas){c.drawImage(images[enemy.type],x,y,w,h);return;}
    if(!state){state=enemy.hitSquash>0?'hurt':enemy.windup>0||enemy.charge>0||enemy.castTimer>0?'attack':enemy.frozen>0||enemy.moving===false?'idle':'walk';}
    const clip=atlas.clips[state];let t=progress;
    if(t===null){
      if(state==='hurt')t=1-enemy.hitSquash/.12;
      else if(state==='attack')t=enemy.windup>0?.5*(1-Math.min(1,enemy.windup/.72)):.5+.5*(1-Math.min(1,(enemy.castTimer||enemy.charge)/.44));
      else t=(((state==='idle'?enemy.phase:enemy.gait)||0)+(enemy.type==='gargoyle'?(enemy.phase||0)*.65:0))/(Math.PI*2)%1;
    }
    const frame=enemy.game.reducedMotion?clip.start:clip.start+Math.min(clip.frames-1,Math.max(0,Math.floor(t*clip.frames)));
    c.drawImage(sheet,frame*atlas.width,0,atlas.width,atlas.height,x,y,w,h);
  };
  N.SpriteAnimator=SpriteAnimator;
})();
