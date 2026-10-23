import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const test=await browserConfig('combat-experience'),out=test.directory;
const browser=await launchBrowser(chromium,{headless:true});
const checks=[],shots=[],errors=[],expectedErrors=[];let context,page,save,expectedNetwork=0;
const read=()=>page.evaluate(()=>JSON.parse(render_game_to_text()));
async function until(fn,label,timeout=14000){for(const start=Date.now();Date.now()-start<timeout;){const s=await read();if(fn(s))return s;await page.waitForTimeout(35);}throw Error(label+': '+JSON.stringify(await read()));}
async function click(id){const s=await until(s=>s.controls.some(c=>c.id===id&&!c.disabled),id),c=s.controls.find(c=>c.id===id);await page.mouse.click(c.x,c.y);}
async function load(){await page.goto(test.baseURL);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(render_game_to_text()).loaded);await click('start');await until(s=>s.mode==='world'&&s.connection==='ready'&&!s.busy,'world');await page.waitForTimeout(200);}
async function setup(options={}){context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out+'/recordings',size:{width:1440,height:900}},...options});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'){if(expectedNetwork&&/net::ERR_FAILED/.test(m.text())){expectedNetwork--;expectedErrors.push(m.text());}else errors.push(m.text());}});await load();save=(await read()).saveId;}
async function seed(weapon='stone_sword',position={x:220,y:240},enemies=null,floor=1){
 await page.goto('about:blank');
 execFileSync('backend/.venv/bin/python',['-c',`import sys,sqlite3,json,time,uuid
sys.path.insert(0,'clients/cocos/tools');from test_guard import assert_fixture
p,key,weapon,pos,enemies,floor=sys.argv[1:];assert_fixture(p)
sys.path.insert(0,'backend');from app.combat import floor_enemies,ensure_combat
con=sqlite3.connect(p);s=json.loads(con.execute('select state from players where id=?',(key,)).fetchone()[0]);s['location']='cave_'+floor;s['position']=json.loads(pos);s['revision']+=1
s['knowledge_growth'].update(science=3,magic=3);s['inventory'].update(stone_sword=1,spring_spear=1,glow_staff=1,soup=3,gel=0,shell=0,crystal=0,gold=20);s['vitality'].update(current=100,max=100);s['stamina'].update(current=100,max=100,updated_at=time.time());s['world_clock'].update(elapsed=187.5,updated_at=time.time(),running_until=0)
c=ensure_combat(s);c.update(equipped=weapon,spark_learned=True,encounter=str(uuid.uuid4()),input_seq=0,last_tick=0,time=0,cast=None,action=None,dash=None,dodge_at=0,attack_at=0,spark_at=0,soup_at=0,hurt_until=0,effects=[],projectiles=[],floors={},soups_used=0)
es=floor_enemies(s,time.time());patch=json.loads(enemies)
if patch is not None:
 for e,row in zip(es,patch):e.update(row)
con.execute('update players set state=? where id=?',(json.dumps(s),key));con.commit();con.close()`,test.database,save,weapon,JSON.stringify(position),JSON.stringify(enemies),String(floor)]);
 await load();
 // These existing weapon/balance scenarios intentionally use optional lock-on;
 // the sword-motion suite exercises pointer and facing aim without a lock.
 await page.keyboard.press('t');
}
async function shot(name){await page.screenshot({path:out+'/'+name+'.png'});await fs.writeFile(out+'/'+name+'.json',JSON.stringify(await read(),null,2));shots.push(name);}
function check(name){checks.push(name);console.log('PASS '+name);}
async function held(ms){await page.keyboard.down('Space');try{await page.waitForTimeout(ms);}finally{await page.keyboard.up('Space');}}
async function sceneNodes(){return page.evaluate(async()=>{const cc=await System.import('cc'),world=cc.director.getScene().getChildByName('Canvas').getChildByName('World');return world.children.filter(n=>n.name==='Player'||n.name==='EquippedWeapon'||n.name.startsWith('Enemy-')).map(n=>({name:n.name,active:n.active,sibling:n.getSiblingIndex(),angle:n.angle,opacity:n.getComponent(cc.UIOpacity)?.opacity,scale:{x:n.scale.x,y:n.scale.y},paths:n.getComponent(cc.Graphics)?._impl?.paths?.length}));});}
const staticEnemies=()=>[{x:250,y:232,phase:'recover',until:50},{x:250,y:248,phase:'recover',until:50},{x:196,y:240,phase:'recover',until:50}];
try{
 await setup();
 await click('menu');if(!(await read()).controls.some(c=>c.id==='menu-preferences'))await click('menu-next');await click('menu-preferences');await until(s=>s.mode==='preferences','settings');await click('sound-toggle');await until(s=>s.experience.audio.state==='running','audio enabled');for(let i=0;i<6&&(await read()).mode!=='world';i++){await page.keyboard.press('Escape');await page.waitForTimeout(80);}await until(s=>s.mode==='world','settings closed');
 await seed('stone_sword',{x:220,y:240},staticEnemies());
 const before=await read();await page.keyboard.press('t');await page.waitForTimeout(200);assert.deepEqual((await read()).inventory,before.inventory);assert.deepEqual((await read()).combat.enemies.map(e=>e.hp),[18,18,18]);
 // Explicit right-click lock is selection only; primary click now attacks.
 let s=await read(),e=s.combat.enemies[0];await page.mouse.click(s.camera.width/2+s.camera.x+e.x*s.camera.zoom,s.camera.height/2-s.camera.y+e.y*s.camera.zoom,{button:'right'});await until(s=>s.combatTarget==='1-0','select');
 await page.keyboard.down('Space');await until(s=>s.combat.enemies[0].hp===10,'sword confirmed hit');await shot('sword-sweep');await page.keyboard.up('Space');s=await read();assert.equal(s.stamina.current,100);assert.equal(s.combat.enemies[1].hp,10);assert.equal(s.combat.enemies[2].hp,18);assert(s.swordPresentation?.active||(await sceneNodes()).some(n=>n.name==='EquippedWeapon'&&n.active),'equipped sword is visible in integrated actor frames or standalone weapon');assert(s.experience.audio.cues.hit>0&&s.experience.audio.cues.swing>0,'actual combat audio cues');await page.locator('[data-realquest-control="dodge"]').focus();await until(s=>s.focusId==='dodge','keyboard focus');await shot('keyboard-dodge-focus');await page.keyboard.press('Escape');check('pure target selection and free sword sweep hit front enemies only, with visible equipped weapon');
 await seed('spring_spear',{x:220,y:240},[{x:250,y:240,phase:'recover',until:50},{x:270,y:240,phase:'recover',until:50},{x:244,y:270,phase:'recover',until:50}]);
 await page.keyboard.down('Space');await until(s=>s.combat.enemies[0].hp===5,'spear hit');await shot('spear-thrust');await page.keyboard.up('Space');s=await read();assert.equal(s.combat.enemies[1].hp,5);assert.equal(s.combat.enemies[2].hp,18);check('spear reaches and pierces two aligned targets without wide-side damage');
 await seed('glow_staff',{x:220,y:240},[{x:320,y:240,phase:'recover',until:50},{x:500,y:240,phase:'recover',until:50},{x:500,y:380,phase:'recover',until:50}]);
 await page.keyboard.press('Space');const projectileState=await until(s=>s.combat.projectiles.some(p=>p.side==='player'),'staff projectile');assert.equal(projectileState.combat.enemies[0].hp,18);await shot('staff-projectile');await page.keyboard.up('Space');await until(s=>s.combat.enemies[0].hp===8,'projectile hit');assert.equal((await read()).stamina.current,100);check('staff damage waits for actual projectile contact and basic attacks preserve daily stamina');
 await seed('stone_sword',{x:220,y:240},[{x:240,y:240,phase:'recover',until:50},{x:500,y:300},{x:500,y:380}]);
 await page.keyboard.press('Space');await until(s=>s.combat.enemies[0].hp===10,'first tap');await page.waitForTimeout(180);await page.keyboard.press('Space');await until(s=>s.combat.enemies[0].hp===2,'buffered tap');await page.waitForTimeout(650);assert.equal((await read()).combat.enemies[0].hp,2);check('short attack taps buffer through late recovery and release adds no extra attack');
 await seed('stone_sword',{x:220,y:240},[{x:250,y:240,phase:'recover',until:50},{x:500,y:300},{x:500,y:380}]);
 await page.keyboard.down('q');await until(s=>s.combat.cast?.kind==='spark','spark casting');await shot('sword-spell-cast');await until(s=>s.combat.enemies[0].hp===6,'spark damage');await page.waitForTimeout(4200);await page.keyboard.up('q');assert.equal((await read()).combat.enemies[0].hp,6);assert.equal((await read()).stamina.current,96);check('holding spell key produces one cast and one four-stamina cost');
 await seed('stone_sword',{x:220,y:240},[{x:255,y:240,phase:'windup',until:3,tx:220,ty:240},{x:500,y:240},{x:500,y:380}]);
 await shot('slime-windup');await page.keyboard.down('s');await page.keyboard.press('v');await page.waitForTimeout(130);await shot('dodge');await page.keyboard.up('s');s=await until(s=>(s.combat.dodge_at||0)>s.combat.time,'dodge acknowledged');const cooldown=s.combat.dodge_at;await page.keyboard.press('v');await page.waitForTimeout(120);assert.equal((await read()).combat.dodge_at,cooldown);await until(s=>s.combat.time>=3.05,'locked tell resolves');assert.equal((await read()).vitality.current,100);check('keyboard dodge moves sideways out of locked tell; server cooldown prevents repeated dash and no resource is consumed');
 await seed('stone_sword',{x:220,y:240},[{x:500,y:240},{x:500,y:300},{x:500,y:380}]);
 let delayed=false;await page.route('**/api/command',async route=>{const b=route.request().postDataJSON();if(b.action==='cave_tick'&&!delayed){delayed=true;await new Promise(r=>setTimeout(r,650));}await route.continue();});
 await page.keyboard.down('d');const initial=await read();await page.waitForTimeout(65);s=await read();assert(s.player.x>initial.player.x+3,'local motion before reply');const early=s.player.x;await page.waitForTimeout(380);const late=await read();assert(late.player.x-initial.savedPosition.x<=65,'bounded prediction');await shot('weak-network-prediction');await page.keyboard.up('d');await page.unroute('**/api/command');await until(s=>s.connection==='ready'&&!s.pendingAction,'network settled');await page.waitForTimeout(350);s=await read();assert(Math.hypot(s.player.x-s.savedPosition.x,s.player.y-s.savedPosition.y)<5,'reconciles on release');await fs.writeFile(out+'/response-sample.json',JSON.stringify({initial:initial.player,early,late:late.player,settled:s.player,authority:s.savedPosition},null,2));check('650ms delayed command retains immediate local response, bounds prediction and reconciles after release');
 await seed('stone_sword',{x:220,y:240},[{x:500,y:240},{x:500,y:300},{x:500,y:380}]);
 let attempts=[],lost=0,waitingTick=false;expectedNetwork=2;await page.route('**/api/command',async route=>{const b=route.request().postDataJSON();if(b.action==='cave_tick'&&!b.data.dodge&&!waitingTick){waitingTick=true;await new Promise(r=>setTimeout(r,400));}if(b.action==='cave_tick'&&b.data.dodge&&(lost<2||b.request_id===attempts[0]?.request_id)){attempts.push(b);if(lost<2){if(lost++===0)await route.fetch();return route.abort('failed');}}await route.continue();});
 await page.keyboard.down('s');for(let i=0;i<100&&!waitingTick;i++)await page.waitForTimeout(20);assert(waitingTick,'movement tick is in flight');await page.keyboard.press('v');await page.keyboard.up('s');await until(s=>s.connection==='uncertain','uncertain dodge');await shot('retry-dodge');await click('reconnect');await until(s=>s.connection==='ready'&&!s.pendingAction,'replayed dodge');await page.unroute('**/api/command');assert.equal(attempts.length,3);assert.equal(attempts[0].data.dodge_x,0);assert.equal(attempts[0].data.dodge_y,1);assert.deepEqual(attempts[0],attempts[1]);assert.deepEqual(attempts[1],attempts[2]);assert.equal((await read()).inventory.gold,20);check('lost committed dodge replay uses identical request/sequence once and awards nothing');
 await click('life');await until(s=>s.mode==='life','life pause');const frozen=(await read()).combat.time;await page.keyboard.press('v');await page.keyboard.press('Space');await page.waitForTimeout(300);assert.equal((await read()).combat.time,frozen);await page.keyboard.press('Escape');await until(s=>s.mode==='world','resume');
 await page.keyboard.down('d');await page.waitForTimeout(100);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.keyboard.up('d');await page.waitForTimeout(200);const paused=await read();await page.waitForTimeout(250);assert.equal((await read()).combat.time,paused.combat.time);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await until(s=>s.connection==='ready','focus');check('Life and blur freeze authoritative combat and clear held movement/actions');
 await seed('stone_sword',{x:64,y:352});await click('soup');await until(s=>s.combat.cast?.kind==='soup','soup started');await until(s=>s.inventory.soup===2,'soup consumed');await shot('soup-confirmed');
 await page.reload();await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(render_game_to_text()).loaded);await click('start');await until(s=>s.mode==='world'&&!s.busy,'reload');assert.equal((await read()).inventory.soup,2);assert.equal((await read()).combat.equipped,'stone_sword');check('safe soup consumes once and equipment/resources persist through reload');
 // All families and the actual boss long-range response at ordinary HP.
 for(const floor of [2,3,5]){await seed('stone_sword',{x:floor===5?280:220,y:240},null,floor);await until(s=>s.combat.enemies.some(e=>e.phase==='windup'),'enemy windup');await shot('floor-'+floor+'-tell');}
 await until(s=>s.combat.projectiles.some(p=>p.side!=='player'),'boss ranged response');await shot('boss-shard-response');check('bat/beetle/boss telegraphs render and boss answers long-range play with real shard projectiles');
 for(const size of [{width:1920,height:1080},{width:1440,height:900},{width:1024,height:768},{width:844,height:390},{width:740,height:360}]){
  await page.setViewportSize(size);await until(s=>s.camera.width===size.width,'resize');await shot('layout-'+size.width);s=await read();const actions=s.controls.filter(c=>['attack','dodge','spark','soup','next-target'].includes(c.id));assert.equal(actions.length,5);for(const c of actions){assert(c.w>=44&&c.h>=44);assert(c.x-c.w/2>=0&&c.x+c.w/2<=size.width&&c.y-c.h/2>=0&&c.y+c.h/2<=size.height);}for(let i=0;i<actions.length;i++)for(let j=i+1;j<actions.length;j++)assert(Math.abs(actions[i].x-actions[j].x)>=(actions[i].w+actions[j].w)/2);
 }
 check('five combat actions stay separate, at least44px and on-screen at three desktop/two landscape viewports');
 await page.setViewportSize({width:1440,height:900});await seed('stone_sword',{x:400,y:200},[{x:400,y:224,phase:'recover',until:50}],5);await shot('boss-occlusion-readable');const layered=await sceneNodes();assert(layered.find(n=>n.name==='Player').sibling>layered.find(n=>n.name==='Enemy-5-0').sibling);if(!(await read()).swordPresentation?.active)assert(layered.find(n=>n.name==='EquippedWeapon').sibling>layered.find(n=>n.name==='Player').sibling);check('overlapping boss preserves visible player and sword draw order while targeting and tells remain solid');
 await seed('stone_sword',{x:280,y:240},null,5);
 const fightStart=Date.now(),heldKeys=new Set(),tells=new Set();let bossCaptured=false;
 await page.keyboard.down('Space');
 try{while(Date.now()-fightStart<45000){
   s=await read();assert.equal(s.location,'cave_5','normal100HP player survives');if(s.combat.cleared)break;
   const boss=s.combat.enemies[0],dx=boss.x-s.savedPosition.x,dy=boss.y-s.savedPosition.y,d=Math.hypot(dx,dy),desired=new Set();
   const evade=boss.phase==='windup'&&boss.until-s.combat.time<.42;
   if(evade){desired.add(s.savedPosition.y>224?'w':'s');}
   else if(d>30){if(Math.abs(dx)>8)desired.add(dx>0?'d':'a');if(Math.abs(dy)>8)desired.add(dy>0?'s':'w');}
   for(const key of heldKeys)if(!desired.has(key)){await page.keyboard.up(key);heldKeys.delete(key);}for(const key of desired)if(!heldKeys.has(key)){await page.keyboard.down(key);heldKeys.add(key);}
   if(evade&&!tells.has(boss.until)){tells.add(boss.until);await page.keyboard.press('v');}
   if(!bossCaptured&&boss.hp<160&&boss.phase==='windup'){await shot('normal-hp-boss-combat');bossCaptured=true;}
   await page.waitForTimeout(55);
 }}finally{await page.keyboard.up('Space');for(const key of heldKeys)await page.keyboard.up(key);}
 s=await read();assert(s.combat.cleared,'normalHP initial sword clears boss');assert.equal(s.inventory.gate_stone,1);assert.equal(s.inventory.gold,50);assert.equal(s.inventory.crystal,3);assert.equal(s.stamina.current,100);await shot('normal-hp-boss-cleared');await fs.writeFile(out+'/normal-hp-boss.json',JSON.stringify({milliseconds:Date.now()-fightStart,hp:s.vitality.current,weapon:s.combat.equipped,dodgedTells:tells.size,inventory:s.inventory},null,2));check('normal100HP initial sword defeats full160HP boss with actual movement/dodges and receives exact first reward');
 await context.close();await setup({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:2,reducedMotion:'reduce'});await seed('stone_sword',{x:220,y:240},staticEnemies());
 s=await read();const button=s.controls.find(c=>c.id==='attack');await page.touchscreen.tap(button.x,button.y);await until(s=>s.combat.enemies.some(e=>e.hp<18),'touch attack');await shot('touch-reduced-hit');const dodge=(await read()).controls.find(c=>c.id==='dodge');await page.touchscreen.tap(dodge.x,dodge.y);await until(s=>(s.combat.dodge_at||0)>s.combat.time,'touch dodge');await shot('touch-reduced-dodge');assert.equal((await read()).stamina.current,100);check('native touch attack/dodge work with reduced motion and preserve daily stamina');
 assert.deepEqual(errors,[]);
 await fs.writeFile(out+'/result.json',JSON.stringify({checks,shots,errors,expectedErrors,fixtures:'Prepared gear/HP/approach/enemy positions; no seeded damage/deaths/rewards. Real UI/server actions determine outcomes.'},null,2));
}catch(e){if(page&&!page.isClosed()){await shot('failure').catch(()=>{});}await fs.writeFile(out+'/partial-result.json',JSON.stringify({checks,shots,errors,error:String(e)},null,2));throw e;}
finally{await context?.close().catch(()=>{});await closeBrowser(browser);}
