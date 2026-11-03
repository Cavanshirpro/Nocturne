/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
(() => {
  const N=window.Nocturne;
  N.drawAscensionIdentity=(c,p)=>{
    const tier=N.Ascension.tier(p);if(tier.order===0)return;
    c.save();c.textAlign='center';c.font='10px Arial';c.lineWidth=3;c.strokeStyle='#111822';c.fillStyle=tier.palette.primary;
    const label=tier.crest+' '+tier.name;c.strokeText(label,p.x,p.y+39);c.fillText(label,p.x,p.y+39);c.restore();
  };
})();
