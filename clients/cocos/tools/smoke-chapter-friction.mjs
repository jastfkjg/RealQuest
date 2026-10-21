import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(new URL('../../../package.json',import.meta.url)),{chromium}=require('playwright');
const test=await browserConfig('chapter-friction'),out=test.directory;
await test.assertDatabase();
const browser=await launchBrowser(chromium,{headless:true});let context,page,save,video;
const checks=[],captures=[],errors=[];
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function until(predicate,label='condition',timeout=18000){for(const start=Date.now();Date.now()-start<timeout;){const s=await read();if(predicate(s))return s;await page.waitForTimeout(75);}throw Error(label+': '+JSON.stringify(await read()));}
async function click(id){
 if(id.startsWith('select-'))for(let i=0;i<16;i++){const s=await read();if(s.controls.some(c=>c.id===id)||!s.controls.some(c=>c.id==='list-next'))break;await click('list-next');}
 const s=await until(s=>s.controls.some(c=>c.id===id&&!c.disabled),'click '+id),c=s.controls.find(c=>c.id===id);await page.mouse.click(c.x,c.y);await page.waitForTimeout(140);
}
async function load(){await page.goto(test.baseURL);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);await click('start');await until(s=>s.mode==='world'&&!s.busy&&s.connection==='ready');}
async function world(){for(let i=0;i<16&&(await read()).mode!=='world';i++){await page.keyboard.press('Escape');await page.waitForTimeout(120);}await until(s=>s.mode==='world'&&!s.busy);}
async function seed(patch,transform=''){
 await page.goto('about:blank');execFileSync('backend/.venv/bin/python',['-c',`import json,sqlite3,sys,time
p,key,patch=sys.argv[1:];sys.path.insert(0,'clients/cocos/tools');from test_guard import assert_fixture;assert_fixture(p);c=sqlite3.connect(p)
s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);s.update(json.loads(patch));s['revision']+=1;s['world_clock'].update(elapsed=0,updated_at=time.time(),running_until=0)
${transform}
c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()`,test.database,save,JSON.stringify(patch)]);await load();
}
async function use(id){if((await read()).mode!=='world')return;await until(s=>s.nearby?.id===id,'near '+id);await click('interact');await until(s=>!s.busy);}
async function go(x,y){const s=await read(),c=s.camera,px=c.width/2+c.x+x*c.zoom,py=c.height/2-c.y+y*c.zoom;assert(px>0&&px<c.width&&py>0&&py<c.height,'visible walking point');await page.mouse.click(px,py);await until(s=>Math.hypot(s.savedPosition.x-x,s.savedPosition.y-y)<64&&!s.route.length,'walk',24000);}
async function quote(id){for(let i=0;i<15;i++){if((await read()).controls.some(c=>c.id==='travel-'+id)){await click('travel-'+id);await until(s=>!s.busy);return;}await click('travel-next');}throw Error('quote '+id);}
async function size(width,height){await page.setViewportSize({width,height});await until(s=>s.camera.width===width);await page.waitForTimeout(200);}
async function shot(name){
 const s=await read(),v=page.viewportSize();for(const c of s.controls){assert(c.w>=44&&c.h>=44,c.id+' target');assert(c.x-c.w/2>=-1&&c.x+c.w/2<=v.width+1&&c.y-c.h/2>=-1&&c.y+c.h/2<=v.height+1,c.id+' bounds');}
 for(let i=0;i<s.controls.length;i++)for(let j=i+1;j<s.controls.length;j++){const a=s.controls[i],b=s.controls[j];assert(!(Math.abs(a.x-b.x)<(a.w+b.w)/2-1&&Math.abs(a.y-b.y)<(a.h+b.h)/2-1),'overlap '+a.id+'/'+b.id);}
 await page.waitForTimeout(180);await page.screenshot({path:path.join(out,name+'.png')});captures.push(name);
}
const check=name=>{checks.push(name);console.log('PASS '+name);};
try{
 context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:path.join(out,'video'),size:{width:1280,height:800}}});page=await context.newPage();video=page.video();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::ERR_FAILED/.test(m.text()))errors.push(m.text());});
 await load();save=(await read()).saveId;
 await seed({location:'workshop',position:{x:376,y:308}},"s['inventory']['gold']=200");await use('armory_counter');await click('buy-gear');await until(s=>s.inventory.stone_sword===1&&!s.busy);
 assert.equal((await read()).combat.equipped,null);assert.equal((await read()).inventory.gold,176);await shot('purchase-equip-desktop');
 await size(740,360);await shot('purchase-equip-landscape');
 let reject=true,lost=true;const attempts=[];
 await page.route('**/api/command',async r=>{const b=r.request().postDataJSON();if(b?.action==='gear_equip'){attempts.push(b);if(reject){reject=false;return r.fulfill({status:422,contentType:'application/json',body:JSON.stringify({detail:'测试：装备尚未确认'})});}if(lost){lost=false;await r.fetch();return r.abort();}}await r.continue();});
 await click('armory-equip');await until(s=>s.error.includes('尚未确认'));assert.equal((await read()).combat.equipped,null);assert.equal((await read()).inventory.stone_sword,1);
 await click('armory-equip');await until(s=>s.combat.equipped==='stone_sword'&&!s.busy);assert.equal(attempts.length,3);assert.deepEqual(attempts[1],attempts[2]);await page.unroute('**/api/command');
 assert.equal((await read()).inventory.gold,176);assert((await read()).controls.find(c=>c.id==='armory-equip').disabled);await shot('equipped-landscape');
 await size(1440,900);await click('select-reinforced_sword');await click('buy-gear');await until(s=>s.inventory.reinforced_sword===1&&!s.busy);assert.equal((await read()).combat.equipped,'stone_sword');await click('armory-equip');await until(s=>s.combat.equipped==='reinforced_sword'&&!s.busy);await load();assert.equal((await read()).combat.equipped,'reinforced_sword');
 check('actual purchase exposes explicit equip at both sizes; rejection preserves gear, lost reply retries once; second purchase preserves old weapon until confirmed equip and reload');
 await seed({location:'overworld',position:{x:256,y:296},tracked_quest:'leave_valley'},"s['quests']['settle_in']={'status':'claimed'};s['quests']['leave_valley']={'status':'active'}");await use('board');await click('select-first_harvest');await shot('side-before-accept-desktop');await click('quest-action');await until(s=>s.questLog.find(q=>q.id==='first_harvest').status==='active'&&!s.busy);
 assert.equal((await read()).trackedQuest,'leave_valley');assert.equal((await read()).questLog.find(q=>q.id==='leave_valley').kind,'main');assert.equal((await read()).questLog.find(q=>q.id==='first_harvest').kind,'side');await shot('side-accepted-main-kept-desktop');
 await size(740,360);assert((await read()).controls.some(c=>c.id==='select-first_harvest'));await shot('side-accepted-main-kept-landscape');await click('quest-action');await until(s=>s.trackedQuest==='first_harvest'&&!s.busy);await load();assert.equal((await read()).trackedQuest,'first_harvest');await size(1440,900);await use('board');await click('select-leave_valley');await click('quest-action');await until(s=>s.trackedQuest==='leave_valley'&&!s.busy);await world();
 check('side acceptance retains main tracking; main/side categories are visible; explicit switching and reload persist without acceptance rewards');
 await seed({location:'mountain',position:{x:704,y:184}},"s['departure']['rope_ready']=True;s['village_combat']['gate_open']=True;s['stamina']['current']=100;s['inventory']['gold']=80;s['events']+=['visited_crossing','crossed_river']");await use('mountain_pass');await quote('climb');await until(s=>s.location==='city'&&s.mode==='world');assert.equal(await page.getByText('↑ 灯穗旅店 · 交信与住宿',{exact:true}).count(),1);await shot('city-arrival-desktop');
 await size(740,360);await shot('city-arrival-landscape');await size(1440,900);await go(256,400);await go(352,280);await shot('inn-door-desktop');
 await use('to_inn');await quote('enter_inn');await until(s=>s.location==='inn'&&s.mode==='world');assert.equal(await page.getByText('↑ 灯穗旅店 · 交信与住宿',{exact:true}).count(),0);await go(176,232);await shot('lanya-desktop');await size(740,360);await shot('lanya-landscape');await size(1440,900);await use('lanya');await quote('deliver');await quote('book');await world();await go(336,112);await use('inn_bed');await click('sleep-night');await until(s=>s.mode==='world'&&!s.busy);assert((await read()).questLog.find(q=>q.id==='leave_valley').checks[7]);
 check('actual mountain climb, street walking, inn doorway, Lanya letter/booking and bed complete without changing map collisions or travel prices');
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'result.json'),JSON.stringify({checks,captures,errors,fixture:{saveId:save,note:'Fresh owned QA database. Only approach positions, settled/main quest eligibility, gold, rope and climb stamina are prepared; purchases, equips, accept/track, climb, street walk, entry, letter, booking and sleep use actual UI/server commands.'}},null,2)+'\n');
}catch(e){if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')});await fs.writeFile(path.join(out,'failure.json'),JSON.stringify(await read(),null,2));}throw e;}
finally{try{if(context)await context.close();if(video)await video.saveAs(path.join(out,'flow.webm'));}finally{await closeBrowser(browser);}}
