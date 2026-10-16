import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../../../frontend/package.json',import.meta.url));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true});
let video;
try{
  const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:'output/cocos-migration/recordings',size:{width:1440,height:900}}});
  const page=await context.newPage();video=page.video();
  const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
  const click=async id=>{await page.waitForFunction(id=>JSON.parse(window.render_game_to_text()).controls.some(c=>c.id===id&&!c.disabled),id);const b=(await read()).controls.find(c=>c.id===id);await page.mouse.click(b.x,b.y);};
  await page.goto('http://127.0.0.1:5420');await page.waitForFunction(()=>typeof window.render_game_to_text==='function'&&JSON.parse(window.render_game_to_text()).loaded);
  await page.mouse.click(460,442);await page.keyboard.insertText('迁移旅人');
  let createdName='';page.on('request',r=>{if(r.url().endsWith('/api/command')){const b=r.postDataJSON();if(b.action==='create')createdName=b.data.name;}});
  await page.waitForTimeout(500);await click('start');await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='world');
  assert.equal(createdName,'迁移旅人');
  await page.keyboard.down('d');await page.waitForTimeout(620);await page.keyboard.up('d');await page.keyboard.press('e');await page.waitForTimeout(700);
  await click('inventory');await click('item-wood');await click('assign');await page.waitForTimeout(900);await click('close');await click('life');await page.waitForTimeout(900);await click('close');
  console.log('Chinese character creation and recorded real movement/gather/inventory/Life flow pass.');
  await context.close();
  await video.saveAs('output/cocos-migration/interaction.webm');
}finally{await browser.close();}
