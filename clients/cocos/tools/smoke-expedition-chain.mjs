import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(new URL('../../../package.json',import.meta.url)),{chromium}=require('playwright');
const test=await browserConfig('expedition-chain'),out=test.directory;
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
s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);s.update(json.loads(patch));s['quest_story']['legacy_departure']=True;s['revision']+=1;s['world_clock'].update(elapsed=0,updated_at=time.time(),running_until=0)
${transform}
c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()`,test.database,save,JSON.stringify(patch)]);await load();
}
async function use(id){if((await read()).mode!=='world')return;await until(s=>s.nearby?.id===id,'near '+id);await click('interact');await until(s=>!s.busy);}
async function go(x,y){
 for(let step=0;step<30;step++){
  const s=await read();if(s.mode!=='world')return;
  const distance=Math.hypot(x-s.player.x,y-s.player.y);if(distance<14)return;
  const fraction=Math.min(1,60/distance),wx=s.player.x+(x-s.player.x)*fraction,wy=s.player.y+(y-s.player.y)*fraction,c=s.camera;
  const px=c.width/2+c.x+wx*c.zoom,py=c.height/2-c.y+wy*c.zoom;
  assert(px>0&&px<c.width&&py>0&&py<c.height,'visible walking point');
  assert(!s.controls.some(b=>Math.abs(px-b.x)<b.w/2&&Math.abs(py-b.y)<b.h/2),'walking point must not hit HUD');
  await page.mouse.click(px,py);await page.waitForTimeout(160);
  await until(n=>n.location!==s.location||n.mode!=='world'||Math.hypot(n.savedPosition.x-wx,n.savedPosition.y-wy)<20&&!n.route.length,'walk',24000);
  if((await read()).location!==s.location)return;
 }
 throw Error('walking route did not converge');
}
async function quote(id){for(let i=0;i<15;i++){if((await read()).controls.some(c=>c.id==='travel-'+id)){await click('travel-'+id);await until(s=>!s.busy);return;}await click('travel-next');}throw Error('quote '+id);}
async function walkKeys(x,y){
 for(const [axis,target,positive,negative] of [['x',x,'ArrowRight','ArrowLeft'],['y',y,'ArrowDown','ArrowUp']]){
  for(let step=0;step<100;step++){
   const s=await read(),delta=target-s.player[axis];assert.equal(s.mode,'world');
   if(Math.abs(delta)<7)break;
   const key=delta>0?positive:negative;
   try{await page.keyboard.down(key);await page.waitForTimeout(Math.min(180,Math.max(35,Math.abs(delta)*4)));}finally{await page.keyboard.up(key);}
   if(step===99)throw Error('keyboard walking did not reach '+axis+' '+target);
  }
 }
 await until(s=>Math.hypot(s.savedPosition.x-x,s.savedPosition.y-y)<20&&!s.busy,'walking saved');
}
async function size(width,height){await page.setViewportSize({width,height});await until(s=>s.camera.width===width);await page.waitForTimeout(200);}
async function shot(name){
 const s=await read(),v=page.viewportSize();for(const c of s.controls){assert(c.w>=44&&c.h>=44,c.id+' target');assert(c.x-c.w/2>=-1&&c.x+c.w/2<=v.width+1&&c.y-c.h/2>=-1&&c.y+c.h/2<=v.height+1,c.id+' bounds');}
 for(let i=0;i<s.controls.length;i++)for(let j=i+1;j<s.controls.length;j++){const a=s.controls[i],b=s.controls[j];assert(!(Math.abs(a.x-b.x)<(a.w+b.w)/2-1&&Math.abs(a.y-b.y)<(a.h+b.h)/2-1),'overlap '+a.id+'/'+b.id);}
 await page.waitForTimeout(180);await page.screenshot({path:path.join(out,name+'.png')});captures.push(name);
}
const check=name=>{checks.push(name);console.log('PASS '+name);};
try{
 context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:path.join(out,'video'),size:{width:1440,height:900}}});page=await context.newPage();video=page.video();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::ERR_FAILED/.test(m.text()))errors.push(m.text());});
 await load();save=(await read()).saveId;
 await seed({location:'workshop',position:{x:328,y:184}},"s['quests']['settle_in']={'status':'claimed'};s['quests']['leave_valley']={'status':'active'};s['tracked_quest']='leave_valley';s['village_intro'].update(briefed=True,dismissed=False)");
 await shot('world-need-gold');assert.equal((await read()).guidance.entry.key,'intro:income');
 const initial=(await read()).savedPosition;await click('tracker-follow');assert.equal((await read()).marker.targetId,'wood_1');assert.deepEqual((await read()).savedPosition,initial);
 await use('blacksmith');assert.equal((await read()).mode,'armory');
 assert((await read()).controls.find(c=>c.id==='buy-gear').disabled);assert(!(await read()).controls.some(c=>c.id==='craft-gear'));
 assert.match(await page.locator('body').innerText(),/还差 4银/);
 await shot('armory-shortfall-1440');await click('smith-see-blueprint');await click('gear-requirements');await until(s=>s.mode==='gear-recipe');assert.match(await page.locator('body').innerText(),/建造1级/);await shot('craft-conditions-1440');await page.keyboard.press('Escape');await until(s=>s.mode==='armory');
 check('world goal preserves authoritative income step; route marking never moves player; purchase shortage and full server crafting reasons are readable');
 for(const [w,h] of [[1920,1080],[1024,768],[844,390],[740,360]]){
  await size(w,h);await shot('armory-shortfall-'+w);await click('gear-requirements');await shot('craft-conditions-'+w);await page.keyboard.press('Escape');await until(s=>s.mode==='armory');
 }
 await seed({},"s['inventory']['gold']=200");await size(1440,900);await shot('world-prepare-1440');await click('tracker-follow');await until(s=>s.mode==='armory');await click('tab-obtain');assert.deepEqual((await read()).savedPosition,initial);
 let reject=true,delay=true,release;const held=new Promise(r=>release=r),attempts=[];
 await page.route('**/api/command',async r=>{const b=r.request().postDataJSON();if(b?.action==='gear_buy'){attempts.push(b);if(reject){reject=false;return r.fulfill({status:422,contentType:'application/json',body:JSON.stringify({detail:'测试：柜台报价待确认'})});}if(delay){delay=false;await held;}}await r.continue();});
 await click('buy-gear');await until(s=>s.error.includes('报价待确认'));assert.equal((await read()).inventory.gold,200);assert.equal((await read()).inventory.stone_sword,0);await shot('purchase-rejected');
 await click('buy-gear');await until(s=>s.busy);assert((await read()).controls.find(c=>c.id==='buy-gear').disabled);release();await until(s=>s.inventory.stone_sword===1&&!s.busy);await page.unroute('**/api/command');
 assert.equal((await read()).inventory.gold,176);assert.equal((await read()).combat.equipped,null);assert.equal(attempts.length,2);await shot('purchased-not-equipped-1440');
 await world();assert.equal((await read()).guidance.entry.key,'intro:equip');await click('tracker-follow');await until(s=>s.mode==='equipment');await shot('equipment-confirm-1440');await click('equip-weapon');await until(s=>s.combat.equipped==='stone_sword'&&!s.busy);await shot('equipment-ready-1440');
 await page.keyboard.press('Escape');await until(s=>s.mode==='world');assert.equal((await read()).guidance.entry.key,'intro:explore');await use('blacksmith');
 check('failed purchase leaves balances untouched; pending purchase is disabled; buy does not auto-equip; world target advances only after explicit equip');
 for(const [w,h] of [[1440,900],[1920,1080],[1024,768],[844,390],[740,360]]){await size(w,h);await shot('equipped-'+w);}
 await size(1440,900);await click('select-reinforced_sword');assert.equal((await read()).combat.gear.reinforced_sword.damage-(await read()).combat.gear.stone_sword.damage,4);await shot('compare-weapon-1440');await click('buy-gear');await until(s=>s.inventory.reinforced_sword===1&&!s.busy);assert.equal((await read()).combat.equipped,'stone_sword');
 let equipReject=true,equipLost=true;const equipAttempts=[];
 await page.route('**/api/command',async r=>{const b=r.request().postDataJSON();if(b?.action==='gear_equip'){equipAttempts.push(b);if(equipReject){equipReject=false;return r.fulfill({status:422,contentType:'application/json',body:JSON.stringify({detail:'测试：装备未确认'})});}if(equipLost){equipLost=false;await r.fetch();return r.abort();}}await r.continue();});
 await world();await click('menu');await click('menu-equipment');await click('select-reinforced_sword');await click('equip-weapon');await until(s=>s.error.includes('装备未确认'));assert.equal((await read()).combat.equipped,'stone_sword');await click('equip-weapon');await until(s=>s.combat.equipped==='reinforced_sword'&&!s.busy);assert.equal(equipAttempts.length,3);assert.deepEqual(equipAttempts[1],equipAttempts[2]);await page.unroute('**/api/command');
 await load();assert.equal((await read()).combat.equipped,'reinforced_sword');await click('menu');await click('menu-equipment');const pos=(await read()).savedPosition;await click('gear-depart');await until(s=>s.mode==='world');assert.equal((await read()).marker.targetId,'cave_entry');assert.deepEqual((await read()).savedPosition,pos);await shot('world-depart-1440');
 check('current-weapon comparison; second purchase preserves equipped weapon; rejected equip and lost reply replay conserve items; reload persists equip and departure only marks the route');
 // Walk the actual room exit and village route; no fixture relocation between equip and entry.
 await go(240,320);await until(s=>s.location==='overworld'&&s.sceneId==='overworld'&&!s.busy);await page.waitForTimeout(180);
 for(const [x,y] of [[416,244],[416,1120],[304,1136]])await walkKeys(x,y);
 await use('cave_entry');await until(s=>s.mode==='cave');
 for(const [w,h] of [[1440,900],[1920,1080],[1024,768],[844,390],[740,360]]){await size(w,h);await shot('cave-ready-'+w);}
 await click('cave-equipment');await until(s=>s.mode==='equipment');await shot('equipment-from-cave-740');await page.keyboard.press('Escape');await until(s=>s.mode==='cave');await click('cave-enter');await until(s=>s.mode==='world'&&s.location==='cave_1');assert.equal((await read()).combat.equipped,'reinforced_sword');await shot('entered-cave-740');
 await click('interact');await until(s=>s.mode==='cave');await click('cave-retreat');await until(s=>s.mode==='world'&&s.location==='overworld');
 check('actual walking from workshop to cave, readiness at five sizes, equipment/Escape returns to cave, explicit enter and retreat preserve equipped weapon');
 await seed({location:'overworld',position:{x:304,y:1136}},"s['village_combat']['equipped']=None;s['vitality']['current']=30;s['stamina']['current']=10");await size(1440,900);await use('cave_entry');await shot('cave-unprepared-1440');assert(!(await read()).controls.find(c=>c.id==='cave-enter').disabled);await click('cave-equipment');await until(s=>s.mode==='equipment');await click('select-reinforced_sword');await click('equip-weapon');await until(s=>s.combat.equipped==='reinforced_sword'&&!s.busy);await page.keyboard.press('Escape');await until(s=>s.mode==='cave');await shot('cave-low-vitals-1440');
 await seed({location:'workshop',position:{x:336,y:280}},"s['inventory'].update(gold=200,plank=3,stone=4,shell=2);s['skill_growth']['building']=1;s['knowledge_growth']['science']=1;s['village_combat']['blueprints']['reinforced_sword']='QA已学图纸'");await use('armory_counter');await click('select-reinforced_sword');assert(!(await read()).controls.find(c=>c.id==='craft-gear').disabled);const count=(await read()).inventory.reinforced_sword;await click('craft-gear');await until(s=>s.inventory.reinforced_sword===count+1&&!s.busy);assert.equal((await read()).inventory.plank,0);assert.equal((await read()).inventory.gold,192);assert.equal((await read()).combat.equipped,'reinforced_sword');await shot('crafted-authoritative-1440');
 check('unprepared/low-vitality warnings do not invent an entry lock; crafting follows real server requirements and consumes recipe once without changing equipment');
 assert.deepEqual(errors,[]);
}catch(e){if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')});await fs.writeFile(path.join(out,'failure.json'),JSON.stringify(await read(),null,2));}throw e;}
finally{try{if(context)await context.close();if(video)await video.saveAs(path.join(out,'expedition-flow.webm'));}finally{await closeBrowser(browser);}await fs.writeFile(path.join(out,'result.json'),JSON.stringify({checks,captures,errors,fixture:'Owned QA only: initial workshop approach/briefing, later currency and crafting requirements are prepared. Purchase, equip, marker, workshop exit, village walk, cave entry/retreat and crafting use real UI/server commands.'},null,2)+'\n');}
