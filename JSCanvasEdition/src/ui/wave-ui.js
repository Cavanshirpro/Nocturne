/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
(() => {
  const N=window.Nocturne;
  N.WaveUI={
    bind(g){
      const on=(id,fn)=>document.getElementById(id)?.addEventListener('click',fn);
      on('open-merchant',()=>{if(N.WaveCycle.preparing(g)&&!g.player.ascension.pendingTrial&&g.state==='playing')g.ui.openShop();});
      on('preparation-grimoire',()=>g.ui.toggleGrimoire());on('open-ascension',()=>N.AscensionUI.open(g));on('ascension-button',()=>N.AscensionUI.open(g));on('start-next-wave',()=>N.WaveCycle.start(g));
    },
    update(g){
      const panel=document.getElementById('preparation-panel');if(!panel)return;
      const preparing=N.WaveCycle.preparing(g),trial=g.player.ascension.pendingTrial;
      panel.hidden=!preparing||g.state!=='playing';if(panel.hidden)return;
      const e=N.Ascension.evaluate(g.player,g),seconds=Math.ceil(trial?20-trial.elapsed:g.cycle.remaining),tier=N.Ascension.tier(g.player);
      const text=`${trial?'FIRST EMBER':seconds<=5?'WAVE '+(g.wave+1)+' INCOMING':'WAVE '+g.wave+' CLEARED'} · ${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
      const heading=document.getElementById('preparation-title');if(heading.textContent!==text)heading.textContent=text;
      const details=document.getElementById('preparation-detail'),value=trial?'Move '+Math.floor(trial.distance)+' / 250 · Dash '+Math.max(0,g.stats.dashes-trial.startDashes)+' / 1':`◈ ${N.fmt(g.player.gold)} · TIER ${tier.name} · ${e.requirements.filter(r=>r.completed).length}/${e.requirements.length} next requirements · ${g.player.progress.preparedOath?N.OATHS[g.player.progress.preparedOath].name:'No oath prepared'}`;
      if(details.textContent!==value)details.textContent=value;
      panel.dataset.warning=!trial&&seconds<=5?'imminent':!trial&&seconds<=15?'soon':'calm';
      for(const id of ['start-next-wave','open-merchant'])document.getElementById(id).disabled=!!trial;
      document.getElementById('power-hud').hidden=!trial;
      document.getElementById('wave-status').textContent=trial?'ASCENSION TRIAL':'EXPLORABLE PREPARATION';
      document.getElementById('timer').textContent=trial?'TRIAL':`NEXT ${seconds}s`;
    }
  };
})();
