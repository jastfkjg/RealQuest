import {toolCatalog} from './toolCatalog';
import {formatMoney} from './currency';
import {gearCatalog,gearMaterials,routeNames,slotNames} from './gearCatalog';
import {crops} from "./cropCatalog";
import {ranchCatalog,ranchProducts} from './ranching';
// Stable game IDs; fine64px original item art shares one presentation registry.
export interface ItemDefinition {
  name: string;
  group: string;
  summary: string;
  description: string;
  source: string;
  use: string;
  icon: string;
}
const icon = (id: string) => `/assets/hearthwood/detail/items/${id}.png`;
export const itemDefinitions: Record<string, ItemDefinition> = {
  wood: {
    name: "木材",
    group: "材料",
    summary: "建造家园，也能加工成木板。",
    description: "带着树脂香气的结实木材。家园的一梁一柱，都从这里开始。",
    source: "装备斧头砍伐树木与树桩",
    use: "3 木材 → 1 木板",
    icon: icon("wood"),
  },
  stone: {
    name: "石料",
    group: "材料",
    summary: "为小屋与工坊添一份坚实。",
    description: "从岩石中开采的石料，是加固小屋与工坊的基础材料。",
    source: "装备十字镐开采岩石",
    use: "用于小屋、工坊和图书馆升级",
    icon: icon("stone"),
  },
  seed: {
    name: "种子",
    group: "种植",
    summary: "在家园农田播种。",
    description: "一小袋萝卜种子。在家门口的农田播下，等待新生活破土而出。",
    source: "杂货铺／工坊购买 · 收获时留种",
    use: "1 种子 → 2 萝卜 + 1 种子",
    icon: icon("seed"),
  },
  crop: {
    name: "萝卜",
    group: "收获",
    summary: "卖给杂货铺，或交付村民的蔬菜订单。",
    description: "刚从泥土中拔出的新鲜萝卜。带去杂货铺，为下一次冒险换些银币。",
    source: "家园农田 · 成熟后收获",
    use: "在杂货铺或工坊出售；也可交付订单",
    icon: icon("crop"),
  },
  plank: {
    name: "木板",
    group: "材料",
    summary: "交给工匠，完成制作委托。",
    description: "细心打磨的木板，保留着温暖的木纹。也是完成工匠委托的证明。",
    source: "工坊制作 · 消耗 3 木材",
    use: "制作委托或在杂货铺出售",
    icon: icon("plank"),
  },
};
// Original vector UI symbols for this slice; no missing sprite path is implied.
const gearSymbol = (body: string) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="#314e3b" stroke-width="2" stroke-linejoin="round">${body}</g></svg>`);
const blade = '<path fill="#b9c6b0" d="M22 44 38 10 48 6 49 17 29 48Z"/><path fill="#edf0d7" stroke="none" d="m27 41 14-28 3-1-15 31Z"/><path fill="#b18a56" d="m17 40 19 9-3 5-19-9Z"/><path fill="#896440" d="m20 46 6 3-6 13-6-3Z"/>';
const additions: [string,string,string,string,string][] = [
  ['stone_sword','石刃短剑','武器','8物理伤害 · 0.65秒 · 1体力',blade],
  ['reinforced_sword','加固短剑','武器','12物理伤害 · 0.65秒 · 1体力',blade+'<path fill="#d2b575" d="m31 28 9 5-3 5-9-5Z"/>'],
  ['spring_spear','弹簧长矛','武器','13物理伤害 · 距离48 · 2体力','<path stroke="#896440" stroke-width="6" d="m14 59 27-41"/><path fill="#b7c8b4" d="m31 24 8-19 13-4-5 23-9 9Z"/><path stroke="#b69e6b" d="m22 40 13 5-10-12 13 5-10-12 13 5"/>'],
  ['glow_staff','微光短杖','武器','10魔法伤害 · 距离112 · 2体力','<path stroke="#856542" stroke-width="6" d="m19 59 19-38"/><path fill="#89b6a0" d="m36 4 15 11-7 18-20-5-2-17Z"/><path fill="#d6e2bb" d="m36 4 1 19-13 5-2-17Z"/>'],
  ['gel','黏液胶质','材料','苔团掉落 · 用于短杖打造','<path fill="#95b87c" d="M9 45Q9 24 28 20L33 7l9 13q14 8 13 25-22 17-46 0Z"/><path fill="#c8d7a6" stroke="none" d="M19 38q-1-10 10-13l-2 6-5 8Z"/>'],
  ['shell','硬壳碎片','材料','石壳虫掉落 · 加固武器','<path fill="#9da782" d="m9 28 17-15 25 6 5 28-25 9-23-10Z"/><path fill="none" d="m26 13 4 23 26 11M30 36 8 46m22-10 16-16"/>'],
  ['crystal','微光晶屑','材料','洞穴蝠掉落 · 用于短杖打造','<path fill="#91b5a3" d="m26 5 14 8 8 33-18 14L14 43Z"/><path fill="#dce5c5" d="m26 5 5 30-17 8Z"/><path fill="none" d="m31 35 9-22m-9 22 17 11m-17-11-1 25"/>'],
  ['gate_stone','门钥魔法石','关键物品','Boss首胜保底 · 魔法3级开启石门','<path fill="#c5cda4" d="m32 5 18 12 5 22-23 21L9 39l5-22Z"/><path fill="#759a83" d="m32 17 10 15-10 15-10-15Z"/><path fill="#f4e6b5" d="m32 23 6 9-6 9-6-9Z"/>'],
  ['soup','便携菜汤','补给','恢复20生命＋15体力 · 8银币','<path fill="#b89a6a" d="M7 24h50l-7 27q-19 13-36 0Z"/><ellipse fill="#b2ba78" cx="32" cy="24" rx="25" ry="10"/><path fill="#d5c789" stroke="none" d="M17 23h9v5h-9Zm16-5h10v5H33Z"/>'],
];
for (const [id,name,group,summary,body] of additions) itemDefinitions[id]={name,group,summary,
  description:summary,source:group==='武器'?'工坊铁匠购买 · 锻造工作台按图纸打造':id==='gate_stone'?'石根山洞第5层 · 石壳守卫首次击败':id==='soup'?'工坊铁匠 · 补给':'石根山洞 · 对应怪物固定掉落',
  use:id==='gate_stone'?'魔法3级后走近东行石门开启，永久通行':group==='武器'?'装备后在洞内攻击；购买不要求制造等级':'在武备台查看用途与持有状态',icon:gearSymbol(body)};
for(const c of crops){
 itemDefinitions[c.seed]={name:c.name+'种子',group:'种植',summary:'需要种植 '+c.level+' 级 · '+c.days+' 游戏日首熟',description:c.note,source:'风铃杂货铺 · 所有等级均可购买',use:'播种消耗1份 · 每轮收获'+c.yield+'份 · 共'+c.harvests+'轮；游戏时间与睡眠推进生长，离线暂停',icon:'assets/derived/farming-v1/items/'+c.seed+'.png'};
 itemDefinitions[c.item]={name:c.name,group:'收获',summary:'可在风铃杂货铺出售。',description:c.note,source:'家园农田 · 成熟后收获',use:'杂货铺出售 · 基础单价'+formatMoney(c.sell)+'，工坊升级可提高报价',icon:'assets/derived/farming-v1/items/'+c.item+'.png'};
}
for(const [id,g] of Object.entries(gearCatalog)){
 const weapon=g.slot==='weapon',w=g as any;
 itemDefinitions[id]={name:g.name,group:weapon?'武器':slotNames[g.slot],summary:weapon?`${routeNames[g.route]} · ${g.tier}阶 · ${w.damage}伤害 · ${w.interval}秒`:g.effect_text,
 description:g.effect_text||('精心制作的'+g.name+'。'),source:g.blueprint_source==='boss'?'石壳守卫首胜获得图纸':g.blueprint_source==='ruins'?'解读村庄沉睡符文获得图纸':g.blueprint_source==='research'?'苔桥城精密工坊 · 达成条件研究兑换图纸':g.region==='city'?'苔桥城精密工坊 · 成品或图纸':'工坊铁匠阿焰 · 成品或图纸',
 use:`装备条件：永久体力上限${g.min_stamina}`+(w.use_science?` · 科学${w.use_science}`:'')+(w.use_magic?` · 魔法${w.use_magic}`:'')+'；图纸永久学会，打造消耗材料。',icon:'assets/derived/equipment-v1/'+id+'.png'};
}
for(const [id,m] of Object.entries(gearMaterials))itemDefinitions[id]={name:m.name,group:'材料',summary:m.summary,description:m.summary,source:'苔桥城精密工坊 · 材料柜台',use:'用于高级武器与护具打造',icon:itemDefinitions[m.icon]?.icon||icon(m.icon)};
itemDefinitions.animal_feed={name:'牧场饲料',group:'养殖',summary:'动物成长与产出的每日口粮。',description:'禽畜通用饲料；不同动物每日用量不同。',source:'杂货铺或牧场采购簿购买，小麦/玉米加工',use:'走近牧场动物投喂；最多储备3游戏日，离线不消耗',icon:'assets/derived/ranching-v1/items/animal_feed.png'};
for(const [id,p] of Object.entries(ranchProducts))for(const fine of [false,true]){
 const key=(fine?'fine_':'')+id;
 itemDefinitions[key]={name:(fine?'优质':'')+p.name,group:id==='wool'||id==='cloth'?'材料':'食物',summary:'杂货铺收购 · '+formatMoney(Math.floor(p.sell*(fine?1.5:1))),description:(fine?'亲密伙伴的优质出产。':'来自向阳牧场的新鲜出产。'),source:'动物成年产出或牧场设备加工',use:'可在杂货铺出售；原料也可在牧场加工',icon:'assets/derived/ranching-v1/items/'+id+'.png'};
}
for(const t of toolCatalog.tools)itemDefinitions[t.id]={name:t.name,group:'工具',summary:t.note,description:t.note,source:'初始工具 · 旧旅程自动补发缺失工具',use:'拿起后在世界使用；铁匠阿焰提供升级，永久使用无耐久损坏',icon:'assets/derived/tools-v1/tools/'+t.id+'-0.png'};
for(const [id,m] of Object.entries(toolCatalog.materials))itemDefinitions[id]={name:m.name,group:id==='tree_seed'?'种植':'材料',summary:m.source,description:m.source,source:m.source,use:id==='tree_seed'?'拿起后在家园空草地种树；3游戏日长成':"工具升级材料，可在杂货铺出售",icon:'assets/derived/tools-v1/items/'+id+'.png'};
export const itemNames: Record<string, string> = {
  gold: "钱币",
  ...Object.fromEntries(
    Object.entries(itemDefinitions).map(([id, item]) => [id, item.name]),
  ),
};
// Legacy tray size, NOT an authoritative capacity or stack limit.
export const inventoryTraySlots = 24;

for(const [id,name] of [['wooden_chest','木箱'],['reinforced_chest','加固木箱']]){itemDefinitions[id]={name,group:'家具',summary:'回家在家园手册中摆放，走近存取。',description:'亲手制作的储物木箱，每种物品占一格。',source:'工坊工作台制作 · 木匠教授图纸',use:'家园手册摆放；走近木箱后可改名、存取和移动',icon:icon('plank')};itemNames[id]=name;}

for(const [facility,spec] of Object.entries(ranchCatalog.facilities as Record<string,{name:string;note:string;craft?:{item:string;level:number}}>)){if(!spec.craft)continue;const id=spec.craft.item;itemDefinitions[id]={name:spec.name,group:'生产设施',summary:'建造'+spec.craft.level+'级自制 · 到牧场加工地带摆放',description:spec.note,source:'木匠阿榆教授图纸 · 工坊工作台制作',use:'牧场采购簿→加工→摆放；走近设备投料与收取，使用不检查制造等级',icon:'assets/derived/ranching-v1/facilities/'+facility+'.png'};itemNames[id]=spec.name;}
