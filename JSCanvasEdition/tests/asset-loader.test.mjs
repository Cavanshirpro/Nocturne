/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
import test from 'node:test';import assert from 'node:assert/strict';import {createHarness} from './helpers.mjs';
test('loader validates all paths before decoding and never starts a save on failure',async()=>{
  const {N,sandbox,memory}=createHarness();let decoded=0;
  class Image{set src(v){decoded++;this.naturalWidth=this.naturalHeight=1;queueMicrotask(()=>this.onload());}}
  for(const value of [null,[],{}, {...sandbox.NOCTURNE_ASSET_MANIFEST,ground:'https://example.com/g.png'}, {...sandbox.NOCTURNE_ASSET_MANIFEST,ground:'assets/images/../g.png'}])await assert.rejects(N.AssetLoader.load(value,{ImageClass:Image}));
  const missing={...sandbox.NOCTURNE_ASSET_MANIFEST};delete missing.ground;await assert.rejects(N.AssetLoader.load(missing,{ImageClass:Image}),/Required asset/);assert.equal(decoded,0);assert.equal(memory.size,0);
});
test('measured loading progress reaches exactly 55 images and successful decodes are shared',async()=>{
  const {N,sandbox}=createHarness();let decoded=0;const progress=[];
  class Image{set src(v){decoded++;this.naturalWidth=96;this.naturalHeight=128;queueMicrotask(()=>this.onload());}}
  const a=await N.AssetLoader.load(sandbox.NOCTURNE_ASSET_MANIFEST,{ImageClass:Image,onProgress:p=>progress.push(p.completed)}),b=await N.AssetLoader.load(sandbox.NOCTURNE_ASSET_MANIFEST,{ImageClass:Image});
  assert.equal(decoded,55);assert.equal(Object.keys(a).length,55);assert.equal(a.ground,b.ground);assert.equal(progress[0],0);assert.equal(progress.at(-1),55);assert.equal(new Set(progress).size,56);
});
test('missing files and decode failures identify their path and can be retried',async()=>{
  const {N,sandbox,memory}=createHarness();class Broken{set src(v){queueMicrotask(()=>this.onerror());}}
  await assert.rejects(N.AssetLoader.load(sandbox.NOCTURNE_ASSET_MANIFEST,{ImageClass:Broken}),/Missing or undecodable image: assets\/images\//);assert.equal(memory.size,0);
  class Good{set src(v){this.naturalWidth=this.naturalHeight=1;queueMicrotask(()=>this.onload());}}
  assert.equal(Object.keys(await N.AssetLoader.load(sandbox.NOCTURNE_ASSET_MANIFEST,{ImageClass:Good})).length,55);
});
