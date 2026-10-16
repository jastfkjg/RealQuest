import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const baseline=JSON.parse(await fs.readFile(path.join(root,'docs/migration/cocos-baseline.json'),'utf8'));
let count=0;
for(const record of baseline.records){
  if(!(baseline.preservation_prefixes||['frontend/','styles/','assets/','backend/app/','backend/migrations/']).some(p=>record.path.startsWith(p)))continue;
  if((baseline.allowed_extensions||[]).includes(record.path))continue;
  const sha=crypto.createHash('sha256').update(await fs.readFile(path.join(root,record.path))).digest('hex');
  if(sha!==record.sha256)throw Error('Unplanned baseline change: '+record.path);
  count++;
}
console.log(`${count} existing Web/art/rule/migration sources preserved from ${baseline.revision.slice(0,7)}.`);

// Deliberate extraction does not waive behavior preservation for the old Web.
for(const name of ['protocol','interaction','stamina','residents','villageIntro','navigation','appearances']){
 const source=name==='protocol'?'frontend/src/types.ts':`frontend/src/game/${name}.ts`;
 let expected=execFileSync('git',['show',baseline.revision+':'+source],{cwd:root,encoding:'utf8'}).replaceAll('"../types"','"./protocol"');
 if(name==='navigation')expected=expected.replace('import { serverNow } from "../stores/game";\n','').replace('(world: World, state: GameState): MapData','(world: World, state: GameState, now: number): MapData').replaceAll('serverNow()', 'now').replace('  state: GameState,\n) {','  state: GameState,\n  now: number,\n) {').replace('currentMap(world, state);','currentMap(world, state, now);');
 if(await fs.readFile(path.join(root,`shared/game/${name}.ts`),'utf8')!==expected)throw Error('Unexpected behavior change during shared extraction: '+name);
}
console.log('Seven extracted protocol/helpers preserve original source semantics; navigation clock is explicitly injected.');
