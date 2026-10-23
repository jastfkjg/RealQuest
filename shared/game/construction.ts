import type {GameState,WorldObject} from './protocol';
export interface Chest {recipe:string;name:string;x:number;y:number;items:Record<string,number>;version:number}
export interface ConstructionState {blueprints:string[];chests:Record<string,Chest>;next_id:number;job:null|{building:string;name:string;level:number;ready_tick:number;costs:Record<string,number>};completed:NonNullable<ConstructionState['job']>[]}
export interface ConstructionView {recipes:Record<string,{name:string;level:number;slots:number;costs:Record<string,number>}>;projects:Record<string,{name:string;level:number;max_level:number;costs:Record<string,number>;days:number}>;remaining_days:number;cells:{x:number;y:number;reason:string}[]}
export function chestObjects(s:GameState):WorldObject[]{return Object.entries(s.construction?.chests||{}).map(([id,c])=>({id,kind:'storage',name:c.name,x:c.x,y:c.y,hitbox:[c.x-20,c.y-20,40,28]}));}
export const carpenter:WorldObject={id:'carpenter',kind:'carpenter',name:'阿榆 · 木匠',x:96,y:288};
export function chestArt(id:string){return id==='reinforced_chest'?'interiors/chest-open':'interiors/chest-closed';}
