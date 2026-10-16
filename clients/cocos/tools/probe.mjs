import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire(new URL('../../../frontend/package.json',import.meta.url));
const { chromium }=require('playwright');
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  await page.goto('http://127.0.0.1:5420');
  await page.waitForFunction(()=>typeof window.render_game_to_text==='function',null,{timeout:30000});
  await page.waitForTimeout(1800);
  console.log(await page.evaluate(()=>window.render_game_to_text()));
  await page.screenshot({path:'output/cocos-migration/first-render.png'});
  await fs.writeFile('output/cocos-migration/first-errors.json',JSON.stringify(errors,null,2));
  console.log('Errors:',errors);
}finally{await browser.close();}
