/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
(() => {
  'use strict';const N=window.Nocturne,phases=['COMBAT','SANCTUM_HUNT','GUARDIAN_FIGHT','INTERMISSION'];
  N.WaveCycle={
    duration(wave){return N.WORLD_CONFIG.preparation.find(([last])=>wave<=last)[1];},
    valid(c,wave){return c?.schema===1&&phases.includes(c.phase)&&Number.isSafeInteger(c.completedWave)&&c.completedWave>=0&&c.completedWave<=(c.phase==='INTERMISSION'?wave:wave-1)&&Number.isFinite(c.remaining)&&c.remaining>=0&&c.remaining<=105&&typeof c.shopPrepared==='boolean'&&(c.phase!=='INTERMISSION'||c.completedWave===wave);},
    preparing(g){return g.cycle?.phase==='INTERMISSION';},
    onStart(g){g.cycle={schema:1,phase:'COMBAT',completedWave:Math.max(g.player.ascension?.progress.completedWaves||0,g.wave-1),remaining:0,shopPrepared:false};},
    sync(g){if(!this.preparing(g))g.cycle.phase=g.sanctum?.phase==='fighting'?'GUARDIAN_FIGHT':g.sanctum?'SANCTUM_HUNT':'COMBAT';},
    begin(g){
      if(this.preparing(g)||g.cycle?.completedWave>=g.wave||g.sanctum?.phase!=='cleared'||!g.bossDefeated)return false;
      g.cycle={schema:1,phase:'INTERMISSION',completedWave:g.wave,remaining:this.duration(g.wave),shopPrepared:false};
      N.Ascension.completedWave(g);g.hitStop=0;g.boss=null;return true;
    },
    stock(g){if(!this.preparing(g)||g.cycle.shopPrepared)return;g.cycle.shopPrepared=true;g.ui.rolls=0;for(const slot of g.ui.slots)if(!slot.locked||!slot.item||slot.item.valid&&!slot.item.valid(g.player))g.ui.rollSlot(slot);},
    resume(g){this.stock(g);g.state='playing';g.input.clear();g.ui.hide();g.checkpoint('intermission');N.AscensionUI?.recognize(g);},
    start(g){
      if(!this.preparing(g)||!['playing','shop'].includes(g.state)||g.player.pendingLevels>0||g.player.ascension.pendingTrial)return false;
      // Change the phase before invoking the low-level start: late callbacks are inert.
      g.cycle.phase='COMBAT';g.startWave();return true;
    },
    update(g,dt){
      if(!this.preparing(g))return;
      if(g.player.ascension.pendingTrial){N.AscensionTrials.update(g,dt);return;}
      g.cycle.remaining=Math.max(0,g.cycle.remaining-dt);if(g.cycle.remaining===0)this.start(g);
    },
    capture(g){return g.cycle?{...g.cycle}:undefined;},
    restore(g,c){
      g.cycle=c.cycle?{...c.cycle}:{schema:1,phase:c.world?.sanctum?.phase==='fighting'?'GUARDIAN_FIGHT':c.world?.sanctum?'SANCTUM_HUNT':'COMBAT',completedWave:c.wave-1,remaining:0,shopPrepared:false};
      if(this.preparing(g)){g.waveTime=g.waveDuration;g.bossDefeated=true;g.boss=null;g.state='playing';}
      N.Ascension.abortInterrupted(g);
    },
    tickPreparation(g,dt){
      g.time+=dt;g.abilities.update(dt);g.player.update(dt);g.rebaseWorld();
      g.zoomFactor+=(g.targetZoom-g.zoomFactor)*(1-Math.exp(-9*dt));g.applyZoom();
      g.camera.x+=(g.player.x-g.camera.x)*(1-Math.exp(-7*dt));g.camera.y+=(g.player.y-g.camera.y)*(1-Math.exp(-7*dt));
      this.update(g,dt);g.autosaveClock+=dt;
      if(g.autosaveClock>=10){g.autosaveClock=0;g.checkpoint('intermission');}
      if(g.player.pendingLevels>0){g.ui.afterLevel='intermission';g.ui.levelUp();}
    }
  };
})();
