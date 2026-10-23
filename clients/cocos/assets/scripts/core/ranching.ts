import {ranchCatalog} from './ranchCatalog';
import type {GameState,WorldObject} from './protocol';
export {ranchCatalog};
export interface RanchAnimal {species:string;name:string;age:number;feed_seconds:number;progress:number;products:Record<string,number>;affection:number;pet_day:number;stage:number;grown_in:number;feed_days:number;next_product_days:number;ready:number;x:number;y:number;}
export interface RanchState {version:number;intro_aid?:{coop?:boolean;chicken?:boolean};buildings:Record<string,number>;facilities:Record<string,boolean>;animals:Record<string,RanchAnimal>;next_id:number;last_tick:number|null;jobs:Record<string,{recipe:string;output:string;ready_tick:number}>;mounted:string|null;}
export interface RanchView {catalog:typeof ranchCatalog;feed_price:number;day_seconds:number;product_capacity:number;feed_capacity_days:number;speed_multiplier:number;animals:Record<string,RanchAnimal>;offers:Record<string,string[]>;buildings:Record<string,{level:number;capacity:number;used:number;next_costs:Record<string,number>|null}>;jobs:Record<string,{recipe:string;output:string;ready_tick:number;ready:boolean;remaining_days:number}>;}
export const stageNames=['','幼年','成长期','成年'];
export const ranchSpecies=ranchCatalog.animals;
export const ranchProducts=ranchCatalog.products as Record<string,{name:string;sell:number}>;
export const ranchFacilities=ranchCatalog.facilities as Record<string,{name:string;costs:Record<string,number>;note:string}>;
export const ranchShelters=ranchCatalog.shelters as Record<string,{name:string;x:number;y:number;width:number;height:number;capacity:number[];costs:Record<string,number>[]} >;
export function ranchObjects(state:GameState):WorldObject[]{
 return Object.entries(state.ranching?.animals||{}).filter(([id])=>id!==state.ranch?.mounted).map(([id,a])=>({id,kind:'animal',name:a.name,x:a.x,y:a.y}));
}
export const animalArt=(species:string,stage:number)=>'ranching/'+species+'-'+stage;
export const ranchArtPaths=[...ranchSpecies.flatMap(s=>[1,2,3].map(n=>animalArt(s.id,n))),...Object.keys(ranchShelters).flatMap(s=>[1,2,3].map(n=>'ranching/'+s+'-'+n)),...Object.keys(ranchFacilities).map(s=>'ranching/'+s),...Object.keys(ranchProducts).flatMap(s=>['items/'+s,'items/fine_'+s]),...['trough','nest','ledger'].map(s=>'ranching/'+s),'items/animal_feed'];
export const ranchDays=(days:number)=>days<.01?'不足0.01日':Number(days.toFixed(2))+'日';
