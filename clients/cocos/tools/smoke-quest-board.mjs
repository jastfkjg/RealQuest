import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(new URL('../../../package.json',import.meta.url))('playwright');
const test=await browserConfig('quest-board'),checks=[],shots=[],errors=[];
const browser=await launchBrowser(chromium,{headless:true});let context,page,touchContext;
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function until(predicate,label='state'){for(let i=0;i<300;i++){const s=await read();if(predicate(s))return s;await page.waitForTimeout(70);}throw Error(label+': '+JSON.stringify(await read()));}
async function click(id){const c=(await until(s=>s.controls.some(c=>c.id===id&&!c.disabled),id)).controls.find(c=>c.id===id);await page.mouse.click(c.x,c.y);await page.waitForTimeout(150);}
async function native(id){const c=(await until(s=>s.controls.some(c=>c.id===id&&!c.disabled),id)).controls.find(c=>c.id===id);await page.getByRole('button',{name:c.accessibleName||c.label,exact:true}).focus();await page.keyboard.press('Enter');await page.waitForTimeout(150);}
async function shot(name){await page.waitForTimeout(180);await page.screenshot({path:test.directory+'/'+name+'.png'});shots.push(name+'.png');}
async function object(id){const s=await read(),o=s.interactables.find(o=>o.id===id),c=s.camera;assert(o,id);const x=o.hitbox?o.hitbox[0]+o.hitbox[2]/2:o.x,y=o.hitbox?o.hitbox[1]+o.hitbox[3]/2:o.y;await page.mouse.click(c.width/2+c.x+x*c.zoom,c.height/2-c.y+y*c.zoom);}
async function go(x,y){const c=(await read()).camera;await page.mouse.click(c.width/2+c.x+x*c.zoom,c.height/2-c.y+y*c.zoom);await until(s=>Math.hypot(s.savedPosition.x-x,s.savedPosition.y-y)<20);await page.waitForTimeout(200);}
async function audit(){const s=await read();for(const c of s.controls){assert(c.x-c.w/2>=0&&c.x+c.w/2<=s.camera.width,c.id+' x');assert(c.y-c.h/2>=0&&c.y+c.h/2<=s.camera.height,c.id+' y');assert(c.h>=44,c.id+' minimum height');}
 for(let i=0;i<s.controls.length;i++)for(let j=i+1;j<s.controls.length;j++){const a=s.controls[i],b=s.controls[j];assert(Math.abs(a.x-b.x)>=(a.w+b.w)/2-2||Math.abs(a.y-b.y)>=(a.h+b.h)/2-2,`overlap ${a.id}/${b.id}`);}}
try{
 context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:test.directory+'/video',size:{width:1440,height:900}}});page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/net::ERR_FAILED/.test(m.text()))errors.push(m.text());});
 await page.goto(test.baseURL);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);await click('start');await until(s=>s.mode==='world'&&!s.busy);
 await go(160,272);await until(s=>s.nearby?.id==='home');await click('interact');await until(s=>s.location==='home');await click('interact');await until(s=>s.location==='overworld');await object('wood_1');await until(s=>s.inventory.wood===3);await object('board');await until(s=>s.mode==='quests');await click('select-settle_in');await until(s=>s.questLog.find(q=>q.id==='settle_in').status==='ready');
 const before=(await read()).savedPosition;
 for(const size of [{width:1440,height:900},{width:1920,height:1080},{width:1056,height:627},{width:1024,height:768},{width:844,height:390},{width:740,height:360}]){
  await page.setViewportSize(size);await until(s=>s.camera.width===size.width&&s.camera.height===size.height);await audit();await shot('board-'+size.width);
  if(size.width===740){await native('objectives-next');await click('list-next');await audit();await shot('board-740-next-group');await click('list-prev');await click('select-settle_in');}
 }
 checks.push('actual ready quest with truthful inventory at desktop 1440/1920/1056/1024 and short landscape 844/740; controls fit with no overlap; compact objectives/index paginate');
 await page.setViewportSize({width:1440,height:900});await until(s=>s.camera.width===1440);await native('quest-read');await until(s=>s.mode==='quest-story');await shot('original-reading');await native('quest-story-back');await until(s=>s.mode==='quests');assert.equal(await page.evaluate(()=>document.activeElement?.dataset.realquestControl),'quest-read');
 await page.keyboard.down('d');try{await page.waitForTimeout(250);}finally{await page.keyboard.up('d');}assert.deepEqual((await read()).savedPosition,before);
 checks.push('native keyboard reading/return restores focus and overlay owns movement input');
 const c=(await read()).controls.find(c=>c.id==='select-settle_in');await page.mouse.move(c.x,c.y);await shot('notice-hover');await page.getByRole('button',{name:c.accessibleName,exact:true}).focus();await shot('notice-keyboard-focus');
 await page.emulateMedia({reducedMotion:'reduce'});await native('select-leave_valley');await until(s=>s.features.questId==='leave_valley');await shot('locked-reduced-motion');await native('select-settle_in');
 let attempts=[],lose=true;await page.route('**/api/command',async route=>{const body=route.request().postDataJSON();if(body.action==='quest_claim'){attempts.push(body);if(lose){lose=false;await route.fetch();return route.abort('failed');}}return route.continue();});
 await native('quest-action');await until(s=>s.questLog.find(q=>q.id==='settle_in').status==='claimed'&&!s.busy);let s=await read();assert.equal(s.inventory.gold,32);assert.equal(s.inventory.seed,9);assert.equal(attempts.length,2);assert.equal(attempts[0].request_id,attempts[1].request_id);await shot('claimed');
 await page.reload();await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);await click('start');await until(s=>s.mode==='world'&&!s.busy);await page.keyboard.press('j');await until(s=>s.mode==='journal');await click('select-settle_in');s=await read();assert.equal(s.inventory.gold,32);assert.equal(s.inventory.seed,9);assert.equal(s.questLog.find(q=>q.id==='settle_in').status,'claimed');
 checks.push('lost claim response retries the same request, grants 12 gold / 3 seed exactly once, and survives reload');
 touchContext=await browser.newContext({storageState:await context.storageState(),viewport:{width:844,height:390},deviceScaleFactor:2,hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 const desktop=page;page=await touchContext.newPage();await page.goto(test.baseURL);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);
 async function tap(id){const c=(await until(s=>s.controls.some(c=>c.id===id&&!c.disabled),id)).controls.find(c=>c.id===id);await page.touchscreen.tap(c.x,c.y);await page.waitForTimeout(150);}
 await tap('start');await until(s=>s.mode==='world'&&!s.busy);await tap('menu');await tap('menu-journal');for(let i=0;i<16&&!(await read()).controls.some(c=>c.id==='select-first_harvest');i++)await tap('list-next');await audit();await tap('select-first_harvest');await tap('quest-read');await until(s=>s.mode==='quest-story');await shot('touch-original');await tap('quest-story-back');await until(s=>s.mode==='journal');await audit();await shot('touch-board');
 checks.push('DPR2 native touch selects a paginated notice, reads its original and returns under reduced motion');
 await touchContext.close();touchContext=undefined;page=desktop;
 assert.deepEqual(errors,[]);
}catch(error){if(page&&!page.isClosed())try{await shot('failure');await fs.writeFile(test.directory+'/failure-state.json',JSON.stringify(await read(),null,2));}catch{}throw error;}
finally{try{if(touchContext)await touchContext.close();if(context)await context.close();}finally{await closeBrowser(browser);}await fs.writeFile(test.directory+'/result.json',JSON.stringify({checks,shots,errors},null,2)+'\n');}
