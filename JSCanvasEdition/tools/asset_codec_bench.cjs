/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
// Optional image-only measurement: Playwright, local Chromium, unpacked v0.8.0.
const fs=require('fs'),path=require('path'),http=require('http'),{chromium}=require('playwright');
const roots={webp:path.resolve(__dirname,'..'),png:path.resolve(process.argv[2]||'')};
if(!process.argv[2])throw Error('Pass the unpacked v0.8.0 JSCanvasEdition path.');
const server=http.createServer((request,response)=>{
  const parts=new URL(request.url,'http://localhost').pathname.split('/').filter(Boolean),root=roots[parts.shift()];
  if(root&&parts.join('/')==='probe.html'){response.setHeader('Content-Type','text/html');response.end('<!doctype html><script src="assets/manifest.js"></script>');return;}
  const file=root&&path.resolve(root,...parts);
  if(!root||!file.startsWith(root+path.sep)){response.writeHead(404);response.end();return;}
  try{response.setHeader('Content-Type',({'.webp':'image/webp','.png':'image/png','.js':'application/javascript'})[path.extname(file)]||'application/octet-stream');response.end(fs.readFileSync(file));}catch{response.writeHead(404);response.end();}
});
let browser;
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,...(process.env.NOCTURNE_CHROMIUM?{executablePath:process.env.NOCTURNE_CHROMIUM}:{}),args:['--disable-gpu']});
  const observations=[];
  for(let round=0;round<5;round++)for(const version of round%2?['webp','png']:['png','webp']){
    const context=await browser.newContext(),page=await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/${version}/probe.html`);
    const result=await page.evaluate(async()=>{
      const start=performance.now(),sources=Object.entries(NOCTURNE_ASSET_MANIFEST).filter(([key])=>!key.startsWith('enemy_walk_'));
      const images=await Promise.all(sources.map(([,src])=>new Promise((resolve,reject)=>{const im=new Image();im.onerror=()=>reject(Error(src));im.onload=async()=>{try{await im.decode();resolve(im);}catch(e){reject(e);}};im.src=src;})));
      return {decodeMilliseconds:performance.now()-start,images:images.length,rawRGBABytes:images.reduce((sum,im)=>sum+im.naturalWidth*im.naturalHeight*4,0),encodedBodyBytes:performance.getEntriesByType('resource').reduce((sum,r)=>sum+r.encodedBodySize,0)};
    });
    observations.push({round,version,...result});await context.close();
  }
  const summaries=Object.fromEntries(['png','webp'].map(version=>{const values=observations.filter(r=>r.version===version).map(r=>r.decodeMilliseconds).sort((a,b)=>a-b);return [version,{minimum:values[0],median:values[2],maximum:values[4]}];}));
  const report={date:new Date().toISOString(),browser:browser.version(),method:'55 active images only, Image.decode(), five fresh contexts per codec, alternating order. Excludes game JS, simulation, GPU memory and cold OS disk cache guarantees.',observations,summaries};
  fs.writeFileSync(process.env.NOCTURNE_CODEC_REPORT||path.join(roots.webp,'validation-logs/codec-benchmark-v081.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
