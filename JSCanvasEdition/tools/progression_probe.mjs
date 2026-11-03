/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
// Deterministic economy/XP gates and synthetic recognition; not a player win-rate model.
import fs from 'node:fs';import path from 'node:path';import {createHarness} from '../tests/helpers.mjs';
const {N,root}=createHarness();
const rows=N.ASCENSION_TIERS.map(t=>{const level=t.requirements.find(r=>r.id==='level')?.required||1,n=t.earliestWave-1;let xp=0;for(let l=1;l<level;l++)xp+=l===1?8:Math.floor(8+(l-1)*5+(l-1)**1.25);return {tier:t.name,earliestWave:t.earliestWave,minimumLevel:level,cumulativeXPAtLevel:xp,completionGoldWithoutFlawless:8*n+3*n*(n+1)/2,developedRanks:t.requirements.find(r=>r.id==='developed')?.required||0,liveTrialImplemented:t.progressionImplemented};});
const legacy=['new','early','wave20','wave50','wave150','extreme'].map(name=>{const d=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/legacy',name+'.json'),'utf8')),c=d.slots[0].checkpoint,s=N.Migration.evaluateLegacyAscension(c,d.slots[0].profile);return {fixture:name,level:c.player.level,currentWave:c.wave,completedWaves:s.progress.completedWaves,recognizedTier:N.ASCENSION_BY_ID[s.currentTier].name,verifiedTrials:s.completedTrials};});
console.log(JSON.stringify({method:'Actual XP formula and guaranteed base completion bonus only. Excludes random kills, gifts, purchases, flawless rewards and player skill; wave targets remain provisional.',tiers:rows,legacy},null,2));
