import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../package.json',import.meta.url)),ts=require('typescript');
const code=ts.transpileModule(await fs.readFile(new URL('../../../shared/game/atlas.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText;
const {atlasProjection,atlasPins}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
for(const frame of [{x:24,y:126,w:800,h:504},{x:24,y:126,w:408,h:120}]){
 const map={width:1920,height:1280},p=atlasProjection(map,frame);assert.equal(p.w/p.h,1.5);assert(p.x>=frame.x&&p.y>=frame.y);assert(p.x+p.w<=frame.x+frame.w+0.001);assert(p.y+p.h<=frame.y+frame.h+0.001);
 const points=Array.from({length:6},(_,i)=>({key:String(i),x:p.x+p.w/2,y:p.y+p.h/2})),before=JSON.stringify(points),pins=atlasPins(points,frame);assert.equal(pins.length,6);assert.equal(JSON.stringify(points),before);
 for(const a of pins){assert.equal(a.x,points[+a.key].x);assert.equal(a.y,points[+a.key].y);assert(a.target.x-22>=frame.x&&a.target.x+22<=frame.x+frame.w);assert(a.target.y-22>=frame.y&&a.target.y+22<=frame.y+frame.h);for(const b of pins)if(a!==b)assert(Math.abs(a.target.x-b.target.x)>=52||Math.abs(a.target.y-b.target.y)>=52);}
}
console.log('PASS uniform map projection, exact anchor preservation, bounded nonoverlapping44px pin targets in desktop and short landscape.');
