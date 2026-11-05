/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
(() => {
  'use strict';const N=window.Nocturne;
  N.AscensionUI={
    open(g,selected=null){
      if(!['playing','paused','shop','levelup','grimoire','ascension'].includes(g.state))return false;
      if(g.state!=='ascension')g.ui.ascensionFrom={state:g.state,grimoireFrom:g.ui.grimoireFrom};
      g.state='ascension';g.input.clear();this.render(g,selected||N.Ascension.next(g.player)?.id||g.player.ascension.currentTier);return true;
    },
    recognize(g){
      const r=g.player.ascension.legacyRecognition;
      if(!r||r.presented||g.player.pendingLevels>0||!g.save.available)return;
      this.open(g);r.presented=true;g.checkpoint(N.WaveCycle.preparing(g)?'intermission':'wave');
    },
    render(g,selected){
      const p=g.player,s=p.ascension,current=N.Ascension.tier(p),tier=N.ASCENSION_BY_ID[selected]||current,e=N.Ascension.evaluate(p,g,tier.id),legacy=s.legacyRecognition,trial=N.ASCENSION_TRIALS[tier.trial],power=tier.power,previous=N.ASCENSION_TIERS[Math.max(0,tier.order-1)].power,earned=tier.order<=current.order;
      const state=t=>t.order<=current.order?(s.history.find(h=>h.tier===t.id)?.source==='legacy'?'Legacy recognized':'Unlocked'):N.Ascension.evaluate(p,g,t.id).eligible?'Trial available':'Requirements incomplete';
      const summary=legacy?`<section class="legacy-recognition"><p class="eyebrow">LEGACY PROGRESS RECOGNIZED</p><h3>${current.name} · ${legacy.completedWaves} completed waves</h3><p>Source save container v${legacy.sourceSchema}; original game version was not recorded. Level ${legacy.level} · ${legacy.schools} spell schools · ${legacy.evolved} evolutions · ${legacy.mastered} masteries · ${legacy.guardians} verified guardians.</p><p>Restoration: ${legacy.restored}. Historical recognition through +C is preserved. New tiers require their own verified Ascension ordeal. No gold, spells or items were issued by migration.</p></section>`:'';
      g.ui.show(`<div class="grimoire-toolbar"><span>ASCENSION · QUALITATIVE PROGRESSION</span><button class="secondary" id="close-ascension">RETURN · ESC / T</button></div><p class="eyebrow">${current.era.toUpperCase()} · LEVEL ${p.level} · BUILD POWER ${N.Difficulty.assess(p).rating}</p><h2 id="menu-title">${current.crest} ${current.name} · ${current.theme}</h2><p class="hint">Character level, adaptive BUILD POWER and Ascension are separate. Schools must be developed deeply; mastery and evolutions matter. Rank powers are cumulative and never modify stored base stats.</p>${summary}<div class="ascension-eras">${['Awakening','Ascendance','Sovereignty','Dominion'].map(era=>`<section><h3>${era}</h3><div class="tier-ladder">${N.ASCENSION_TIERS.filter(t=>t.era===era).map(t=>`<button class="tier-card ${t.order<=current.order?'earned':''} ${t.id===selected?'selected':''}" style="--tier-color:${t.palette.primary}" data-ascension-tier="${t.id}" aria-pressed="${t.id===selected}" aria-label="${t.accessibilityLabel}, ${state(t)}"><span aria-hidden="true">${t.crest}</span><strong>${t.name}</strong><small>${state(t)}</small></button>`).join('')}</div></section>`).join('')}</div><section class="ascension-detail" style="--tier-color:${tier.palette.primary}"><p class="eyebrow">STAGE ${tier.order+1} / 16 · EARLIEST TARGET WAVE ${tier.earliestWave}</p><h3>${tier.crest} ${tier.name} · ${tier.theme}</h3><p>${earned?state(tier):'Meet the independent requirements, then complete this tier’s ordeal during preparation.'}</p><ul class="ascension-requirements">${e.requirements.map(r=>`<li class="${r.completed?'met':''}"><span>${r.completed?'✓':'◇'} ${r.label}</span><strong>${N.fmt(r.current)} / ${r.required}</strong>${r.recognizedFromLegacy?'<small>Includes recognized historical progress</small>':''}</li>`).join('')}</ul><h4>Rank power</h4><p><strong>×${power.damage.toFixed(2)} spell damage</strong> · ${((1-power.taken)*100).toFixed(1)}% less incoming damage · +${Math.round((power.speed-1)*100)}% movement · +${Math.round((power.recovery-1)*100)}% ritual recovery.</p><p>Damage increase from the previous rank: +${((power.damage/previous.damage-1)*100).toFixed(1)}%. Conditional bonuses stack with this total. Boss adaptation only accounts for part of Ascension power.</p><h4>Cumulative abilities</h4><ul>${N.ASCENSION_TIERS.filter(t=>t.order>0&&t.order<=tier.order).map(t=>`<li><strong>${t.name} · ${t.power.name}</strong>: ${t.power.description}</li>`).join('')}</ul><h4>New unlock</h4><ul>${tier.unlocks.map(u=>`<li>${u.name} · ${u.kind==='cosmetic'?'Cosmetic identity':'Active combat ability'}</li>`).join('')}</ul><p>${trial?g.ui.escape(trial.description):'Starting tier: no ordeal required.'}</p>${s.lastTrial?`<p role="status">Last ordeal result: ${g.ui.escape(s.lastTrial.outcome)} — ${g.ui.escape(s.lastTrial.reason)}</p>`:''}<button class="primary" id="begin-ascension-trial" ${!e.trialAvailable||!N.WaveCycle.preparing(g)||s.pendingTrial?'disabled':''}>${earned?'ALREADY RECOGNIZED':!tier.progressionImplemented?'FUTURE TRIAL · UNAVAILABLE':!N.WaveCycle.preparing(g)?'AVAILABLE DURING PREPARATION':'BEGIN '+(trial?.name.toUpperCase()||'ORDEAL')}</button></section>`);
      g.ui.menu.querySelectorAll('[data-ascension-tier]').forEach(b=>b.addEventListener('click',()=>this.render(g,b.dataset.ascensionTier)));
      g.ui.on('#close-ascension',()=>this.close(g));g.ui.on('#begin-ascension-trial',()=>{if(!e.trialAvailable||!N.WaveCycle.preparing(g))return;g.state='playing';g.ui.hide();N.AscensionTrials.start(g);});
    },
    close(g){
      if(g.state!=='ascension')return;const from=g.ui.ascensionFrom||{state:'playing'};
      if(from.state==='shop'){g.state='shop';g.ui.renderShop();}
      else if(from.state==='levelup'){g.state='levelup';g.ui.renderLevel();}
      else if(from.state==='grimoire'){g.state=from.grimoireFrom||'playing';g.ui.toggleGrimoire();}
      else if(from.state==='paused'){g.state='playing';g.ui.pause();}
      else {g.state='playing';g.ui.hide();}
    }
  };
})();
