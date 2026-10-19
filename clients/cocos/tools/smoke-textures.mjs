import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
const name=process.env.REALQUEST_ENGINE||'chromium';assert(['chromium','firefox','webkit'].includes(name));
const engine=createRequire(new URL('../../../package.json',import.meta.url))('playwright')[name],test=await browserConfig('textures');await test.assertDatabase();
const build=JSON.parse(await fs.readFile(path.join(test.build.directory,'realquest-build.json'),'utf8'));
const root=new URL('../../../',import.meta.url);
const original=JSON.parse(await fs.readFile(new URL('clients/cocos/assets/resources/scenes/terrain.png.meta',root),'utf8')).uuid;
const compact=JSON.parse(await fs.readFile(new URL('clients/cocos/assets/resources/scenes/terrain-web.webp.meta',root),'utf8')).uuid;
const originalFile=build.payload.find(r=>r.path.includes('/'+original+'.')&&r.path.endsWith('.png'));
const compactFile=build.payload.find(r=>r.path.includes('/'+compact+'.')&&r.path.endsWith('.webp'));
assert(originalFile&&compactFile);assert(compactFile.bytes<originalFile.bytes);
const pngURL=test.baseURL+'/'+originalFile.path,webpURL=test.baseURL+'/'+compactFile.path;
const report={kind:'lossless-terrain-capability-and-recovery',engine:name,checks:[],captures:[],errors:[],observations:[],complete:false,scope:'Actual locked desktop engines, native controls and same-image decoder equality. Explicit unsupported-WebP fixture is not a physical device or branded Safari test.'};
let browser,page;const contexts=[];
const read=p=>p.evaluate(()=>JSON.parse(render_game_to_text()));
async function until(p,predicate,label,timeout=30000){for(let t=Date.now();Date.now()-t<timeout;){const s=await read(p);if(predicate(s))return s;await p.waitForTimeout(80);}throw Error(label+': '+JSON.stringify(await read(p)));}
async function ready(p){await p.waitForFunction(()=>window.render_game_to_text&&JSON.parse(render_game_to_text()).loaded&&!document.getElementById('rq-boot'),null,{timeout:45000});}
async function action(p,id){await until(p,s=>s.controls.some(c=>c.id===id&&!c.disabled),id);await p.locator('[data-realquest-control="'+id+'"]').focus();await p.keyboard.press('Enter');await p.waitForTimeout(120);}
async function world(p){for(let i=0;i<10&&(await read(p)).mode!=='world';i++){await p.keyboard.press('Escape');await p.waitForTimeout(100);}await until(p,s=>s.mode==='world'&&s.connection==='ready'&&!s.busy&&!s.pendingAction,'world');}
async function shot(p,label){await p.screenshot({path:path.join(test.directory,label+'.png')});report.captures.push(label+'.png');}
async function exported(p){const a=await p.evaluate(()=>JSON.parse(localStorage.getItem('realquest-session-v2')));const r=await p.request.get(test.baseURL+'/api/export',{headers:{Authorization:'Bearer '+a.token}});assert.equal(r.status(),200);return r.json();}
async function create(options={}){
 const context=await browser.newContext({viewport:{width:1440,height:900},...options});contexts.push(context);const p=await context.newPage();const observation={png:0,webp:0,stage:'normal'};
 p.on('request',r=>{if(r.url()===pngURL)observation.png++;if(r.url()===webpURL)observation.webp++;});
 p.on('pageerror',e=>{report.observations.push({stage:observation.stage,pageerror:e.message});report.errors.push(e.message);});
 p.on('console',m=>{if(m.type()!=='error')return;const text=m.text(),url=m.location().url;const expected=observation.stage==='webp-503'&&(url===webpURL||text.includes(webpURL)||text.includes(compact));report.observations.push({stage:observation.stage,text,url,expected});if(!expected)report.errors.push(text);});
 return {context,p,observation};
}
try{
 browser=await launchBrowser(engine,{headless:true,...(name==='chromium'&&process.env.REALQUEST_CHROMIUM_EXECUTABLE?{executablePath:process.env.REALQUEST_CHROMIUM_EXECUTABLE}:{})});report.browserVersion=browser.version();
 const normal=await create();page=normal.p;await page.goto(test.baseURL);await ready(page);assert.equal(normal.observation.webp,1);assert.equal(normal.observation.png,0);await action(page,'start');await until(page,s=>s.mode==='world'&&s.connection==='ready'&&!s.busy&&!s.pendingAction,'original world');
 const save=(await read(page)).saveId,credential=await page.evaluate(()=>localStorage.getItem('realquest-session-v2')),initial=(await exported(page)).state;
 const x=(await read(page)).player.x;await page.keyboard.down('d');try{await page.waitForTimeout(250);}finally{await page.keyboard.up('d');}await until(page,s=>s.savedPosition.x>x&&!s.busy&&!s.pendingAction,'first native world movement');
 await page.keyboard.press('m');await until(page,s=>s.mode==='map','map');await shot(page,'webp-map');await world(page);await page.keyboard.press('i');await until(page,s=>s.mode==='inventory','satchel');await shot(page,'webp-satchel');await world(page);
 report.checks.push('Native boot requests only the lossless terrain on a supported engine; first Enter-to-movement saves and original map/satchel remain usable');
 report.decoded=await page.evaluate(async ({pngURL,webpURL})=>{
  const decode=async url=>{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const pixels=canvas.getContext('2d',{willReadFrequently:true});pixels.drawImage(image,0,0);const bytes=pixels.getImageData(0,0,canvas.width,canvas.height).data;const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');return {width:canvas.width,height:canvas.height,rgbaSHA256:hash};};
  return {png:await decode(pngURL),webp:await decode(webpURL)};
 },{pngURL,webpURL});assert.deepEqual(report.decoded.webp,report.decoded.png);assert.deepEqual([report.decoded.png.width,report.decoded.png.height],[3840,2560]);report.checks.push('Actual browser decoders return identical full-size RGBA pixels for the PNG fallback and WebP derivative');
 await action(page,'life');await until(page,s=>s.mode==='life'&&!s.pendingAction&&!s.busy,'pause before failure');const beforeFailure=(await exported(page)).state;
 let failures=0;normal.observation.stage='webp-503';await page.route(webpURL,route=>{failures++;return route.fulfill({status:503,contentType:'image/webp',body:''});});await page.reload();const failure=page.getByRole('dialog',{name:'旅途资源未能载入',exact:true});await failure.waitFor({state:'visible',timeout:45000});assert(failures>0);assert.equal(await page.evaluate(()=>localStorage.getItem('realquest-session-v2')),credential);await shot(page,'webp-resource-503');
 await page.unroute(webpURL);normal.observation.stage='normal';await page.getByRole('button',{name:'重新载入旅程',exact:true}).focus();await page.keyboard.press('Enter');await ready(page);await action(page,'start');await until(page,s=>s.mode==='world'&&s.connection==='ready'&&!s.pendingAction&&!s.busy,'same guest after actual retry');assert.equal((await read(page)).saveId,save);assert.equal(await page.evaluate(()=>localStorage.getItem('realquest-session-v2')),credential);const afterFailure=(await exported(page)).state;assert.deepEqual(afterFailure.inventory,initial.inventory);assert.deepEqual(afterFailure.position,beforeFailure.position);assert.equal(afterFailure.knowledge_points,initial.knowledge_points);await shot(page,'webp-same-guest-recovered');report.checks.push('Actual required WebP503 reaches the native failure/retry page and original credential, position, possessions and points survive real reload');
 await action(page,'life');await until(page,s=>!s.pendingAction&&!s.busy,'pause original guest');await normal.context.close();
 const fallback=await create({userAgent:'RealQuest-PNG-Fallback-Capability-Fixture'});page=fallback.p;
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.toDataURL;HTMLCanvasElement.prototype.toDataURL=function(type,...args){return type==='image/webp'?'data:image/png;base64,':original.call(this,type,...args);};});
 await page.goto(test.baseURL);await ready(page);assert.equal(fallback.observation.webp,0);assert.equal(fallback.observation.png,1);await action(page,'start');await until(page,s=>s.mode==='world'&&s.connection==='ready'&&!s.busy&&!s.pendingAction,'PNG fallback world');const start=(await read(page)).player.x;await page.keyboard.down('d');try{await page.waitForTimeout(250);}finally{await page.keyboard.up('d');}await until(page,s=>s.savedPosition.x>start&&!s.pendingAction,'PNG fallback native move');await shot(page,'unsupported-webp-original-png');await action(page,'life');await until(page,s=>!s.pendingAction&&!s.busy,'pause fallback guest');report.checks.push('Explicit unsupported-WebP capability fixture requests and renders only the original PNG, preserving native world input');
 assert.deepEqual(report.errors,[]);report.complete=true;
}catch(e){report.error=String(e);process.exitCode=1;if(page&&!page.isClosed())try{await shot(page,'failure');await fs.writeFile(path.join(test.directory,'failure-state.json'),JSON.stringify(await read(page),null,2));}catch{}}
finally{const closed=await Promise.allSettled(contexts.map(c=>c.close()));if(browser)await closeBrowser(browser);report.cleanupErrors=closed.filter(x=>x.status==='rejected').map(x=>String(x.reason));if(report.cleanupErrors.length){report.complete=false;process.exitCode=1;}await fs.writeFile(path.join(test.directory,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({engine:name,complete:report.complete,checks:report.checks.length,error:report.error}));}
