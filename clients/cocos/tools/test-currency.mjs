import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../package.json',import.meta.url));
const result=await require('esbuild').build({entryPoints:[new URL('../../../shared/game/currency.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node'});
const {formatMoney}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
for(const [amount,text] of [[0,'0银'],[99,'99银'],[100,'1金'],[101,'1金 1银'],[245,'2金 45银'],[100000,'1,000金'],[100000001,'1,000,000金 1银']])assert.equal(formatMoney(amount),text);
console.log('PASS exact silver/gold wallet boundaries and full large balances');
