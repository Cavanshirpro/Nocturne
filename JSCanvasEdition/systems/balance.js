/* Combat distances are world units, independent of the camera and screen size. */
(() => {
  'use strict';
  const N=window.Nocturne;
  N.BALANCE=Object.freeze({boltRange:430,boltTravel:490,lightningRange:390,chainRange:170,evolvedChainRange:210,
    minAttackInterval:.24,maxDamage:95,maxSpeed:300,maxProjectileSpeed:850,maxPickupRadius:190,maxCrit:.45,maxArmor:.45,maxRegen:1.2,minDashCooldown:1.25,maxHp:320});
  N.balancePlayer=p=>{
    const b=N.BALANCE;
    p.damage=N.clamp(p.damage,1,b.maxDamage);p.speed=N.clamp(p.speed,1,b.maxSpeed);
    p.attackInterval=N.clamp(p.attackInterval,b.minAttackInterval,10);
    p.projectileSpeed=N.clamp(p.projectileSpeed,1,b.maxProjectileSpeed);
    p.pickupRadius=N.clamp(p.pickupRadius,1,b.maxPickupRadius);
    p.critChance=N.clamp(p.critChance,0,b.maxCrit);p.armor=N.clamp(p.armor,0,b.maxArmor);p.regen=N.clamp(p.regen,0,b.maxRegen);
    p.dashCooldown=Math.max(b.minDashCooldown,p.dashCooldown);p.maxHp=Math.min(b.maxHp,p.maxHp);p.hp=Math.min(p.hp,p.maxHp);
    return p;
  };
})();
