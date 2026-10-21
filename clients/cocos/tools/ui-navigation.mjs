/** Exercise the same journey-menu navigation available to players. */
export async function openSession(page){
 const read=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
 const click=async id=>{await page.waitForFunction(id=>JSON.parse(window.render_game_to_text()).controls.some(c=>c.id===id&&!c.disabled),id);const c=(await read()).controls.find(c=>c.id===id);await page.mouse.click(c.x,c.y);await page.waitForTimeout(140);};
 await click('menu');
 for(let i=0;i<4&&!(await read()).controls.some(c=>c.id==='menu-session');i++)await click('menu-next');
 await click('menu-session');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='session');
}
