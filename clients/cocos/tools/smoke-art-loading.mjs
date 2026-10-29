import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import {openSession} from './ui-navigation.mjs';
const require=createRequire(new URL('../../../package.json',import.meta.url)),{chromium}=require('playwright');
const test=await browserConfig('art-loading');await test.assertDatabase();
const report={complete:false,checks:[],errors:[],expected:[],captures:[]},releases=[];
const browser=await launchBrowser(chromium,{headless:true});let page,stage='normal',closing=false;
async function continueRoute(route){try{await route.continue();}catch(error){if(!closing)throw error;}}
const read=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function until(p,predicate,label){for(let i=0;i<800;i++){const s=await read(p);if(predicate(s))return s;await p.waitForTimeout(50);}throw Error(label+' '+JSON.stringify(await read(p)));}
async function click(p,id){const s=await until(p,s=>s.controls.some(c=>c.id===id&&!c.disabled),id),c=s.controls.find(c=>c.id===id);await p.getByRole('button',{name:c.accessibleName||c.label,exact:true}).focus();await p.keyboard.press('Enter');await p.waitForTimeout(120);}
async function field(p,id,value){const s=await until(p,s=>s.controls.some(c=>c.id===id&&!c.disabled),id),c=s.controls.find(c=>c.id===id);await p.getByRole('button',{name:'编辑 '+c.label,exact:true}).focus();await p.keyboard.press('Enter');await p.locator('input:focus,textarea:focus').fill(value);await p.keyboard.press('Escape');await p.waitForTimeout(100);}
async function ready(p){await p.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded&&!document.getElementById('rq-boot'));}
async function shot(p,name){await p.screenshot({path:test.directory+'/'+name+'.png'});report.captures.push(name+'.png');}
async function imageId(path){for(const ext of ['.webp','.png'])try{return JSON.parse(await fs.readFile(new URL('../assets/resources/'+path+ext+'.meta',import.meta.url),'utf8')).uuid;}catch{}throw Error('Missing real image '+path);}
const entryIds=await Promise.all(['ui/notice-paper-web','village/actor-0','village/actor-1','village/actor-2'].map(imageId));
const backgroundIds=await Promise.all(['ui/arrival-web','ui/register-web'].map(imageId));
const letter=await imageId('ui/letter-web'),terrain=await imageId('scenes/terrain-web'),satchel=await imageId('ui/satchel');
const native=url=>/\/assets\/resources\/native\/.*\.(?:png|webp)$/.test(url.pathname);
const matches=(url,ids)=>ids.some(id=>url.includes(id));
async function context(){const c=await browser.newContext({viewport:{width:1440,height:900}}),p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error'){if(stage==='normal')report.errors.push(m.text());else report.expected.push(m.text());}});return{c,p};}
async function exported(p){const session=await p.evaluate(()=>JSON.parse(localStorage.getItem('realquest-session-v2')));const r=await p.request.get(test.baseURL+'/api/export',{headers:{Authorization:'Bearer '+session.token}});assert.equal(r.status(),200);return r.json();}
try{
 const first=await context();page=first.p;
 let releaseBackground,releaseWorld;const heldBackground=new Promise(r=>releaseBackground=r),heldWorld=new Promise(r=>releaseWorld=r);releases.push(releaseBackground,releaseWorld);
 let backgrounds=0,worldRequests=0,creates=0,backgroundStarted;
 const backgroundSeen=new Promise(r=>backgroundStarted=r);
 page.on('request',r=>{if(new URL(r.url()).pathname==='/api/command'&&r.method()==='POST'&&r.postDataJSON().action==='create')creates++;});
 await page.route(native,async route=>{const url=route.request().url();if(matches(url,backgroundIds)){backgrounds++;backgroundStarted();await heldBackground;}else if(!matches(url,[...entryIds,letter])){worldRequests++;await heldWorld;}await continueRoute(route);});
 await page.goto(test.baseURL);await ready(page);
 assert.equal(worldRequests,0);await backgroundSeen;assert(backgrounds>0);assert((await read(page)).controls.find(c=>c.id==='start'&&!c.disabled));
 await shot(page,'entry-usable-with-background-held');
 await click(page,'import-save');await click(page,'session-tab-account');await click(page,'account-mode-register');
 await field(page,'account-username','loading_qa');await field(page,'account-password','a long woodland passphrase');await field(page,'account-confirm','a long woodland passphrase');await click(page,'account-submit');
 await until(page,s=>s.account?.username==='loading_qa'&&!s.busy,'registered before world assets');assert.equal(creates,0);assert.equal(worldRequests,0);
 await shot(page,'account-before-world-assets');
 await click(page,'session-close');await field(page,'traveler-name','分批加载旅人');await click(page,'start');
 await until(page,s=>s.assets.blocked&&s.controls.some(c=>c.id==='asset-back'),'world loading');assert(worldRequests>0);assert.equal(creates,1);
 const id=(await read(page)).saveId,before=await exported(page);
 await page.keyboard.down('KeyD');await page.keyboard.press('KeyE');await page.waitForTimeout(300);await page.keyboard.up('KeyD');
 assert.deepEqual((await exported(page)).state.position,before.state.position);
 await page.setViewportSize({width:740,height:360});await shot(page,'world-loading-landscape');
 const back=(await read(page)).controls.find(c=>c.id==='asset-back');assert(back.h>=44&&back.y+back.h/2<=360);
 await click(page,'asset-back');await until(page,s=>s.mode==='welcome'&&!s.busy,'back to entry');
 releaseWorld();releaseBackground();await until(page,s=>s.assets.pending.length===0,'old view downloads finish');
 assert.equal((await read(page)).mode,'welcome');assert.equal((await read(page)).saveId,id);
 await page.setViewportSize({width:1440,height:900});await click(page,'start');await until(page,s=>s.mode==='world'&&!s.busy&&!s.assets.blocked&&s.sceneId===s.location,'world ready');assert.equal(creates,1);
 assert.deepEqual((await exported(page)).state.inventory,before.state.inventory);await shot(page,'world-after-deferred-assets');
 report.checks.push('entry and real account registration remain usable while illustrated backgrounds and all world images are held; no world requests before play');
 report.checks.push('loading owns gameplay input; cancel remains on entry after stale completion; retrying play preserves the same save and exactly one create');
 let releaseSatchel;const heldSatchel=new Promise(r=>releaseSatchel=r);releases.push(releaseSatchel);
 const blockSatchel=url=>url.pathname.includes(satchel);
 await page.route(blockSatchel,async r=>{await heldSatchel;await continueRoute(r);});
 await click(page,'inventory');await until(page,s=>s.assets.blocked&&s.assets.view==='inventory','inventory demand');await shot(page,'inventory-loading-on-first-use');
 releaseSatchel();await until(page,s=>s.mode==='inventory'&&!s.busy&&!s.assets.blocked,'inventory ready');await until(page,s=>s.assets.pending.length===0,'inventory icons ready');await shot(page,'inventory-after-demand');
 for(let i=0;i<3&&(await read(page)).mode!=='world';i++){await page.keyboard.press('Escape');await page.waitForTimeout(150);}
 await openSession(page);await click(page,'session-tab-account');assert.equal((await read(page)).account.username,'loading_qa');await shot(page,'account-with-original-save');await first.c.close();
 report.checks.push('satchel waits only on first use; its icons and original account/save remain available after completion');

 stage='deliberate-world-asset-failure';const second=await context();page=second.p;let failures=0,secondCreates=0;
 page.on('request',r=>{if(new URL(r.url()).pathname==='/api/command'&&r.method()==='POST'&&r.postDataJSON().action==='create')secondCreates++;});
 const blockTerrain=url=>url.pathname.includes(terrain);
 await page.route(blockTerrain,r=>{failures++;return r.fulfill({status:503,contentType:'image/webp',body:''});});
 await page.goto(test.baseURL);await ready(page);await click(page,'start');await until(page,s=>s.assets.failed&&s.controls.some(c=>c.id==='asset-retry'),'world asset failure');
 assert(failures>0);assert.equal(secondCreates,1);const failedId=(await read(page)).saveId,failedState=await exported(page);await shot(page,'world-asset-failed-with-retry');
 await page.unroute(blockTerrain);await click(page,'asset-retry');await until(page,s=>s.mode==='world'&&!s.busy&&!s.assets.blocked&&s.sceneId===s.location,'retried world');
 assert.equal((await read(page)).saveId,failedId);assert.equal(secondCreates,1);assert.deepEqual((await exported(page)).state.inventory,failedState.state.inventory);
 await shot(page,'world-asset-retry-preserves-save');await second.c.close();stage='normal';
 report.checks.push('a real503 for the current scene reaches an accessible resource-only retry; retry preserves identity/inventory and does not create another character');
 assert.deepEqual(report.errors,[]);report.complete=true;
}catch(error){report.error=String(error);if(page&&!page.isClosed())try{await shot(page,'failure');await fs.writeFile(test.directory+'/failure-state.json',JSON.stringify(await read(page),null,2));}catch{}throw error;}
finally{closing=true;for(const release of releases)release();await closeBrowser(browser);await fs.writeFile(test.directory+'/result.json',JSON.stringify(report,null,2)+'\n');}
