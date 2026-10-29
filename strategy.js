import {TYRE_COLORS} from './chart.js';
export function finishOrder(drivers,results=[]){
 const ranks=new Map(results.filter(r=>Number.isFinite(r.position)&&r.position>0).map(r=>[r.driver_number,r.position]));
 const records=new Map(results.map(r=>[r.driver_number,r]));
 return [...drivers].sort((a,b)=>{
  const rank=(ranks.get(a.driver_number)??Infinity)-(ranks.get(b.driver_number)??Infinity);if(rank)return rank;
  const ra=records.get(a.driver_number),rb=records.get(b.driver_number);
  return (rb?.number_of_laps??-1)-(ra?.number_of_laps??-1)||(ra?.duration??Infinity)-(rb?.duration??Infinity)||a.driver_number-b.driver_number;
 });
}
export function strategyRows(drivers,stints){return drivers.map(driver=>({driver,stints:stints.filter(s=>s.driver_number===driver.driver_number).sort((a,b)=>a.lap_start-b.lap_start)}));}
export function strategyLabels(stints,x,measure){
 let previous=-Infinity;
 return stints.map(s=>{const label=String(s.lap_end),width=measure(label)+10,anchor=x(s.lap_end),center=Math.max(anchor,previous+4+width/2);previous=center+width/2;return {label,width,anchor,center};});
}
export function drawStrategy(canvas,{drivers,stints,title,source='OpenF1'}){
 const rows=strategyRows(drivers,stints),W=1600,H=Math.max(760,160+Math.max(1,rows.length)*40);
 canvas.width=W;canvas.height=H;canvas.style.aspectRatio=`${W}/${H}`;const ctx=canvas.getContext('2d');ctx.fillStyle='#10141c';ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#edf1f7';ctx.font='bold 28px system-ui';ctx.textAlign='left';ctx.fillText(`${title} · Шинные стратегии`,100,47);
 const left=105,top=95,width=1240,last=Math.max(1,...stints.map(s=>s.lap_end||0)),bottom=top+(rows.length-1)*40,x=n=>left+n/last*width;
 const step=last>40?10:5;ctx.font='17px monospace';
 for(let n=0;n<=last;n++){const major=n%step===0;ctx.strokeStyle=major?'#394455':'#222c3b';ctx.lineWidth=major?1.5:1;ctx.setLineDash(major?[]:[2,5]);ctx.beginPath();ctx.moveTo(x(n),top-19);ctx.lineTo(x(n),bottom+22);ctx.stroke();if(major){ctx.textAlign='center';ctx.fillStyle='#a8b5c6';ctx.fillText(n,x(n),bottom+52);}}
 ctx.setLineDash([]);
 rows.forEach((row,i)=>{const y=top+i*40;ctx.textAlign='right';ctx.font='bold 20px monospace';ctx.fillStyle='#e9edf5';ctx.fillText(row.driver.name_acronym||row.driver.driver_number,left-18,y+6);
  if(!row.stints.length){ctx.textAlign='left';ctx.fillStyle='#8794a8';ctx.font='14px system-ui';ctx.fillText('нет данных',left+8,y+5);}
  row.stints.forEach((s,j)=>{const c=TYRE_COLORS[s.compound]||TYRE_COLORS.UNKNOWN,used=Number.isFinite(s.tyre_age_at_start)&&s.tyre_age_at_start>0,unknown=!Number.isFinite(s.tyre_age_at_start);ctx.strokeStyle=c;ctx.lineWidth=10;ctx.setLineDash(unknown?[2,5]:used?[4,5]:[]);ctx.beginPath();ctx.moveTo(x(s.lap_start-1),y);ctx.lineTo(x(s.lap_end),y);ctx.stroke();ctx.setLineDash([]);
  });
  ctx.font='bold 18px monospace';
  strategyLabels(row.stints,x,label=>ctx.measureText(label).width).forEach(({label,width:bw,anchor,center})=>{
   if(center!==anchor){ctx.strokeStyle='#a8b5c6';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(anchor,y-7);ctx.lineTo(anchor,y-17);ctx.lineTo(center,y-17);ctx.stroke();}
   ctx.fillStyle='#10141c';ctx.fillRect(center-bw/2,y-13,bw,24);ctx.textAlign='center';ctx.fillStyle='#edf1f7';ctx.fillText(label,center,y+6);
  });
 });
 const lx=1390;ctx.textAlign='left';ctx.font='15px system-ui';Object.entries(TYRE_COLORS).filter(([k])=>k!=='UNKNOWN').forEach(([name,color],i)=>{const y=110+i*66;ctx.strokeStyle=color;ctx.lineWidth=9;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(lx,y);ctx.lineTo(lx+135,y);ctx.stroke();ctx.fillStyle='#d4dce7';ctx.fillText(name,lx,y+27);});
 [['Новый',[]],['Прикатанный',[4,5]],['Возраст неизвестен',[2,5]]].forEach(([label,dash],i)=>{const y=480+i*62;if(y+28>H-30)return;ctx.strokeStyle='#d4dce7';ctx.lineWidth=9;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(lx,y);ctx.lineTo(lx+135,y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#a8b5c6';ctx.fillText(label,lx,y+26);});
 ctx.textAlign='center';ctx.fillStyle='#a8b5c6';ctx.font='18px system-ui';ctx.fillText('Круг',left+width/2,bottom+83);ctx.textAlign='right';ctx.font='13px system-ui';ctx.fillStyle='#6f7f95';ctx.fillText(stints.some(s=>s.data_note)?'F1 STATS · OpenF1 · STR: первый пит — 15 (коррекция по Honda)':'F1 STATS · '+source,W-35,H-16);
}
