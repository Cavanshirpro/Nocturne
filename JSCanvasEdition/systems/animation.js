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
      const t=q.dodgeWindup>0?.45*(1-q.dodgeWindup/.22):q.dodgeTime>0?.45+.55*(1-q.dodgeTime/.24):q.windup>0?.45*(1-q.windup/q.windupTotal):q.releaseTime>0?.45+.55*(1-q.releaseTime/.55):q.salvo>0?.5+(q.shotIndex%4)*.12:((e.phase||0)/7)%1;
      return {action,style,t};
    },
    pose(e){
      if(e.game.reducedMotion||e.frozen>0)return {lean:0,lift:0,stretch:0};
      const cycle=e.phase||0,walking=e.moving!==false&&e.spawnDelay<=0;
      const ritual=this.ritual(e),power=ritual?Math.sin(ritual.t*Math.PI):0;
      return {lean:ritual?.style==='sweep'?Math.sin(ritual.t*Math.PI*2)*.13:walking?Math.sin(e.gait||0)*(e.boss?.07:.065):Math.sin(cycle)*.018,
        lift:e.type==='wraith'||e.type==='overlord'?Math.sin(cycle*.8)*3:walking?Math.abs(Math.sin(e.gait||0))*1.5:0,
        stretch:ritual?.style==='blink'?power*.12:e.type==='slime'?Math.sin(cycle)*.06:e.charge>0?.07:0};
    },
    accents(c,e){this.intent(c,e);},
    intent(c,e){
      const r=this.ritual(e);if(!r)return;
      const size=17+(e.game.reducedMotion?0:Math.sin(r.t*Math.PI)*5);
      c.save();c.translate(e.x+57*e.scale,e.y-82*e.scale);c.strokeStyle=['voidseal','riftstep'].includes(r.action)?'#d6b3ff':['starfall','meteors'].includes(r.action)?'#ffbc8c':'#e8d5ee';c.fillStyle=c.strokeStyle;c.lineWidth=2;
      const line=(x,y,a,b)=>{c.beginPath();c.moveTo(x,y);c.lineTo(a,b);c.stroke();};
      if(['salvo','lances','starfall'].includes(r.action)){for(let i=-1;i<=1;i++){const x=i*size*.7;line(x,-size,x+(r.action==='lances'?i*7:0),size);if(r.action==='starfall'){line(x-4,0,x+4,0);line(x,-5,x,5);}}}
      else if(['meteors','crossfire','soulring'].includes(r.action)){const count=r.action==='meteors'?3:r.action==='crossfire'?2:8;for(let i=0;i<count;i++){const a=i*Math.PI*2/count+(e.game.reducedMotion?0:r.t*.8);c.beginPath();c.arc(Math.cos(a)*size,Math.sin(a)*size,r.action==='crossfire'?8:3,0,Math.PI*2);c.stroke();}}
      else if(r.action==='slash'){c.beginPath();c.arc(0,0,size,-1.2,1.2);c.stroke();line(0,-size,size,0);}
      else if(r.action==='aegis'){c.beginPath();for(let i=0;i<=6;i++){const a=i*Math.PI/3;c[i?'lineTo':'moveTo'](Math.cos(a)*size,Math.sin(a)*size);}c.stroke();line(-6,0,6,0);line(0,-6,0,6);}
      else if(r.action==='shockwave'){for(let i=0;i<3;i++){c.beginPath();c.arc(0,0,8+i*7,-2.8,-.3);c.stroke();}}
      else if(r.action==='riftstep'){for(const x of [-10,10]){c.beginPath();c.ellipse(x,0,7,size,0,0,Math.PI*2);c.stroke();}}
      else{c.beginPath();c.moveTo(0,-size);c.lineTo(size,0);c.lineTo(0,size);c.lineTo(-size,0);c.closePath();c.stroke();line(-8,-8,8,8);line(-8,8,8,-8);}
      c.restore();
    }
  };
  N.drawEnemy=(c,images,enemy,x,y,w,h,state=null,progress=null)=>{
    let atlas=window.NOCTURNE_ENEMY_ATLAS,sheet=images['enemy_atlas_'+enemy.type];
    if(!sheet||!atlas){c.drawImage(images[enemy.type],x,y,w,h);return;}
    const q=enemy.guardian;
    const ritual=state===null&&progress===null?N.EnemyMotion.ritual(enemy):null;
    if(ritual&&images['enemy_ritual_'+enemy.type]){atlas=window.NOCTURNE_RITUAL_ATLAS;sheet=images['enemy_ritual_'+enemy.type];state=atlas.clips[ritual.action]?ritual.action:ritual.style;progress=ritual.t;}
    if(!state){state=enemy.terrified?'fear':q?.windup>0||(!['cultist','wraith'].includes(enemy.type)&&enemy.windup>0)||enemy.charge>0?'attack':enemy.hitSquash>0?'hurt':enemy.castTimer>0?'attack':enemy.frozen>0||enemy.moving===false?'idle':'walk';}
    const clip=atlas.clips[state];let t=progress;
    if(t===null){
      if(state==='hurt')t=1-enemy.hitSquash/.12;
      else if(state==='attack')t=q?.windup>0?.42*(1-Math.min(1,q.windup/1.15)):q?.salvo>0?.5+.5*(q.shotIndex%6)/6:enemy.windup>0?.42*(1-Math.min(1,enemy.windup/.72)):.42+.58*(1-Math.min(1,(enemy.castTimer||enemy.charge)/.44));
      else t=(((state==='idle'||state==='fear'?enemy.phase:enemy.gait)||0)+(enemy.type==='gargoyle'?(enemy.phase||0)*.65:0))/(Math.PI*2)%1;
    }
    t=N.clamp(t,0,.999999);const position=t*clip.frames,index=Math.floor(position);
    const row=atlas.rows?Math.max(0,atlas.directions.indexOf(enemy.facing||'S')):0;
    const draw=i=>{const frame=clip.start+i,columns=atlas.columns||Infinity;N.Motion.draw(c,sheet,(frame%columns)*atlas.width,(row*(atlas.rowStride||1)+Math.floor(frame/columns))*atlas.height,atlas.width,atlas.height,x,y,w,h,enemy);};
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
