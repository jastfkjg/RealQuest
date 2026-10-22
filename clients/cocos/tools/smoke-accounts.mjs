import {openSession} from './ui-navigation.mjs';
import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../package.json',import.meta.url)),{chromium}=require('playwright');
const config=await browserConfig('accounts'),base=config.baseURL,out=config.directory;
const checks=[],errors=[],expected=[],shots=[];
const password='a long woodland passphrase',username='woodland_qa';
const browser=await launchBrowser(chromium,{headless:true});let page;
const read=p=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
async function until(p,fn,label='condition'){
 for(let i=0;i<250;i++){const s=await read(p);if(fn(s))return s;await p.waitForTimeout(60);}
 throw Error(label+' '+JSON.stringify(await read(p)));
}
async function click(p,id){await p.waitForTimeout(100);const s=await until(p,s=>s.controls.some(c=>c.id===id&&!c.disabled),id),c=s.controls.find(c=>c.id===id);await p.mouse.click(c.x,c.y,{delay:40});await p.waitForTimeout(150);}
async function field(p,id,value){await click(p,id);const editor=p.locator('input:focus,textarea:focus');await editor.fill(value);}
async function load(p){
 await p.goto(base);await p.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);
}
async function shot(p,name){await p.waitForTimeout(120);await p.screenshot({path:`${out}/${name}.png`});shots.push(name);}
function listen(p){
 p.on('pageerror',e=>errors.push(e.message));p.on('console',e=>{if(e.type()==='error'&&!/net::ERR_FAILED|401 \(Unauthorized\)/.test(e.text()))errors.push(e.text());});
 p.on('response',r=>{if(r.status()===401&&new URL(r.url()).pathname==='/api/account/login')expected.push('wrong password rejected');});
}
async function headers(p){return p.evaluate(()=>({Authorization:'Bearer '+JSON.parse(localStorage.getItem('realquest-session-v2')).token}));}
async function exported(p,h){const r=await p.request.get(base+'/api/export',{headers:h||await headers(p)});assert.equal(r.status(),200);return r.json();}
async function accountPage(p){if((await read(p)).mode==='world')await openSession(p);else await click(p,'import-save');await click(p,'session-tab-account');}
async function loginForm(p,pass=password){await field(p,'account-username',username.toUpperCase());await field(p,'account-password',pass);await click(p,'account-submit');}
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out+'/video',size:{width:1440,height:900}}});
 page=await context.newPage();listen(page);await load(page);
 await field(page,'traveler-name','账号旅人');await click(page,'start');const guest=await until(page,s=>s.mode==='world'&&!s.busy);
 const guestHeaders=await headers(page);
 await accountPage(page);await click(page,'account-mode-register');
 await field(page,'account-username',username);await field(page,'account-password','too short');await field(page,'account-confirm','too short');await click(page,'account-submit');
 await until(page,s=>s.error.includes('15–128'));assert.equal((await read(page)).saveId,guest.saveId);await shot(page,'registration-validation');
 await field(page,'account-password',password);await field(page,'account-confirm',password);
 assert(!(await page.locator('#realquest-accessibility').innerText()).includes(password));assert(!JSON.stringify(await read(page)).includes(password));
 await click(page,'account-password');assert.equal(await page.locator('input:focus,textarea:focus').getAttribute('type'),'password');await page.keyboard.press('Tab');
 const before=await exported(page);await shot(page,'registration-ready');
 await click(page,'account-submit');await until(page,s=>s.account?.username===username&&!s.busy);
 assert.equal((await read(page)).saveId,guest.saveId);assert.deepEqual(await exported(page),before);
 assert.equal((await page.request.get(base+'/api/state',{headers:guestHeaders})).status(),401);
 await shot(page,'registered-account-desktop');checks.push('guest save and exact exported history survive registration; password is masked and excluded from semantics/state; old guest session revoked');
 await load(page);await click(page,'start');await until(page,s=>s.mode==='world'&&s.account?.username===username&&!s.busy);assert.equal((await read(page)).saveId,guest.saveId);
 checks.push('reload restores the account and same saved character through the normal start action');

 const secondContext=await browser.newContext({viewport:{width:740,height:360},hasTouch:true,reducedMotion:'reduce'}),second=await secondContext.newPage();listen(second);
 await load(second);await field(second,'traveler-name','保留游客');await click(second,'start');const other=await until(second,s=>s.mode==='world'&&!s.busy),otherHeaders=await headers(second);
 await accountPage(second);await loginForm(second,'wrong password');await until(second,s=>s.error==='用户名或密码不正确'&&!s.busy);assert.equal((await read(second)).saveId,other.saveId);await shot(second,'login-error-landscape');
 await field(second,'account-password',password);await click(second,'account-submit');await until(second,s=>s.accountPreview&&!s.busy);
 assert.equal((await read(second)).saveId,other.saveId);assert((await read(second)).controls.find(c=>c.id==='account-adopt').disabled);await shot(second,'login-backup-required-landscape');
 const download=second.waitForEvent('download');await click(second,'account-backup');const stream=await(await download).createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);
 const recovery=JSON.parse(Buffer.concat(chunks).toString());assert.equal(recovery.format,'realquest-recovery');await until(second,s=>!s.busy);await click(second,'account-backup-saved');await click(second,'account-adopt');
 await until(second,s=>s.mode==='world'&&s.account?.username===username&&!s.busy);assert.equal((await read(second)).saveId,guest.saveId);
 assert.equal((await exported(second,otherHeaders)).state.character.name,'保留游客');
 checks.push('wrong password preserves current identity; another device previews login and requires saving the current guest credential before explicit adoption; neither save is merged');
 await accountPage(second);const originalToken=await headers(page);let lost=false;
 await second.route('**/api/account/logout',async route=>{if(!lost){lost=true;await route.fetch();return route.abort('failed');}return route.continue();});
 await click(second,'account-logout');await until(second,s=>s.logoutPending&&!s.busy);await shot(second,'logout-retry-landscape');
 await load(second);await click(second,'start');await until(second,s=>s.mode==='welcome'&&!s.busy&&!s.saveId&&!s.logoutPending);
 assert.equal(await second.evaluate(()=>localStorage.getItem('realquest-session-v2')),null);assert((await read(second)).notice.includes('已保留'));
 assert.equal((await page.request.get(base+'/api/state',{headers:originalToken})).status(),200);
 await second.unroute('**/api/account/logout');await accountPage(second);await loginForm(second);await until(second,s=>s.accountPreview&&!s.busy);await click(second,'account-adopt');await until(second,s=>s.mode==='world'&&s.saveId===guest.saveId&&!s.busy);
 checks.push('committed logout with lost reply persists intent, reload retries without creating a guest, another device stays logged in, and relogin restores the original save');

 await click(second,'menu'); // Leave world input before resizing for form review.
 await openSession(page);await click(page,'session-tab-account');await click(page,'account-logout');await until(page,s=>s.mode==='welcome'&&!s.busy);
 await accountPage(page);await click(page,'account-mode-register');
 for(const size of [{width:1440,height:900},{width:1920,height:1080},{width:1056,height:627},{width:844,height:390},{width:740,height:360}]){
  await page.setViewportSize(size);const s=await until(page,s=>s.camera.width===size.width&&s.controls.some(c=>c.id==='account-confirm'));
  const controls=s.controls;for(const c of controls)assert(c.x-c.w/2>=0&&c.x+c.w/2<=size.width&&c.y-c.h/2>=0&&c.y+c.h/2<=size.height,c.id+' viewport');
  for(let i=0;i<controls.length;i++)for(const other of controls.slice(i+1))assert(!(Math.abs(controls[i].x-other.x)<(controls[i].w+other.w)/2-1&&Math.abs(controls[i].y-other.y)<(controls[i].h+other.h)/2-1),'controls overlap '+controls[i].id+' '+other.id);
  await shot(page,'registration-'+size.width);
 }
 await field(page,'account-password',password);await click(page,'account-password-visibility');await click(page,'account-password');assert.equal(await page.locator('input:focus,textarea:focus').getAttribute('type'),'text');
 await click(page,'account-password-visibility');await click(page,'account-password');assert.equal(await page.locator('input:focus,textarea:focus').getAttribute('type'),'password');
 await page.keyboard.press('Escape');await page.keyboard.press('Tab');assert(await page.locator('#realquest-accessibility button:focus').count());
 assert(!(await page.locator('#realquest-accessibility').innerText()).includes(password));assert(!JSON.stringify(await read(page)).includes(password));
 checks.push('registration, explicit labels, visibility toggle, native password masking, keyboard return and nonoverlapping controls verified at five desktop/landscape viewports');
 let createdGuests=0;const countGuest=r=>{if(new URL(r.url()).pathname==='/api/client-session'&&r.method()==='POST')createdGuests++;};page.on('request',countGuest);
 await field(page,'account-username','first_account_qa');await field(page,'account-password',password);await field(page,'account-confirm',password);await click(page,'account-submit');
 await until(page,s=>s.account?.username==='first_account_qa'&&!s.busy);assert.equal((await read(page)).character,null);assert.equal(createdGuests,0);page.off('request',countGuest);
 await click(page,'session-close');await until(page,s=>s.mode==='welcome');await field(page,'traveler-name','新账号旅人');await click(page,'start');
 await until(page,s=>s.mode==='world'&&s.account?.username==='first_account_qa'&&s.character?.name==='新账号旅人'&&!s.busy);
 checks.push('a visitor can register before playing without an automatic guest session, then create and persist the first character on that account');
 await secondContext.close();await context.close();
 assert.deepEqual(errors,[]);assert(expected.length>=1);
 await fs.writeFile(out+'/result.json',JSON.stringify({checks,errors,expected,shots},null,2));console.log(JSON.stringify({checks,errors,shots}));
}catch(error){if(page&&!page.isClosed()){await page.screenshot({path:out+'/failure.png'});await fs.writeFile(out+'/failure-state.json',JSON.stringify({state:await read(page),editor:await page.evaluate(()=>({active:document.activeElement?.tagName,type:document.activeElement?.getAttribute('type'),inputs:[...document.querySelectorAll('input,textarea')].map(e=>({tag:e.tagName,type:e.getAttribute('type'),focused:e===document.activeElement}))}))},null,2));}throw error;}
finally{await closeBrowser(browser);}
