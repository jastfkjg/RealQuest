import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(new URL('../../../package.json',import.meta.url));
const esbuild=require('esbuild');
if(Number(process.versions.node.split('.')[0])!==22)throw Error('Sword motion tests require the repository Node 22 runtime.');
let motion,features,cave;
try{
  [motion,features,cave]=await Promise.all(['swordMotion','features','caveView'].map(async name=>{
    const {outputFiles}=await esbuild.build({entryPoints:[new URL(`../../../shared/game/${name}.ts`,import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node'});
    return import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
  }));
}finally{
  esbuild.stop();
}

const freeze=value=>{
  if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}
  return value;
};
const close=(actual,expected,message)=>assert(Math.abs(actual-expected)<1e-10,message||`${actual} != ${expected}`);
const action=freeze({kind:'weapon',style:'sweep',angle:0,started:10,hit_at:10.1104,until:10.48,seq:8});
const base=freeze({appearance:0,weapon:'stone_sword',owned:true,direction:0,action:null,time:10,elapsed:2,moving:false,dodge:null,reduced:false});
const pose=overrides=>motion.swordPresentation({...base,...overrides});
const directions=[{dx:0,dy:1,angle:Math.PI/2},{dx:0,dy:-1,angle:-Math.PI/2},{dx:-1,dy:0,angle:Math.PI},{dx:1,dy:0,angle:0}];

for(const [direction,{angle}] of directions.entries()){
  assert.equal(motion.facingDirection(angle),direction);
  for(const [time,frame,phase] of [[10.02,1,'anticipation'],[10.08,2,'start'],[10.1104,3,'active'],[10.20,4,'follow'],[10.44,5,'recover']]){
    const result=pose({direction:(direction+1)%4,action:{...action,angle},time});
    assert.deepEqual([result.active,result.direction,result.sheet,result.frame,result.phase],[true,direction,'attack',frame,phase]);
  }
  assert.equal(pose({direction,action:{...action,angle},time:10.48}).phase,'ready','complete recovery returns to held stance');
  assert.equal(pose({direction,action:{...action,angle},time:10.48}).direction,direction);
}

// A slower authority timeline must not use the short sword's default hit frame.
const slower=freeze({...action,started:20,hit_at:20.4,until:21.1});
for(const [time,phase] of [[20.11,'anticipation'],[20.30,'start'],[20.4,'active'],[20.6,'follow'],[21.0,'recover'],[21.1,'ready']]){
  assert.equal(pose({action:slower,time}).phase,phase);
}
const legacy={...action};delete legacy.hit_at;
assert.equal(pose({action:legacy,time:10.12}).phase,'active','older action without hit_at retains its supported fallback');
assert.equal(pose({action:{...action,kind:'spark',style:'spark'},time:10.02}).phase,'ready','a spell does not play a sword strike');
assert.equal(pose({action:{...action,style:'thrust'},time:10.02}).phase,'ready','other weapon actions do not borrow approved sword frames');

assert.deepEqual(pose({}),{active:true,direction:0,frame:0,phase:'ready',sheet:'attack',moving:false});
for(const [elapsed,frame] of [[.125,0],[.375,1]]){
  const result=pose({moving:true,elapsed});
  assert.deepEqual([result.phase,result.sheet,result.frame,result.moving],['walk','motion',frame,true]);
  assert.equal(pose({moving:true,elapsed,reduced:true}).phase,'ready','reduced motion retains the readable held stance');
}
for(const time of [10.02,10.08,10.1104,10.20,10.44]){
  assert.deepEqual(pose({action,time,reduced:true}),pose({action,time}),'reduced motion retains attack timing and directional information');
}
for(const [direction,{dx,dy}] of directions.entries()){
  const dodge=freeze({started:10,until:10.18,dx,dy});
  for(const [time,frame] of [[10.01,2],[10.15,3]]){
    const result=pose({action,time,dodge});
    assert.deepEqual([result.direction,result.sheet,result.frame,result.phase],[direction,'motion',frame,'dodge'],'dodge takes visual ownership from canceled sword animation');
    assert.deepEqual(pose({action,time,dodge,reduced:true}),result);
  }
  assert.equal(pose({time:10.18,dodge}).phase,'ready','ended dash stops using dodge art');
}
for(const [appearance,weapon,owned] of [[1,'stone_sword',true],[0,'reinforced_sword',true],[0,'crystal_sword',true],[0,null,true],[0,'stone_sword',false]]){
  assert.equal(motion.hasSwordArt(appearance,weapon,owned),false);
  assert.equal(pose({appearance,weapon,owned,action,time:10.12,dodge:{started:10,until:10.18,dx:1,dy:0}}).active,false,'only the approved identity and owned stone sword select this sheet');
}
console.log('PASS sword presentation: four directions, accepted contact and recovery timelines, stance/walk/reduced motion, dodge priority, scoped actor and equipment.');

const point=freeze({x:220,y:240}),pointer=freeze({x:180,y:210});
const locked=freeze({id:'explicit-lock',kind:'slime',hp:18,x:400,y:300});
assert.deepEqual(motion.resolveCombatAim(point,0,pointer,locked),{x:400,y:300,source:'lock',lockedTarget:'explicit-lock'});
assert.deepEqual(motion.resolveCombatAim(point,0,pointer,undefined),{...pointer,source:'pointer',lockedTarget:null});
assert.deepEqual(motion.resolveCombatAim(point,0,pointer,{...locked,hp:0}),{...pointer,source:'pointer',lockedTarget:null},'dead lock falls back to current pointer');
for(const [direction,{dx,dy}] of directions.entries()){
  for(const missing of [undefined,{...locked,hp:0}]){
    const result=motion.resolveCombatAim(point,direction,null,missing);
    close(result.x,point.x+dx*48);close(result.y,point.y+dy*48);
    assert.equal(result.source,'facing');assert.equal(result.lockedTarget,null);
  }
}
for(const invalid of [{x:NaN,y:210},{x:180,y:NaN},{x:Infinity,y:210},{x:180,y:-Infinity},{x:220,y:240},{x:222,y:240}]){
  const result=motion.resolveCombatAim(point,1,invalid,undefined);
  assert(Number.isFinite(result.x)&&Number.isFinite(result.y));
  assert.equal(result.source,'facing');close(result.x,220);close(result.y,192);
}

const state=freeze({location:'cave_1',position:point,inventory:{stone_sword:1,gel:0,gold:20},combat:{
  encounter:'sword-test',input_seq:41,time:10.12,floor:1,action,effects:[],enemies:[
    {id:'dead',kind:'slime',hp:0,x:221,y:240},
    {id:'nearest',kind:'slime',hp:18,x:230,y:240},locked,
  ],
}});
const snapshot=JSON.stringify(state),buttons=freeze({attack:true,spark:false,soup:false,dodge:false,dodge_x:0,dodge_y:1});
for(const target of [null,'missing','dead']){
  const result=features.combatIntention(state,'input-owner',{dx:1,dy:1},target,buttons,pointer);
  assert.equal(result.targetId,null,'manual aim never implicitly locks the nearest enemy');
  assert.deepEqual([result.data.aim_x,result.data.aim_y],[180,210]);
  close(result.data.dx,Math.SQRT1_2);close(result.data.dy,Math.SQRT1_2);
  assert.deepEqual([result.data.owner,result.data.location,result.data.encounter,result.data.seq],['input-owner','cave_1','sword-test',42]);
  assert.equal(result.data.attack,true);assert.equal(result.data.dodge_x,0);assert.equal(result.data.dodge_y,1);
}
const explicitAim=motion.resolveCombatAim(point,2,pointer,locked);
const lockIntent=features.combatIntention(state,'input-owner',{dx:0,dy:0},locked.id,buttons,explicitAim);
assert.equal(lockIntent.targetId,locked.id);assert.deepEqual([lockIntent.data.aim_x,lockIntent.data.aim_y],[400,300]);
const override=features.combatIntention(state,'input-owner',{dx:.3,dy:.4},locked.id,buttons,pointer);
assert.deepEqual([override.data.aim_x,override.data.aim_y],[180,210],'supplied aim remains the aim even if target metadata is present');
assert.deepEqual([override.data.dx,override.data.dy],[.3,.4],'sub-unit movement speed is preserved');
for(const direction of [0,1,2,3]){
  const facing=motion.resolveCombatAim(point,direction,null,undefined);
  const result=features.combatIntention(state,'input-owner',{dx:0,dy:0},null,buttons,facing);
  assert.equal(result.targetId,null,'pure keyboard facing does not acquire a nearby enemy');
  close(result.data.aim_x,facing.x);close(result.data.aim_y,facing.y);
}
const bounded=features.combatIntention(state,'input-owner',{dx:0,dy:0},null,buttons,{x:-12,y:999});
assert.deepEqual([bounded.data.aim_x,bounded.data.aim_y],[0,448]);
assert.equal(features.combatIntention({...state,location:'overworld'},'input-owner',{dx:0,dy:0},null,buttons,pointer),null);
assert.equal(features.combatIntention({...state,combat:{...state.combat,encounter:''}},'input-owner',{dx:0,dy:0},null,buttons,pointer),null);
console.log('PASS combat intentions: explicit lock/pointer/facing priority, missing/dead lock fallback, finite pointer guard, normalized movement, sequence and owner, bounded aim, no implicit target.');

assert.equal(pose({action:state.combat.action,time:state.combat.time}).phase,'active');
assert.deepEqual(cave.confirmedFeedback(state),[],'an active local/authority swing alone never fabricates a hit');
assert.equal(JSON.stringify(state),snapshot,'presentation and intention preserve enemy HP, rewards and authoritative state');
const confirmed=freeze({...state,combat:{...state.combat,effects:[{id:7,kind:'hit',x:230,y:240,text:'−8',until:10.7}]}});
const feedback=cave.confirmedFeedback(confirmed);
assert.equal(feedback.length,1);assert.equal(feedback[0].id,7);assert.equal(feedback[0].text,'−8');
assert.equal(cave.confirmedFeedback({...confirmed,combat:{...confirmed.combat,time:11}}).length,0);
console.log('PASS authority boundary: animation and aim create no damage or rewards; only unexpired confirmed server effects produce hit feedback.');
