import {prepareLaps,lapKey,included,driverStats,formatTime,validTime} from './pace.js';
const $=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors={SOFT:'#ff646b',MEDIUM:'#ffe17b',HARD:'#eef2f8',INTERMEDIATE:'#76d780',WET:'#6cb7ff',UNKNOWN:'#a1adbb'};
const teamColor=d=>/^[0-9a-f]{6}$/i.test(d.team_colour)?`#${d.team_colour}`:'#a1adbb';
const tyre=(compound,age=null)=>`<span class="tyre" style="--tyre:${colors[compound]||colors.UNKNOWN}" title="${escape(compound)}${age===null?'':` · возраст ${age} кр. к началу круга`}"><i>${escape(compound?.[0]||'?')}</i>${age===null?'':age}</span>`;
let sessions=[],data=null,overrides={},selected=new Set(),busy=false;
const status=(message,error=false)=>{$('status').textContent=message;$('status').classList.toggle('error',error);};
const storageKey=()=>`f1stats:selection:v1:${data.session.session_key}`;
function persist(){try{localStorage.setItem(storageKey(),JSON.stringify(overrides));}catch{status('Не удалось сохранить выбор в браузере. Экспортируй его в файл.',true);}}
async function api(endpoint,params){
 const url=`https://api.openf1.org/v1/${endpoint}?${new URLSearchParams(params)}`;
 for(let attempt=0;attempt<3;attempt++){
  const response=await fetch(url,{signal:AbortSignal.timeout(45000)});
  if(response.status===429&&attempt<2){await new Promise(r=>setTimeout(r,2200*(attempt+1)));continue;}
  if(!response.ok)throw new Error(`OpenF1: HTTP ${response.status}. Попробуй позже.`);
  const rows=await response.json();if(!Array.isArray(rows))throw new Error('OpenF1 вернул неожиданный формат данных.');return rows;
 }
}
function lock(value){busy=value;for(const id of ['year','session','load'])$(id).disabled=value;}
async function loadSessions(){
 lock(true);status('Загружаем список гонок…');
 try{sessions=(await api('sessions',{year:$('year').value,session_type:'Race'})).filter(s=>Date.parse(s.date_end)+30*60000<Date.now()).sort((a,b)=>Date.parse(a.date_start)-Date.parse(b.date_start));
 $('session').innerHTML=sessions.length?sessions.map(s=>`<option value="${s.session_key}">${escape(s.country_name)} · ${escape(s.location)} · ${escape(s.session_name)} · ${new Date(s.date_start).toLocaleDateString('ru-RU')}</option>`).join(''):'<option value="">Нет завершённых гонок</option>';
 if(sessions.length)$('session').value=sessions.at(-1).session_key;
 status(sessions.length?'Выбери сессию и загрузи данные для анализа.':'В этом сезоне пока нет доступных завершённых гонок.');
 }catch(e){$('session').innerHTML='<option value="">Не удалось загрузить список</option>';status(e.message,true);}finally{lock(false);}
}
async function loadRace(){
 if(busy||!$('session').value)return;lock(true);$('analysis').hidden=true;
 try{
 const session=sessions.find(s=>String(s.session_key)===$('session').value);const raw={};
 for(const [index,endpoint] of ['drivers','laps','stints','pit','race_control'].entries()){
  status(`Загружаем ${session.location}: ${index+1}/5…`);
  raw[endpoint]=await api(endpoint,{session_key:session.session_key});
  await new Promise(r=>setTimeout(r,450));
 }
 if(!raw.laps.length)throw new Error('В этой сессии пока нет времён кругов.');
 data={session,drivers:raw.drivers,stints:raw.stints,laps:prepareLaps(raw.laps,raw.stints,raw.pit,raw.race_control)};
 overrides={};try{const saved=JSON.parse(localStorage.getItem(storageKey())||'{}');overrides=validateOverrides(saved);}catch{status('Сохранённый выбор прочитать не удалось. Применён автоматический отбор.',true);}
 selected=new Set(data.drivers.map(d=>d.driver_number));
 $('race-title').textContent=`${session.location} · ${session.session_name} ${session.year}`;
 const numbers=[...new Set(data.laps.map(l=>l.stint_number))].filter(n=>n>0).sort((a,b)=>a-b);
 $('stint').innerHTML='<option value="all">Все отрезки</option>'+numbers.map(n=>`<option value="${n}">Отрезок ${n}</option>`).join('');
 $('from').value='';$('to').value='';$('analysis').hidden=false;render();
 if(!$('status').classList.contains('error'))status('Данные загружены. Выбор кругов сохраняется в этом браузере.');
 }catch(e){status(`Загрузка не завершена: ${e.message}`,true);}finally{lock(false);}
}
function validateOverrides(value){if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Неверный формат выбора');const keys=new Set(data.laps.map(lapKey));const out={};for(const [k,v]of Object.entries(value)){if(!keys.has(k)||typeof v!=='boolean')throw new Error('Файл содержит неизвестные круги или неверные значения');out[k]=v;}return out;}
function render(){
 const stats=data.drivers.map(d=>({...d,...driverStats(data.laps.filter(l=>l.driver_number===d.driver_number),overrides)})).sort((a,b)=>(a.pace??Infinity)-(b.pace??Infinity));
 const best=stats.find(d=>d.pace!==null)?.pace;
 $('driver-count').textContent=data.drivers.length;$('lap-count').textContent=stats.reduce((s,d)=>s+d.count,0);$('best-pace').textContent=formatTime(best);$('manual-count').textContent=Object.keys(overrides).length;
 $('summary').innerHTML='<thead><tr><th>Пилот</th><th>Средний темп</th><th>Δ с / круг</th><th>Кругов</th><th>Шинная стратегия</th></tr></thead><tbody>'+stats.map(d=>`<tr><td class="driver-name" style="border-left:3px solid ${teamColor(d)}">${escape(d.name_acronym||d.driver_number)}<span class="team">${escape(d.team_name)}</span></td><td class="${d.pace===best?'best':''}">${formatTime(d.pace)}</td><td class="${d.pace===best?'best':''}">${d.pace===null?'—':d.pace===best?'BEST':`+${(d.pace-best).toFixed(3)}`}</td><td>${d.count} / ${d.total}</td><td>${data.stints.filter(s=>s.driver_number===d.driver_number).sort((a,b)=>a.stint_number-b.stint_number).map(s=>tyre(s.compound)).join(' → ')}</td></tr>`).join('')+'</tbody>';
 $('driver-filters').innerHTML=data.drivers.map(d=>`<button class="driver-toggle" data-driver="${d.driver_number}" style="--team:${teamColor(d)}" aria-pressed="${selected.has(d.driver_number)}">${escape(d.name_acronym||d.driver_number)}</button>`).join('');
 renderMatrix();
 $('stints').innerHTML='<thead><tr><th>Пилот</th><th>Отрезок</th><th>Шины / возраст</th><th>Круги</th><th>Учтено</th><th>Средний темп</th></tr></thead><tbody>'+data.stints.slice().sort((a,b)=>a.driver_number-b.driver_number||a.stint_number-b.stint_number).map(s=>{const d=data.drivers.find(d=>d.driver_number===s.driver_number);const stat=driverStats(data.laps.filter(l=>l.driver_number===s.driver_number&&l.stint_number===s.stint_number),overrides);return `<tr><td>${escape(d?.name_acronym||s.driver_number)}</td><td>${s.stint_number}</td><td>${tyre(s.compound,s.tyre_age_at_start??0)}</td><td>${s.lap_start}–${s.lap_end}</td><td>${stat.count} / ${stat.total}</td><td>${formatTime(stat.pace)}</td></tr>`;}).join('')+'</tbody>';
}
function visibleLaps(){return data.laps.filter(l=>selected.has(l.driver_number)&&($('stint').value==='all'||String(l.stint_number)===$('stint').value));}
function renderMatrix(){
 const drivers=data.drivers.filter(d=>selected.has(d.driver_number));const visible=visibleLaps();const numbers=[...new Set(visible.map(l=>l.lap_number))].sort((a,b)=>a-b);const lookup=new Map(visible.map(l=>[lapKey(l),l]));
 $('laps').innerHTML=`<thead><tr><th>Круг</th>${drivers.map(d=>`<th>${escape(d.name_acronym||d.driver_number)}</th>`).join('')}</tr></thead><tbody>`+numbers.map(n=>`<tr><td>${n}</td>`+drivers.map(d=>{const l=lookup.get(`${d.driver_number}:${n}`);if(!l)return '<td>—</td>';const yes=included(l,overrides),manual=Object.hasOwn(overrides,lapKey(l));const reason=manual?(yes?'ВКЛЮЧЁН ВРУЧНУЮ':'ИСКЛЮЧЁН ВРУЧНУЮ'):(l.reasons.join(' · ')||`ОТРЕЗОК ${l.stint_number||'?'}`);return `<td><button class="lap-button ${yes?'':'excluded'} ${manual?'manual':''}" data-lap="${lapKey(l)}" aria-pressed="${yes}" aria-label="${escape(d.name_acronym)} круг ${n}: ${formatTime(l.lap_duration)}, ${escape(reason)}" title="${escape(reason)}" ${validTime(l)?'':'disabled'}>${formatTime(l.lap_duration)} ${tyre(l.compound,l.tyre_age)}<small>${escape(reason)}</small></button></td>`;}).join('')+'</tr>').join('')+'</tbody>';
 if(!drivers.length)$('laps').innerHTML='<tbody><tr><td>Выбери хотя бы одного пилота выше.</td></tr></tbody>';
}
$('load').onclick=loadRace;$('year').onchange=loadSessions;$('stint').onchange=renderMatrix;
$('driver-filters').onclick=e=>{const b=e.target.closest('[data-driver]');if(!b)return;const n=Number(b.dataset.driver);selected.has(n)?selected.delete(n):selected.add(n);render();};
$('laps').onclick=e=>{const b=e.target.closest('[data-lap]');if(!b||b.disabled)return;const lap=data.laps.find(l=>lapKey(l)===b.dataset.lap);overrides[lapKey(lap)]=!included(lap,overrides);persist();render();};
function range(include){const from=Number($('from').value||1),to=Number($('to').value||Math.max(...data.laps.map(l=>l.lap_number)));if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from){status('Укажи корректный диапазон кругов.',true);return;}for(const l of visibleLaps())if(l.lap_number>=from&&l.lap_number<=to&&validTime(l))overrides[lapKey(l)]=include;persist();render();}
$('exclude-range').onclick=()=>range(false);$('include-range').onclick=()=>range(true);
$('reset').onclick=()=>{if(!confirm('Сбросить все ручные изменения этой гонки?'))return;overrides={};persist();render();};
function download(content,name){const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').onclick=()=>download(JSON.stringify({format:'f1stats-selection-v1',session_key:data.session.session_key,overrides},null,2),`f1stats-${data.session.session_key}.json`);
$('import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2000000)throw new Error('Слишком большой файл');const json=JSON.parse(await file.text());if(json.format!=='f1stats-selection-v1'||json.session_key!==data.session.session_key)throw new Error('Файл относится к другой сессии или имеет неверный формат');const next=validateOverrides(json.overrides);overrides=next;status('Выбор импортирован.');persist();render();}catch(error){status(`Импорт не выполнен: ${error.message}`,true);}finally{e.target.value='';}};
const currentYear=new Date().getFullYear();$('year').innerHTML=Array.from({length:currentYear-2022},(_,i)=>currentYear-i).map(y=>`<option>${y}</option>`).join('');loadSessions();
