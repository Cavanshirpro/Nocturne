/*
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade
This file is part of Nocturne. See the distribution's LICENSE and NOTICE files.
*/
(() => {
  'use strict';
  const N = window.Nocturne = {};
  N.VERSION = '0.8.0';
  const compactNumbers=new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1});N.fmt=v=>Math.abs(v)>=10000?compactNumbers.format(v):Number.isInteger(v)?String(v):Number(v.toFixed(1)).toString();
  N.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  N.rand = (a, b) => a + Math.random() * (b - a);
  // Cosmetic randomness must not alter enemy spawns, crits or item rolls.
  let fxSeed=81723;
  N.fxRand=(a,b)=>{fxSeed=(fxSeed*1664525+1013904223)>>>0;return a+fxSeed/4294967296*(b-a);};
  N.pick = a => a[Math.floor(Math.random() * a.length)];
  N.dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  N.shuffle = list => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  N.segmentDistance2 = (ax, ay, bx, by, x, y) => {
    const dx = bx - ax, dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len ? N.clamp(((x - ax) * dx + (y - ay) * dy) / len, 0, 1) : 0;
    return (x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2;
  };

  // Earliest intersection along a segment, including starts inside a circle.
  N.circleHit = (ax, ay, bx, by, x, y, radius) => {
    const dx=bx-ax,dy=by-ay,fx=ax-x,fy=ay-y;
    const a=dx*dx+dy*dy,c=fx*fx+fy*fy-radius*radius;
    if(c<=0)return 0;
    if(a===0)return Infinity;
    const b=2*(fx*dx+fy*dy),disc=b*b-4*a*c;
    if(disc<0)return Infinity;
    const t=(-b-Math.sqrt(disc))/(2*a);
    return t>=0&&t<=1?t:Infinity;
  };
  N.PLAYER_FIELDS = ['x','y','hp','maxHp','speed','damage','attackInterval','projectileSpeed',
    'projectileCount','critChance','critMultiplier','pickupRadius','armor','regen','gold',
    'kills','xp','xpNeeded','level','pendingLevels','dashCooldown','pierce'];

})();
