import {prepareLaps,lapKey,included,driverStats,formatTime,validTime,mean} from './pace.js';
import {teamKey,teamStyles,orderedDrivers,moveDriver} from './presentation.js';
import {drawChart} from './chart.js';
import {drawStrategy,finishOrder} from './strategy.js';
import {correctStints,STROLL_SOURCE} from './data-corrections.js';
import {parseLapSelection,hitPoints} from './chart-edit.js';
import {reasonOptions,validateReasons} from './exclusion-reasons.js';
const $=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors={SOFT:'#ff646b',MEDIUM:'#ffe17b',HARD:'#eef2f8',INTERMEDIATE:'#76d780',WET:'#6cb7ff',UNKNOWN:'#a1adbb'};
let palette=new Map(),order=[];
const teamColor=d=>palette.get(teamKey(d.team_name))||'#a1adbb';
const driversInOrder=()=>orderedDrivers(data.drivers,order);
const tyre=(compound,age=null)=>`<span class="tyre" style="--tyre:${colors[compound]||colors.UNKNOWN}" title="${escape(compound)}${age===null?'':` · возраст ${age} кр. к началу круга`}"><i>${escape(compound?.[0]||'?')}</i>${age===null?'':age}</span>`;
let sessions=[],data=null,overrides={},manualReasons={},selected=new Set(),chartSelected=new Set(),busy=false;
const status=(message,error=false)=>{$('status').textContent=message;$('status').classList.toggle('error',error);};
const storageKey=()=>`f1stats:selection:v1:${data.session.session_key}`;
function persist(){try{localStorage.setItem(storageKey(),JSON.stringify(overrides));localStorage.setItem(storageKey()+':reasons',JSON.stringify(manualReasons));}catch{status('Не удалось сохранить выбор в браузере. Экспортируй его в файл.',true);}}
function persistView(){try{localStorage.setItem(`f1stats:view:v1:${data.session.session_key}`,JSON.stringify({order,selected:[...selected],chartSelected:[...chartSelected]}));}catch{status('Порядок пилотов не сохранён: хранилище недоступно.',true);}}
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
 status(sessions.length?'':'Нет завершённых гонок.');
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
 try{status('Загружаем итоговую классификацию…');raw.results=await api('session_result',{session_key:session.session_key});}catch{raw.results=[];}
 $('pace-audit').hidden=true;chartUndo.length=0;$('chart-undo').disabled=true;$('chart-picked').hidden=true;
 raw.stints=correctStints(session.session_key,raw.stints,raw.pit);
 data={session,drivers:raw.drivers,results:raw.results,stints:raw.stints,pits:raw.pit,laps:prepareLaps(raw.laps,raw.stints,raw.pit,raw.race_control)};
 $('strategy-note').innerHTML=raw.stints.some(s=>s.data_note)?`STR: исправлена граница первого отрезка — 15-й круг. <a href="${STROLL_SOURCE}" target="_blank" rel="noopener">Источник: Honda</a>. Возраст комплектов — по OpenF1.`:'';
 overrides={};try{const saved=JSON.parse(localStorage.getItem(storageKey())||'{}');overrides=validateOverrides(saved);}catch{status('Сохранённый выбор прочитать не удалось. Применён автоматический отбор.',true);}
 manualReasons={};try{manualReasons=validateReasons(JSON.parse(localStorage.getItem(storageKey()+':reasons')||'{}'),overrides);}catch{}
 selected=new Set(data.drivers.map(d=>d.driver_number));
 order=data.drivers.map(d=>d.driver_number);palette=teamStyles(data.drivers);chartSelected=new Set(order);
 try{const view=JSON.parse(localStorage.getItem(`f1stats:view:v1:${session.session_key}`)||'null');const valid=new Set(order);if(view&&Array.isArray(view.order)&&Array.isArray(view.selected)){order=[...new Set(view.order.filter(n=>valid.has(n)))];order.push(...data.drivers.map(d=>d.driver_number).filter(n=>!order.includes(n)));selected=new Set(view.selected.filter(n=>valid.has(n)));if(Array.isArray(view.chartSelected))chartSelected=new Set(view.chartSelected.filter(n=>valid.has(n)));}}catch{}
 $('race-title').textContent=`${session.location} · ${session.session_name} ${session.year}`;
 const numbers=[...new Set(data.laps.map(l=>l.stint_number))].filter(n=>n>0).sort((a,b)=>a-b);
 $('stint').innerHTML='<option value="all">Все отрезки</option>'+numbers.map(n=>`<option value="${n}">Отрезок ${n}</option>`).join('');
 $('chart-stint').innerHTML=$('stint').innerHTML;
 $('from').value='';$('to').value='';$('chart-from').value='';$('chart-to').value='';$('analysis').hidden=false;render();
 if(!$('status').classList.contains('error'))status('');
 }catch(e){status(`Загрузка не завершена: ${e.message}`,true);}finally{lock(false);}
}
function validateOverrides(value){if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Неверный формат выбора');const keys=new Set(data.laps.map(lapKey));const out={};for(const [k,v]of Object.entries(value)){if(!keys.has(k)||typeof v!=='boolean')throw new Error('Файл содержит неизвестные круги или неверные значения');out[k]=v;}return out;}
function render(){
 const stats=data.drivers.map(d=>{const rows=data.laps.filter(l=>l.driver_number===d.driver_number),baseline=driverStats(rows),manualRemoved=rows.filter(l=>included(l)&&!included(l,overrides)).length,manualAdded=rows.filter(l=>!included(l)&&included(l,overrides)).length;return {...d,...driverStats(rows,overrides),baseline,manualRemoved,manualAdded};}).sort((a,b)=>(a.pace??Infinity)-(b.pace??Infinity));
 const best=stats.find(d=>d.pace!==null)?.pace;
 $('summary').innerHTML='<thead><tr><th>Пилот</th><th>Средний темп</th><th>Δ с / круг</th><th>Кругов</th><th>Шинная стратегия</th></tr></thead><tbody>'+stats.map(d=>`<tr><td class="driver-name" style="--team:${teamColor(d)};border-left:3px solid var(--team);color:var(--team);background:color-mix(in srgb,var(--team) 9%,transparent)">${escape(d.name_acronym||d.driver_number)}<span class="team">${escape(d.team_name)}</span></td><td class="${d.pace===best?'best':''}">${formatTime(d.pace)}</td><td class="${d.pace===best?'best':''}">${d.pace===null?'—':d.pace===best?'BEST':`+${(d.pace-best).toFixed(3)}`}</td><td><button class="audit-count" data-audit-driver="${d.driver_number}">${d.count} / ${d.total}${d.manualRemoved||d.manualAdded?`<small>${d.manualRemoved?`−${d.manualRemoved}`:''} ${d.manualAdded?`+${d.manualAdded}`:''} вручную</small>`:''}</button></td><td>${data.stints.filter(s=>s.driver_number===d.driver_number).sort((a,b)=>a.stint_number-b.stint_number).map(s=>tyre(s.compound)).join(' → ')}</td></tr>`).join('')+'</tbody>';
 renderMatrix();
 drawStrategy($('strategy-chart'),{drivers:finishOrder(data.drivers,data.results),stints:data.stints,title:$('race-title').textContent+(data.results.length?'':' · классификация недоступна')});
 $('stints').innerHTML='<thead><tr><th>Пилот</th><th>Отрезок</th><th>Шины / возраст</th><th>Круги</th><th>Учтено</th><th>Средний темп</th></tr></thead><tbody>'+data.stints.slice().sort((a,b)=>a.driver_number-b.driver_number||a.stint_number-b.stint_number).map(s=>{const d=data.drivers.find(d=>d.driver_number===s.driver_number);const stat=driverStats(data.laps.filter(l=>l.driver_number===s.driver_number&&l.stint_number===s.stint_number),overrides);return `<tr><td style="color:${d?teamColor(d):'#a1adbb'}">${escape(d?.name_acronym||s.driver_number)}</td><td>${s.stint_number}</td><td>${tyre(s.compound,s.tyre_age_at_start??0)}</td><td>${s.lap_start}–${s.lap_end}</td><td>${stat.count} / ${stat.total}</td><td>${formatTime(stat.pace)}</td></tr>`;}).join('')+'</tbody>';
}
$('summary').onclick=e=>{const button=e.target.closest('[data-audit-driver]');if(!button)return;const number=Number(button.dataset.auditDriver),driver=data.drivers.find(d=>d.driver_number===number),rows=data.laps.filter(l=>l.driver_number===number),base=driverStats(rows),current=driverStats(rows,overrides),removed=rows.filter(l=>included(l)&&!included(l,overrides)).map(l=>l.lap_number),added=rows.filter(l=>!included(l)&&included(l,overrides)).map(l=>l.lap_number);
 $('pace-audit').hidden=false;$('pace-audit').innerHTML=`<strong>${escape(driver?.name_acronym)} · отбор кругов</strong><button id="close-audit" class="secondary">Закрыть</button><p>Автоматический отбор: ${base.count} кругов · ${formatTime(base.pace)}. С ручными правками: ${current.count} кругов · ${formatTime(current.pace)}.</p><p>Убраны вручную: ${removed.join(', ')||'—'}. Возвращены вручную: ${added.join(', ')||'—'}.</p>`;$('close-audit').onclick=()=>{$('pace-audit').hidden=true;};};
async function exportStrategy(copy){try{const blob=new Promise((resolve,reject)=>$('strategy-chart').toBlob(b=>b?resolve(b):reject(new Error('PNG не создан')),'image/png'));if(copy){if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw new Error('Копирование недоступно. Скачай PNG.');await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);$('strategy-status').textContent='PNG в буфере обмена.';}else{const url=URL.createObjectURL(await blob),a=document.createElement('a');a.href=url;a.download=`f1stats-${data.session.session_key}-tyres.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('strategy-status').textContent='PNG скачан.';}}catch(e){$('strategy-status').textContent=e.message;}}
$('strategy-copy').onclick=()=>exportStrategy(true);$('strategy-download').onclick=()=>exportStrategy(false);
function visibleLaps(){return data.laps.filter(l=>selected.has(l.driver_number)&&($('stint').value==='all'||String(l.stint_number)===$('stint').value));}
function renderMatrix(){
 const drivers=driversInOrder();const visible=visibleLaps();const numbers=[...new Set(visible.map(l=>l.lap_number))].sort((a,b)=>a-b);const lookup=new Map(visible.map(l=>[lapKey(l),l]));
 $('laps').innerHTML=`<thead><tr><th>Круг</th>${drivers.map(d=>{const i=order.indexOf(d.driver_number),active=selected.has(d.driver_number);return `<th class="driver-header ${active?'':'collapsed-driver'}" data-order="${d.driver_number}" draggable="true" style="--team:${teamColor(d)}"><div class="column-controls"><button class="move" data-move="${d.driver_number}" data-step="-1" aria-label="${escape(d.name_acronym)} влево" ${i===0?'disabled':''}>‹</button><button class="column-toggle" data-driver="${d.driver_number}" aria-pressed="${active}" title="${escape(d.team_name)}">${escape(d.name_acronym||d.driver_number)}</button><button class="move" data-move="${d.driver_number}" data-step="1" aria-label="${escape(d.name_acronym)} вправо" ${i===order.length-1?'disabled':''}>›</button></div></th>`;}).join('')}</tr></thead><tbody>`+numbers.map(n=>`<tr><td>${n}</td>`+drivers.map(d=>{const l=lookup.get(`${d.driver_number}:${n}`);if(!selected.has(d.driver_number))return '<td class="collapsed-driver"></td>';if(!l)return '<td>—</td>';const yes=included(l,overrides),manual=Object.hasOwn(overrides,lapKey(l));const reason=manual?(yes?'IN':manualReasons[lapKey(l)]||'EXC'):(l.reasons.join(' · ')||'');const reasonTitle=(manual?'Вручную: '+reason+' · ':'')+'Авто: '+(l.reasons.join(' · ')||'чистый круг');return `<td class="tyre-cell ${l.tyre_fresh===true?'tyre-new':l.tyre_fresh===false?'tyre-used':'tyre-unconfirmed'}" style="--team:${teamColor(d)};--compound:${colors[l.compound]||colors.UNKNOWN}" title="${escape(l.compound)} · ${l.tyre_fresh===true?'новый комплект в начале отрезка':l.tyre_fresh===false?'использованный комплект в начале отрезка':'свежесть комплекта неизвестна'}"><button class="lap-button ${yes?'':'excluded'} ${manual?'manual':''}" data-lap="${lapKey(l)}" aria-pressed="${yes}" aria-label="${escape(d.name_acronym)} круг ${n}: ${formatTime(l.lap_duration)}, ${escape(reason)}" title="${escape(reasonTitle)}" ${validTime(l)?'':'disabled'}>${formatTime(l.lap_duration)} ${tyre(l.compound,l.tyre_age)}<small>${escape(reason)}</small></button></td>`;}).join('')+'</tr>').join('')+'</tbody>';

 renderChart();
}
$('load').onclick=loadRace;$('year').onchange=loadSessions;$('stint').onchange=renderMatrix;
function handleColumnClick(e){const move=e.target.closest('[data-move]');if(move){const n=Number(move.dataset.move);order=moveDriver(order,n,order.indexOf(n)+Number(move.dataset.step));persistView();render();return;}const b=e.target.closest('[data-driver]');if(!b)return;const n=Number(b.dataset.driver);selected.has(n)?selected.delete(n):selected.add(n);persistView();render();};
function editExclusions(keys){
 if(!keys.length)return;
 const dialog=$('reason-dialog'),single=keys.length===1,first=keys[0];
 $('reason-title').textContent=single?'Круг '+first.split(':')[1]:'Кругов: '+keys.length;
 $('reason-choice').innerHTML=reasonOptions.map(([code,label])=>`<option value="${code}">${escape(label)}${code?' · '+code:''}</option>`).join('');
 $('reason-choice').value=single?(manualReasons[first]||''):'';
 $('reason-auto').textContent=single?'Авто: '+(data.laps.find(l=>lapKey(l)===first)?.reasons.join(' · ')||'чистый круг'):'';
 $('reason-include').hidden=!single;
 dialog.returnValue='';dialog.showModal();
 dialog.onclose=()=>{
  const action=dialog.returnValue;if(!['exclude','include','auto'].includes(action))return;
  changeChartSelection(keys.map(key=>[key,action==='exclude'?false:action==='include'?true:undefined]),$('reason-choice').value);
 };
}
$('laps').onclick=e=>{if(e.target.closest('[data-move], [data-driver]')){handleColumnClick(e);return;}const b=e.target.closest('[data-lap]');if(!b||b.disabled)return;editExclusions([b.dataset.lap]);};
function range(include){const from=Number($('from').value||1),to=Number($('to').value||Math.max(...data.laps.map(l=>l.lap_number)));if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from){status('Укажи корректный диапазон кругов.',true);return;}const rows=visibleLaps().filter(l=>l.lap_number>=from&&l.lap_number<=to&&validTime(l));if(!include){editExclusions(rows.map(lapKey));return;}changeChartSelection(rows.map(l=>[lapKey(l),true]));}
$('exclude-range').onclick=()=>range(false);$('include-range').onclick=()=>range(true);
$('reset').onclick=()=>{if(!confirm('Сбросить все ручные изменения этой гонки?'))return;chartUndo.length=0;overrides={};manualReasons={};persist();render();};
function download(content,name){const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').onclick=()=>download(JSON.stringify({format:'f1stats-selection-v1',session_key:data.session.session_key,overrides,reasons:manualReasons},null,2),`f1stats-${data.session.session_key}.json`);
$('import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2000000)throw new Error('Слишком большой файл');const json=JSON.parse(await file.text());if(json.format!=='f1stats-selection-v1'||json.session_key!==data.session.session_key)throw new Error('Файл относится к другой сессии или имеет неверный формат');const next=validateOverrides(json.overrides),nextReasons=validateReasons(json.reasons||{},next);chartUndo.length=0;overrides=next;manualReasons=nextReasons;status('Выбор импортирован.');persist();render();}catch(error){status(`Импорт не выполнен: ${error.message}`,true);}finally{e.target.value='';}};
let dragged=null,chartState=null;const chartUndo=[];
$('laps').ondragstart=e=>{const chip=e.target.closest('[data-order]');if(!chip)return;dragged=Number(chip.dataset.order);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(dragged));chip.classList.add('dragging');};
$('laps').ondragover=e=>{if(dragged!==null){e.preventDefault();e.dataTransfer.dropEffect='move';}};
$('laps').ondrop=e=>{e.preventDefault();const chip=e.target.closest('[data-order]');if(chip&&dragged!==null){const target=Number(chip.dataset.order);if(target!==dragged){order=moveDriver(order,dragged,order.indexOf(target));persistView();}}dragged=null;render();};
$('laps').ondragend=()=>{dragged=null;for(const el of document.querySelectorAll('.dragging'))el.classList.remove('dragging');};
$('order-pace').onclick=()=>{order=driversInOrder().sort((a,b)=>(driverStats(data.laps.filter(l=>l.driver_number===a.driver_number),overrides).pace??Infinity)-(driverStats(data.laps.filter(l=>l.driver_number===b.driver_number),overrides).pace??Infinity)).map(d=>d.driver_number);persistView();render();};
$('order-team').onclick=()=>{order=driversInOrder().sort((a,b)=>teamKey(a.team_name).localeCompare(teamKey(b.team_name))).map(d=>d.driver_number);persistView();render();};
$('select-all').onclick=()=>{selected=new Set(order);persistView();render();};
$('select-none').onclick=()=>{selected.clear();persistView();render();};
function renderChart(){
 if(!data)return;
 $('chart-drivers').innerHTML=driversInOrder().map(d=>`<label class="chart-driver" style="--team:${teamColor(d)}"><input type="checkbox" data-chart-driver="${d.driver_number}" ${chartSelected.has(d.driver_number)?'checked':''}><span>${escape(d.name_acronym||d.driver_number)}</span></label>`).join('');
 renderExcluded();
 const from=Number($('chart-from').value||1),to=Number($('chart-to').value||Infinity);
 const valid=Number.isInteger(from)&&from>=1&&(Number.isInteger(to)||to===Infinity)&&to>=from;
 $('chart-status').textContent=valid?'':'Неверный диапазон кругов.';
 chartState=drawChart($('pace-chart'),{drivers:driversInOrder().filter(d=>chartSelected.has(d.driver_number)),laps:valid?data.laps.filter(l=>$('chart-stint').value==='all'||String(l.stint_number)===$('chart-stint').value):[],overrides,palette,title:$('race-title').textContent,mode:$('chart-mode').value,from,to,stint:$('chart-stint').value,stints:data.stints,pits:data.pits,showTyres:$('chart-tyres').checked,showPits:$('chart-pits').checked});
 $('chart-copy').disabled=$('chart-download').disabled=!chartState.hasData;
 $('pace-chart').setAttribute('aria-label',`${$('race-title').textContent}: ${$('chart-mode').selectedOptions[0].textContent}`);
 $('chart-data').textContent=chartState.series.map(s=>`${s.driver.name_acronym}: ${formatTime(mean(s.laps))}, ${s.laps.length} кругов`).join('; ');
}
$('chart-mode').onchange=renderChart;
$('chart-stint').onchange=renderChart;
$('chart-tyres').onchange=renderChart;
$('chart-pits').onchange=renderChart;
$('chart-drivers').onchange=e=>{const n=Number(e.target.dataset.chartDriver);if(!Number.isFinite(n))return;e.target.checked?chartSelected.add(n):chartSelected.delete(n);persistView();renderChart();};
$('chart-all').onclick=()=>{chartSelected=new Set(order);persistView();renderChart();};
$('chart-none').onclick=()=>{chartSelected.clear();persistView();renderChart();};
for(const id of ['chart-from','chart-to'])$(id).oninput=renderChart;
$('pace-chart').onpointermove=e=>{const rect=e.currentTarget.getBoundingClientRect(),x=(e.clientX-rect.left)*e.currentTarget.width/rect.width,y=(e.clientY-rect.top)*e.currentTarget.height/rect.height;const nearest=chartState?.points?.reduce((best,p)=>Math.hypot(p.x-x,p.y-y)<(best?.distance??20)?{...p,distance:Math.hypot(p.x-x,p.y-y)}:best,null);e.currentTarget.title=nearest?`${nearest.driver.name_acronym} · круг ${nearest.lap.lap_number} · ${formatTime(nearest.lap.lap_duration)}`:'';};
function renderExcluded(){
 const rows=data.laps.filter(l=>chartSelected.has(l.driver_number)&&overrides[lapKey(l)]===false);
 $('chart-excluded').innerHTML=rows.length?'<span class="muted">Исключены вручную:</span> '+rows.sort((a,b)=>order.indexOf(a.driver_number)-order.indexOf(b.driver_number)||a.lap_number-b.lap_number).map(l=>{const d=data.drivers.find(d=>d.driver_number===l.driver_number);return `<button class="excluded-tag" data-restore="${lapKey(l)}" style="--team:${teamColor(d||{})}" title="Изменить причину">${escape(d?.name_acronym||l.driver_number)} ${l.lap_number}${manualReasons[lapKey(l)]?' · '+escape(manualReasons[lapKey(l)]):''}</button><button class="excluded-tag" data-auto="${lapKey(l)}" title="Вернуть автоматический отбор" aria-label="Сбросить пометку круга ${l.lap_number}">×</button>`;}).join(''):'';
 $('chart-undo').disabled=!chartUndo.length;
}
function changeChartSelection(changes,reason=''){
 const previous=[];
 for(const [key,value] of changes){
  const nextReason=value===false?reason:undefined;
  if(overrides[key]===value&&manualReasons[key]===nextReason)continue;
  previous.push([key,overrides[key],manualReasons[key]]);
  if(value===undefined)delete overrides[key];else overrides[key]=value;
  if(nextReason)manualReasons[key]=nextReason;else delete manualReasons[key];
 }
 if(!previous.length){$('chart-status').textContent='Нет новых изменений.';return;}
 chartUndo.push(previous);$('chart-picked').hidden=true;persist();render();
 $('chart-status').textContent=`Изменено кругов: ${previous.length}.`;
}
$('chart-exclude').onclick=()=>{try{if(!chartSelected.size)throw new Error('Выбери пилотов графика.');const numbers=parseLapSelection($('chart-exclude-input').value,Math.max(...data.laps.map(l=>l.lap_number)));const rows=data.laps.filter(l=>chartSelected.has(l.driver_number)&&numbers.has(l.lap_number)&&validTime(l)&&($('chart-stint').value==='all'||String(l.stint_number)===$('chart-stint').value));if(!rows.length)throw new Error('Нет таких кругов у выбранных пилотов и отрезка.');editExclusions(rows.map(lapKey));}catch(e){$('chart-status').textContent=e.message;}};
$('chart-exclude-input').onkeydown=e=>{if(e.key==='Enter')$('chart-exclude').click();};
$('chart-undo').onclick=()=>{const previous=chartUndo.pop();if(!previous)return;for(const [key,value,reason]of previous){if(value===undefined)delete overrides[key];else overrides[key]=value;if(reason)manualReasons[key]=reason;else delete manualReasons[key];}$('chart-picked').hidden=true;persist();render();$('chart-status').textContent='Последнее изменение отменено.';};
$('chart-excluded').onclick=e=>{const button=e.target.closest('[data-restore]');if(button)editExclusions([button.dataset.restore]);const reset=e.target.closest('[data-auto]');if(reset)changeChartSelection([[reset.dataset.auto,undefined]]);};
$('pace-chart').onclick=e=>{const rect=e.currentTarget.getBoundingClientRect(),scale=e.currentTarget.width/rect.width;const points=hitPoints(chartState?.points||[],(e.clientX-rect.left)*scale,(e.clientY-rect.top)*e.currentTarget.height/rect.height,18*scale);if(!points.length){$('chart-picked').hidden=true;return;}
 $('chart-picked').hidden=false;$('chart-picked').innerHTML='<span>Убрать круг:</span> '+points.map(p=>`<button data-remove="${lapKey(p.lap)}" style="--team:${teamColor(p.driver)}">${escape(p.driver.name_acronym)} · ${p.lap.lap_number} · ${formatTime(p.lap.lap_duration)}</button>`).join('')+'<button data-close>Закрыть</button>';};
$('chart-picked').onclick=e=>{const button=e.target.closest('[data-remove]');if(button)editExclusions([button.dataset.remove]);else if(e.target.closest('[data-close]'))$('chart-picked').hidden=true;};
function chartBlob(){return new Promise((resolve,reject)=>$('pace-chart').toBlob(blob=>blob?resolve(blob):reject(new Error('PNG не создан')),'image/png'));}
$('chart-download').onclick=async()=>{try{const blob=await chartBlob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`f1stats-${data.session.session_key}-${$('chart-mode').value}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('chart-status').textContent='PNG скачан.';}catch(e){$('chart-status').textContent=e.message;}};
$('chart-copy').onclick=async()=>{try{if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw new Error('Копирование недоступно в этом браузере. Используй «Скачать PNG».');const blob=chartBlob();await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);$('chart-status').textContent='PNG в буфере обмена.';}catch(e){$('chart-status').textContent='Не удалось скопировать PNG. Используй «Скачать PNG».';}};
const currentYear=new Date().getFullYear();$('year').innerHTML=Array.from({length:currentYear-2022},(_,i)=>currentYear-i).map(y=>`<option>${y}</option>`).join('');loadSessions();

