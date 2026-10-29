export function parseLapSelection(text,maxLap) {
 const tokens=text.trim().replace(/[–—]/g,'-').split(/[\s,;]+/).filter(Boolean),numbers=new Set();
 if(!tokens.length)throw new Error('Укажи круги: например 2, 50–53.');
 for(const token of tokens){const match=/^(\d+)(?:-(\d+))?$/.exec(token);if(!match)throw new Error(`Неверная запись: ${token}`);const start=Number(match[1]),end=Number(match[2]||match[1]);if(start<1||end<start||end>maxLap)throw new Error(`Круги должны быть в диапазоне 1–${maxLap}.`);for(let n=start;n<=end;n++)numbers.add(n);}
 return numbers;
}
export function hitPoints(points,x,y,radius=20){return points.map(p=>({...p,distance:Math.hypot(p.x-x,p.y-y)})).filter(p=>p.distance<=radius).sort((a,b)=>a.distance-b.distance);}
