/*
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade
This file is part of Nocturne. See LICENSE and NOTICE.
*/
(() => {
  'use strict';
  const N=window.Nocturne,cache=new Map();
  N.AssetLoader={
    entries(manifest){
      if(!manifest||typeof manifest!=='object'||Array.isArray(manifest))throw new Error('Asset manifest is missing.');
      const entries=Object.entries(manifest);
      if(!entries.length)throw new Error('Asset manifest is empty.');
      const required=['ground','ground_ember','ground_moon','orb',...['S','SW','W','NW','N','NE','E','SE'].flatMap(d=>['witch_'+d,'witch_atlas_'+d,'demon_atlas_'+d]),...Object.keys(N.ENEMY_TYPES).flatMap(id=>[id,'enemy_atlas_'+id]),'enemy_ritual_warden','enemy_ritual_overlord',...['tree','arch','tomb','obelisk','wall','brazier','charred'].map(id=>'prop_'+id)];
      for(const key of required)if(!Object.hasOwn(manifest,key))throw new Error('Required asset missing from manifest: '+key);
      for(const [key,src] of entries)if(!/^[a-zA-Z0-9_]+$/.test(key)||typeof src!=='string'||!/^assets\/images\/[a-zA-Z0-9_./-]+\.webp$/.test(src)||src.split('/').includes('..'))throw new Error('Invalid asset path: '+key);
      return entries.filter(([key])=>!key.startsWith('enemy_walk_'));
    },
    async load(manifest,{onProgress=()=>{},ImageClass=window.Image}={}){
      const entries=this.entries(manifest),images={};let completed=0;
      onProgress({completed,total:entries.length,key:null});
      await Promise.all(entries.map(async([key,src])=>{
        if(!cache.has(src))cache.set(src,new Promise((resolve,reject)=>{
          const image=new ImageClass();
          image.onload=()=>image.naturalWidth>0&&image.naturalHeight>0?resolve(image):reject(new Error('Empty image: '+src));
          image.onerror=()=>reject(new Error('Missing or undecodable image: '+src));image.src=src;
        }).catch(error=>{cache.delete(src);throw error;}));
        images[key]=await cache.get(src);onProgress({completed:++completed,total:entries.length,key});
      }));
      return images;
    }
  };
})();
