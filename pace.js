export const validTime = lap => Number.isFinite(lap.lap_duration) && lap.lap_duration > 0;
export const lapKey = lap => `${lap.driver_number}:${lap.lap_number}`;
export const mean = laps => { const times = laps.filter(validTime).map(x=>x.lap_duration); return times.length ? times.reduce((a,b)=>a+b,0)/times.length : null; };
export function formatTime(seconds) { if (!Number.isFinite(seconds)) return '—'; const ms=Math.round(seconds*1000);return `${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`; }
export function neutralizations(messages) {
 const intervals=[]; let active=null;
 for (const m of [...messages].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date))) {
  const msg=(m.message||'').toUpperCase(); const time=Date.parse(m.date);
  if (!Number.isFinite(time)) continue;
  const start=/VIRTUAL SAFETY CAR DEPLOYED|SAFETY CAR DEPLOYED/.test(msg)||m.flag==='RED';
  const finish=/VIRTUAL SAFETY CAR ENDED|VSC ENDED|SAFETY CAR WITHDRAWN|SAFETY CAR RETURNED|TRACK CLEAR/.test(msg)||(m.flag==='GREEN'&&m.scope==='Track');
  if(start&&!active) active={start:time,startLap:m.lap_number,end:Infinity,endLap:Infinity};
  if(finish&&active){active.end=time;active.endLap=m.lap_number;intervals.push(active);active=null;}
 }
 if(active) intervals.push(active); return intervals;
}
export function prepareLaps(laps,stints,pits,messages) {
 const intervals=neutralizations(messages);
 return laps.map(lap=>{
  const stint=stints.find(s=>s.driver_number===lap.driver_number&&lap.lap_number>=s.lap_start&&lap.lap_number<=s.lap_end);
  const reasons=[];
  if(!validTime(lap)) reasons.push('NO TIME');
  if(lap.lap_number===1) reasons.push('START');
  if(lap.is_pit_out_lap) reasons.push('OUT');
  if(pits.some(p=>p.driver_number===lap.driver_number&&p.lap_number===lap.lap_number)) reasons.push('PIT');
  const start=Date.parse(lap.date_start), end=start+(lap.lap_duration||0)*1000;
  if(intervals.some(n=>Number.isFinite(start)?start<n.end&&end>n.start:lap.lap_number>=n.startLap&&lap.lap_number<=n.endLap)) reasons.push('SC/VSC/RED');
  return {...lap,stint_number:stint?.stint_number??0,compound:stint?.compound??'UNKNOWN',tyre_age:stint ? (stint.tyre_age_at_start??0)+lap.lap_number-stint.lap_start : null,reasons};
 });
}
export function included(lap,overrides={}) { return validTime(lap)&&(overrides[lapKey(lap)]??(lap.reasons.length===0)); }
export function driverStats(laps,overrides={}) { const chosen=laps.filter(l=>included(l,overrides));return {pace:mean(chosen),count:chosen.length,total:laps.length}; }
