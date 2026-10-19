import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../../../',import.meta.url)));
const {chromium}=createRequire(new URL('../../../package.json',import.meta.url))('playwright');const test=await browserConfig('preference-layout'),out=test.directory,db=test.database,captures=[],errors=[];
await test.assertDatabase();
const browser=await launchBrowser(chromium,{headless:true});let page;
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(test,label){for(let start=Date.now();Date.now()-start<20000;){const s=await read();if(test(s))return s;await page.waitForTimeout(70);}throw Error(label);}
async function click(id){const c=(await wait(s=>s.controls.some(c=>c.id===id&&!c.disabled),id)).controls.find(c=>c.id===id);await page.mouse.click(c.x,c.y);await page.waitForTimeout(100);}
async function load(){await page.goto(test.baseURL);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);await click('start');await wait(s=>s.mode==='world'&&!s.busy,'world');}
async function shot(name){const s=await read(),v=s.camera;for(const c of s.controls)assert(c.w>=44&&c.h>=44&&c.x-c.w/2>=-1&&c.x+c.w/2<=v.width+1&&c.y-c.h/2>=-1&&c.y+c.h/2<=v.height+1,c.id+' geometry');for(let i=0;i<s.controls.length;i++)for(let j=i+1;j<s.controls.length;j++){const a=s.controls[i],b=s.controls[j];assert(!(Math.abs(a.x-b.x)<(a.w+b.w)/2-1&&Math.abs(a.y-b.y)<(a.h+b.h)/2-1),a.id+'/'+b.id+' overlap');}if(s.feedback)for(const c of [...s.controls,...s.hudRegions]){const f=s.feedback;assert(!(Math.abs(c.x-f.x)<(c.w+f.w)/2-1&&Math.abs(c.y-f.y)<(c.h+f.h)/2-1),'feedback/'+c.id+' overlap');}await page.screenshot({path:path.join(out,'layout-'+name+'.png')});await fs.writeFile(path.join(out,'layout-'+name+'.json'),JSON.stringify(s,null,2));captures.push(name);}
try{
 page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));await load();const save=(await read()).saveId;
 for(const location of ['overworld','city','cave_1']){
  await page.goto('about:blank');execFileSync('backend/.venv/bin/python',['-c',`import sqlite3,json,sys,time
sys.path.insert(0,'backend')
from app.combat import ensure_combat
db,key,location=sys.argv[1:];sys.path.insert(0,'clients/cocos/tools');from test_guard import assert_fixture;assert_fixture(db);assert location in ['overworld','city','cave_1'];c=sqlite3.connect(db);row=c.execute('select state from players where id=?',(key,)).fetchone();assert row;s=json.loads(row[0]);ensure_combat(s);s.update(location=location,position={'x':64,'y':352} if location=='cave_1' else {'x':240,'y':320});s['world_clock'].update(elapsed=1237.5,updated_at=time.time(),running_until=0);s['stamina'].update(current=2,updated_at=time.time());s['revision']+=1;c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()`,db,save,location]);await load();
  for(const size of [{width:1920,height:1080},{width:1440,height:900},{width:1024,height:768},{width:844,height:390},{width:740,height:360}]){await page.setViewportSize(size);await wait(s=>s.camera.width===size.width,'resize');await page.waitForTimeout(160);assert((await read()).controls.some(c=>c.id==='travel-notice'));await shot(location+'-'+size.width);}
  if(location!=='cave_1'){await click('travel-notice');await click('notice-action');await wait(s=>s.mode==='world'&&!!s.feedback,'real marker feedback');assert((await read()).controls.some(c=>c.id==='travel-notice'));await shot(location+'-740-feedback');}
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'layout-result.json'),JSON.stringify({checks:['Actual world notice coexists with current goal, touch pad, cave dock and local/travel status at five desktop and short-landscape sizes.','Real marker feedback remains clear of important notices and all controls in village and city at740.'],captures,errors,fixture:'Own fresh QA guest only. Relocated/prepared clock/stamina to inspect village, city and safe cave entrance HUD; no proof of natural travel, combat, earned equipment or elapsed night.'},null,2));console.log('PASS 2 layout groups / '+captures.length+' captures.');
}catch(e){if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'layout-failure.png')});await fs.writeFile(path.join(out,'layout-failure.json'),JSON.stringify(await read(),null,2));}throw e;}finally{await closeBrowser(browser);}
