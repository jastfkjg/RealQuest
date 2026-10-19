import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../../../',import.meta.url)));
const require=createRequire(new URL('../../../package.json',import.meta.url)),{chromium}=require('playwright');
const test=await browserConfig('rest');const base=test.baseURL,out=test.directory,db=test.database;
await test.assertDatabase();
const browser=await launchBrowser(chromium,{headless:true}),contexts=[],errors=[],checks=[],captures=[];let page,save,video;
const read=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function until(p,pred,label='condition',ms=18000){for(const start=Date.now();Date.now()-start<ms;){const s=await read(p);if(pred(s))return s;await p.waitForTimeout(80);}throw Error(label+': '+JSON.stringify(await read(p)));}
async function click(p,id){const s=await until(p,s=>s.controls.some(c=>c.id===id&&!c.disabled),'click '+id),c=s.controls.find(c=>c.id===id);await p.mouse.click(c.x,c.y);await p.waitForTimeout(150);}
async function tap(p,id){const s=await until(p,s=>s.controls.some(c=>c.id===id&&!c.disabled)),c=s.controls.find(c=>c.id===id);await p.touchscreen.tap(c.x,c.y);await p.waitForTimeout(170);}
async function welcome(p){await p.goto(base);await p.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);}
async function load(p){await welcome(p);await click(p,'start');await until(p,s=>s.mode==='world'&&!s.busy&&s.connection==='ready','world');}
async function world(p){for(let i=0;i<16&&(await read(p)).mode!=='world';i++){await p.keyboard.press('Escape');await p.waitForTimeout(140);}await until(p,s=>s.mode==='world'&&!s.busy);}
async function menu(p,id){await world(p);await click(p,'menu');for(let i=0;i<3;i++){if((await read(p)).controls.some(c=>c.id==='menu-'+id))break;await click(p,'menu-next');}await click(p,'menu-'+id);}
async function last(p){for(let i=0;i<50;i++){if((await read(p)).controls.find(c=>c.id==='places-next')?.disabled)return;await click(p,'places-next');}throw Error('pagination never ends');}
async function go(x,y){const s=await read(page),c=s.camera,px=c.width/2+c.x+x*c.zoom,py=c.height/2-c.y+y*c.zoom;assert(px>=0&&px<c.width&&py>=0&&py<c.height,'visible walking target');await page.mouse.click(px,py);await until(page,s=>Math.hypot(s.savedPosition.x-x,s.savedPosition.y-y)<64&&!s.route.length||s.mode!=='world','walking',24000);await page.waitForTimeout(350);}
async function use(id){if((await read(page)).mode!=='world')return;await until(page,s=>s.nearby?.id===id,'nearby '+id);await click(page,'interact');await until(page,s=>!s.busy);}
async function geometry(p){const s=await read(p),v=p.viewportSize();for(const c of s.controls){assert(c.w>=44&&c.h>=44,c.id+' target size');assert(c.x-c.w/2>=-1&&c.x+c.w/2<=v.width+1&&c.y-c.h/2>=-1&&c.y+c.h/2<=v.height+1,c.id+' bounds');}for(let i=0;i<s.controls.length;i++)for(let j=i+1;j<s.controls.length;j++){const a=s.controls[i],b=s.controls[j];assert(!(Math.abs(a.x-b.x)<(a.w+b.w)/2-1&&Math.abs(a.y-b.y)<(a.h+b.h)/2-1),'overlap '+a.id+'/'+b.id);}}
async function shot(p,name){await geometry(p);await p.waitForTimeout(180);await p.screenshot({path:path.join(out,name+'.png')});captures.push(name);}
const check=name=>{checks.push(name);console.log('PASS '+name);};
async function auth(p){return p.evaluate(()=>JSON.parse(localStorage.getItem('realquest-session-v2')));}
async function api(p,route='state',body){const a=await auth(p),r=await p.request.fetch(base+'/api/'+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+a.token},data:body});assert(r.ok(),route+' '+r.status());return r.json();}
async function raw(p){return (await api(p,'export')).state;}
const assets=s=>({inventory:s.inventory,storage:s.storage,xp:s.xp,attributes:s.attributes,knowledge_points:s.knowledge_points,health_points:s.health_points,skill_points:s.skill_points,knowledge_growth:s.knowledge_growth,skill_growth:s.skill_growth});
async function context(options={}){const c=await browser.newContext({viewport:{width:1440,height:900},...options});contexts.push(c);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::ERR_FAILED/.test(m.text()))errors.push(m.text());});return {c,p};}
async function seed(patch,transform=''){await page.goto('about:blank');execFileSync('backend/.venv/bin/python',['-c',`import json,sqlite3,sys,time
p,key,patch=sys.argv[1:];sys.path.insert(0,'clients/cocos/tools');from test_guard import assert_fixture;assert_fixture(p);c=sqlite3.connect(p)
s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0]);assert s['character'];s.update(json.loads(patch));s['revision']+=1;s['world_clock'].update(updated_at=time.time(),running_until=0)
${transform}
c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()`,db,save,JSON.stringify(patch)]);await load(page);}
async function atlas(p){await world(p);await p.keyboard.press('m');await until(p,s=>s.mode==='map');}
async function findPlace(p,mapId,id){await until(p,s=>s.mode==='map');for(let i=0;i<16&&(await read(p)).features.atlasMap!==mapId;i++)await click(p,'atlas-map-next');assert.equal((await read(p)).features.atlasMap,mapId);for(let i=0;i<40;i++){const s=await read(p);if(s.controls.some(c=>c.id==='atlas-place-'+id)){await click(p,'atlas-place-'+id);return;}assert(!s.controls.find(c=>c.id==='atlas-next').disabled,'missing place '+id);await click(p,'atlas-next');}throw Error('place missing');}
async function subject(p,id){for(let i=0;i<6;i++){if((await read(p)).controls.some(c=>c.id==='neighbor-'+id)){await click(p,'neighbor-'+id);return;}await click(p,'atlas-next');}throw Error('neighbor missing');}
async function nearResident(id,elapsed=562.5,extra=''){await seed({},`s['world_clock'].update(elapsed=${elapsed},updated_at=time.time(),running_until=0);s['npc_encounter']=None
import sys;sys.path.insert(0,'backend')
from app.residents import resident_position
p=resident_position(s,'${id}',time.time());s['location']=p['location'];s['position']={'x':p['x'],'y':p['y']+32}
${extra}`);}
try{const main=await context();page=main.p;await load(page);save=(await read(page)).saveId;
 await seed({location:'inn',position:{x:288,y:152}},"s['departure']['booking_day']=0");const before=assets(await raw(page));await use('inn_bed');assert((await read(page)).controls.find(c=>c.id==='sleep-night').disabled);await shot(page,'rest-unbooked-inn');await page.setViewportSize({width:740,height:360});await until(page,s=>s.camera.width===740);await page.waitForTimeout(170);await shot(page,'rest-unbooked-inn-740');await world(page);assert.deepEqual(assets(await raw(page)),before);check('inn without current-day booking visibly disables sleep, preserves assets and has44px desktop/short-landscape controls');
 await seed({location:'home',position:{x:288,y:152}},"s['stamina'].update(current=70,updated_at=time.time())");const restBefore=assets(await raw(page));await use('home_bed');await shot(page,'rest-home-740');await click(page,'short-rest');await until(page,s=>s.mode==='world'&&!s.busy);assert((await read(page)).stamina.current>70);assert((await read(page)).stamina.current<=100);assert.deepEqual(assets(await raw(page)),restBefore);await shot(page,'rest-home-returned-world');check('successful home short rest returns to play, shows confirmed recovery and leaves inventory/points/XP unchanged');assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'rest-result.json'),JSON.stringify({checks,captures,errors,fixture:{saveId:save,note:'Only location/current-day booking and70-stamina setup are prepared; UI rest is actual server command.'}},null,2));console.log(checks.length+' rest groups / '+captures.length+' captures.');
}catch(e){if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'rest-failure.png')});await fs.writeFile(path.join(out,'rest-failure.json'),JSON.stringify(await read(page),null,2));}throw e;}finally{for(const c of contexts)await c.close();await closeBrowser(browser);}
