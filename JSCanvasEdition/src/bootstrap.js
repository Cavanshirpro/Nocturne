/*
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade
This file is part of Nocturne. See LICENSE and NOTICE.
*/
document.addEventListener('DOMContentLoaded',async()=>{
  const N=window.Nocturne,menu=document.getElementById('menu');
  try{
    menu.innerHTML='<p class="eyebrow">LOADING NOCTURNE</p><h1 id="menu-title">Preparing the Hollow…</h1><p id="loading-status" role="status" aria-live="polite"></p>';
    const status=document.getElementById('loading-status');
    const images=await N.AssetLoader.load(window.NOCTURNE_ASSET_MANIFEST,{onProgress:({completed,total,key})=>{status.textContent=`${completed} / ${total} images${key?' · '+key:''}`;}});
    N.game=new N.Game(document.getElementById('game'),images);
  }catch(error){
    console.error(error);
    menu.innerHTML='<p class="eyebrow">ASSET LOADING FAILED</p><h1 id="menu-title">The grimoire could not open.</h1><p id="load-error" role="alert"></p><p>Keep the complete assets folder with index.html. Required assets must finish loading before a run can open. If your browser restricts local files, run python -m http.server 8000 from this folder.</p><button class="primary" id="retry-load">TRY AGAIN</button>';
    document.getElementById('load-error').textContent=error.message;
    document.getElementById('retry-load').addEventListener('click',()=>location.reload());
  }
});
