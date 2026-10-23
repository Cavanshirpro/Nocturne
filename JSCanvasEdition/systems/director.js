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
    target(g){return Math.max(1,Math.round(g.player.level+.18*(g.wave-1)-.1*Math.sqrt(Math.max(0,g.player.level-1))));},
    roll(g,ordinal){
      const target=this.target(g),band=ordinal%20;
      let tier=band<7?'fodder':band<17||g.wave<3?'regular':'veteran';
      const living=g.enemies.filter(e=>e.alive);
      if(tier==='veteran'&&living.filter(e=>e.tier==='veteran').length>=Math.max(1,Math.ceil((living.length+1)*.22)))tier='regular';
      const int=(a,b)=>Math.floor(N.rand(a,b+1));
      const level=tier==='fodder'?int(Math.max(1,Math.floor(target*.5)),Math.max(1,target-3)):
        tier==='veteran'?int(target+2,target+3):int(Math.max(1,target-1),target+1);
      const elite=tier==='veteran'&&Math.random()<.32;
      const trait=g.wave>=4&&tier!=='fodder'&&Math.random()<(tier==='veteran'?.65:.14)?N.pick(['swift','armored','mending','volatile']):'none';
      return {level,tier,trait,elite};
    }
  };
})();
