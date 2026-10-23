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
  N.SpriteAnimator=SpriteAnimator;
})();
