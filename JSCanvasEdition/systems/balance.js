/*
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade
This file is part of Nocturne. See the distribution's LICENSE and NOTICE files.
*/
/* Endless growth: no gameplay stat ceilings. Percent ratings use smooth formulas. */
(() => {
  'use strict';
  const N=window.Nocturne;
  N.BALANCE=Object.freeze({boltRange:430,boltTravel:490,lightningRange:390,chainRange:170,evolvedChainRange:210});
  N.armorReduction=p=>p.armor/(1+p.armor);
  N.boltRange=p=>430*Math.sqrt(p.projectileSpeed/510);
  N.boltTravel=p=>N.boltRange(p)*(490/430);
  N.castInterval=p=>Math.max(Number.MIN_VALUE,p.attackInterval);
  N.critRoll=p=>{const tiers=Math.floor(p.critChance)+(Math.random()<p.critChance%1?1:0);return {crit:tiers>0,multiplier:1+tiers*(p.critMultiplier-1)};};
  N.balancePlayer=p=>{p.hp=Math.min(p.hp,p.maxHp);return p;};
})();
