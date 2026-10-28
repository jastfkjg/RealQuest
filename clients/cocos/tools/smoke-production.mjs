import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import {auditPanelText} from './ui-layout-audit.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const test=await browserConfig('production'),out=test.directory;await test.assertDatabase();
const browser=await launchBrowser(chromium,{headless:true});let page;const errors=[],checks=[],captures=[];
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(fn,label='state'){for(const start=Date.now();Date.now()-start<20000;){const s=await read();if(fn(s))return s;await page.waitForTimeout(80);}throw Error(label+': '+JSON.stringify(await read()));}
async function click(id){const s=await wait(s=>s.controls.some(c=>c.id===id&&!c.disabled),'click '+id),c=s.controls.find(c=>c.id===id);if(page.viewportSize().width<1000)await page.touchscreen.tap(c.x,c.y);else await page.mouse.click(c.x,c.y);await page.waitForTimeout(160);}
async function choose(id){for(let i=0;i<5;i++){if((await read()).controls.some(c=>c.id==='construction-select-'+id)){await click('construction-select-'+id);return;}await click('construction-page');}throw Error('construction selection '+id);}
async function field(id,value){await click(id);await page.keyboard.press('ControlOrMeta+A');await page.keyboard.insertText(value);await page.keyboard.press('Tab');await page.waitForTimeout(100);}
async function load(){await page.goto(test.baseURL);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);await click('start');await wait(s=>s.mode==='world'&&!s.busy&&s.connection==='ready');}
async function fixture(code){const id=(await read()).saveId;await page.goto('about:blank');execFileSync('backend/.venv/bin/python',['-c',`import json,sqlite3,sys,time
p,key=sys.argv[1:];sys.path.insert(0,'clients/cocos/tools');from test_guard import assert_fixture;assert_fixture(p)
c=sqlite3.connect(p);s=json.loads(c.execute('select state from players where id=?',(key,)).fetchone()[0])
${code}
s['world_clock'].update(updated_at=time.time(),running_until=0);s['revision']+=1
c.execute('update players set state=? where id=?',(json.dumps(s),key));c.commit();c.close()`,test.database,id]);await load();}
async function object(id){const s=await read(),o=s.interactables.find(o=>o.id===id);assert(o,'object '+id);const c=s.camera;await page.mouse.click(c.width/2+c.x+o.x*c.zoom,c.height/2-c.y+o.y*c.zoom);await wait(s=>s.mode!=='world','interact '+id);}
async function world(){for(let i=0;i<8&&(await read()).mode!=='world';i++){await page.keyboard.press('Escape');await page.waitForTimeout(140);}await wait(s=>s.mode==='world'&&!s.busy);}
async function shot(name){const s=await read(),v=page.viewportSize();for(const c of s.controls){assert(c.w>=44&&c.h>=44,c.id+' target');assert(c.x-c.w/2>=-1&&c.x+c.w/2<=v.width+1&&c.y-c.h/2>=-1&&c.y+c.h/2<=v.height+1,c.id+' bounds');}for(let i=0;i<s.controls.length;i++)for(let j=i+1;j<s.controls.length;j++){const a=s.controls[i],b=s.controls[j];assert(!(Math.abs(a.x-b.x)<(a.w+b.w)/2-1&&Math.abs(a.y-b.y)<(a.h+b.h)/2-1),a.id+'/'+b.id+' overlap');}assert.deepEqual(await auditPanelText(page),[],name+' readable text');await page.screenshot({path:path.join(out,name+'.png')});await fs.writeFile(path.join(out,name+'.json'),JSON.stringify(s,null,2));captures.push(name);}
async function worldShot(name){await wait(s=>s.mode==='world'&&!s.busy);await page.screenshot({path:path.join(out,name+'.png')});await fs.writeFile(path.join(out,name+'.json'),JSON.stringify(await read(),null,2));captures.push(name);}
const check=s=>{checks.push(s);console.log('PASS '+s);};
async function ledger(){await object('ranch_ledger');await click('ranch-tab-process');await click('ranch-process');await wait(s=>s.mode==='production');}
async function nearMachine(key){await world();await fixture("m=s['construction']['machines']['"+key+"'];s.update(location='pasture',position={'x':m['x'],'y':m['y']+40})");await object(key);await wait(s=>s.mode==='production-machine');}
async function place(item,x){
 await world();await fixture("s.update(location='pasture',position={'x':448,'y':440})");await ledger();await click('production-place');
 const names={mayo_machine:'蛋黄酱机',loom_machine:'织布机',cheese_press:'压酪机',oil_press:'榨油机'};
 for(let i=0;i<5;i++){if((await read()).controls.find(c=>c.id==='placement-device').label.includes(names[item]))break;await click('placement-device');}
 if(x>=528)await click('zone-east');await click('machine-place-'+x);const old=Object.keys((await read()).construction.machines);
 await shot('placement-'+item+'-'+x);await click('machine-placement-confirm');await wait(s=>s.mode==='world'&&!s.busy&&Object.keys(s.construction.machines).length===old.length+1);
 return Object.keys((await read()).construction.machines).find(k=>!old.includes(k));
}
async function sleep(){await world();await fixture("s.update(location='home',position={'x':288,'y':152})");await object('home_bed');await click('sleep-night');await wait(s=>s.mode==='world'&&!s.busy);}
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},hasTouch:true,reducedMotion:'reduce',recordVideo:{dir:out+'/video'}});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await load();await fixture("s.update(location='workshop',position={'x':96,'y':288});s['inventory'].update(wood=100,plank=100,stone=200,egg=5,duck_egg=2,milk=2,goat_milk=2,wool=2,truffle=2,fine_egg=2);s['skill_growth']['building']=0");
 for(const item of ['mayo_machine','loom_machine','cheese_press','oil_press']){await object('carpenter');await choose(item);await shot('blueprint-'+item);await click('construction-learn');await wait(s=>s.construction.blueprints.includes(item));await world();}
 check('four permanent blueprints learned from actual carpenter');
 await fixture("s.update(location='workshop',position={'x':240,'y':196})");await object('workshop_counter');await choose('oil_press');assert((await read()).controls.find(c=>c.id==='construction-craft').disabled);await shot('building-level-required');
 await world();await fixture("s['skill_growth']['building']=4;s.update(location='workshop',position={'x':240,'y':196})");await object('workshop_counter');
 for(const item of ['mayo_machine','loom_machine','cheese_press','oil_press','mayo_machine']){await choose(item);const before=await read();await click('construction-craft');await wait(s=>!s.busy&&s.inventory[item]===(before.inventory[item]||0)+1);const after=await read();for(const [id,n] of Object.entries(before.constructionView.recipes[item].costs))assert.equal(after.inventory[id],before.inventory[id]-n);}
 await shot('workbench-devices');check('skill gate and five crafts conserve exact server materials');
 await world();await click('inventory');for(let i=0;i<20;i++){if((await read()).controls.some(c=>c.id==='item-oil_press'))break;await click('inventory-next');}await click('item-oil_press');await shot('inventory-device');
 const ids={};for(const [item,x]of [['mayo_machine',144],['loom_machine',240],['cheese_press',624],['oil_press',720],['mayo_machine',336]])ids[item+(x===336?'_second':'')]=await place(item,x);
 await worldShot('workyard-world');check('five devices placed from inventory and visible as individual world objects');
 await nearMachine(ids.mayo_machine);const before=(await read()).inventory.egg;let drops=2;const requests=[];
 await page.route('**/api/command',async r=>{const body=r.request().postDataJSON();if(body.action==='ranch_process'){requests.push(body);if(drops-->0){await r.fetch();return r.abort('failed');}}await r.continue();});
 await click('machine-process');await wait(s=>s.connection==='uncertain'&&!s.busy);await shot('lost-response');await page.unroute('**/api/command');await click('machine-reconnect');await wait(s=>s.connection==='ready'&&!s.busy);assert.equal((await read()).inventory.egg,before-1);assert.deepEqual(requests[0],requests[1]);await shot('machine-processing');check('lost committed response retries same receipt and consumes exactly once');
 for(const [item,recipe] of [['loom_machine','wool_cloth'],['cheese_press','milk_cheese'],['oil_press','truffle_oil'],['mayo_machine_second','duck_mayo']]){await nearMachine(ids[item]);await click('machine-recipe-'+recipe);await click('machine-process');await wait(s=>!s.busy&&s.ranch.jobs[ids[item]]);assert((await read()).controls.find(c=>c.id==='machine-move').disabled);assert((await read()).controls.find(c=>c.id==='machine-pack').disabled);}
 assert.equal(Object.keys((await read()).ranch.jobs).length,5);check('two same-kind machines and three others process independently; busy devices block move and pack');
 for(const v of [{width:844,height:390},{width:740,height:360}]){await page.setViewportSize(v);await wait(s=>s.camera.width===v.width);await shot('processing-'+v.width);}
 await page.setViewportSize({width:1440,height:900});for(let night=0;night<3&&Object.values((await read()).ranching.jobs).some(j=>!j.ready);night++)await sleep();
 for(const [item,output] of [['mayo_machine','mayonnaise'],['loom_machine','cloth'],['cheese_press','cheese'],['oil_press','truffle_oil'],['mayo_machine_second','duck_mayo']]){await nearMachine(ids[item]);await wait(s=>s.ranching.jobs[ids[item]]?.ready);const old=(await read()).inventory[output]||0;await shot('ready-'+item);await click('machine-process');await wait(s=>!s.busy&&!s.ranch.jobs[ids[item]]);assert.equal((await read()).inventory[output],old+1);}
 check('actual sleep completes all five jobs; each device returns its corresponding product');
 await nearMachine(ids.cheese_press);await click('machine-recipe-goat_cheese');await click('machine-process');await wait(s=>s.ranch.jobs[ids.cheese_press]&&!s.busy);
 await nearMachine(ids.mayo_machine);await click('machine-recipe-egg_mayo');await click('machine-quality');assert.equal((await read()).controls.find(c=>c.id==='machine-quality').label,'优质原料');await click('machine-process');await wait(s=>s.ranch.jobs[ids.mayo_machine]&&!s.busy);for(let night=0;night<3&&Object.values((await read()).ranching.jobs).some(j=>!j.ready);night++)await sleep();
 await nearMachine(ids.mayo_machine);await click('machine-process');await wait(s=>s.inventory.fine_mayonnaise===1&&!s.busy);await nearMachine(ids.cheese_press);await click('machine-process');await wait(s=>s.inventory.goat_cheese===1&&!s.busy);check('all six existing recipes work and fine input preserves output quality');
 await nearMachine(ids.oil_press);await click('machine-move');await click('zone-east');await click('machine-place-816');await click('machine-placement-confirm');await wait(s=>s.mode==='world'&&s.construction.machines[ids.oil_press].x===816);await nearMachine(ids.oil_press);await click('machine-pack');await wait(s=>s.mode==='world'&&s.inventory.oil_press===1);assert(!(await read()).construction.machines[ids.oil_press]);const repacked=await place('oil_press',768);await nearMachine(repacked);await shot('replaced-device');check('idle move, pack and re-place preserve the device');
 for(const v of [{width:844,height:390},{width:740,height:360}]){await page.setViewportSize(v);await wait(s=>s.camera.width===v.width);await shot('idle-'+v.width);await click('machine-move');await shot('move-'+v.width);await click('close');await world();await fixture("s.update(location='pasture',position={'x':448,'y':440})");await ledger();await shot('production-index-'+v.width);await world();await fixture("s.update(location='workshop',position={'x':240,'y':196})");await object('workshop_counter');await choose('oil_press');await shot('workbench-'+v.width);await nearMachine(repacked);}
 await world();await load();assert.equal(Object.keys((await read()).construction.machines).length,5);assert.equal((await read()).inventory.fine_mayonnaise,1);check('desktop and two touch landscape layouts fit; devices, diagrams and products survive reload');
 assert.deepEqual(errors,[]);await context.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify({checks,captures,errors,complete:true,fixture:'Isolated QA materials/building skill/approach coordinates only. Actual UI learns, crafts, places, starts, sleeps, collects, moves, packs, replaces. No fixture machines/jobs.'},null,2));
}catch(e){if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')});await fs.writeFile(path.join(out,'failure.json'),JSON.stringify(await read(),null,2));}throw e;}finally{await closeBrowser(browser);}
