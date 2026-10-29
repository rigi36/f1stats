// Deliberately distinct display palette; independent of upstream duplicate colours.
const TEAMS = [
 ['mclaren', '#ff9418'], ['ferrari', '#ff4055'], ['mercedes', '#35dfc5'],
 ['red bull', '#997cff'], ['racing bulls', '#80b7ff'], ['alpine', '#f58ac9'],
 ['aston martin', '#238c69'], ['williams', '#2274eb'], ['haas', '#f1f3f7'],
 ['audi', '#ffcf43'], ['cadillac', '#b3a38a'], ['sauber', '#93db42'],
 ['alphatauri', '#b4cbe2'], ['alfa romeo', '#bb5868']
];
export function teamKey(name='') {
 const s=name.toLowerCase().replace(/[_-]/g,' ');
 if(/racing bulls|rb f1|visa cash|vcarb/.test(s)||s==='rb')return 'racing bulls';
 if(/alpha\s*tauri/.test(s))return 'alphatauri';
 return TEAMS.find(([key])=>s.includes(key))?.[0] || s || 'unknown';
}
export function teamStyles(drivers) {
 const result=new Map(), used=new Set();
 for(const d of drivers){const key=teamKey(d.team_name);if(result.has(key))continue;
  let color=TEAMS.find(([k])=>k===key)?.[1];
  if(!color){let hue=(result.size*137.508)%360;color=`hsl(${hue.toFixed(2)} 75% 68%)`;while(used.has(color)){hue+=17;color=`hsl(${hue.toFixed(2)} 75% 68%)`;}}
  used.add(color);result.set(key,color);
 }
 return result;
}
export function orderedDrivers(drivers,order=[]) {
 const rank=new Map(order.map((n,i)=>[n,i]));
 return drivers.map((d,i)=>({d,i})).sort((a,b)=>(rank.get(a.d.driver_number)??order.length+a.i)-(rank.get(b.d.driver_number)??order.length+b.i)).map(x=>x.d);
}
export function moveDriver(order,number,targetIndex) {
 const next=order.filter(n=>n!==number);next.splice(Math.max(0,Math.min(next.length,targetIndex)),0,number);return next;
}
