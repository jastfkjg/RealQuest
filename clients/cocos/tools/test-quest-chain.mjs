import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../package.json',import.meta.url)),ts=require('typescript'),cache=new Map();
async function module(name){if(cache.has(name))return cache.get(name);let code=ts.transpileModule(await fs.readFile(new URL('../../../shared/game/'+name+'.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;for(const m of [...code.matchAll(/from ['"]\.\/(\w+)['"]/g)])code=code.replace(m[0],'from '+JSON.stringify(await module(m[1])));const url='data:text/javascript;base64,'+Buffer.from(code).toString('base64');cache.set(name,url);return url;}
const {currentGuidance,objectiveText}=await import(await module('guidance'));
const {questTarget}=await import(await module('navigation'));
const {canExploreStory,canReadGate}=await import(await module('story'));
const {villageIntroStep}=await import(await module('villageIntro'));
const {nextDeparture,returnNote}=await import(await module('nextDeparture'));
const q=(id,kind='main',status='active')=>({id,kind,title:id,giver:'board',giver_name:'告示板',status,objectives:['目标1','目标2'],checks:[false,false]});
const s={quest_story:{version:2,legacy_departure:false},quests:{settle_in:{status:'claimed'},first_harvest:{status:'active'}},quest_log:[q('settle_in','main','claimed'),q('first_harvest'),q('market_neighbor','side')],tracked_quest:null,village_intro:{dismissed:false,briefed:false,first_clear:false,returned:false,reviewed:false},combat:{gate_open:false,boss_first:false,equipped:'stone_sword',unlocked:1,weapons:{stone_sword:{}}},inventory:{stone_sword:1,crop:4},stats:{harvest_radish:2},attributes:{wisdom:0},buildings:{home:1},storage:{},plots:{},farm:{tilled:['field_0_0']},events:[],knowledge_growth:{magic:0},knowledge_points:0,life_journal:{tasks:[]},ranch:{animals:{}},location:'overworld',position:{x:240,y:320}};
const before=JSON.stringify(s);
assert.equal(currentGuidance(s,0).questId,'first_harvest');assert.equal(villageIntroStep(s),null);assert.equal(nextDeparture(s,0),null);assert(!canExploreStory(s)&&!canReadGate(s));
assert.match(objectiveText(s,s.quest_log[1],0),/2\/4/);assert.equal(questTarget(s.quest_log[1],s).targetId,'field_0_0');
s.tracked_quest='market_neighbor';assert.equal(currentGuidance(s,0).questId,'market_neighbor');s.tracked_quest=null;
assert.equal(JSON.stringify(s),before,'guidance never mutates authoritative resources');
s.quest_log.push(q('first_expedition','main','available'));assert(canExploreStory(s));assert(!canReadGate(s));assert.equal(currentGuidance(s,0).kind,'quest');
s.quests.first_harvest.status='claimed';s.quest_log[1].status='claimed';s.quests.first_expedition={status:'active'};s.quest_log.at(-1).status='active';assert.equal(currentGuidance(s,0).kind,'intro');assert.notEqual(villageIntroStep(s).id,'brief','first cave needs no departure briefing');
s.tracked_quest='market_neighbor';assert.equal(currentGuidance(s,0).questId,'market_neighbor');s.tracked_quest=null;
s.village_intro.reviewed=true;s.quest_log.push(q('gate_story'));s.quests.first_expedition.status='claimed';s.quest_log.find(q=>q.id==='first_expedition').status='claimed';assert(canReadGate(s));assert.equal(nextDeparture(s,0),null,'no magic growth prompts before reading gate conditions');
s.village_intro.briefed=true;s.quest_log.push(q('gate_preparation'));s.quests.gate_preparation={status:'active'};assert.equal(currentGuidance(s,0).kind,'preparation');
s.quest_log.push({...q('leave_valley','main','available'),accept_anywhere:true,giver:'river_bridge',giver_map:'crossing'});s.quests.gate_preparation.status='claimed';for(const q of s.quest_log)if(q.kind==='main'&&q.id!=='leave_valley')q.status='claimed';assert.equal(currentGuidance(s,0).action.panel,'journal');assert.equal(returnNote(s,600,{version:1,at:0,depth:1,magic:0}),null);
const legacy={...q('leave_valley'),legacy:true,checks:[true,true,false]};assert.equal(questTarget(legacy,{...s,village_intro:{...s.village_intro,reviewed:true}}).targetId,'village_departure');
console.log('Quest-chain guidance: discovery, manual ownership, concrete navigation, legacy continuity and read-only state passed.');

// The actual armory view must keep the return-review action even while armed.
const {outputFiles}=await require('esbuild').build({entryPoints:[new URL('../assets/scripts/ui/expeditionGear.ts',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node'});
const {drawExpeditionGear}=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
function armory(state){
 const buttons=new Map(),events=[];
 const host={state,mode:'armory',width:1440,height:900,busy:false,error:'',notice:'',
  box(){},image(){},region(){},text(){},line(){},redraw(){},close(){},
  button(id,label,x,y,w,h,run,disabled){buttons.set(id,{run,disabled});},
  go(mode){events.push(mode);},mark(target){events.push(target);}};
 const view={weaponId:'',page:0,detailPage:0,gearTab:'obtain',gearFilter:'all',confirm:'',prepare(){}};
 drawExpeditionGear(host,view);return {buttons,events};
}
const returned={...s,inventory:{stone_sword:1},combat:{...s.combat,equipped:'stone_sword',weapons:{},gear_shop:{offers:[]}},village_intro:{...s.village_intro,returned:true,reviewed:false}};
let ui=armory(returned),resources=JSON.stringify(returned.inventory);
assert(ui.buttons.has('expedition-entry'),'armed returning player can open the material review');
ui.buttons.get('expedition-entry').run();assert.deepEqual(ui.events,['expedition']);assert.equal(JSON.stringify(returned.inventory),resources);
const farming={...returned,quest_log:[q('first_harvest')],combat:{...returned.combat,equipped:null},village_intro:{...returned.village_intro,returned:false}};
ui=armory(farming);assert(!ui.buttons.has('expedition-entry'),'farming stage armory keeps future guidance undiscovered');ui.buttons.get('gear-current-quest').run();assert.deepEqual(ui.events,['journal']);
console.log('Actual armory view: armed return review is reachable, early guidance remains undiscovered and reading preserves resources.');
