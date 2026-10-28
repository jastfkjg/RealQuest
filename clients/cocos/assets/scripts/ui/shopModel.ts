import {formatMoney} from '../core/currency';
import type {Market} from '../core/protocol';
import {itemDefinitions,itemNames} from '../core/items';

export type ShopSide='buy'|'sell';
export const shopCategories=[['all','全部'],['seed','种子'],['material','材料'],['food','食物'],['tool','工具'],['gear','装备'],['other','其他']] as const;
export function shopCategory(id:string){
 const group=itemDefinitions[id]?.group;
 if(group==='种植')return 'seed';
 if(group==='材料')return 'material';
 if(group==='收获'||group==='补给'||group==='食物')return 'food';
 if(group==='工具')return 'tool';
 if(group==='武器'||group==='护具'||group==='饰品'||group==='装备')return 'gear';
 return 'other';
}
export function stockIds(market:Market,category:string,query:string){
 const text=query.trim().normalize('NFKC').toLocaleLowerCase();
 return Object.keys(market.buy).filter(id=>(category==='all'||shopCategory(id)===category)&&(!text||((itemNames[id]||id)+' '+id).normalize('NFKC').toLocaleLowerCase().includes(text)));
}
export function pageOf<T>(ids:T[],page:number,per:number){
 const pages=Math.max(1,Math.ceil(ids.length/per)),index=Math.max(0,Math.min(Math.trunc(page)||0,pages-1));
 return {index,pages,ids:ids.slice(index*per,(index+1)*per)};
}
export class ShopModel {
 category='all';query='';search=false;pages:Record<string,number>={};bagPage=0;amount='1';
 selected:{side:ShopSide;item:string;price:number|undefined}|null=null;
 bag:(string|null)[]=[];private save='';
 enter(save:string,market:Market,inventory:Record<string,number>,ordered:(string|null)[]){
  if(this.save!==save){this.save=save;this.category='all';this.query='';this.search=false;this.pages={};this.bagPage=0;this.amount='1';this.bag=[...ordered];const first=Object.keys(market.buy)[0];this.selected=first?{side:'buy',item:first,price:market.buy[first]}:null;}
  this.bag=this.bag.map(id=>id&&(inventory[id]||0)>0?id:null);
  for(const id of ordered)if(id&&(inventory[id]||0)>0&&!this.bag.includes(id)){const i=this.bag.indexOf(null);if(i<0)this.bag.push(id);else this.bag[i]=id;}
  // A depleted selection stays empty; never select a neighbouring possession.
  if(this.selected?.side==='sell'&&!(inventory[this.selected.item]>0))this.selected=null;
 }
 select(side:ShopSide,item:string,market:Market){this.selected={side,item,price:market[side][item]};this.amount='1';}
 get page(){return this.pages[this.category]||0;}
 set page(value:number){this.pages[this.category]=value;}
 filter(category:string){this.category=category;this.selected?.side==='buy'&&(this.selected=null);}
 find(query:string){this.query=query;this.page=0;if(this.selected?.side==='buy')this.selected=null;}
 visible(side:ShopSide,ids:(string|null)[]){if(this.selected?.side===side&&!ids.includes(this.selected.item))this.selected=null;}
 quote(market:Market,inventory:Record<string,number>){
  const s=this.selected,amount=Number(this.amount),gold=inventory.gold||0,owned=s?inventory[s.item]||0:0;
  const price=s?market[s.side][s.item]:undefined,traded=typeof price==='number'&&Number.isFinite(price)&&price>=0;
  const max=traded?Math.min(99,s?.side==='sell'?owned:price===0?99:Math.floor(gold/price)):0;
  const total=traded?price*amount:0,valid=Number.isInteger(amount)&&amount>=1&&amount<=99;
  const reason=!s?'点选货架商品购买，或点选行囊物品出售':!traded?(s.side==='sell'?'本店不收购此物':'商品已下架，请重新选择'):price!==s.price?'报价已变化，请重新点选物品核对':!valid?'请输入 1–99 的整数数量':amount>max?s.side==='sell'?'出售数量超过持有数量':`还差 ${formatMoney(Math.max(0,total-gold))}`:'';
  return {price,amount,owned,gold,max,total,reason,valid,afterGold:gold+(s?.side==='sell'?total:-total),remaining:owned-amount};
 }
 snapshot(){return {shopCategory:this.category,shopQuery:this.query,shopPage:this.page,shopBagPage:this.bagPage,shopSelection:this.selected,shopAmount:this.amount};}
}
