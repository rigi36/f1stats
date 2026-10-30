export const sourceLabel=source=>source==='fastf1'?'FastF1':'OpenF1';
export const selectionKey=(source,key)=>source==='fastf1'?`f1stats:selection:fastf1:v1:${key}`:`f1stats:selection:v1:${key}`;
export function validateFastF1(value,key){
 if(value?.format!=='f1stats-fastf1-v1'||value.source!=='fastf1'||value.session?.session_key!==key)throw new Error('Неверный файл FastF1.');
 if(!/^ff1-[0-9]{4}-[0-9]+-[RS]$/.test(key)||!Number.isInteger(value.session.year)||value.session.year<2018||typeof value.session.location!=='string'||!['Race','Sprint'].includes(value.session.session_name))throw new Error('Неверное описание сессии FastF1.');
 for(const name of ['drivers','laps','stints','pits','results'])if(!Array.isArray(value[name]))throw new Error('Неполные данные FastF1.');
 if(!value.laps.length||!value.drivers.length)throw new Error('FastF1: нет данных гонки.');
 const drivers=new Set(value.drivers.map(d=>d.driver_number));const keys=new Set();
 for(const l of value.laps){const k=`${l.driver_number}:${l.lap_number}`;if(!drivers.has(l.driver_number)||!Number.isInteger(l.lap_number)||l.lap_number<1||keys.has(k)||!Array.isArray(l.reasons)||l.reasons.some(r=>typeof r!=='string')||(l.lap_duration!==null&&(!Number.isFinite(l.lap_duration)||l.lap_duration<=0)))throw new Error('Некорректные круги FastF1.');keys.add(k);}
 return value;
}
