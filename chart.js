import {included,formatTime,mean} from './pace.js';
import {teamKey} from './presentation.js';
export function chartSeries(drivers,laps,overrides,{from=1,to=Infinity}={}) {
 return drivers.map(driver=>({driver,laps:laps.filter(l=>l.driver_number===driver.driver_number&&l.lap_number>=from&&l.lap_number<=to&&included(l,overrides)).sort((a,b)=>a.lap_number-b.lap_number)}));
}
export function drawChart(canvas,{drivers,laps,overrides,palette,title,mode='laps',from=1,to=Infinity,stint='all'}) {
 const ctx=canvas.getContext('2d');const W=1600,H=940;canvas.width=W;canvas.height=H;
 ctx.fillStyle='#10141c';ctx.fillRect(0,0,W,H);
 const series=chartSeries(drivers,laps,overrides,{from,to});
 ctx.fillStyle='#f0f3f8';ctx.font='bold 29px system-ui';ctx.fillText(title,92,53);
 ctx.font='18px system-ui';ctx.fillStyle='#9ba9ba';
 const actual=series.flatMap(s=>s.laps);const bounds=actual.length?`${Math.min(...actual.map(l=>l.lap_number))}–${Math.max(...actual.map(l=>l.lap_number))}`:'—';
 ctx.fillText(`${mode==='laps'?'Время круга':'Средний темп'} · круги ${bounds}${stint==='all'?'':` · отрезок ${stint}`} · учтённые круги`,92,86);
 const x0=110,y0=130,w=1430,h=620;
 const color=d=>palette.get(teamKey(d.team_name));
 const teammateIndex=d=>drivers.filter(x=>teamKey(x.team_name)===teamKey(d.team_name)).findIndex(x=>x.driver_number===d.driver_number);
 if(!actual.length){ctx.fillStyle='#9ba9ba';ctx.font='24px system-ui';ctx.fillText('Нет выбранных кругов',x0,y0+150);return {series,hasData:false};}
 const values=mode==='laps'?actual.map(l=>l.lap_duration):series.filter(s=>s.laps.length).map(s=>mean(s.laps));
 const low=Math.min(...values),high=Math.max(...values),pad=Math.max((high-low)*.12,.3),min=low-pad,max=high+pad;
 const y=t=>y0+h-(t-min)/(max-min)*h;
 ctx.font='17px monospace';ctx.textAlign='right';ctx.lineWidth=1;
 for(let i=0;i<=6;i++){const t=min+(max-min)*i/6,yy=y(t);ctx.strokeStyle='#293343';ctx.beginPath();ctx.moveTo(x0,yy);ctx.lineTo(x0+w,yy);ctx.stroke();ctx.fillStyle='#a4b1c2';ctx.fillText(formatTime(t),x0-14,yy+5);}
 ctx.textAlign='left';ctx.font='16px system-ui';ctx.fillText('Время, мин:с',x0,116);
 const points=[];
 if(mode==='laps'){
  const first=Math.min(...actual.map(l=>l.lap_number)),last=Math.max(...actual.map(l=>l.lap_number));const x=n=>x0+(n-first)/Math.max(1,last-first)*w;
  const step=Math.max(1,Math.ceil((last-first)/14));ctx.textAlign='center';ctx.font='17px monospace';
  for(let n=first;n<=last;n+=step){ctx.fillStyle='#a4b1c2';ctx.fillText(String(n),x(n),y0+h+30);}
  ctx.fillText('Круг',x0+w/2,y0+h+60);
  for(const s of series){const dash=teammateIndex(s.driver)%2?[10,7]:[];ctx.strokeStyle=color(s.driver);ctx.fillStyle=color(s.driver);ctx.lineWidth=2.8;ctx.setLineDash(dash);ctx.beginPath();let prev=null;
   for(const l of s.laps){const px=x(l.lap_number),py=y(l.lap_duration);if(!prev||l.lap_number!==prev.lap_number+1||l.stint_number!==prev.stint_number)ctx.moveTo(px,py);else ctx.lineTo(px,py);prev=l;points.push({x:px,y:py,driver:s.driver,lap:l});}ctx.stroke();ctx.setLineDash([]);
   for(const p of points.filter(p=>p.driver===s.driver)){ctx.beginPath();ctx.arc(p.x,p.y,3,0,2*Math.PI);ctx.fill();}
  }
 }else{
  const shown=series.filter(s=>s.laps.length),best=Math.min(...shown.map(s=>mean(s.laps)));const slot=w/shown.length;
  shown.forEach((s,i)=>{const avg=mean(s.laps),xx=x0+i*slot+slot*.15,bw=slot*.7;ctx.fillStyle=color(s.driver);ctx.globalAlpha=.85;ctx.fillRect(xx,y(avg),bw,y0+h-y(avg));ctx.globalAlpha=1;
   ctx.fillStyle='#e9edf5';ctx.textAlign='center';ctx.font='bold 16px monospace';ctx.fillText(s.driver.name_acronym||s.driver.driver_number,xx+bw/2,y0+h+28);
   ctx.save();ctx.translate(xx+bw/2,y(avg)-12);if(slot<100)ctx.rotate(-Math.PI/3);ctx.font='15px monospace';ctx.fillText(`${formatTime(avg)} · ${avg===best?'BEST':`+${(avg-best).toFixed(3)}`}`,0,0);ctx.restore();
  });
 }
 ctx.textAlign='left';const legendY=842;
 series.forEach((s,i)=>{const col=i%10,row=Math.floor(i/10),xx=92+col*148,yy=legendY+row*29;ctx.strokeStyle=color(s.driver);ctx.lineWidth=3;ctx.setLineDash(teammateIndex(s.driver)%2?[8,5]:[]);ctx.beginPath();ctx.moveTo(xx,yy-5);ctx.lineTo(xx+25,yy-5);ctx.stroke();ctx.setLineDash([]);ctx.font='15px monospace';ctx.fillStyle=color(s.driver);ctx.fillText(`${s.driver.name_acronym||s.driver.driver_number} (${s.laps.length})`,xx+33,yy);});
 ctx.fillStyle='#657489';ctx.font='14px system-ui';ctx.fillText('F1 STATS · OpenF1',W-238,H-21);
 return {series,points,hasData:true};
}
