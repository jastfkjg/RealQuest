import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import {auditPanelText} from './ui-layout-audit.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const {chromium}=createRequire(new URL('../../../package.json',import.meta.url))('playwright');
const test=await browserConfig('shop'),out=test.directory;await test.assertDatabase();
const browser=await launchBrowser(chromium,{headless:true});let page;const errors=[],checks=[],captures=[],requests=[];
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(fn,label='state'){for(const start=Date.now();Date.now()-start<20000;){const s=await read();if(fn(s))return s;await page.waitForTimeout(80);}throw Error(label+': '+JSON.stringify(await read()));}
async function click(id){const s=await wait(s=>s.controls.some(c=>c.id===id&&!c.disabled),'click '+id),c=s.controls.find(c=>c.id===id);await page.mouse.click(c.x,c.y);await page.waitForTimeout(140);}
async function field(id,value){await click(id);await page.keyboard.press('ControlOrMeta+A');await page.keyboard.insertText(value);await page.keyboard.press('Tab');await page.waitForTimeout(150);}
async function load(){await page.goto(test.baseURL);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);await click('start');await wait(s=>s.mode==='world'&&!s.busy&&s.connection==='ready');}
async function open(){const s=await read(),c=s.camera;await page.mouse.click(c.width/2+c.x+240*c.zoom,c.height/2-c.y+188*c.zoom);await wait(s=>s.mode==='shop');}
async function shot(name){const s=await read(),v=page.viewportSize();for(const c of s.controls){assert(c.w>=44&&c.h>=44,c.id+' target');assert(c.x-c.w/2>=-1&&c.x+c.w/2<=v.width+1&&c.y-c.h/2>=-1&&c.y+c.h/2<=v.height+1,c.id+' bounds');}for(let i=0;i<s.controls.length;i++)for(let j=i+1;j<s.controls.length;j++){const a=s.controls[i],b=s.controls[j];assert(!(Math.abs(a.x-b.x)<(a.w+b.w)/2-1&&Math.abs(a.y-b.y)<(a.h+b.h)/2-1),a.id+'/'+b.id+' overlap');}assert.deepEqual(await auditPanelText(page),[],name+' readable text');await page.screenshot({path:path.join(out,name+'.png')});await fs.writeFile(path.join(out,name+'.json'),JSON.stringify(s,null,2));captures.push(name);}
const disabled=(s,id)=>s.controls.find(c=>c.id===id)?.disabled;
function check(s){checks.push(s);console.log('PASS '+s);}
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',recordVideo:{dir:path.join(out,'video')}});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::ERR_FAILED/.test(m.text()))errors.push(m.text());});
 await load();let s=await read(),save=s.saveId;await page.goto('about:blank');
 execFileSync('backend/.venv/bin/python',['-c',`import sqlite3,json,sys,time
p,key=sys.argv[1:];sys.path.insert(0,'clients/cocos/tools');from test_guard import assert_fixture;assert_fixture(p);c=sqlite3.connect(p);s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);s.update(location='shop',position={'x':240,'y':188},inventory={'gold':20,'crop':4,'wood':6,'stone':2,'seed':6,'gate_stone':1});s['world_clock'].update(updated_at=time.time(),running_until=0);s['revision']+=1;c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()`,test.database,save]);
 await load();await open();await click('select-buy:seed_potato');await shot('browse-desktop');s=await read();assert.equal(s.inventory.gold,20);await field('trade-amount','99');assert(disabled(await read(),'trade-confirm'));await field('trade-amount','1');await click('trade-confirm');await wait(s=>!s.busy&&s.inventory.seed_potato===1);assert.equal((await read()).inventory.gold,12);check('selection is read-only; unaffordable purchase disabled; confirmed purchase uses authoritative stock/gold');
 await click('select-sell:crop');await field('trade-amount','2');await shot('sell-desktop');await click('trade-confirm');await wait(s=>!s.busy&&s.inventory.crop===2);assert.equal((await read()).inventory.gold,20);await click('trade-max');assert.equal((await read()).features.shopAmount,'2');
 await page.route('**/api/command',async r=>{if(r.request().postDataJSON().action==='market_trade')return r.fulfill({status:422,contentType:'application/json',body:JSON.stringify({detail:'测试：柜台暂时无法交易'})});await r.continue();});await click('trade-confirm');await wait(s=>!s.busy);assert.equal((await read()).inventory.crop,2);await page.unroute('**/api/command');check('failed sale preserves possessions and balance');
 let drops=1;await page.route('**/api/command',async r=>{if(r.request().postDataJSON().action==='market_trade'){requests.push(r.request().postDataJSON());if(drops-->0){await r.fetch();return r.abort();}}await r.continue();});await click('trade-confirm');await wait(s=>!s.busy&&!s.inventory.crop);assert.equal((await read()).inventory.gold,28);assert.equal((await read()).features.shopSelection,null);assert(requests.length>=2);assert.deepEqual(requests[0],requests[1]);await page.unroute('**/api/command');check('lost response replays identical request; last stack sold exactly once and selection clears');
 await click('select-sell:seed');assert(disabled(await read(),'trade-confirm'));await shot('not-accepted');await click('tab-orders');await wait(s=>s.mode==='shop-orders');await click('select-timber');await shot('orders');await click('deliver-order');await wait(s=>!s.busy&&disabled(s,'deliver-order'));await page.keyboard.press('Escape');await wait(s=>s.mode==='shop');check('unaccepted seed stays inspectable; separate collection order delivers once; Escape returns to shop');
 await click('shop-search');const before=(await read()).player;await field('shop-query','土豆');assert.equal((await read()).features.shopProductCount,1);assert.deepEqual((await read()).player,before);await field('shop-query','无此商品');assert.equal((await read()).features.shopProductCount,0);await shot('search-empty');await click('shop-search-clear');await click('shop-category-seed');assert.equal((await read()).features.shopProductCount,12);check('Chinese search, empty result and real-stock category work without moving player');
 for(const viewport of [{width:1920,height:1080},{width:1024,height:768},{width:844,height:390},{width:740,height:360}]){
  await page.setViewportSize(viewport);await wait(s=>s.camera.width===viewport.width);await page.waitForTimeout(200);await shot('browse-'+viewport.width);
  if(viewport.height<500){assert(disabled(await read(),'shop-prev'));await click('list-next');assert.equal((await read()).features.shopPage,1);await shot('page2-'+viewport.width);while(!disabled(await read(),'list-next'))await click('list-next');assert.notEqual((await read()).features.shopSelection?.side,'buy');while(!disabled(await read(),'shop-prev'))await click('shop-prev');}
  await click('select-sell:stone');await shot('sell-'+viewport.width);
 }
 check('desktop and landscape controls, text and pagination fit; off-page selection clears');
 await page.setViewportSize({width:1440,height:900});await load();await open();assert.equal((await read()).inventory.crop||0,0);assert.equal((await read()).inventory.gold,46);check('sale and order persist across reload');

 // Read-only response fixture: expanded future catalogue, never written to the server.
 const {build}=createRequire(new URL('../../../package.json',import.meta.url))('esbuild');
 const bundled=await build({entryPoints:[new URL('../assets/scripts/core/items.ts',import.meta.url).pathname],bundle:true,format:'esm',platform:'node',write:false});
 const {itemDefinitions}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
 const ids=Object.keys(itemDefinitions).filter(id=>id!=='gold').slice(0,43);assert.equal(ids.length,43);
 await page.route('**/api/**',async route=>{const response=await route.fetch();const body=await response.json();if(body.state?.market){body.state.market.buy=Object.fromEntries(ids.map(id=>[id,8]));body.state.inventory={gold:20,...Object.fromEntries(ids.map(id=>[id,2]))};}await route.fulfill({response,json:body});});
 await load();await open();assert.equal((await read()).features.shopProductCount,43);assert.equal((await read()).features.shopPages,4);await shot('expanded43-readonly-desktop');
 await click('list-next');assert.equal((await read()).features.shopPage,1);const bagPage=(await read()).features.shopBagPage;await click('shop-bag-next');assert.equal((await read()).features.shopPage,1);assert.equal((await read()).features.shopBagPage,bagPage+1);await shot('expanded43-readonly-page2');
 for(const viewport of [{width:844,height:390},{width:740,height:360}]){await page.setViewportSize(viewport);await wait(s=>s.camera.width===viewport.width);await page.waitForTimeout(150);await shot('expanded43-readonly-'+viewport.width);await click('shop-categories-next');await shot('expanded43-readonly-categories-'+viewport.width);}
 check('read-only 43-product fixture: four desktop pages, independent bag paging, compact category navigation; no fixture purchases');
 await page.unroute('**/api/**');
 assert.deepEqual(errors,[]);await context.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify({checks,captures,errors,requests,fixture:'isolated QA save: gold20, crop4, wood6, stone2, seed6, gate_stone1; not player data'},null,2));
}catch(e){if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')});await fs.writeFile(path.join(out,'failure.json'),JSON.stringify(await read(),null,2));}throw e;}finally{await closeBrowser(browser);}
