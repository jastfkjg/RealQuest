import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import {auditPanelText} from './ui-layout-audit.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const test=await browserConfig('equipment'),out=test.directory;
await test.assertDatabase();const browser=await launchBrowser(chromium,{headless:true});
let page,context,video;const checks=[],captures=[],errors=[],fixtures=[];
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function wait(fn,label='state',timeout=16000){for(const start=Date.now();Date.now()-start<timeout;){const s=await read();if(fn(s))return s;await page.waitForTimeout(60);}throw Error(label+': '+JSON.stringify(await read()));}
async function click(id){if(id.startsWith('filter-')&&(await read()).controls.some(c=>c.id==='smith-filter')){const filter=id.slice(7);for(let i=0;i<5&&(await read()).features.gearFilter!==filter;i++)await click('smith-filter');return;}const s=await wait(s=>s.controls.some(c=>c.id===id&&!c.disabled),'click '+id),c=s.controls.find(c=>c.id===id);await page.mouse.click(c.x,c.y);await page.waitForTimeout(120);}
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
async function useService(id,mode){
 await world();const initial=await read(),o=initial.interactables.find(o=>o.id===id);assert(o,'world object '+id);
 // Walk along the clear aisle; on short landscapes the distant anvil is initially offscreen.
 for(const goal of [{x:328,y:initial.player.y},{x:328,y:o.y}]){
  for(let i=0;i<120;i++){const s=await read(),dx=goal.x-s.player.x,dy=goal.y-s.player.y;if(Math.abs(dx)<7&&Math.abs(dy)<7)break;
   const key=Math.abs(dx)>=7?(dx>0?'d':'a'):(dy>0?'s':'w');await page.keyboard.down(key);await page.waitForTimeout(45);await page.keyboard.up(key);await page.waitForTimeout(30);
  }
 }
 await wait(s=>s.nearby?.id===id,'walk to '+id);await page.keyboard.press('e');await wait(s=>s.mode===mode&&!s.busy,'open '+mode);
}
async function equipGear(id){
 await world();await click('menu');await click('menu-equipment');await choose(id);await click('equip-weapon');await wait(s=>s.combat.equipped===id||Object.values(s.combat.equipment).includes(id));await useService('blacksmith','armory');
}
try{
 context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out+'/video',size:{width:1440,height:900}}});page=await context.newPage();video=page.video();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/net::ERR_FAILED|Failed to load resource/.test(m.text()))errors.push(m.text());});
 await load();await fixture("s['location']='workshop';s['position']={'x':376,'y':184};s['inventory'].update(gold=3000,plank=60,stone=60,gel=60,shell=60,crystal=60);s['skill_growth']['building']=3;s['knowledge_growth'].update(science=3,magic=3);s['health_points']=4",'QA workshop approach, currency/materials and growth; no weapons or learned diagrams injected');
 await page.keyboard.press('e');await wait(s=>s.mode==='armory');await shot('village-armory-1440');
 let s=await read();for(const id of ['clockwork_pistol','repeater_smg','prism_rifle','exo_armor'])assert(!s.combat.gear_shop.offers.includes(id)&&!s.combat.gear_shop.diagrams.includes(id)&&!s.combat.gear_shop.research.includes(id));
 await click('buy-gear');await wait(s=>s.inventory.stone_sword===1&&!s.busy);assert.equal((await read()).combat.equipped,null);await equipGear('stone_sword');
 await click('filter-science');await shot('village-science');await click('tab-diagrams');await click('filter-martial');await choose('wooden_bow');
 const before=(await read()).inventory.gold,attempts=[];let lost=true;
 await page.route('**/api/command',async route=>{const b=route.request().postDataJSON();if(b.action==='blueprint_buy'){attempts.push(b);if(lost){lost=false;await route.fetch();return route.abort();}}await route.continue();});
 await click('buy-blueprint');await wait(s=>s.combat.blueprints.wooden_bow&&!s.busy);await page.unroute('**/api/command');assert.equal(attempts.length,2);assert.deepEqual(attempts[0],attempts[1]);assert.equal((await read()).inventory.gold,before-16);assert((await read()).controls.find(c=>c.id==='buy-blueprint').disabled);await shot('diagram-learned');
 await useService('armory_counter','forge');await choose('wooden_bow');const materials={...(await read()).inventory};await click('craft-gear');await wait(s=>s.inventory.wooden_bow===1&&!s.busy);s=await read();assert.equal(s.inventory.plank,materials.plank-4);assert.equal(s.inventory.gel,materials.gel-2);assert.equal(s.combat.equipped,'stone_sword');assert(s.combat.blueprints.wooden_bow);await equipGear('wooden_bow');await shot('crafted-bow');
 check('village excludes advanced science; actual purchase needs explicit equip; lost diagram reply replays identical request and charges once; learned diagram remains after exact-cost crafting');
 await world();await click('inventory');await choose('stone_sword','item-');await click('quick-0');await choose('wooden_bow','item-');await click('quick-1');await world();await page.keyboard.press('1');await wait(s=>s.combat.equipped==='stone_sword'&&!s.busy);assert.equal((await read()).mode,'world');await page.keyboard.press('2');await wait(s=>s.combat.equipped==='wooden_bow'&&!s.busy);await shot('quick-equipped-bow');await load();assert.equal((await read()).combat.equipped,'wooden_bow');await page.keyboard.press('1');await wait(s=>s.combat.equipped==='stone_sword'&&!s.busy);
 check('real inventory pocket assignment and1–2 switch equipment without attacking/opening a menu; equipment and pockets persist through reload');
 await page.keyboard.press('e');await wait(s=>s.mode==='armory');await click('tab-obtain');await click('filter-martial');await choose('stone_hammer');await click('buy-gear');await wait(s=>s.inventory.stone_hammer===1&&!s.busy);assert((await read()).combat.gear.stone_hammer.use_reasons.length);await shot('stamina-gate');
 await world();for(let i=0;i<2;i++){const r=await command('health_spend',{target:'stamina',expected_invested:i});assert.equal(r.status,200);}await load();await page.keyboard.press('e');await wait(s=>s.mode==='armory');await choose('stone_hammer');await equipGear('stone_hammer');
 await click('filter-gear');for(const id of ['travel_coat','scout_boots','lantern_charm']){await choose(id);await click('buy-gear');await wait(s=>s.inventory[id]===1&&!s.busy);await equipGear(id);await click('filter-gear');}
 s=await read();assert.equal(s.combat.gear_stats.defense,1);assert.equal(s.combat.gear_stats.dodge_bonus,.15);assert.equal(s.combat.gear_stats.heal_bonus,5);await shot('equipped-protection');await world();await click('menu');await click('menu-equipment');await wait(s=>s.mode==='equipment');await choose('stone_hammer');await shot('equipment-four-slots');await click('gear-unequip');await wait(s=>!s.busy);await world();
 check('permanent stamina gate rejects a purchased hammer, actual health-point allocation unlocks it; armor, boots and charm occupy independent slots and change real combat statistics');
 for(const size of [{width:1920,height:1080},{width:1024,height:768},{width:844,height:390},{width:740,height:360}]){
  await page.setViewportSize(size);await wait(s=>s.camera.width===size.width);await page.keyboard.press('e');await wait(s=>s.mode==='armory');await click('filter-magic');await choose('frost_staff');await shot('armory-'+size.width);if((await read()).controls.some(c=>c.id==='smith-see-blueprint'))await click('smith-see-blueprint');await click('gear-requirements');await wait(s=>s.mode==='gear-recipe');await shot('conditions-'+size.width);await world();
 }
 await page.setViewportSize({width:1440,height:900});await fixture("s['location']='city';s['position']={'x':520,'y':320};s['inventory']['gold']=20000;s['knowledge_growth'].update(science=10,magic=10);s['skill_growth']['building']=5;c['boss_first']=True",'QA city approach and late-game growth/first-boss qualification for advanced channels, no advanced gear or diagrams injected');
 await shot('city-workshop-world');await page.keyboard.press('e');await wait(s=>s.mode==='armory');await click('filter-science');await choose('clockwork_pistol');await shot('city-pistol');await click('buy-gear');await wait(s=>s.inventory.clockwork_pistol===1&&!s.busy);
 await click('tab-materials');await choose('alloy');await click('buy-material-five');await wait(s=>s.inventory.alloy===5&&!s.busy);await shot('city-materials');
 await fixture("s['inventory'].update(alloy=80,mechanism=80,energy_cell=80,focus_core=80)",'QA sufficient city crafting materials for high-tier recipe validation; purchases already verified separately');
 await page.keyboard.press('e');await wait(s=>s.mode==='armory');await click('tab-diagrams');await click('filter-science');await choose('prism_rifle');const crystal=(await read()).inventory.crystal;await shot('city-research');await click('buy-blueprint');await wait(s=>s.combat.blueprints.prism_rifle&&!s.busy);assert.equal((await read()).inventory.crystal,crystal-6);await click('tab-craft');await choose('prism_rifle');await click('craft-gear');await wait(s=>s.inventory.prism_rifle===1&&!s.busy);await click('armory-equip');await wait(s=>s.combat.equipped==='prism_rifle'&&!s.busy);await shot('laser-crafted');
 check('actual city counter exposes city-only pistol and materials; late research consumes6 crystals and a quoted fee, permanently unlocks laser recipe, real crafting/equip succeeds');
 const catalogue=JSON.parse(await fs.readFile(new URL('../../../backend/app/equipment_catalog.json',import.meta.url),'utf8'));
 for(const g of catalogue.equipment.filter(g=>g.slot==='weapon')){
  await fixture(`s['location']='cave_1';s['position']={'x':220,'y':240};s['stamina'].update(max=200,current=200,updated_at=time.time());s['inventory']['${g.id}']=1;s['tools']['held']='${g.id}';c.update(equipped='${g.id}',encounter=str(uuid.uuid4()),input_seq=0,last_tick=0,time=0,cast=None,action=None,dash=None,dodge_at=0,attack_at=0,spark_at=0,hurt_until=0,effects=[],projectiles=[],floors={});es=floor_enemies(s,time.time())\nfor i,e in enumerate(es):e.update(x=250 if i==0 else 500,y=240 if i==0 else 360+i*20,hp=1000,max_hp=1000,phase='recover',until=1000)`,g.id+': QA held gear and high-HP static target; actual input/projectile contact causes damage, no reward or death injected');
  // This all-weapon integration scenario explicitly opts into target lock.
  await page.keyboard.press('t');await wait(s=>s.combatTarget==='1-0',g.id+' explicit target lock');await page.keyboard.press('Space');await wait(s=>s.combat.enemies[0].hp<1000,g.id+' actual hit');assert.equal((await read()).stamina.current,200);if(['stone_sword','wooden_bow','stone_hammer','repeating_crossbow','clockwork_pistol','prism_rifle','frost_staff','crystal_sword'].includes(g.id))await shot('combat-'+g.id);
  const visible=await page.evaluate(async()=>{const cc=await System.import('cc'),s=JSON.parse(window.render_game_to_text());let found=false;function visit(n){if(n.name==='HeldWeaponArt'&&n.activeInHierarchy)found=true;if(n.name==='Player'&&n.activeInHierarchy&&s.swordPresentation?.active){const frame=n.getComponent(cc.Sprite)?.spriteFrame;found=found||!!frame&&frame.rect.width===96&&frame.rect.height===96;}n.children.forEach(visit);}visit(cc.director.getScene());return found;});assert(visible,g.id+' actual held-weapon or integrated-sword sprite visible');
 }
 check('all18 weapons execute real server-confirmed attacks with visible original held art; melee, piercing, hammer, arrows, bullets, beams and magic preserve daily stamina');
 await fixture("s['tools']['held']=None;c['equipped']=None;c['spark_learned']=True;c['cast']=None;c['action']=None;c['attack_at']=0;c['spark_at']=0",'QA empty main hand to verify both attack controls are disabled');s=await read();const hp=s.combat.enemies[0].hp;assert(s.controls.find(c=>c.id==='attack').disabled&&s.controls.find(c=>c.id==='spark').disabled);await page.keyboard.press('Space');await page.keyboard.press('q');await page.waitForTimeout(600);assert.equal((await read()).combat.enemies[0].hp,hp);await shot('unarmed-blocked');
 await click('life');await wait(s=>s.mode==='life');const eqBefore=(await read()).combat.equipped;await page.keyboard.press('1');await page.keyboard.press('Space');await page.waitForTimeout(150);assert.equal((await read()).combat.equipped,eqBefore);check('unarmed attacks and offensive spell are disabled and harmless; Life Mode owns keyboard input');
 assert.deepEqual(errors,[]);
}catch(e){if(page&&!page.isClosed()){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});await fs.writeFile(out+'/failure.json',JSON.stringify(await read(),null,2)).catch(()=>{});}throw e;}
finally{try{await context?.close();if(video)await video.saveAs(out+'/equipment-flow.webm');}finally{await closeBrowser(browser);}await fs.writeFile(out+'/result.json',JSON.stringify({checks,captures,errors,fixtures},null,2)+'\n');}
