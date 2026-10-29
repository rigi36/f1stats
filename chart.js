import {included,formatTime,mean} from './pace.js';
import {teamKey} from './presentation.js';
export const TYRE_COLORS={SOFT:'#ff646b',MEDIUM:'#ffe17b',HARD:'#eef2f8',INTERMEDIATE:'#76d780',WET:'#6cb7ff',UNKNOWN:'#a1adbb'};
export function tyreContext(drivers,stints,pits,{from=1,to=Infinity,stint='all'}={}) {
 return drivers.map(driver=>({driver,
  stints:stints.filter(s=>s.driver_number===driver.driver_number&&(stint==='all'||String(s.stint_number)===String(stint))&&s.lap_end>=from&&s.lap_start<=to)
   .sort((a,b)=>a.lap_start-b.lap_start).map(s=>({...s,start:Math.max(from,s.lap_start),end:Math.min(to,s.lap_end)})),
  pits:pits.filter(p=>p.driver_number===driver.driver_number&&p.lap_number>=from&&p.lap_number<=to&&(stint==='all'||stints.some(s=>s.driver_number===driver.driver_number&&String(s.stint_number)===String(stint)&&p.lap_number>=s.lap_start&&p.lap_number<=s.lap_end))).sort((a,b)=>a.lap_number-b.lap_number)
 }));
}
function tyreBadge(ctx,compound,x,y,r=10){const c=TYRE_COLORS[compound]||TYRE_COLORS.UNKNOWN;ctx.strokeStyle=c;ctx.fillStyle='#10141c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=c;ctx.font=`bold ${r+3}px monospace`;ctx.textAlign='center';ctx.fillText(compound?.[0]||'?',x,y+4);}
export function chartSeries(drivers,laps,overrides,{from=1,to=Infinity}={}) {
 return drivers.map(driver=>({driver,laps:laps.filter(l=>l.driver_number===driver.driver_number&&l.lap_number>=from&&l.lap_number<=to&&included(l,overrides)).sort((a,b)=>a.lap_number-b.lap_number)}));
}
export function drawChart(canvas,{drivers,laps,overrides,palette,title,mode='laps',from=1,to=Infinity,stint='all',stints=[],pits=[],showTyres=true}) {
 const badgePerLine=Math.max(1,Math.floor((1430/Math.max(1,drivers.length)-8)/30));
 const badgeRows=Math.max(0,...tyreContext(drivers,stints,pits,{from,to,stint}).map(r=>Math.ceil(r.stints.length/badgePerLine)));
 const averageLegendY=Math.max(842,806+badgeRows*27+25);
 const ctx=canvas.getContext('2d');const W=1600,H=mode==='laps'&&showTyres?Math.max(940,1000+drivers.length*49):mode==='average'&&showTyres?Math.max(940,averageLegendY+Math.ceil(drivers.length/10)*29+50):940;canvas.width=W;canvas.height=H;canvas.style.aspectRatio=`${W}/${H}`;
 ctx.fillStyle='#10141c';ctx.fillRect(0,0,W,H);
 const series=chartSeries(drivers,laps,overrides,{from,to});
 const contextLaps=laps.filter(l=>drivers.some(d=>d.driver_number===l.driver_number)&&l.lap_number>=from&&l.lap_number<=to);
 const first=contextLaps.length?Math.min(...contextLaps.map(l=>l.lap_number)):from,last=contextLaps.length?Math.max(...contextLaps.map(l=>l.lap_number)):from;
 ctx.fillStyle='#f0f3f8';ctx.font='bold 29px system-ui';ctx.fillText(title,92,53);
 ctx.font='18px system-ui';ctx.fillStyle='#9ba9ba';
 const actual=series.flatMap(s=>s.laps);const bounds=contextLaps.length?`${first}–${last}`:'—';
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
 const tyreRows=tyreContext(drivers,stints,pits,{from:first,to:last,stint});
 if(mode==='laps'){
  const x=n=>x0+(n-(first-.5))/Math.max(1,last-first+1)*w;
  const step=Math.max(1,Math.ceil((last-first)/14));ctx.textAlign='center';ctx.font='17px monospace';
  for(let n=first;n<=last;n+=step){ctx.fillStyle='#a4b1c2';ctx.fillText(String(n),x(n),y0+h+30);}
  ctx.fillText('Круг',x0+w/2,y0+h+60);
  for(const s of series){const dash=teammateIndex(s.driver)%2?[10,7]:[];ctx.strokeStyle=color(s.driver);ctx.fillStyle=color(s.driver);ctx.lineWidth=2.8;ctx.setLineDash(dash);ctx.beginPath();let prev=null;
   for(const l of s.laps){const px=x(l.lap_number),py=y(l.lap_duration);if(!prev||l.lap_number!==prev.lap_number+1||l.stint_number!==prev.stint_number)ctx.moveTo(px,py);else ctx.lineTo(px,py);prev=l;points.push({x:px,y:py,driver:s.driver,lap:l});}ctx.stroke();ctx.setLineDash([]);
   for(const p of points.filter(p=>p.driver===s.driver)){ctx.beginPath();ctx.arc(p.x,p.y,3,0,2*Math.PI);ctx.fill();}
  }
  if(showTyres){
   ctx.textAlign='left';ctx.font='17px system-ui';ctx.fillStyle='#9ba9ba';ctx.fillText('ШИНЫ · фактические отрезки, включая исключённые круги',x0,923);
   const laneX=n=>x0+(n-(first-.5))/Math.max(1,last-first+1)*w;
   tyreRows.forEach((row,i)=>{const yy=958+i*49;
    ctx.textAlign='right';ctx.font='bold 16px monospace';ctx.fillStyle=color(row.driver);ctx.fillText(row.driver.name_acronym||row.driver.driver_number,x0-16,yy+15);
    ctx.fillStyle='#1c2431';ctx.fillRect(x0,yy,w,23);
    if(!row.stints.length){ctx.textAlign='left';ctx.font='13px monospace';ctx.fillStyle='#8d9caf';ctx.fillText('нет данных о шинах',x0+8,yy+16);}
    for(const s of row.stints){const left=laneX(s.start-.5),right=laneX(s.end+.5),width=right-left,c=TYRE_COLORS[s.compound]||TYRE_COLORS.UNKNOWN;ctx.fillStyle=c;ctx.globalAlpha=.28;ctx.fillRect(left,yy,width,23);ctx.globalAlpha=1;ctx.strokeStyle=c;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(left,yy+22);ctx.lineTo(right,yy+22);ctx.stroke();
     const label=width>130?`${s.compound?.[0]||'?'} · ${s.start}–${s.end}`:s.compound?.[0]||'?';ctx.fillStyle=c;ctx.font='bold 13px monospace';ctx.textAlign='center';if(width>15)ctx.fillText(label,(left+right)/2,yy+16);
    }
    for(const p of row.pits){const px=laneX(p.lap_number+.5),label=`PIT ${p.lap_number}`,labelX=Math.min(x0+w-27,Math.max(x0+27,px));ctx.fillStyle='#edf1f7';ctx.beginPath();ctx.moveTo(px,yy-1);ctx.lineTo(px-4,yy-7);ctx.lineTo(px+4,yy-7);ctx.closePath();ctx.fill();ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.fillText(label,labelX,yy-10);}
   });
  }
 }else{
  const shown=series.filter(s=>s.laps.length),best=Math.min(...shown.map(s=>mean(s.laps)));const slot=w/shown.length;
  shown.forEach((s,i)=>{const avg=mean(s.laps),xx=x0+i*slot+slot*.15,bw=slot*.7;ctx.fillStyle=color(s.driver);ctx.globalAlpha=.85;ctx.fillRect(xx,y(avg),bw,y0+h-y(avg));ctx.globalAlpha=1;
   ctx.fillStyle='#e9edf5';ctx.textAlign='center';ctx.font='bold 16px monospace';ctx.fillText(s.driver.name_acronym||s.driver.driver_number,xx+bw/2,y0+h+28);
   ctx.save();ctx.translate(xx+bw/2,y(avg)-12);if(slot<100)ctx.rotate(-Math.PI/3);ctx.font='15px monospace';ctx.fillText(`${formatTime(avg)} · ${avg===best?'BEST':`+${(avg-best).toFixed(3)}`}`,0,0);ctx.restore();
   if(showTyres){const row=tyreRows.find(r=>r.driver.driver_number===s.driver.driver_number),items=row?.stints||[];const perLine=Math.max(1,Math.floor((slot-8)/30));items.forEach((st,j)=>{const group=Math.floor(j/perLine),start=group*perLine,count=Math.min(perLine,items.length-start);tyreBadge(ctx,st.compound,xx+bw/2+(j%perLine-(count-1)/2)*30,y0+h+56+group*27,9);});}
  });
 }
 ctx.textAlign='left';const legendY=mode==='average'&&showTyres?averageLegendY:842;
 series.forEach((s,i)=>{const col=i%10,row=Math.floor(i/10),xx=92+col*148,yy=legendY+row*29;ctx.strokeStyle=color(s.driver);ctx.lineWidth=3;ctx.setLineDash(teammateIndex(s.driver)%2?[8,5]:[]);ctx.beginPath();ctx.moveTo(xx,yy-5);ctx.lineTo(xx+25,yy-5);ctx.stroke();ctx.setLineDash([]);ctx.font='15px monospace';ctx.fillStyle=color(s.driver);ctx.fillText(`${s.driver.name_acronym||s.driver.driver_number} (${s.laps.length})`,xx+33,yy);});
 ctx.fillStyle='#657489';ctx.font='14px system-ui';ctx.fillText('F1 STATS · OpenF1',W-238,H-21);
 return {series,points,hasData:true};
}
