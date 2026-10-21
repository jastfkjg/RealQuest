import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const {chromium}=createRequire(new URL('../../../package.json',import.meta.url))('playwright');
const test=await browserConfig('interface-refresh'),checks=[],shots=[],errors=[],states=[];
const browser=await launchBrowser(chromium,{headless:true});let context,page;
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function until(predicate,label='state'){for(let i=0;i<360;i++){const s=await read();if(predicate(s))return s;await page.waitForTimeout(70);}throw Error(label+': '+JSON.stringify(await read()));}
async function click(id){const c=(await until(s=>s.controls.some(c=>c.id===id&&!c.disabled),id)).controls.find(c=>c.id===id);await page.mouse.click(c.x,c.y);await page.waitForTimeout(120);}
async function field(id,value){await click(id);await page.keyboard.press('ControlOrMeta+A');await page.keyboard.insertText(value);await page.keyboard.press('Tab');await page.waitForTimeout(120);}
async function size(width,height){await page.setViewportSize({width,height});await until(s=>s.camera.width===width&&s.camera.height===height,'resize');await page.waitForTimeout(100);}
async function world(){for(let i=0;i<12&&(await read()).mode!=='world';i++){await page.keyboard.press('Escape');await page.waitForTimeout(100);}await until(s=>s.mode==='world'&&!s.busy);}
async function shot(name){await until(s=>!s.uiArt.loading.length,'materials');await page.waitForTimeout(200);const s=await read();assert.deepEqual(s.uiArt.failed,[]);
 for(const c of s.controls){assert(c.w>=44&&c.h>=44,c.id+' target size');assert(c.x-c.w/2>=-1&&c.x+c.w/2<=s.camera.width+1,c.id+' horizontal');assert(c.y-c.h/2>=-1&&c.y+c.h/2<=s.camera.height+1,c.id+' vertical');}
 for(let i=0;i<s.controls.length;i++)for(let j=i+1;j<s.controls.length;j++){const a=s.controls[i],b=s.controls[j];assert(Math.abs(a.x-b.x)>=(a.w+b.w)/2-1||Math.abs(a.y-b.y)>=(a.h+b.h)/2-1,`${name} overlap ${a.id}/${b.id}`);}
 if(!['world','welcome'].includes(s.mode)){
  assert.deepEqual(s.hudRegions,[],name+' world HUD hidden in focused panel');
  assert(!s.controls.some(c=>['menu','session','inventory','life','interact','up','down','left','right','tracker-open'].includes(c.id)),name+' no world navigation/input controls');
 }
 const inside=(c,r)=>c.x-c.w/2>=r.x-1&&c.x+c.w/2<=r.x+r.w+1&&c.y-c.h/2>=r.y-1&&c.y+c.h/2<=r.y+r.h+1;
 if(s.mode==='menu'&&s.uiRegions.length){
  const left=s.uiRegions.find(r=>r.id==='menu-left-leaf'),right=s.uiRegions.find(r=>r.id==='menu-right-leaf');
  for(const c of s.controls){const r=['menu-character','menu-growth','menu-equipment','menu-journal','menu-map'].includes(c.id)?left:right;assert(inside(c,r),name+' actual illustrated leaf bounds '+c.id);}
 }
 if(s.mode==='life'&&s.uiRegions.length){
  const left=s.uiRegions.find(r=>r.id==='life-index-leaf'),right=s.uiRegions.find(r=>r.id==='life-content-leaf');
  for(const c of s.controls)assert(inside(c,c.id.startsWith('tab-')?left:right),name+' Life leaf bounds '+c.id);
 }
 await page.screenshot({path:test.directory+'/'+name+'.png'});shots.push(name+'.png');states.push({name,mode:s.mode,viewport:s.camera,controls:s.controls,uiRegions:s.uiRegions,hudRegions:s.hudRegions,uiArt:s.uiArt});}
async function load(){await page.goto(test.baseURL);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);}
async function fixture(location,position){const save=(await read()).saveId;await page.goto('about:blank');execFileSync('backend/.venv/bin/python',['-c',`import sqlite3,json,sys,time
p,key,location,position=sys.argv[1:];sys.path.insert(0,'clients/cocos/tools');from test_guard import assert_fixture;assert_fixture(p)
c=sqlite3.connect(p);s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);s.update(location=location,position=json.loads(position));s['revision']+=1;s['world_clock'].update(updated_at=time.time(),running_until=0);c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()`,test.database,save,location,JSON.stringify(position)]);await load();await click('start');await until(s=>s.mode==='world'&&!s.busy);}
const sizes=[[1440,900],[1920,1080],[1056,627],[1024,768],[844,390],[740,360]];
try{
 context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:test.directory+'/video',size:{width:1440,height:900}}});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await load();for(const [w,h] of [...sizes,[1056,515]]){await size(w,h);await shot('registration-'+w+'x'+h);}
 await size(1440,900);await field('traveler-name','林间来客');await click('appearance-2');assert.equal((await read()).registrationAppearance,2);await shot('registration-selected');await click('start');await until(s=>s.mode==='world'&&!s.busy);assert.equal((await read()).character.appearance,2);assert.equal((await read()).character.name,'林间来客');
 checks.push('native Chinese registration and real appearance selection at seven desktop/landscape sizes; saved actor identity matches selected outfit');
 const position=(await read()).savedPosition;
 for(const [w,h] of sizes){
  await world();await size(w,h);await click('menu');await shot('menu-'+w);
  await world();await click('life');await click('tab-study');await shot('study-empty-'+w);await click('tab-history');await shot('history-empty-'+w);await click('tab-contracts');await shot('contracts-empty-'+w);
  await world();await click('session');await shot('credentials-'+w);await click('session-tab-data');await shot('data-'+w);await click('session-tab-recovery');await click('session-close');
 }
 assert.deepEqual((await read()).savedPosition,position);
 checks.push('menu and Life controls stay inside actual illustrated leaves, focused panels hide world HUD/navigation, six sizes retain >=44px targets without overlaps or world movement');
 await size(1440,900);await click('life');await click('tab-study');await click('study-new');await field('study-title','读一页村庄植物图鉴');await field('study-minutes','15');await click('save-study');await until(s=>s.mode==='life-study'&&!s.busy);await shot('study-detail');await world();await click('life');await click('tab-study');await shot('study-with-record');await click('tab-record');await field('activity-amount','5');await field('activity-note','整理书桌五分钟');await shot('manual-record');await click('save-activity');await until(s=>s.features.lifeTab==='history'&&!s.busy);await shot('history-with-record');assert.equal((await read()).points.knowledge,0);assert.equal((await read()).points.health,0);assert.equal((await read()).points.skill,0);
 await page.reload();await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);await click('start');await until(s=>s.mode==='world'&&!s.busy);assert.equal((await read()).studyTasks[0].title,'读一页村庄植物图鉴');assert((await read()).activities.some(a=>a.source==='manual'&&!a.verified));checks.push('real study/manual forms persist after reload and keep provenance; recording does not mint growth points');
 await fixture('overworld',{x:304,y:1136});await click('interact');await until(s=>s.mode==='cave');for(const [w,h] of sizes){await size(w,h);await shot('cave-entry-'+w);}
 await click('cave-enter');await until(s=>s.mode==='world'&&s.location==='cave_1');await click('interact');await until(s=>s.mode==='cave');await click('cave-retreat');await until(s=>s.mode==='world'&&s.location==='overworld');
 await fixture('overworld',{x:1784,y:368});await click('interact');await until(s=>s.mode==='gate');await shot('gate-locked-740');assert((await read()).controls.find(c=>c.id==='open-gate').disabled);
 checks.push('existing native cave/gate artwork represents actual state; explicit cave entry and retreat work and locked gate remains disabled');
 for(const [location,position,mode,name] of [
  ['shop',{x:240,y:236},'shop','market-counter'],
  ['workshop',{x:376,y:296},'armory','armory'],
  ['workshop',{x:240,y:220},'building','workbench'],
  ['library',{x:112,y:252},'spellbook','spellbook'],
  ['home',{x:360,y:224},'storage','storage'],
  ['home',{x:320,y:144},'sleep','rest'],
 ]){
  await fixture(location,position);await click('interact');
  if(mode==='shop'&&(await read()).mode==='dialogue'){
   for(let i=0;i<12&&!(await read()).controls.some(c=>c.id==='tab-shop');i++)await click('dialogue-next');
   await click('tab-shop');
  }
  await until(s=>s.mode===mode,name);
  for(const [w,height] of [[1440,900],[740,360]]){await size(w,height);await shot(name+'-'+w);}
 }
 await world();await size(1440,900);await click('menu');await click('menu-preferences');await shot('preferences-1440');await size(740,360);await shot('preferences-740');
 checks.push('actual market, armory, workbench, spellbook, home storage/rest and preferences at desktop/short landscape retain 44px controls and focused input without world HUD');
 assert.deepEqual(errors,[]);
}catch(error){if(page&&!page.isClosed())try{await page.screenshot({path:test.directory+'/failure.png'});await fs.writeFile(test.directory+'/failure-state.json',JSON.stringify(await read(),null,2));}catch{}throw error;}
finally{try{if(context)await context.close();}finally{await closeBrowser(browser);}await fs.writeFile(test.directory+'/result.json',JSON.stringify({checks,shots,errors,states,fixture:'Only the fresh owned QA guest was relocated to actual service locations for visual/input checks; no fabricated possessions or rewards.'},null,2)+'\n');}
