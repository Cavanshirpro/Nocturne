/*
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade
This file is part of Nocturne. See the distribution's LICENSE and NOTICE files.
*/
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export function createHarness(){
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const elements=new Map();
const docEvents=new Map();
function element(){return {hidden:false,style:{},dataset:{},innerHTML:'',textContent:'',classList:{add(){},remove(){}},addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},focus(){},contains(){return false;},getBoundingClientRect(){return {left:0,top:0,width:106,height:106};}};}
const gradient={addColorStop(){}};
const context=new Proxy({createPattern:()=>({}),createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>{o[k]=v;return true;}});
const state={seed:271828};
const seededMath=Object.create(Math);
seededMath.random=()=>{state.seed=(state.seed*1664525+1013904223)>>>0;return state.seed/4294967296;};
const memory=new Map();
const sandbox={console,Math:seededMath,Float32Array,localStorage:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},document:{hidden:false,addEventListener(type,fn,options){if(!docEvents.has(type))docEvents.set(type,[]);docEvents.get(type).push({fn,options});},getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}},innerWidth:1280,innerHeight:800,devicePixelRatio:1,addEventListener(){},matchMedia:()=>({matches:false})};
sandbox.window=sandbox;
vm.createContext(sandbox);
for(const [,source] of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script defer src="([^"]+)"/g)){const name=source.split('?')[0];vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),sandbox,{filename:name});}
const N=sandbox.Nocturne;
const images=Object.fromEntries(Object.keys(sandbox.NOCTURNE_ASSET_MANIFEST).map(k=>[k,{}]));
const create=()=>new N.Game({getContext:()=>context},images);
return {root,elements,docEvents,element,context,memory,sandbox,N,images,create,state,gradient,seededMath};
}
export function clearedGuardian(g){g.sanctum={x:g.player.x,y:g.player.y,radius:420,phase:'cleared',bossId:1};g.nextId=Math.max(1,g.nextId);g.bossDefeated=true;return g.finishWave();}
