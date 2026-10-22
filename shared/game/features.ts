import type { GameState, GrowthTarget, Quest } from './protocol';
export const itemNames:Record<string,string>={gold:'金币',seed:'种子',wood:'木材',stone:'石料',crop:'萝卜',plank:'木板',stone_sword:'石刃短剑',reinforced_sword:'加固短剑',spring_spear:'弹簧长矛',glow_staff:'微光短杖',gel:'黏液胶质',shell:'硬壳',crystal:'微光晶屑',gate_stone:'门钥魔法石',soup:'便携菜汤'};
export const growthNames:Record<GrowthTarget,string>={vitality:'生命上限',stamina:'体力上限',science:'科学',magic:'魔法',planting:'种植',ranching:'养殖',building:'建造'};
export const questStatuses={available:'可接取',active:'进行中',ready:'待交付',claimed:'已完成',locked:'尚未开放'};
export const costText=(costs:Record<string,number>)=>Object.entries(costs).map(([id,n])=>`${itemNames[id]||id} ${n}`).join(' · ');
export const shortages=(state:GameState,costs:Record<string,number>)=>Object.entries(costs).filter(([id,n])=>(state.inventory[id]||0)<n).map(([id,n])=>`${itemNames[id]||id}还差 ${n-(state.inventory[id]||0)}`);
export function growthCommand(state:GameState,target:GrowthTarget){
 const quote=state.character_growth_options?.[target];
 if(!quote)throw new Error('请刷新成长选项');
 const action=quote.currency==='knowledge_points'?'knowledge_spend':quote.currency==='skill_points'?'skill_spend':'health_spend';
 return {action,data:{...(action==='health_spend'?{target}:{branch:target}),expected_invested:quote.expected_invested},shortfall:Math.max(0,quote.cost-(state[quote.currency]||0))};
}
export function timerSeconds(state:GameState,now:number){const t=state.timer;return t?Math.max(0,t.elapsed+(t.running?Math.max(0,now-t.started_at):0)):0;}
export const timeText=(seconds:number)=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
export function entityId(hex:string){if(!/^[a-f0-9]{32}$/.test(hex))throw new Error('无法生成记录标识');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;}
export function questEntries(state:GameState,giver?:string):Quest[]{return state.quest_log.filter(q=>!giver||q.giver===giver);}
// Descriptive existing recipes only. The server validates costs and mutates assets.
export const plankRecipe={wood:3};
export const upgradeCosts=(level:number)=>({wood:level*6,stone:level*3,gold:level*10});
export function combatIntention(state:GameState,owner:string,axes:{dx:number;dy:number},targetId:string|null,buttons:{attack:boolean;spark:boolean;soup:boolean;dodge?:boolean;dodge_x?:number;dodge_y?:number}){
 const c=state.combat;if(!c?.encounter||!state.location.startsWith('cave_'))return null;
 const alive=c.enemies.filter(e=>e.hp>0),p=state.position;
 const target=alive.find(e=>e.id===targetId)||alive.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
 const length=Math.max(1,Math.hypot(axes.dx,axes.dy));
 return {targetId:target?.id||null,data:{location:state.location,owner,encounter:c.encounter,seq:c.input_seq+1,dx:axes.dx/length,dy:axes.dy/length,aim_x:Math.min(640,Math.max(0,target?.x??p.x+30)),aim_y:Math.min(448,Math.max(0,target?.y??p.y)),...buttons}};
}
