/* SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2026 Javanshir Gurbanzade. See LICENSE and NOTICE. */
// Optional dependency: Playwright and a local Chromium. No runtime dependency.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),report={engine:'Chromium',checks:[],layouts:[],errors:[],screenshots:[]};
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  try{res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.gif':'image/gif','.json':'application/json'})[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
});
let browser;
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);console.log('PASS '+name);};
async function ready(page,url){const start=Date.now();await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.Nocturne?.game,null,{timeout:60000});return Date.now()-start;}
async function prepare(page){await page.evaluate(()=>{const N=Nocturne,g=N.game;g.reset();g.wave=3;g.player.level=10;g.player.weapons.bolt=g.player.weapons.orbit=4;g.sanctum={x:0,y:0,radius:420,phase:'cleared',bossId:1};g.nextId=1;g.bossDefeated=true;g.finishWave();g.ui.hudFrame=3;g.ui.updateHUD();document.getElementById('wave-banner').classList.remove('visible');});}
async function main(){
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,...(process.env.NOCTURNE_CHROMIUM?{executablePath:process.env.NOCTURNE_CHROMIUM}:{}),args:['--disable-gpu']});
  report.browserVersion=browser.version();
  for(const touch of [false,true]){
    const context=await browser.newContext({hasTouch:touch,isMobile:touch,viewport:{width:touch?390:1440,height:touch?844:900}}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
    const startup=await ready(page,base+'/index.html#verification');
    check('HTTP startup '+(touch?'touch':'desktop'),await page.evaluate(()=>Object.keys(Nocturne.game.images).length===55&&Nocturne.VERSION==='0.8.0'));
    report.layouts.push({touch,startupMilliseconds:startup});
    for(const [width,height] of touch?[[390,844],[390,640],[844,390]]:[[1440,900],[1240,660]]){
      await page.setViewportSize({width,height});await prepare(page);
      const result=await page.evaluate(()=>{const panel=document.getElementById('preparation-panel').getBoundingClientRect(),touch=document.getElementById('touch-zone').getBoundingClientRect();return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,panelVisible:!document.getElementById('preparation-panel').hidden,panelInside:panel.left>=0&&panel.right<=innerWidth&&panel.top>=0&&panel.bottom<=innerHeight,touchOverlap:matchMedia('(pointer:coarse)').matches&&panel.left<touch.right&&panel.right>touch.left&&panel.top<touch.bottom&&panel.bottom>touch.top};});
      report.layouts.push(result);check('Preparation fits '+width+'x'+height,!result.overflow&&result.panelVisible&&result.panelInside&&!result.touchOverlap);
      await page.click('#open-ascension');check('16 tier cards '+width+'x'+height,await page.locator('[data-ascension-tier]').count()===16);
      check('Ascension has no horizontal overflow '+width+'x'+height,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.click('#close-ascension');
    }
    if(!touch){
      await page.setViewportSize({width:1440,height:900});await prepare(page);await page.screenshot({path:path.join(root,'previews/preparation-v080.png')});report.screenshots.push('previews/preparation-v080.png');
      await page.click('#open-merchant');const remaining=await page.evaluate(()=>Nocturne.game.cycle.remaining);await page.evaluate(()=>Nocturne.game.update(3));check('Merchant blocks simulation timer',await page.evaluate(()=>Nocturne.game.cycle.remaining)===remaining);await page.click('#leave-merchant');
      await page.click('#open-ascension');await page.click('#begin-ascension-trial');check('Trial starts from real UI',await page.evaluate(()=>!!Nocturne.game.player.ascension.pendingTrial));
      await page.evaluate(()=>{const g=Nocturne.game;g.input.x=1;g.player.dash();for(let i=0;i<1220&&g.player.ascension.pendingTrial;i++)g.update(1/60);g.input.clear();});check('Trial earns +E',await page.evaluate(()=>Nocturne.game.player.ascension.currentTier==='e-plus'));
      await page.evaluate(()=>Nocturne.game.checkpoint('intermission'));const saved=await page.evaluate(()=>({remaining:Nocturne.game.cycle.remaining,gold:Nocturne.game.player.gold}));await page.reload();await page.waitForFunction(()=>Nocturne?.game);await page.click('#continue');
      check('Reloaded preparation retains tier and economy',await page.evaluate(s=>{const g=Nocturne.game;return g.cycle.phase==='INTERMISSION'&&g.player.ascension.currentTier==='e-plus'&&g.player.gold===s.gold&&Math.abs(g.cycle.remaining-s.remaining)<2;},saved));
      await page.click('#start-next-wave');check('Early wave starts once',await page.evaluate(()=>{const g=Nocturne.game;return g.wave===4&&g.cycle.phase==='COMBAT'&&!Nocturne.WaveCycle.start(g);}));
      const fixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/legacy/wave150.json'),'utf8'));await page.evaluate(d=>{const g=Nocturne.game;g.save.importData(JSON.stringify(d));g.continueRun();},fixture);
      check('Legacy summary and +C recognition are visible',await page.evaluate(()=>Nocturne.game.state==='ascension'&&Nocturne.game.player.ascension.currentTier==='c-plus'&&!!document.querySelector('.legacy-recognition')));
      await page.setViewportSize({width:1440,height:1200});await page.screenshot({path:path.join(root,'previews/ascension-v080.png')});report.screenshots.push('previews/ascension-v080.png');
    }
    await context.close();
  }
  const suite=await browser.newPage({viewport:{width:1440,height:1000}});suite.on('pageerror',e=>report.errors.push(e.message));await suite.goto(base+'/browser-tests.html');await suite.waitForFunction(()=>!document.getElementById('run').disabled);await suite.click('#run');await suite.waitForFunction(()=>!document.getElementById('run').disabled&&document.getElementById('results').textContent.includes('failed.'),null,{timeout:180000});report.existingSuite=await suite.locator('#results').innerText();console.log(report.existingSuite);check('Existing and new real Canvas suite',report.existingSuite.includes('0 failed.'));await suite.close();
  const offline=await browser.newPage();report.fileStartupMilliseconds=await ready(offline,pathToFileURL(path.join(root,'index.html')).href+'#verification');check('Direct file launch with PNG assets',await offline.evaluate(()=>Object.keys(Nocturne.game.images).length===55));await offline.close();
  const broken=await browser.newPage();await broken.route('**/assets/images/environments/grounds/ground.png',route=>route.abort());await broken.goto(base+'/index.html#verification');await broken.waitForSelector('#load-error');
  check('Missing image names the failed path without opening save state',await broken.evaluate(()=>!Nocturne.game&&document.getElementById('load-error').textContent.includes('ground.png')&&!localStorage.getItem('nocturne.coven.qa.v4')));await broken.close();
  check('No unexpected browser page errors',report.errors.length===0);
}
main().catch(error=>{report.failure=error.stack;console.error(error);process.exitCode=1;}).finally(async()=>{
  fs.writeFileSync(process.env.NOCTURNE_VERIFY_RESULT||path.join(root,'validation-logs/foundations-browser.json'),JSON.stringify(report,null,2));if(browser)await browser.close();server.close();
});
