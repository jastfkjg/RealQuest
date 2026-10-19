import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../../../package.json',import.meta.url));const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true});
try{
 const p=await browser.newPage({viewport:{width:1440,height:900}});await p.goto('http://127.0.0.1:5422');await p.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).loaded);
 const read=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
 const click=async id=>{await p.waitForFunction(id=>JSON.parse(window.render_game_to_text()).controls.some(c=>c.id===id&&!c.disabled),id);const c=(await read()).controls.find(c=>c.id===id);await p.mouse.click(c.x,c.y);};
 await click('start');await p.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='world');await click('inventory');
 for(const [width,height] of [[844,390],[740,360],[1920,1080]]){await p.setViewportSize({width,height});await p.waitForTimeout(500);const s=await read();console.log(JSON.stringify({width,height,controls:s.controls}));for(const c of s.controls)assert(c.x-c.w/2>=0&&c.x+c.w/2<=width&&c.y-c.h/2>=0&&c.y+c.h/2<=height,c.id);await p.screenshot({path:`output/cocos-phase23/resize-${width}.png`});}
}finally{await browser.close();}
