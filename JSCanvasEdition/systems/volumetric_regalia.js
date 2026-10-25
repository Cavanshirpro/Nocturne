/* Nocturne v5.2.1 — Depth & silhouette pass.
 * Cosmetic adapter around the v5.2.0 appearance composer. No save fields,
 * game clocks, RNG, hitboxes or combat behaviour are changed.
 */
(() => {
  'use strict';
  const N = window.Nocturne, A = N.Appearance, TAU = Math.PI * 2;
  const angleOf = Object.freeze({S:0, SW:1, W:2, NW:3, N:4, NE:5, E:6, SE:7});
  const sourceBack = A.playerBack, sourceFront = A.playerFront;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const P = (p) => {
    const a = (angleOf[p.facing] ?? 0) * Math.PI / 4;
    const frozen = p.game.reducedMotion || p.frozen > 0;
    const time = frozen ? 0 : p.game.time || 0;
    const gait = frozen ? 0 : Math.sin(p.walk || 0);
    return {
      a, time, gait, quality:p.game.quality,
      p(x, y, z) {
        return [p.x + (x*Math.cos(a) - y*Math.sin(a)) * 5/6,
                p.y - 2 + (x*Math.sin(a) + y*Math.cos(a)) * .401 - z * .744];
      },
      depth(x, y) { return x*Math.sin(a) + y*Math.cos(a); }
    };
  };
  function pen(c, r) {
    return {
      line(points, color, width=1) {
        c.strokeStyle=color;c.lineWidth=width;c.beginPath();
        for(let i=0;i<points.length;i++){
          const [x,y]=r.p(...points[i]);c[i?'lineTo':'moveTo'](x,y);
        }c.stroke();
      },
      poly(points, fill, stroke) {
        c.beginPath();for(let i=0;i<points.length;i++){
          const [x,y]=r.p(...points[i]);c[i?'lineTo':'moveTo'](x,y);
        }c.closePath();c.fillStyle=fill;c.fill();
        if(stroke){c.lineWidth=.8;c.strokeStyle=stroke;c.stroke();}
      },
      gem(x,y,z,size,color) {
        this.poly([[x,y,z+size],[x+size*.7,y,z],[x,y,z-size],[x-size*.7,y,z]],'#1a2633',color);
        this.line([[x,y,z+size],[x,y,z-size]],color,.65);
      },
      orb(x,y,z,size,color) {
        const [xx,yy]=r.p(x,y,z);c.beginPath();c.arc(xx,yy,size,0,TAU);c.fillStyle=color;c.fill();
      },
      ring(x,y,z,size,color) {
        const [xx,yy]=r.p(x,y,z);c.beginPath();c.ellipse(xx,yy,size,size*.55,0,0,TAU);
        c.strokeStyle=color;c.lineWidth=.9;c.stroke();
      }
    };
  }
  function colors(p, d) {
    const base = p.coven==='ash' ? ['#352d40','#4d3749','#766075'] :
      p.coven==='moon' ? ['#302e47','#51465c','#9580a4'] : ['#263c47','#3b5260','#7da0a9'];
    return d.demon ? ['#40253b','#6c4056','#ce8da8'] : base;
  }
  // An actual elliptical robe cross section. Front-facing facets are drawn
  // *over* the atlas only for the side views, where the 2D panels formerly
  // collapsed to an edge. All facings retain the same projected anchor.
  function robe(c, r, palette, front, sideOnly, stage) {
    const strength = clamp((Math.abs(Math.sin(r.a))-.28)/.65, 0, .8);
    if(sideOnly && strength===0)return;
    c.save();c.globalAlpha *= sideOnly ? strength : .95;
    const b=pen(c,r),sections=r.quality==='low'?8:14;
    const facets=[];
    for(let i=0;i<sections;i++){
      const t=i*TAU/sections,u=(i+1)*TAU/sections,mid=(t+u)*.5;
      const nx=Math.cos(mid),ny=Math.sin(mid);
      const exposed = nx*Math.sin(r.a)+ny*Math.cos(r.a);
      if(front ? exposed < .06 : exposed >= .06)continue;
      const sway=r.gait*1.6+Math.sin(r.time*1.6+mid)*.65;
      const skirt=(a)=>[(21+stage*.45)*Math.cos(a)+sway,(17+stage*.3)*Math.sin(a)-1,11];
      const waist=(a)=>[10.5*Math.cos(a),11.5*Math.sin(a),54];
      facets.push({depth:exposed,pts:[skirt(t),skirt(u),waist(u),waist(t)],shade:((i+sections)%3)});
    }
    facets.sort((a,b)=>a.depth-b.depth);
    for(const f of facets) {
      b.poly(f.pts,palette[f.shade]);
      if(front && f.shade!==0)b.line([f.pts[0],f.pts[3]],palette[2]+'7d',.65);
    }
    // Contoured cuirass holds its full side depth, even when the original
    // corset's flat front surface turns perpendicular to the camera.
    if(front && sideOnly){
      b.poly([[-9,8,60],[0,12,62],[9,8,60],[11,7,49],[0,12,43],[-11,7,49]],palette[0],palette[2]);
      b.line([[-10,8,57],[0,11,58],[10,8,57]],palette[2],1.1);
    }
    c.restore();
  }
  function rim(c,r,front,col) {
    // Segmented, pitched hat brim: broad in x AND y, so side views have
    // thickness. Rear half goes behind the atlas; near half over it.
    const b=pen(c,r),count=r.quality==='low'?12:20;
    for(let i=0;i<count;i++){
      const t=i*TAU/count,u=(i+1)*TAU/count,m=(t+u)/2;
      const near=Math.cos(m)*Math.sin(r.a)+Math.sin(m)*Math.cos(r.a)>0;
      if(near!==front)continue;
      const point=(a,z)=>[27*Math.cos(a),16*Math.sin(a),z+Math.sin(a)*1.5];
      b.poly([point(t,94),point(u,94),point(u,96),point(t,96)],'#1b1d2c',col);
      if(i%3===0)b.line([point(t,96),point(u,96)],col,1);
    }
  }
  // The original compositor is still used for boss, enemy and effects; for the
  // player, crowded per-stat ticks are replaced with recognizable ensembles.
  function clearDescriptor(d) {
    return {...d,spells:[],stats:Object.fromEntries(Object.keys(d.stats).map(id=>[id,0])),
      talents:[],relics:[],specials:[],oath:null,essence:0,stage:Math.min(d.stage,3)};
  }
  function spellLayer(c,p,d,r,front) {
    const b=pen(c,r);
    // Keep the v5.2.0 attachment API, including per-spell detail and grade.
    const originalRig={...r,p:(x,y,z)=>{const [x2,y2]=r.p(x,y,z);return {x:x2,y:y2};},
      scale:1,clock:r.time,depth:r.depth,gait:r.gait};
    for(const item of d.spells){
      if((r.depth(item.slot[0],item.slot[1])>=0)!==front)continue;
      // Preserve all twelve unique 3D equipment anchors and their mastery,
      // but keep each frame's drawing strictly tied to existing player state.
      A.spellPart(c,b,originalRig,item);
    }
  }
  function equipment(c,p,d,r) {
    // Physically front-mounted equipment is occluded on rearward facings;
    // back-mounted spell parts are handled separately by spellLayer().
    if(r.depth(0,12)<-2){
      const b=pen(c,r),col=N.COVENS[p.coven].color;
      for(let i=0;i<d.stage;i++)b.gem((i-(d.stage-1)/2)*5,-15,62,1.8,col);
      return;
    }
    const b=pen(c,r),col=N.COVENS[p.coven].color,stats=d.stats;
    const grade=(...names)=>Math.max(...names.map(n=>stats[n]||0));
    // Three readable systems: offensive focus, defensive cuirass, mobility kit.
    const offense=grade('damage','haste','projectiles','critical','criticalPower','range','pierce');
    const defense=grade('armor','vitality','regen');
    const mobility=grade('speed','dash','pickup');
    if(offense){
      b.poly([[21,5,63],[27,7,68],[25,6,76],[20,5,72]],'#44374a',col);
      b.gem(24,8,70,2+offense*.4,'#ecd1a4');
      for(let i=0;i<Math.min(3,offense);i++)b.line([[21,8,64+i*3],[24,8,65+i*3]],'#e3bb8f',.8);
    }
    if(defense){
      b.poly([[-9,12,57],[0,14,61],[9,12,57],[7,14,48],[0,15,45],[-7,14,48]],'#303c49',col);
      b.gem(0,16,53,2.1+defense*.5,'#b8e5c5');
      for(const s of [-1,1])if(defense>2)b.line([[s*9,12,58],[s*13,12,62],[s*15,13,57]],'#9db8ba',1);
    }
    if(mobility){
      for(const s of [-1,1]){
        b.poly([[s*8,7,11],[s*(12+mobility),4,18],[s*11,8,10]],'#35545c',col);
        if(mobility>2)b.line([[s*5,8,9],[s*11,9,12]],'#d4ddd4',1);
      }
      if(stats.pickup)b.ring(-9,11,37,2+Math.min(stats.pickup,3),'#bfa97d');
    }
    // Extra categories are differentiated by the exact color and grade of
    // the shared fixture, not dozens of independent overlapping glyphs.
    if(stats.critical)b.gem(-4,7,99,1.5+stats.critical*.28,'#e8ca8e');
    if(stats.criticalPower)b.gem(4,7,99,1.5+stats.criticalPower*.28,'#e4b7d8');
    if(stats.regen)b.gem(-8,12,43,2,'#99d9b8');
    if(stats.pierce)b.line([[24,7,72],[27,7,81+stats.pierce]],'#e1c6ed',1.1);
    // Six talents form a restrained throat/cape sigil, spaced rather than
    // randomly stacked on the torso and legs.
    const talents={scavenger:[-11,10,36,'#ddc28d'],kindling:[-14,8,54,'#f4a47e'],
      veil:[10,8,17,'#a7d5d2'],frostbite:[-4,10,64,'#a9dceb'],
      bloodledger:[12,11,34,'#e8a3ba'],focus:[5,9,79,'#e7c897']};
    for(const t of d.talents){const spec=talents[t.id];if(!spec)continue;
      b.gem(spec[0],spec[1],spec[2],1.6+Math.min(3,t.band)*.45,spec[3]);}
    // Relics are ordered along one belt, instead of being mixed into every
    // weapon and shoulder fixture. Each ownership state remains visible.
    d.relics.forEach((id,i)=>{
      const row=Math.floor(i/6),colIdx=i%6;
      const spell=Object.entries(N.WEAPONS).find(([,weapon])=>weapon.relic===id)?.[0];
      b.gem(-11+colIdx*4.3,14,40-row*4,1.25,A.colors[spell]||'#e7cfa7');
    });
    const ritualX={slash:-11,frostfall:0,soulstorm:11};
    for(const s of d.specials){const x=ritualX[s.id];if(x===undefined)continue;
      const color=s.id==='slash'?'#f2c594':s.id==='frostfall'?'#bae5ff':'#e6b2ec';
      b.gem(x,9,68,s.selected?3.3:2.2,color);
      if(s.selected)b.ring(x,9,68,4.7,color);
    }
    if(d.oath)b.gem(0,16,34,3.8,({ember:'#ffc195',stone:'#d7d8db',wisdom:'#c9bded',pilgrim:'#b9e8e0',fortune:'#e6c789'})[d.oath]||col);
    if(d.essence)b.gem(-16,11,28,2+Math.min(4,d.essence)*.48,'#dda9e5');
    // Rank ornaments are a single crown strip rather than repeated needles.
    if(d.stage>2){for(let i=0;i<Math.min(d.stage,5);i++)b.gem((i-(Math.min(d.stage,5)-1)/2)*5,5,d.demon?100:104,2,col);}
  }
  A.playerBack=function(c,p,d=this.player(p)){
    const r=P(p),palette=colors(p,d);c.save();
    robe(c,r,palette,false,false,d.stage);
    if(!d.demon)rim(c,r,false,N.COVENS[p.coven].color);
    sourceBack.call(this,c,p,clearDescriptor(d));
    spellLayer(c,p,d,r,false);c.restore();
  };
  A.playerFront=function(c,p,d=this.player(p)){
    const r=P(p),palette=colors(p,d);c.save();
    robe(c,r,palette,true,true,d.stage);
    if(!d.demon)rim(c,r,true,N.COVENS[p.coven].color);
    spellLayer(c,p,d,r,true);
    equipment(c,p,d,r);
    sourceFront.call(this,c,p,clearDescriptor(d));c.restore();
  };
  A.volumeVersion='5.2.1';
})();
