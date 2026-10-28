import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runOwned} from './cocos-child.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
if(Number(process.versions.node.split('.')[0])!==22)throw Error('Cocos unit tools require Node22; run nvm use (see .nvmrc).');
const modules=[
 ['tools','clients/cocos/tools/test-tools.mjs'],
 ['tool-poses','clients/cocos/tools/test-tool-poses.mjs'],
 ['currency','clients/cocos/tools/test-currency.mjs'],
 ['sword-motion','clients/cocos/tools/test-sword-motion.mjs'],
 ['quest-chain','clients/cocos/tools/test-quest-chain.mjs'],
 ['ranching','clients/cocos/tools/test-ranching.mjs'],
 ['construction','clients/cocos/tools/test-construction.mjs'],
 ['production','clients/cocos/tools/test-production.mjs'],
 ['shop','clients/cocos/tools/test-shop.mjs'],
 ['equipment','clients/cocos/tools/test-equipment.mjs'],
 ['blacksmith','clients/cocos/tools/test-blacksmith.mjs'],
 ['farming','clients/cocos/tools/test-farming.mjs'],
 ['tool-lifecycle','tools/test-cocos-child.mjs'],
 ['source-ownership','tools/test-cocos-sources.mjs'],
 ['sqlite-backup','tools/test-cocos-backup.mjs'],
 ['browser-configuration','tools/test-cocos-browser.mjs'],
 ['build-receipts','tools/test-cocos-build-info.mjs'],
 ['preview-startup','tools/test-cocos-preview.mjs'],
 ['release-packaging','tools/test-cocos-release.mjs'],
 ['network-budget','tools/test-cocos-network-budget.mjs'],
 ['network-proxy','tools/test-cocos-network-proxy.mjs'],
 ['core','clients/cocos/tools/test-core.mjs'],['features','clients/cocos/tools/test-features.mjs'],
 ['cave-view','clients/cocos/tools/test-cave-view.mjs'],['local-scene','clients/cocos/tools/test-local-scene.mjs'],
 ['life-records','clients/cocos/tools/test-life-records.mjs'],['life-dates','tools/test-life-journal-dates.mjs'],
 ['dossier','clients/cocos/tools/test-dossier.mjs'],['guidance','clients/cocos/tools/test-guidance.mjs'],
 ['departure-decisions','tools/test-next-departure-state.mjs'],['places','clients/cocos/tools/test-places.mjs'],
 ['atlas','clients/cocos/tools/test-atlas.mjs'],['dialogue','clients/cocos/tools/test-dialogue.mjs'],
 ['inventory','clients/cocos/tools/test-inventory.mjs'],['preferences','clients/cocos/tools/test-preferences.mjs'],
];
const args=process.argv.slice(2);let only,report;
for(let i=0;i<args.length;i++){
 if(args[i]==='--list'){console.log(modules.map(([name,file])=>name+'\t'+file).join('\n'));process.exit(0);}
 else if(args[i]==='--only'&&args[i+1])only=args[++i].split(',');
 else if(args[i]==='--report'&&args[i+1])report=path.resolve(root,args[++i]);
 else throw Error('Usage: node tools/cocos-unit.mjs [--list] [--only name,name] [--report output/path.json]');
}
if(only?.some(n=>!modules.some(([name])=>name===n)))throw Error('Unknown unit module. Use --list.');
report||=path.join(root,'output/cocos-unit',new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8),'result.json');
if(!report.startsWith(path.join(root,'output')+path.sep))throw Error('Unit reports must be inside this repository output directory.');
const controller=new AbortController(),stop=()=>controller.abort();process.on('SIGINT',stop);process.on('SIGTERM',stop);
const results=[],begin=new Date().toISOString();
try{
 for(const [name,file] of modules.filter(([n])=>!only||only.includes(n))){
  const r=await runOwned(process.execPath,[path.join(root,file)],{cwd:root,log:path.join(path.dirname(report),name+'.log'),signal:controller.signal});
  results.push({name,file,...r});console.log((r.code===0&&!r.timedOut&&!r.cancelled?'PASS ':'FAIL ')+name);
  if(r.code!==0||r.timedOut||r.cancelled){process.exitCode=1;break;}
 }
}finally{
 process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);await fs.mkdir(path.dirname(report),{recursive:true});
 const expected=modules.filter(([n])=>!only||only.includes(n)).length;
 await fs.writeFile(report,JSON.stringify({kind:'unit-modules',runtime:{node:process.version,nodeExecutable:process.execPath},started:begin,finished:new Date().toISOString(),expected,results,complete:results.length===expected&&results.every(r=>r.code===0&&!r.timedOut&&!r.cancelled),browserTestsIncluded:false},null,2)+'\n');console.log('Report: '+report);
}
