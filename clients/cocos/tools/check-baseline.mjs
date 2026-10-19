import {verifyTransition} from '../../../tools/cocos-transition.mjs';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const baseline=JSON.parse(await fs.readFile(path.join(root,'docs/migration/cocos-baseline.json'),'utf8'));
// Validate every closed phase exception before the legacy baseline loop.
const transition=await verifyTransition(root);
let count=0;
for(const record of baseline.records){
  if(!(baseline.preservation_prefixes||['frontend/','styles/','assets/','backend/app/','backend/migrations/']).some(p=>record.path.startsWith(p)))continue;
  if((baseline.append_only_extensions||[]).includes(record.path)){
    const original=execFileSync('git',['show',baseline.revision+':'+record.path],{cwd:root});
    const current=await fs.readFile(path.join(root,record.path));
    if(!current.subarray(0,original.length).equals(original))throw Error('Original definitions changed in append-only extension: '+record.path);
    count++;continue;
  }
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

const originalDates=execFileSync('git',['show',baseline.revision+':frontend/src/game/lifeJournalDates.ts'],{cwd:root,encoding:'utf8'}).replaceAll('"../types"','"./protocol"');
if(await fs.readFile(path.join(root,'shared/game/lifeJournalDates.ts'),'utf8')!==originalDates)throw Error('Life date/quota extraction changed original semantics');
console.log('Life date/quota helper preserves original Web semantics.');

const originalDateTest=execFileSync('git',['show',baseline.revision+':frontend/scripts/life-journal-dates.mjs'],{cwd:root,encoding:'utf8'}).replace('../src/game/lifeJournalDates.ts','../../shared/game/lifeJournalDates.ts');
if(await fs.readFile(path.join(root,'frontend/scripts/life-journal-dates.mjs'),'utf8')!==originalDateTest)throw Error('Original date assertions changed during shared extraction');
console.log('Original Web date tests retain every assertion against the canonical shared helper.');

const originalDeparture=execFileSync('git',['show',baseline.revision+':frontend/src/game/nextDeparture.ts'],{cwd:root,encoding:'utf8'}).replaceAll('"../types"','"./protocol"');
if(await fs.readFile(path.join(root,'shared/game/nextDeparture.ts'),'utf8')!==originalDeparture)throw Error('Preparation/return extraction changed original semantics');
const originalDepartureTest=execFileSync('git',['show',baseline.revision+':frontend/scripts/next-departure-state.mjs'],{cwd:root,encoding:'utf8'}).replace('../src/game/nextDeparture.ts','../../shared/game/nextDeparture.ts');
if(await fs.readFile(path.join(root,'frontend/scripts/next-departure-state.mjs'),'utf8')!==originalDepartureTest)throw Error('Original preparation/return assertions changed during extraction');
console.log('Preparation/return helper and original Web decision assertions preserve original semantics.');

const originalItems=execFileSync('git',['show',baseline.revision+':frontend/src/game/items.ts'],{cwd:root,encoding:'utf8'});
if(await fs.readFile(path.join(root,'shared/game/items.ts'),'utf8')!==originalItems)throw Error('Item registry extraction changed original content');
if(await fs.readFile(path.join(root,'frontend/src/game/items.ts'),'utf8')!=='export { itemDefinitions, itemNames, inventoryTraySlots } from "../../../shared/game/items";\nexport type { ItemDefinition } from "../../../shared/game/items";\n')throw Error('Web item registry wrapper changed');
console.log('Exact original item registry and Web re-export preserved.');

console.log('Current transition protection: '+JSON.stringify(transition));
