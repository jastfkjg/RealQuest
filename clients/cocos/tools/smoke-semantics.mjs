import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
const {chromium}=createRequire(new URL('../../../package.json',import.meta.url))('playwright'),test=await browserConfig('semantics');await test.assertDatabase();
const browser=await launchBrowser(chromium,{headless:true}),checks=[],captures=[],errors=[],observations=[];let context,page,cdp;
const report={kind:'cocos-native-semantics',checks,captures,errors,observations,complete:false,scope:'Actual DOM keyboard and Chromium accessibility tree. Not OS screen-reader, physical-device, system IME or whole V5 approval.'};
const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function until(predicate,label='state'){for(let i=0;i<350;i++){const s=await read();if(predicate(s))return s;await page.waitForTimeout(80);}throw Error(label);}
async function tree(name){const value=await cdp.send('Accessibility.getFullAXTree');await fs.writeFile(path.join(test.directory,name+'-ax.json'),JSON.stringify(value,null,2));const visible=value.nodes.filter(n=>!n.ignored);observations.push({name,roles:visible.map(n=>({role:n.role?.value,name:n.name?.value})),state:await read()});return visible;}
async function shot(name){await page.screenshot({path:path.join(test.directory,name+'.png')});captures.push(name+'.png');}
async function action(id,key='Enter'){const c=(await until(s=>s.controls.some(c=>c.id===id&&!c.disabled),id)).controls.find(c=>c.id===id),button=page.getByRole('button',{name:c.accessibleName||c.label,exact:true});assert.equal(await button.count(),1,'native button '+id);await button.focus();await page.keyboard.press(key);await page.waitForTimeout(150);}
async function field(id,value,exit='Escape'){
 const c=(await until(s=>s.controls.some(c=>c.id===id&&!c.disabled),id)).controls.find(c=>c.id===id),button=page.getByRole('button',{name:'编辑 '+c.label,exact:true});
 assert.equal(await button.count(),1,'keyboard edit action '+id);await button.focus();await page.keyboard.press('Enter');
 await page.waitForFunction(()=>['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)&&!document.activeElement.disabled);
 assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),c.label);
 await page.keyboard.press('ControlOrMeta+A');await page.keyboard.insertText(value);await page.waitForFunction(v=>document.activeElement?.value===v,value);
 await page.keyboard.press(exit);await page.waitForTimeout(140);
 if(exit==='Escape')assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'编辑 '+c.label);
}
async function focused(id){
 await page.waitForFunction(id=>document.activeElement?.dataset?.realquestControl===id,id);
 await until(s=>s.focusId===id,'visible focus '+id);
}
async function tabCycle(name){
 const s=await read(),ids=s.controls.filter(c=>!c.disabled).map(c=>c.id);
 assert(ids.length>1,name+' needs a real set of enabled controls');
 assert.equal(new Set(ids).size,ids.length,name+' control identities');
 for(const control of s.controls){
  const native=page.locator('#realquest-accessibility button[data-realquest-control="'+control.id+'"]');
  assert.equal(await native.count(),1,name+' native control '+control.id);
  assert.equal(await native.isEnabled(),!control.disabled,name+' native disabled '+control.id);
 }
 await page.locator('canvas').focus();await page.keyboard.press('Tab');await focused(ids[0]);
 for(let i=1;i<ids.length;i++){await page.keyboard.press('Tab');await focused(ids[i]);}
 await page.keyboard.press('Tab');await focused(ids[0]);
 for(let i=ids.length-1;i>=0;i--){await page.keyboard.press('Shift+Tab');await focused(ids[i]);}
 assert.equal((await read()).mode,s.mode,name+' traversal must not activate navigation');
 observations.push({name,mode:s.mode,viewport:page.viewportSize(),forward:ids,reverse:[...ids].reverse(),skippedDisabled:s.controls.filter(c=>c.disabled).map(c=>c.id)});
}
async function leaveToWorld(){for(let i=0;i<10&&(await read()).mode!=='world';i++){await page.keyboard.press('Escape');await page.waitForTimeout(100);}await until(s=>s.mode==='world'&&!s.busy);}
try{
 context=await browser.newContext({viewport:{width:1440,height:900}});page=await context.newPage();cdp=await context.newCDPSession(page);await cdp.send('Accessibility.enable');let creates=0,studyCreates=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(!r.url().endsWith('/api/command'))return;const action=r.postDataJSON()?.action;if(action==='create')creates++;if(action==='study_create')studyCreates++;});
 await page.goto(test.baseURL);await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);const welcome=await until(s=>s.controls.some(c=>c.id==='start'&&!c.disabled));await tree('welcome');await shot('welcome');const label=welcome.controls.find(c=>c.id==='start').label;assert.equal(await page.getByRole('button',{name:label,exact:true}).count(),1,'actual Start control needs a native accessible button');
 await tabCycle('welcome-forward-reverse');await shot('welcome-keyboard-focus');checks.push('welcome Tab and Shift+Tab reach every enabled native control in rendered order and wrap');
 await page.locator('canvas').focus();await page.keyboard.press('Tab');await page.waitForTimeout(100);assert.match(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')||''),/^编辑 旅人姓名/);await field('traveler-name','语义键盘旅人');await action('appearance-2','Space');await action('start');await until(s=>s.mode==='world'&&!s.busy&&s.connection==='ready');assert.equal((await read()).character.name,'语义键盘旅人');assert.equal(creates,1);checks.push('keyboard/native labeled EditBox registration and Enter create exactly once');
 const lifeControl=(await read()).controls.find(c=>c.id==='life'),life=lifeControl.accessibleName||lifeControl.label;await action('life');await until(s=>s.mode==='life');assert.equal(await page.getByRole('dialog',{name:'现实成长',exact:true}).count(),1);const nativeFocus=await page.evaluate(()=>document.activeElement?.getAttribute('aria-label'));await page.keyboard.press('m');await until(s=>s.mode==='map','M must keep opening the map from a focused native button');await page.keyboard.press('Escape');await until(s=>s.mode==='life');assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),nativeFocus);checks.push('existing M shortcut and Escape focus history survive native control focus');const before=(await read()).savedPosition;await page.keyboard.down('d');try{await page.waitForTimeout(250);}finally{await page.keyboard.up('d');}assert.deepEqual((await read()).savedPosition,before);await tabCycle('life-forward-reverse');await action('study-new');
 await until(s=>s.controls.some(c=>c.id==='save-study'&&c.disabled),'empty title disables save');
 await tabCycle('empty-study-skips-save');assert.equal(studyCreates,0);await shot('empty-study-keyboard-focus');
 checks.push('empty study form exposes disabled save and both Tab directions skip it without submitting');
 await field('study-title','键盘创建的真实书页','Tab');await focused('study-minutes');
 await page.keyboard.press('Shift+Tab');await focused('study-title');await page.keyboard.press('Enter');
 await page.waitForFunction(()=>['INPUT','TEXTAREA'].includes(document.activeElement?.tagName));
 assert.equal(await page.evaluate(()=>document.activeElement.value),'键盘创建的真实书页');
 await page.keyboard.press('Escape');await focused('study-title');
 checks.push('Tab leaves the actual text editor for the next control; reverse Tab and re-entry retain the draft');
 await field('study-minutes','0');await until(s=>s.controls.some(c=>c.id==='save-study'&&c.disabled),'zero minutes disables save');
 await tabCycle('invalid-study-skips-save');assert.equal(studyCreates,0);
 await field('study-minutes','12');await until(s=>s.controls.some(c=>c.id==='save-study'&&!c.disabled),'valid study enables save');
 await tabCycle('valid-study-includes-save');await shot('valid-study-keyboard-focus');
 checks.push('correcting invalid minutes restores save to the native Tab order without changing the draft');
 await action('save-study');await until(s=>s.studyTasks.some(t=>t.title==='键盘创建的真实书页')&&!s.busy);assert.equal((await read()).points.knowledge,0);assert.equal(studyCreates,1);await tree('study-created');await shot('study-created');checks.push('named Life dialog owns keyboard, labeled native fields save original study task without points');
 await page.keyboard.press('Escape');await until(s=>s.mode==='life');await page.keyboard.press('Escape');await until(s=>s.mode==='world');assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),life);const startX=(await read()).player.x;await page.locator('canvas').focus();await page.keyboard.down('d');try{await page.waitForTimeout(350);}finally{await page.keyboard.up('d');}await until(s=>s.player.x>startX+15&&!s.pendingAction);checks.push('Escape returns through original panel history to opener; real world movement resumes from canvas');
 await action('menu');await until(s=>s.mode==='menu');await tabCycle('journey-menu-forward-reverse');await action('menu-character');await until(s=>s.mode==='character');await tabCycle('character-forward-reverse');await tree('character');await shot('character');await page.keyboard.press('Escape');await until(s=>s.mode==='menu'&&s.controls.some(c=>c.id==='menu-character'&&!c.disabled));const opener=(await read()).controls.find(c=>c.id==='menu-character').label;assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),opener);checks.push('nested native focus returns to original menu action');
 for(const viewport of [{width:1440,height:900},{width:740,height:360}]){
  await leaveToWorld();await page.setViewportSize(viewport);await until(s=>s.camera.width===viewport.width&&s.camera.height===viewport.height,'resized viewport');
  for(const [key,mode,readyId] of [['m','map','atlas-current'],['j','journal','quest-read'],['i','inventory','inventory-wallet'],['l','life','study-new']]){
   await page.locator('canvas').focus();await page.keyboard.press(key);
   // Mode changes before the next Cocos redraw; wait for this panel's actual
   // control and its native peer, including after a viewport change.
   await until(s=>s.mode===mode&&!s.busy&&s.controls.some(c=>c.id===readyId),'keyboard opens rendered '+mode);
   await page.locator('#realquest-accessibility button[data-realquest-control="'+readyId+'"]').waitFor({state:'attached'});
   await tabCycle(mode+'-'+viewport.width+'-forward-reverse');await shot(mode+'-'+viewport.width+'-keyboard-focus');
   await leaveToWorld();
  }
  checks.push('native forward/reverse Tab, wrap and disabled skipping across map, journal, inventory and Life at '+viewport.width+'x'+viewport.height);
 }
 assert.equal(creates,1);assert.equal(studyCreates,1);assert.equal((await read()).points.knowledge,0);
 assert.deepEqual(errors,[]);report.complete=true;
}catch(error){report.error=String(error);if(page&&!page.isClosed())try{await shot('failure');}catch{}throw error;}
finally{try{if(context)await context.close();}finally{await closeBrowser(browser);}await fs.writeFile(path.join(test.directory,'semantic-result.json'),JSON.stringify(report,null,2)+'\n');}
