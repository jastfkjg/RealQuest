/** One wallet, integer silver units. `gold` remains the stable wire/save ID. */
export const SILVER_PER_GOLD = 100;
export function formatMoney(silver:number):string {
 const value=Number.isFinite(silver)?Math.max(0,Math.trunc(silver)):0;
 const gold=Math.floor(value/SILVER_PER_GOLD),rest=value%SILVER_PER_GOLD;
 const whole=gold.toLocaleString('zh-CN');
 return gold ? whole+'金'+(rest?' '+rest+'银':'') : rest+'银';
}
export const moneyName='钱币';
