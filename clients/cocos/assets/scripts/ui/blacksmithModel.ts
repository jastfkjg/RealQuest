import type {GameState} from '../core/protocol';

export type SmithTab='obtain'|'diagrams'|'sell'|'supplies';
export const smithTabs:[SmithTab,string][]=[['obtain','成品武器'],['diagrams','武器图纸'],['sell','出售装备'],['supplies','补给']];
export const smithFilters=[['all','全部'],['martial','冷兵器'],['science','科学'],['magic','魔法'],['gear','护具']];
export function smithStock(state:GameState,tab:SmithTab,filter:string){
 const c=state.combat!,gear=c.gear||c.weapons,shop=c.gear_shop!;
 const ids=tab==='sell'?Object.keys(gear).filter(id=>state.inventory[id]>0):tab==='diagrams'?shop.diagrams:tab==='supplies'?shop.offers.filter(id=>!gear[id]):shop.offers.filter(id=>!!gear[id]);
 return ids.filter(id=>tab==='supplies'||filter==='all'||(filter==='gear'?gear[id]?.slot!=='weapon':gear[id]?.slot==='weapon'&&gear[id].route===filter));
}
export function smithQuote(state:GameState,tab:SmithTab,id:string,requested:number){
 const gear=state.combat!.gear||state.combat!.weapons,g=gear[id],owned=state.inventory[id]||0,gold=state.inventory.gold||0;
 const price=tab==='sell'?Math.floor((g?.price||0)/4):tab==='diagrams'?g?.blueprint_price||0:id==='soup'?8:g?.price||0;
 const max=tab==='diagrams'?1:tab==='sell'?Math.min(99,owned):Math.min(99,Math.floor(gold/Math.max(1,price)));
 const amount=tab==='diagrams'?1:Math.max(1,Math.min(99,Number.isInteger(requested)?requested:1));
 const total=price*amount,missing=tab==='sell'?0:Math.max(0,total-gold),known=tab==='diagrams'&&!!g?.known;
 const listed=smithStock(state,tab,'all').includes(id),valid=listed&&price>0&&!known&&!missing&&(tab!=='sell'||owned>=amount);
 const equipped=!!g&&(g.slot==='weapon'?state.combat!.equipped===id:state.combat!.equipment?.[g.slot]===id);
 return {price,owned,gold,max,amount,total,missing,known,valid,equipped,unloads:tab==='sell'&&equipped&&amount===owned,after:gold+(tab==='sell'?total:-total)};
}
