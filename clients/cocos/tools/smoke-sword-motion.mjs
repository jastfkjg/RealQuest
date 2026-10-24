import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

const test=await browserConfig('sword-motion'),out=test.directory;
await test.assertDatabase();
const remaining=process.argv.includes('--remaining');
const checks=[],shots=[],errors=[],expectedErrors=[],directions=[];
let browser,context,page,save,s,expectedRejections=0;
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function until(predicate,label,timeout=16000){
 for(const started=Date.now();Date.now()-started<timeout;){const s=await read();if(predicate(s))return s;await page.waitForTimeout(20);}
 throw Error(label+': '+JSON.stringify(await read()));
}
function check(label){checks.push(label);console.log('PASS '+label);}
async function click(id,touch=false){const s=await until(s=>s.controls.some(c=>c.id===id&&!c.disabled),'control '+id),c=s.controls.find(c=>c.id===id);if(touch)await page.touchscreen.tap(c.x,c.y);else await page.mouse.click(c.x,c.y);}
async function load(){await page.goto(test.baseURL);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);await click('start');await until(s=>s.mode==='world'&&s.connection==='ready'&&!s.busy&&!s.pendingAction,'world ready');}
async function setup(options={}){
 context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out+'/recordings',size:{width:1440,height:900}},...options});
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()!=='error')return;if(expectedRejections&&/422/.test(m.text())){expectedRejections--;expectedErrors.push(m.text());}else errors.push(m.text());});
 await load();save=(await read()).saveId;
}
function worldPoint(s,x,y){return {x:s.camera.width/2+s.camera.x+x*s.camera.zoom,y:s.camera.height/2-s.camera.y+y*s.camera.zoom};}
async function aim(dx,dy){const s=await read(),p=worldPoint(s,s.player.x+dx*75,s.player.y+dy*75);await page.mouse.move(p.x,p.y);await until(s=>s.combatAim?.source==='pointer','pointer aim');return p;}
async function seed({front={x:250,y:240},back={x:194,y:240},appearance=0,weapon='stone_sword',enemies=null}={}){
 await page.goto('about:blank');
 execFileSync('backend/.venv/bin/python',['-c',`import sys,sqlite3,json,time,uuid
sys.path.insert(0,'clients/cocos/tools');from test_guard import assert_fixture
p,key,config=sys.argv[1:];assert_fixture(p);options=json.loads(config)
sys.path.insert(0,'backend');from app.combat import ensure_combat,floor_enemies
con=sqlite3.connect(p);s=json.loads(con.execute('select state from players where id=?',(key,)).fetchone()[0]);s['location']='cave_1';s['position']={'x':220,'y':240};s['revision']+=1
s['tools']['held']=options['weapon'] # Match real cave entry, which draws the equipped weapon.
s['character']={'name':'持剑验收旅人','appearance':options['appearance']};s['inventory'].update(stone_sword=1,spring_spear=1,soup=3,gold=20,gel=0);s['knowledge_growth'].update(science=3,magic=3)
s['vitality'].update(current=100,max=100);s['stamina'].update(current=100,max=100,updated_at=time.time());s['world_clock'].update(elapsed=187.5,updated_at=time.time(),running_until=0)
c=ensure_combat(s);c.update(equipped=options['weapon'],spark_learned=True,encounter=str(uuid.uuid4()),input_seq=0,last_tick=0,time=0,cast=None,action=None,dash=None,dodge_at=0,attack_at=0,spark_at=0,soup_at=0,hurt_until=0,effects=[],projectiles=[],floors={},soups_used=0)
es=floor_enemies(s,time.time());rows=options['enemies'] or [options['front'],options['back'],{'x':530,'y':360}]
for e,row in zip(es,rows):e.update(hp=200,max_hp=200,phase='recover',until=1000,ready=1000);e.update(row)
con.execute('update players set state=? where id=?',(json.dumps(s),key));con.commit();con.close()`,test.database,save,JSON.stringify({front,back,appearance,weapon,enemies})]);
 await load();await until(s=>s.appearance===appearance&&s.combat?.equipped===weapon,'prepared isolated fixture');
}
async function shot(name){const s=await read();await page.screenshot({path:out+'/'+name+'.png'});await fs.writeFile(out+'/'+name+'.json',JSON.stringify(s,null,2));shots.push(name);}
async function visibleSword(){return page.evaluate(async()=>{const cc=await System.import('cc'),world=cc.director.getScene().getChildByName('Canvas').getChildByName('World'),actor=world.getChildByName('Player'),sprite=actor.getComponent(cc.Sprite),sf=sprite.spriteFrame,ui=actor.getComponent(cc.UITransform),weapon=world.getChildByName('EquippedWeapon');return {actorVisible:actor.activeInHierarchy,frame:{x:sf.rect.x,y:sf.rect.y,width:sf.rect.width,height:sf.rect.height},texture:{width:sf.texture.width,height:sf.texture.height},display:{width:ui.width,height:ui.height},duplicateWeaponVisible:!!weapon?.activeInHierarchy};});}
async function sampleStart(){await page.evaluate(()=>{window.__swordSamples=[];window.__swordSampling=true;const tick=()=>{if(!window.__swordSampling)return;const s=JSON.parse(window.render_game_to_text());const a=s.combat?.action;window.__swordSamples.push({at:performance.now(),sword:s.swordPresentation,aim:s.combatAim,action:a?{angle:a.angle,seq:a.seq,started:a.started,hit_at:a.hit_at,until:a.until}:null,time:s.combat?.time,hp:s.combat?.enemies.map(e=>e.hp),feedback:s.presentation?.confirmedFeedback});requestAnimationFrame(tick);};requestAnimationFrame(tick);});}
async function sampleStop(name){const samples=await page.evaluate(()=>{window.__swordSampling=false;return window.__swordSamples;});await fs.writeFile(out+'/'+name+'-frames.json',JSON.stringify(samples,null,2));return samples;}
const hp=s=>s.combat.enemies.map(e=>e.hp);
const balances=s=>({inventory:s.inventory,stamina:s.stamina.current,vitality:s.vitality.current});
async function release(){await page.mouse.up().catch(()=>{});for(const key of ['Space','w','a','s','d','v','Shift'])await page.keyboard.up(key).catch(()=>{});}

try{
 browser=await launchBrowser(chromium,{headless:true});await setup();
 await click('menu');if(!(await read()).controls.some(c=>c.id==='menu-preferences'))await click('menu-next');await click('menu-preferences');await click('sound-toggle');await until(s=>s.experience.audio.state==='running','sound enabled');
 for(let i=0;i<8&&(await read()).mode!=='world';i++){await page.keyboard.press('Escape');await page.waitForTimeout(60);}
 if(!remaining){
 for(const [name,dx,dy,direction] of [['south',0,1,0],['north',0,-1,1],['west',-1,0,2],['east',1,0,3]]){
  await seed({front:{x:220+dx*29,y:240+dy*29},back:{x:220-dx*26,y:240-dy*26}});
  const initial=await read();await aim(dx,dy);await until(s=>s.swordPresentation?.active&&s.swordPresentation.direction===direction&&s.swordPresentation.phase==='ready','four-way grip '+name);await shot('grip-'+name);const sprite=await visibleSword();assert(sprite.actorVisible);assert.equal(sprite.frame.width,96);assert.equal(sprite.frame.height,96);assert.equal(sprite.frame.y,direction*96);assert.equal(sprite.duplicateWeaponVisible,false,'integrated sword replaces duplicate icon');
  assert.deepEqual(hp(await read()),[200,200,200],'aim alone never attacks');assert.deepEqual((await read()).savedPosition,initial.savedPosition);
  await sampleStart();await page.mouse.down();await until(s=>s.swordPresentation?.direction===direction&&s.swordPresentation.phase==='active','four-way swing '+name);await shot('swing-'+name);
  await until(s=>s.combat.enemies[0].hp<200,'directional hit '+name);await page.mouse.up();await until(s=>s.swordPresentation?.phase==='ready','swing returns to ready '+name);const s=await read(),samples=await sampleStop(name);
  assert(s.combat.enemies[0].hp<200);assert.equal(s.combat.enemies[1].hp,200,'behind target is not hit');assert.equal(s.combat.enemies[2].hp,200);assert.equal(s.stamina.current,100);assert.equal(s.inventory.gold,20);assert.equal(s.combatAim.lockedTarget,null);assert.equal(s.route.length,0);
  const phases=[...new Set(samples.filter(r=>r.sword?.active).map(r=>r.sword.phase))],frames=[...new Set(samples.filter(r=>r.sword?.sheet==='attack').map(r=>r.sword.frame))];
  assert(phases.includes('active')&&phases.some(p=>['follow','recover'].includes(p)),'swing has impact and recovery');assert(frames.length>=3,'body animation changes through attack');assert(samples.some(r=>r.feedback>0),'confirmed hit feedback');directions.push({name,direction,phases,frames,sprite,hp:hp(s)});
 }
 check('four pointer directions show matching held-sword/body frames, swing and recovery; primary clicks hit only the aimed front and never create a walk route');

 await seed();await aim(0,-1);s=await read();let hitCues=s.experience.audio.cues.hit||0,inventory=s.inventory;await page.mouse.click(...Object.values(worldPoint(s,220,150)));await until(s=>s.combat.attack_at>0,'miss accepted');await until(s=>s.swordPresentation.phase==='ready','miss recovery');s=await read();assert.deepEqual(hp(s),[200,200,200]);assert.equal(s.experience.audio.cues.hit||0,hitCues);assert.deepEqual(s.inventory,inventory);await shot('swing-miss');
 check('swinging into empty space has no damage, hit sound, reward or item consumption');

 await seed();s=await read();const target=worldPoint(s,250,240);await page.mouse.click(target.x,target.y,{button:'right'});await until(s=>s.combatAim?.source==='lock'&&s.combatAim.lockedTarget==='1-0','right-click lock');await page.waitForTimeout(180);assert.deepEqual(hp(await read()),[200,200,200]);assert.deepEqual((await read()).savedPosition,s.savedPosition);await shot('explicit-lock');await page.keyboard.press('Escape');await until(s=>s.mode==='world'&&s.combatAim.lockedTarget===null,'Escape releases lock');
 await aim(1,0);await sampleStart();await page.mouse.down();s=await until(s=>s.combat.action?.kind==='weapon','committed sword direction');const sequence=s.combat.action.seq,angle=s.combat.action.angle;await page.mouse.up();await aim(-1,0);await until(s=>!s.combat.action||s.combat.time>=s.combat.action.until,'locked swing completed');const aimSamples=await sampleStop('mid-swing-aim');const same=aimSamples.filter(r=>r.action?.seq===sequence);assert(same.length>0);assert(same.every(r=>Math.abs(r.action.angle-angle)<.001),'committed attack cannot flip mid-swing');s=await read();assert(s.combat.enemies[0].hp<200);assert.equal(s.combat.enemies[1].hp,200);
 check('right-click lock is optional and non-attacking, Escape releases it, and pointer movement cannot redirect an already committed swing');

 await seed();await aim(1,0);const strafeStart=(await read()).savedPosition;await page.keyboard.down('s');await until(s=>s.savedPosition.y>strafeStart.y+8,'pointer strafe moved');await page.keyboard.up('s');s=await read();assert.equal(s.combatAim.source,'pointer','stationary pointer aim survives movement');assert.equal(s.swordPresentation.direction,3);await shot('pointer-strafe');
 await seed();await aim(1,0);await page.keyboard.press('Escape');await until(s=>s.combatAim.source==='facing','Escape returns to facing aim');await sampleStart();await page.keyboard.down('a');await page.waitForTimeout(75);await page.keyboard.up('a');const walkSamples=await sampleStop('keyboard-held-walk');assert(walkSamples.some(r=>r.aim?.source==='facing'&&r.sword?.direction===2&&r.sword.moving),'keyboard facing/walk');await shot('keyboard-held-walk');await until(s=>s.swordPresentation.phase==='ready','walk released');
 check('WASD supports stationary-pointer strafing; Escape returns to keyboard facing, held-sword walking and Space attacking that direction');

 }

 await seed();await aim(1,0);await page.keyboard.press('Escape');const attackInputs=[];const observeAttack=request=>{if(!request.url().endsWith('/api/command')||request.method()!=='POST')return;const body=request.postDataJSON();if(body?.action==='cave_tick'&&body.data.attack)attackInputs.push(body.data);};page.on('request',observeAttack);
 try{await page.keyboard.down('a');await page.keyboard.down('Space');s=await until(s=>s.combat.action?.kind==='weapon','first direction+attack command');assert(Math.abs(Math.abs(s.combat.action.angle)-Math.PI)<.02,'first swing faces newly pressed left');await page.keyboard.up('Space');await page.keyboard.up('a');await until(s=>!s.combat.action||s.combat.time>=s.combat.action.until,'first-frame directional recovery');}
 finally{await page.keyboard.up('Space');await page.keyboard.up('a');page.off('request',observeAttack);}
 assert(attackInputs.length>0);assert.equal(attackInputs[0].dx,-1);assert.equal(attackInputs[0].dy,0);assert.equal((await read()).combat.enemies[0].hp,200);await shot('first-direction-and-attack');
 check('pressing a new direction immediately with Space uses that direction in the first actual attack command and committed server angle');

 await seed({enemies:[{x:249,y:240,phase:'windup',until:2.5,tx:220,ty:240},{x:520,y:320},{x:530,y:360}]});await aim(1,0);await sampleStart();await page.keyboard.down('s');await page.keyboard.press('v');s=await until(s=>s.combat.dodge_at>s.combat.time,'server dodge acknowledged');const cooldown=s.combat.dodge_at;await page.keyboard.up('s');await page.keyboard.press('v');await page.waitForTimeout(180);assert.equal((await read()).combat.dodge_at,cooldown);await until(s=>s.combat.time>=2.6,'enemy locked attack resolves');s=await read();const dodgeSamples=await sampleStop('keyboard-dodge');assert(dodgeSamples.some(r=>r.sword?.phase==='dodge'),'dedicated dodge frames observed');assert.equal(s.vitality.current,100);assert.equal(s.stamina.current,100);assert(s.savedPosition.y>270);assert.equal(s.inventory.gold,20);await shot('keyboard-dodge');
 check('held-sword dodge frames follow real displacement; sideways dodge escapes a telegraphed hit, cannot repeat during cooldown, and consumes no daily stamina');

 await seed();await aim(1,0);await sampleStart();let delayedDodge=false,delayedReply=null;const dodgeRequests=[];
 await page.route('**/api/command',async route=>{
  const body=route.request().postDataJSON();
  if(body.action==='cave_tick'&&body.data.dodge){dodgeRequests.push(body.data);if(!delayedDodge){delayedDodge=true;const response=await route.fetch();delayedReply=await response.json();await new Promise(resolve=>setTimeout(resolve,280));await route.fulfill({response});return;}}
  await route.continue();
 });
 const delayedStart=(await read()).savedPosition;const swingsBefore=(await read()).experience.audio.cues.swing||0;
 try{
  await page.keyboard.down('s');await page.keyboard.press('v');await until(()=>delayedDodge,'delayed dodge submitted');await page.keyboard.up('s');await page.keyboard.down('d');await page.keyboard.press('v');await page.keyboard.up('d');await page.keyboard.down('Space');
  await page.waitForTimeout(215);assert.equal((await read()).experience.audio.cues.swing||0,swingsBefore,'pending dodge owns attack prediction');
  await until(()=>delayedReply?.state?.combat?.dash,'delayed dodge accepted');assert.deepEqual([delayedReply.state.combat.dash.dx,delayedReply.state.combat.dash.dy],[0,1]);await shot('delayed-dodge');
  await until(s=>s.combat.action?.kind==='weapon','held attack resumes after delayed dodge');await page.keyboard.up('Space');await until(s=>s.combat.time>s.combat.action?.until||!s.combat.action,'delayed dodge recovery');
 }finally{await release();await page.unroute('**/api/command');}
 s=await read();assert.equal(dodgeRequests.length,1,'cooldown presses do not replace active or queued dodge');assert.deepEqual([dodgeRequests[0].dodge_x,dodgeRequests[0].dodge_y],[0,1]);assert(Math.abs(s.savedPosition.x-delayedStart.x)<10);assert(s.savedPosition.y>delayedStart.y+50);assert.equal(s.vitality.current,100);assert.equal(s.stamina.current,100);const delayedSamples=await sampleStop('delayed-dodge');assert(delayedSamples.some(r=>r.sword?.phase==='dodge'));assert(delayedSamples.filter(r=>r.sword?.phase==='dodge').every(r=>r.sword.direction===0),'repeated direction input cannot steer active dodge artwork');
 check('delayed dodge keeps its committed direction, owns movement and attack prediction, then releases a held attack after recovery');

 await seed();await aim(1,0);s=await read();const initialBalances=balances(s),initialHP=hp(s);let rejected=false;expectedRejections=1;await page.route('**/api/command',async route=>{const body=route.request().postDataJSON();if(body.action==='cave_tick'&&body.data.attack&&!rejected){rejected=true;return route.continue({postData:JSON.stringify({...body,data:{...body.data,seq:body.data.seq+2}})});}await route.continue();});await page.keyboard.press('Space');await until(s=>rejected&&s.error.includes('战斗输入'),'real server refuses invalid sequence');await page.waitForTimeout(650);s=await read();assert.deepEqual(hp(s),initialHP);assert.deepEqual(balances(s),initialBalances);await shot('attack-rejected');await page.unroute('**/api/command');await aim(1,0);await page.keyboard.press('Space');await until(s=>s.combat.enemies[0].hp<200,'attack succeeds after rejection');await page.waitForTimeout(600);s=await read();assert.equal(s.combat.enemies[0].hp,192,'one retry makes one hit');assert.equal(s.combat.enemies[1].hp,200);assert.deepEqual(s.inventory,initialBalances.inventory);
 check('server rejection preserves enemy HP/resources; a new intentional attack retries successfully exactly once');

 await seed();await click('life');await click('tab-study');await click('study-new');await click('study-title');const input=page.locator('input:focus,textarea:focus');await input.fill('持剑输入隔离');const paused=await read();await input.dispatchEvent('compositionstart',{data:'中'});await page.keyboard.press('d');await page.keyboard.press('Space');await page.keyboard.press('v');await input.dispatchEvent('compositionend',{data:'中'});await page.waitForTimeout(250);s=await read();assert.deepEqual(s.savedPosition,paused.savedPosition);assert.equal(s.combat.time,paused.combat.time);assert.deepEqual(hp(s),hp(paused));await shot('life-ime-owns-input');for(let i=0;i<8&&(await read()).mode!=='world';i++){await page.keyboard.press('Escape');await page.waitForTimeout(60);}await until(s=>s.mode==='world','return from Life');
 await page.keyboard.down('d');await page.waitForTimeout(90);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.keyboard.up('d');await page.waitForTimeout(200);const blurred=await read();await page.waitForTimeout(250);s=await read();assert.equal(s.combat.time,blurred.combat.time);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await until(s=>s.connection==='ready','focus return');await page.waitForTimeout(200);const resumed=(await read()).savedPosition;await page.waitForTimeout(250);assert.deepEqual((await read()).savedPosition,resumed);
 check('real Life title input and synthetic IME composition own shortcuts; blur pauses combat and focus return does not restore held movement');

 await seed();await aim(1,0);await page.locator('[data-realquest-control="dodge"]').focus();await until(s=>s.focusId==='dodge','semantic keyboard focus');await shot('keyboard-dodge-focus');await page.keyboard.press('Enter');await until(s=>s.combat.dodge_at>s.combat.time,'semantic dodge');
 for(const size of [{width:1920,height:1080},{width:1440,height:900},{width:1024,height:768},{width:844,height:390},{width:740,height:360}]){
  await page.setViewportSize(size);await until(s=>s.camera.width===size.width,'viewport size');s=await read();const actions=s.controls.filter(c=>['attack','dodge','spark','soup','next-target'].includes(c.id));assert.equal(actions.length,5);for(const c of actions){assert(c.w>=44&&c.h>=44);assert(c.x-c.w/2>=0&&c.x+c.w/2<=size.width&&c.y-c.h/2>=0&&c.y+c.h/2<=size.height);}await shot('sword-layout-'+size.width);
 }
 check('keyboard focus/Enter dodge work; all five combat controls remain at least44px and within three desktop/two landscape viewports');

 await context.close();await setup({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:2,reducedMotion:'reduce'});await seed();s=await read();const up=s.controls.find(c=>c.id==='up'),touchSession=await context.newCDPSession(page);
 try{await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:up.x,y:up.y,id:1}]});await until(s=>s.combatAim.source==='facing'&&s.swordPresentation.direction===1&&s.swordPresentation.moving,'touch pad sets free facing');await shot('touch-reduced-walk');}
 finally{await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touchSession.detach();}
 await seed();s=await read();const touchTarget=worldPoint(s,250,240);await page.touchscreen.tap(touchTarget.x,touchTarget.y);await until(s=>s.combatAim.lockedTarget==='1-0','touch selects target');assert.deepEqual(hp(await read()),[200,200,200]);await click('attack',true);await until(s=>s.combat.enemies[0].hp<200,'touch attack hit');await shot('touch-reduced-hit');await click('dodge',true);await until(s=>s.combat.dodge_at>s.combat.time,'touch dodge accepted');await shot('touch-reduced-dodge');s=await read();assert.equal(s.stamina.current,100);assert.equal(s.presentation.reducedMotion,true);assert(s.swordPresentation.active);
 check('native landscape touch pad/facing, target/attack/dodge work with reduced motion, truthful damage and no daily stamina cost');

 await seed({appearance:1});assert.equal((await read()).swordPresentation.active,false,'other appearance keeps its own art');await seed({weapon:'spring_spear'});assert.equal((await read()).swordPresentation.active,false,'other weapon keeps its own art');
 check('the approved sword artwork applies only to appearance0 holding stone_sword; other characters and weapons retain their art');
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/result.json',JSON.stringify({coverage:remaining?'remaining-after-four-way-lock-and-walk':'full',checks,shots,directions,errors,expectedErrors,fixtures:'Owned fresh QA database only. Appearance0, initial sword,200HP stationary targets and specific telegraphs are fixtures; damage, dodge, input and feedback are actual browser/server actions. Synthetic IME is not physical-device IME certification.'},null,2));
}catch(error){if(page&&!page.isClosed())await shot('failure').catch(()=>{});await fs.writeFile(out+'/partial-result.json',JSON.stringify({checks,shots,directions,errors,error:String(error)},null,2));throw error;}
finally{if(page&&!page.isClosed()){await release();await page.evaluate(()=>{window.__swordSampling=false;}).catch(()=>{});}await context?.close().catch(()=>{});if(browser)await closeBrowser(browser);}
