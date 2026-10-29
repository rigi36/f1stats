// OpenF1 Austin 2026: pit-lane start was incorrectly treated as a tyre change.
// Verified against Honda's race report and OpenF1 pit stops on laps 15 and 41.
export const STROLL_SOURCE='https://honda.racing/f1/post/f1-2026-rd18-race';
export function correctStints(sessionKey,stints,pits){
 const rows=stints.map(s=>({...s}));
 if(Number(sessionKey)!==11396)return rows;
 const driver=rows.filter(s=>s.driver_number===18).sort((a,b)=>a.stint_number-b.stint_number);
 const stops=pits.filter(p=>p.driver_number===18).map(p=>p.lap_number).sort((a,b)=>a-b);
 if(driver.length===3&&driver[0].compound==='MEDIUM'&&driver[0].lap_start===1&&driver[0].lap_end===1&&driver[1].compound==='SOFT'&&driver[1].lap_start===2&&driver[1].lap_end===41&&stops.length===2&&stops[0]===15&&stops[1]===41){
  driver[0].lap_end=15;driver[1].lap_start=16;
  for(const s of driver.slice(0,2))s.data_note='STR: граница первого пита исправлена с 1 на 15 круг (Honda / OpenF1 pit).';
 }
 return rows;
}
