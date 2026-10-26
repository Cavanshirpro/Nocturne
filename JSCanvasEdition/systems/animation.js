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
    draw(c,images,facing,x,y,w=80,h=107,variant='witch',visualClock=null,quality='high',actor=null){
      const a=window.NOCTURNE_ATLAS,clip=a.clips[this.state];
      const sheet=images[variant+'_atlas_'+facing]||images['witch_atlas_'+facing];
      if(!sheet)return;
      const cycle=visualClock!==null&&!this.reduced&&this.state==='cast'
        ? ((visualClock%1)+1)%1
        : clip.loop ? (this.time%clip.duration)/clip.duration
        : Math.min(.999999,this.time/clip.duration);
      const position=this.reduced?0:cycle*clip.frames;
      const current=this.reduced?Math.min(clip.frames-1,this.state==='cast'?2:0):Math.min(clip.frames-1,Math.floor(position));
      const draw=index=>{if(actor)N.Motion.draw(c,sheet,(clip.start+index)*a.width,0,a.width,a.height,x,y,w,h,actor);else c.drawImage(sheet,(clip.start+index)*a.width,0,a.width,a.height,x,y,w,h);};
      draw(current);
      // Display-only crossfade: no extra simulation update, allocations,
      // timers or interpolation of the character's world coordinates.
      if(this.reduced||quality==='low')return;
      const next=clip.loop?(current+1)%clip.frames:Math.min(current+1,clip.frames-1);
      const fraction=position-Math.floor(position),crisp=this.state==='walk'||this.state==='dash';
      const blend=crisp?Math.max(0,(fraction-.7)/.3):fraction;
      if(next!==current && blend>.025){c.save();c.globalAlpha*=blend;draw(next);c.restore();}
    }
  }
  N.EnemyMotion={
    ritual(e){
      const q=e.guardian||e.tactics;if(!q)return null;
      if(q.salvo>0&&q.windup<=0&&!(q.releaseTime>0))return null;
      const action=q.dodgeWindup>0||q.dodgeTime>0?'riftstep':q.action||(q.salvo>0?'salvo':q.releaseTime>0?q.lastAction:q.ward>0?'aegis':null);
      if(!action)return null;
      const style=action==='riftstep'?'blink':['salvo','slash','lances'].includes(action)?'sweep':['aegis','shockwave','soulring'].includes(action)?'guard':'channel';
      const t=q.dodgeWindup>0?.45*(1-q.dodgeWindup/.22):q.dodgeTime>0?.45+.55*(1-q.dodgeTime/.24):q.windup>0?.45*(1-q.windup/q.windupTotal):q.releaseTime>0?.45+.55*(1-q.releaseTime/.55):q.salvo>0?.5+(q.shotIndex%4)*.12:.35;
      return {action,style,t};
    },
    pose(e){return N.HostileVisuals.pose(e);},
    accents(c,e){this.intent(c,e);},
    intent(c,e){N.HostileVisuals.ritual(c,e);}
  };
  N.drawEnemy=(c,images,enemy,x,y,w,h,state=null,progress=null)=>{
    let atlas=window.NOCTURNE_ENEMY_ATLAS,key='enemy_atlas_'+enemy.type,sheet=images[key];
    if(!sheet||!atlas){c.drawImage(images[enemy.type],x,y,w,h);return;}
    const q=enemy.guardian;
    const ritual=state===null&&progress===null?N.EnemyMotion.ritual(enemy):null;
    if(!ritual&&state===null&&progress===null){const summon=N.HostileVisuals.summonProgress(enemy);if(summon>=0){state='attack';progress=.1+summon*.8;}}
    if(ritual&&images['enemy_ritual_'+enemy.type]){atlas=window.NOCTURNE_RITUAL_ATLAS;key='enemy_ritual_'+enemy.type;sheet=images[key];state=atlas.clips[ritual.action]?ritual.action:ritual.style;progress=ritual.t;}
    if(!state){state=enemy.terrified?'fear':q?.windup>0||(!['cultist','wraith'].includes(enemy.type)&&enemy.windup>0)||enemy.charge>0?'attack':enemy.hitSquash>0?'hurt':enemy.castTimer>0?'attack':enemy.frozen>0||enemy.moving===false?'idle':'walk';}
    const clip=atlas.clips[state];let t=progress;
    if(t===null){
      if(state==='hurt')t=1-enemy.hitSquash/.12;
      else if(state==='attack')t=q?.windup>0?.42*(1-Math.min(1,q.windup/1.15)):q?.salvo>0?.5+.5*(q.shotIndex%6)/6:enemy.windup>0?.42*(1-Math.min(1,enemy.windup/.72)):.42+.58*(1-Math.min(1,(enemy.castTimer||enemy.charge)/.44));
      else t=(((state==='idle'||state==='fear'?enemy.phase:enemy.gait)||0)+(enemy.type==='gargoyle'?(enemy.phase||0)*.65:0))/(Math.PI*2)%1;
    }
    t=N.clamp(t,0,.999999);const position=t*clip.frames,index=Math.floor(position);
    const row=atlas.rows?Math.max(0,atlas.directions.indexOf(N.HostileVisuals.facing(enemy))):0;
    const draw=i=>{const frame=clip.start+i,columns=atlas.columns||Infinity,logicalRow=row*(atlas.rowStride||1)+Math.floor(frame/columns),logicalColumn=frame%columns,packing=window.NOCTURNE_PACKING?.[key],rect=packing?.rects[logicalRow*(packing.logicalWidth/atlas.width)+logicalColumn];
     if(rect){const [px,py,pw,ph,ox,oy]=rect;c.drawImage(sheet,px,py,pw,ph,x+ox*(w/atlas.width),y+oy*(h/atlas.height),pw*(w/atlas.width),ph*(h/atlas.height));}
     else N.Motion.draw(c,sheet,logicalColumn*atlas.width,logicalRow*atlas.height,atlas.width,atlas.height,x,y,w,h,enemy);};
    if(enemy.game.reducedMotion){draw(0);return;}
    draw(index);
    // Only prominent/uncrowded actors blend; low quality keeps a single atlas draw.
    if(progress===null&&enemy.game.quality!=='low'&&(enemy.boss||(enemy.game.enemies?.length||0)<60)&&enemy.frozen<=0){
      const next=['walk','idle','fear'].includes(state)?(index+1)%clip.frames:Math.min(index+1,clip.frames-1);
      const fraction=position-index,blend=['walk','fear'].includes(state)?Math.max(0,(fraction-.7)/.3):fraction;
      if(next!==index&&blend>.025){c.save();c.globalAlpha*=blend;draw(next);c.restore();}
    }
  };
  N.SpriteAnimator=SpriteAnimator;
})();
