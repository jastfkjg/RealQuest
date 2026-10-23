import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import {auditPanelText} from './ui-layout-audit.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const test=await browserConfig('blacksmith'),out=test.directory;
await test.assertDatabase();const browser=await launchBrowser(chromium,{headless:true});
let page,context,video;const checks=[],captures=[],errors=[],fixtures=[];
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(fn,label='state',timeout=16000){for(const start=Date.now();Date.now()-start<timeout;){const s=await read();if(fn(s))return s;await page.waitForTimeout(60);}throw Error(label+': '+JSON.stringify(await read()));}
async function click(id){const s=await wait(s=>s.controls.some(c=>c.id===id&&!c.disabled),'click '+id),c=s.controls.find(c=>c.id===id);await page.mouse.click(c.x,c.y);await page.waitForTimeout(120);}
async function choose(id,prefix='select-'){for(let i=0;i<40;i++){const s=await read();if(s.controls.some(c=>c.id===prefix+id))return click(prefix+id);assert(s.controls.some(c=>c.id==='list-next'),'missing '+id);await click('list-next');}throw Error('missing entry '+id);}
async function load(){await page.goto(test.baseURL);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);await click('start');await wait(s=>s.mode==='world'&&!s.busy&&s.connection==='ready');}
async function world(){for(let i=0;i<12&&(await read()).mode!=='world';i++){await page.keyboard.press('Escape');await page.waitForTimeout(100);}await wait(s=>s.mode==='world'&&!s.busy);}
async function fixture(code,note){
 const id=(await read()).saveId;await page.goto('about:blank');execFileSync('backend/.venv/bin/python',['-c',`import json,sqlite3,sys,time,uuid
p,key=sys.argv[1:];sys.path.insert(0,'clients/cocos/tools');from test_guard import assert_fixture;assert_fixture(p)
sys.path.insert(0,'backend');from app.combat import ensure_combat,floor_enemies
con=sqlite3.connect(p);s=json.loads(con.execute('select state from players where id=?',(key,)).fetchone()[0]);c=ensure_combat(s)
${code}
s['world_clock'].update(updated_at=time.time(),running_until=0);s['revision']+=1
con.execute('update players set state=? where id=?',(json.dumps(s),key));con.commit();con.close()`,test.database,id]);fixtures.push(note);await load();
}
async function shot(name){
 const s=await read(),size=page.viewportSize();
 for(const c of s.controls){assert(c.w>=44&&c.h>=44,c.id+' target');assert(c.x-c.w/2>=-1&&c.x+c.w/2<=size.width+1&&c.y-c.h/2>=-1&&c.y+c.h/2<=size.height+1,c.id+' bounds');}
 for(let i=0;i<s.controls.length;i++)for(let j=i+1;j<s.controls.length;j++){const a=s.controls[i],b=s.controls[j];assert(!(Math.abs(a.x-b.x)<(a.w+b.w)/2-1&&Math.abs(a.y-b.y)<(a.h+b.h)/2-1),a.id+'/'+b.id+' overlap');}
 assert.deepEqual(await auditPanelText(page),[],name+' readable text');await page.screenshot({path:path.join(out,name+'.png')});await fs.writeFile(path.join(out,name+'.json'),JSON.stringify(s,null,2));captures.push(name);
}
const check=s=>{checks.push(s);console.log('PASS '+s);};
async function command(action,data){const auth=await page.evaluate(()=>JSON.parse(localStorage.getItem('realquest-session-v2')));const r=await page.request.post(test.baseURL+'/api/command',{headers:{Authorization:'Bearer '+auth.token},data:{request_id:crypto.randomUUID(),action,data}});return {status:r.status(),body:await r.json()};}
async function use(id,mode){
 await world();const initial=await read(),o=initial.interactables.find(o=>o.id===id);assert(o,'world object '+id);
 // Walk along the clear aisle; on short landscapes the distant anvil is initially offscreen.
 for(const goal of [{x:328,y:initial.player.y},{x:328,y:o.y}]){
  for(let i=0;i<120;i++){const s=await read(),dx=goal.x-s.player.x,dy=goal.y-s.player.y;if(Math.abs(dx)<7&&Math.abs(dy)<7)break;
   const key=Math.abs(dx)>=7?(dx>0?'d':'a'):(dy>0?'s':'w');await page.keyboard.down(key);await page.waitForTimeout(45);await page.keyboard.up(key);await page.waitForTimeout(30);
  }
 }
 await wait(s=>s.nearby?.id===id,'walk to '+id);await page.keyboard.press('e');await wait(s=>s.mode===mode&&!s.busy,'open '+mode);
}
try{
 context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out+'/video',size:{width:1440,height:900}}});page=await context.newPage();video=page.video();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/net::ERR_FAILED|Failed to load resource/.test(m.text()))errors.push(m.text());});
 await load();await fixture("s['location']='workshop';s['position']={'x':328,'y':184};s['inventory']['gold']=20",'Independent QA character at the new NPC; original20 silver, no weapons or learned diagrams');
 await shot('blacksmith-world');await page.keyboard.press('e');await wait(s=>s.mode==='armory');await shot('browse-1440');
 let s=await read();assert(s.controls.find(c=>c.id==='buy-gear').disabled);assert(!s.controls.some(c=>c.id==='craft-gear'||c.id==='tab-craft'));assert.equal(s.inventory.gold,20);
 const pos=s.savedPosition;await page.keyboard.down('d');await page.keyboard.press('Space');await page.waitForTimeout(150);assert.deepEqual((await read()).savedPosition,pos);await page.keyboard.up('d');
 await click('smith-see-blueprint');await wait(s=>s.features.gearTab==='diagrams');await shot('diagram-1440');
 let reject=true;await page.route('**/api/command',async route=>{if(reject&&route.request().postDataJSON().action==='blueprint_buy'){reject=false;return route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({detail:'图纸暂未交到柜台，请稍后再试'})});}await route.continue();});
 await click('buy-blueprint');await wait(s=>!s.busy&&s.error);assert.equal((await read()).inventory.gold,20);assert(!(await read()).combat.blueprints.stone_sword);await shot('diagram-rejected');await page.unroute('**/api/command');
 const attempts=[];let lost=true;await page.route('**/api/command',async route=>{const b=route.request().postDataJSON();if(b.action==='blueprint_buy'){attempts.push(b);if(lost){lost=false;await route.fetch();return route.abort();}}await route.continue();});
 await click('buy-blueprint');await wait(s=>s.combat.blueprints.stone_sword&&!s.busy);await page.unroute('**/api/command');assert.equal(attempts.length,2);assert.deepEqual(attempts[0],attempts[1]);assert.equal((await read()).inventory.gold,12);assert((await read()).controls.find(c=>c.id==='buy-blueprint').disabled);await shot('diagram-learned');
 check('native NPC opens merchant;20/24 insufficient quote is honest; modal owns movement; rejected diagram preserves assets and committed lost reply retries once with same request');
 await fixture("s['inventory'].update(gold=1000,plank=10,stone=10);s['skill_growth']['building']=1",'QA currency/materials and building1 for actual two-weapon purchase and learned-recipe crafting; no gear injected');
 await page.keyboard.press('e');await wait(s=>s.mode==='armory');await click('tab-obtain');await click('smith-plus');await click('buy-gear');await wait(s=>s.inventory.stone_sword===2&&!s.busy);assert.equal((await read()).inventory.gold,952);assert.equal((await read()).combat.equipped,null);await shot('bought-two');
 await world();await click('menu');await click('menu-equipment');await choose('stone_sword');await click('equip-weapon');await wait(s=>s.combat.equipped==='stone_sword'&&!s.busy);
 await use('armory_counter','forge');s=await read();assert(!s.controls.some(c=>['buy-gear','buy-blueprint','sell-gear','tab-obtain','tab-diagrams'].includes(c.id)));await shot('forge-1440');
 await click('gear-requirements');await wait(s=>s.mode==='gear-recipe');await shot('forge-conditions');await page.keyboard.press('Escape');await wait(s=>s.mode==='forge');
 const materials={...(await read()).inventory};await click('craft-gear');await wait(s=>s.inventory.stone_sword===3&&!s.busy);s=await read();assert.equal(s.inventory.plank,materials.plank-2);assert.equal(s.inventory.stone,materials.stone-2);assert.equal(s.inventory.gold,952);assert(s.combat.blueprints.stone_sword);assert.equal(s.combat.equipped,'stone_sword');
 check('bulk purchase charges exact price without auto-equip; real walking reaches separate forge; forge has no trading controls; learned recipe crafts exact cost and persists');
 await use('blacksmith','armory');await click('tab-sell');await choose('stone_sword');await click('smith-plus');await click('smith-plus');const before={...(await read()).inventory};await click('sell-gear');assert.deepEqual((await read()).inventory,before);await shot('last-equipped-confirm');await click('sell-gear');await wait(s=>s.inventory.stone_sword===0&&!s.busy);assert.equal((await read()).inventory.gold,970);assert.equal((await read()).combat.equipped,null);await shot('sold-empty');
 await load();assert.equal((await read()).inventory.gold,970);assert((await read()).combat.blueprints.stone_sword);check('sell quantity requires separate confirmation; last equipped item unloads; inventory, money and permanent knowledge survive reload');
 for(const size of [{width:1920,height:1080},{width:1440,height:900},{width:1024,height:768},{width:844,height:390},{width:740,height:360}]){
  await page.setViewportSize(size);await wait(s=>s.camera.width===size.width);await use('blacksmith','armory');await click('tab-obtain');await shot('browse-'+size.width+'-funded');
  await choose('spring_spear');await shot('science-'+size.width);await click('tab-diagrams');await shot('blueprints-'+size.width);await click('gear-requirements');await wait(s=>s.mode==='gear-recipe');await shot('requirements-'+size.width);await use('armory_counter','forge');await shot('forge-'+size.width);await world();
 }
 check('actual Cocos desktop1920/1440/1024 and landscape844/740 stock, blueprint, full conditions and forge fit; pagination and touch-size controls remain usable');
 await page.setViewportSize({width:1440,height:900});await use('blacksmith','armory');await click('tab-supplies');await choose('soup');const money=(await read()).inventory.gold;await click('buy-gear');await wait(s=>s.inventory.soup===1&&!s.busy);assert.equal((await read()).inventory.gold,money-8);await shot('supplies-preserved');
 assert.deepEqual(errors,[]);check('existing soup remains purchasable through a subordinate supplies tab; no browser console or page errors');
}catch(e){if(page&&!page.isClosed()){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});await fs.writeFile(out+'/failure.json',JSON.stringify(await read(),null,2)).catch(()=>{});}throw e;}
finally{try{await context?.close();if(video)await video.saveAs(out+'/blacksmith-flow.webm');}finally{await closeBrowser(browser);}await fs.writeFile(out+'/result.json',JSON.stringify({checks,captures,errors,fixtures},null,2)+'\n');}
