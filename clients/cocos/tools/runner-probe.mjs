// Infrastructure lifecycle fixture only; never part of game-behavior coverage.
import fs from 'node:fs/promises';import path from 'node:path';import {createRequire} from 'node:module';
import {browserConfig,launchBrowser,closeBrowser} from '../../../tools/cocos-browser-config.mjs';
const {chromium}=createRequire(new URL('../../../package.json',import.meta.url))('playwright');
const mode=process.env.REALQUEST_RUNNER_PROBE,suite='lifecycle-'+mode,test=await browserConfig(suite);
const browser=await launchBrowser(chromium,{headless:true});
try{
 const page=await browser.newPage();await page.goto('data:text/html,<p>Owned lifecycle fixture</p>');
 if(mode==='failure')throw Error('Expected isolated fixture failure');
 if(mode==='service-exit'){const ready=JSON.parse(await fs.readFile(path.join(test.directory,'ready.json'),'utf8'));process.kill(ready.children[0],'SIGTERM');await new Promise(()=>{});}
 if(mode==='timeout'){process.removeAllListeners('SIGTERM');process.on('SIGTERM',()=>{});await fs.writeFile(path.join(test.directory,'fault-armed.json'),'true');await new Promise(()=>{});}
 if(mode==='cancel'||mode==='startup-cancel')await new Promise(()=>{});
 await fs.writeFile(path.join(test.directory,'probe-result.json'),JSON.stringify({checks:['actual owned browser opens and closes'],errors:[]})+'\n');
}finally{await closeBrowser(browser);}
