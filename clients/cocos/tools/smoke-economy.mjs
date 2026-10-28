/** Dedicated QA journeys; only boundary wallet/location fixtures are injected. */
import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import {auditPanelText} from './ui-layout-audit.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(new URL('../../../package.json',import.meta.url));
const test=await browserConfig('economy'),out=test.directory;await test.assertDatabase();
let browser,context,page,save;const checks=[],captures=[],errors=[];
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(fn,label='state'){for(const t=Date.now();Date.now()-t<25000;){const s=await read();if(fn(s))return s;await page.waitForTimeout(80);}throw Error(label+': '+JSON.stringify(await read()));}
async function click(id){const s=await wait(s=>s.controls.some(c=>c.id===id&&!c.disabled),'click '+id),c=s.controls.find(c=>c.id===id);await page.mouse.click(c.x,c.y);await page.waitForTimeout(120);}
async function load(){await page.goto(test.baseURL);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);await click('start');await wait(s=>s.mode==='world'&&!s.busy&&s.connection==='ready');}
async function text(name){return page.evaluate(async name=>{const cc=await System.import('cc');let result;function visit(n){if(n.activeInHierarchy&&n.name===name)result=n.getComponent(cc.Label)?.string;n.children.forEach(visit);}visit(cc.director.getScene());return result;},name);}
async function field(id,value){await click(id);await page.keyboard.press('ControlOrMeta+A');await page.keyboard.insertText(value);await page.keyboard.press('Tab');}
async function shot(name){assert.deepEqual(await auditPanelText(page),[],name+' actual label bounds');await page.screenshot({path:path.join(out,name+'.png')});await fs.writeFile(path.join(out,name+'.json'),JSON.stringify(await read(),null,2));captures.push(name);}
async function fixture(body){await page.goto('about:blank');execFileSync('backend/.venv/bin/python',['-c',`import sqlite3,json,sys,time
sys.path[:0]=['backend','backend/tests','clients/cocos/tools']
from test_guard import assert_fixture
p,key=sys.argv[1:];assert_fixture(p);db=sqlite3.connect(p);s=json.loads(db.execute('select state from players where id=?',(key,)).fetchone()[0])
${body}
s['world_clock'].update(updated_at=time.time(),running_until=0);s['revision']+=1;db.execute('update players set state=? where id=?',(json.dumps(s),key));db.commit();db.close()`,test.database,save]);await load();}
async function openShop(){const s=await read(),c=s.camera;await page.mouse.click(c.width/2+c.x+240*c.zoom,c.height/2-c.y+188*c.zoom);await wait(s=>s.mode==='shop');}
const check=s=>{checks.push(s);console.log('PASS '+s);};
try{
 browser=await launchBrowser(require('playwright').chromium,{headless:true});context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',recordVideo:{dir:path.join(out,'video')}});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await load();save=(await read()).saveId;assert.equal(await text('LocalGold'),'20银');await shot('starter-silver');
 await fixture("s.update(location='shop',position={'x':240,'y':188});s['inventory'].update(gold=98,wood=2)");await openShop();await click('select-sell:wood');await field('trade-amount','2');await click('trade-confirm');await wait(s=>s.inventory.gold===102&&!s.busy);assert.equal(await text('FeatureBalance'),'钱袋 1金 2银');await shot('gold-boundary-shop');
 await load();assert.equal((await read()).inventory.gold,102);assert.equal(await text('LocalGold'),'1金 2银');await shot('gold-boundary-hud');await openShop();await click('select-buy:seed');await field('trade-amount','2');await click('trade-confirm');await wait(s=>s.inventory.gold===98&&!s.busy);assert.equal(await text('FeatureBalance'),'钱袋 98银');check('actual sale crosses 100 silver, reload persists, purchase automatically breaks gold');
 for(const viewport of [{width:1920,height:1080},{width:844,height:390}]){await page.setViewportSize(viewport);await wait(s=>s.camera.width===viewport.width);await page.waitForTimeout(150);await shot('wallet-'+viewport.width);}
 await page.setViewportSize({width:1440,height:900});
 await fixture("from test_quest_chain import player,farm_and_home\ns=player();farm_and_home(s);s.update(location='pasture',position={'x':448,'y':440})");await page.keyboard.press('e');await wait(s=>s.mode==='ranch');await click('ranch-tab-build');await click('ranch-select-coop');await shot('coop-assistance');let before=(await read()).inventory.gold;await click('ranch-build');await wait(s=>s.ranch.buildings.coop===1&&!s.busy);assert.equal((await read()).inventory.gold,before);
 await click('ranch-tab-buy');await click('ranch-select-chicken');assert.match(await text('RanchDetailTitle'),/首次领养援助/);await shot('chicken-assistance');await click('ranch-buy');await wait(s=>Object.keys(s.ranch.animals).length===1&&!s.busy);assert.equal((await read()).inventory.gold,before);assert.match(await text('RanchDetailTitle'),/60银/);check('public construction and adoption consume each noncash aid once, next chicken has ordinary price');
 await page.keyboard.press('Escape');await load();assert.equal(Object.keys((await read()).ranch.animals).length,1);assert.equal((await read()).inventory.gold,before);check('assistance and wallet persist together after reload');
 assert.deepEqual(errors,[]);
} catch(e){if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});await fs.writeFile(path.join(out,'failure.json'),JSON.stringify(await read(),null,2)).catch(()=>{});}throw e;}
finally{try{await context?.close();}finally{if(browser)await closeBrowser(browser);}await fs.writeFile(path.join(out,'result.json'),JSON.stringify({checks,captures,errors,fixture:'isolated QA boundary wallet/location; startup aid earned through real backend tutorial commands'},null,2));}
