/* Mixed encounter bands: weaker swarms, peers, and a minority of veterans. */
(() => {
  'use strict';
  const N=window.Nocturne;
  N.ENEMY_TRAITS=Object.freeze({
    none:{name:'Unmarked',icon:'',color:'#aebbb1',text:'Ordinary enemy.'},
    swift:{name:'Swift',icon:'»',color:'#b5d8dc',text:'+18% speed, −15% vitality.'},
    armored:{name:'Armored',icon:'⬡',color:'#c0c5d0',text:'18% damage reduction and −10% speed. Crits and Soul Lance bypass the armor.'},
    mending:{name:'Mending',icon:'✚',color:'#a8d6a6',text:'Heals 1.2% maximum vitality per second after two seconds without being hit.'},
    volatile:{name:'Volatile',icon:'✹',color:'#ecad85',text:'On death, leaves a small explosion with a 0.9s warning. Move out.'}
  });
  N.EnemyDirector={
    target(g){return Math.max(1,N.Difficulty.current(g).effectiveLevel);},
    bands(g){const p=N.Difficulty.current(g);return {fodder:p.fodder,regular:p.regular,veteran:p.veteran};},
    roll(g,ordinal){
      const level=this.target(g),actual=g.player.level,mix=this.bands(g),band=((ordinal%100)+100)%100;
      let tier=band<Math.round(mix.fodder*100)?'fodder':band<Math.round((mix.fodder+mix.regular)*100)?'regular':'veteran';
      const living=g.enemies.filter(e=>e.alive&&!e.boss);
      if(tier==='veteran'&&living.filter(e=>e.tier==='veteran').length>=Math.max(1,Math.ceil((living.length+1)*.12)))tier='regular';
      const int=(a,b)=>Math.floor(N.rand(a,b+1)),mature=N.clamp((level-8)/32,0,1);
      const lo=tier==='fodder'?Math.max(1,Math.floor(Math.min(actual>=40?actual*.8:Infinity,level*(70-20*mature)/100))):tier==='regular'?Math.max(1,Math.floor(level*.75)):Math.max(level+1,Math.ceil(level*105/100));
      const hi=tier==='fodder'?Math.max(lo,Math.floor(Math.min(actual>=40?actual*.95:Infinity,level*(90-20*mature)/100))):tier==='regular'?Math.max(lo,level):Math.max(lo,Math.floor(level*110/100));
      const elite=tier==='veteran'&&Math.random()<.20;
      const trait=g.wave>=4&&tier!=='fodder'&&Math.random()<(tier==='veteran'?.5:.08)?N.pick(['swift','armored','mending','volatile']):'none';
      return {level:int(lo,hi),tier,trait,elite};
    }
  };
})();
