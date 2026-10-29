import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {reasonOptions,validateReasons} from '../exclusion-reasons.js';import {selectionKey} from '../source.js';
test('dialog saves, edits, undoes and resets exclusion reasons',()=>{
 const elements=new Map(),saved=new Map();
 const el=id=>{if(!elements.has(id))elements.set(id,{value:'',hidden:false,classList:{toggle(){}},showModal(){this.open=true;}});return elements.get(id);};
 const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/const currentYear=[\s\S]*$/,'');
 const context=vm.createContext({document:{getElementById:el},reasonOptions,validateReasons,selectionKey,lapKey:l=>l.driver_number+':'+l.lap_number,localStorage:{setItem:(k,v)=>saved.set(k,v)},console});
 vm.runInContext(source+`
 render=()=>{};
 data={session:{session_key:1},laps:[{driver_number:16,lap_number:3,reasons:[]}]};
 editExclusions(['16:3']);
 document.getElementById('reason-choice').value='W2W';
 document.getElementById('reason-dialog').returnValue='exclude';
 document.getElementById('reason-dialog').onclose();
 if(overrides['16:3']!==false||manualReasons['16:3']!=='W2W')throw Error('save');
 editExclusions(['16:3']);
 if(document.getElementById('reason-choice').value!=='W2W')throw Error('prefill');
 document.getElementById('reason-choice').value='SC';
 document.getElementById('reason-dialog').returnValue='exclude';
 document.getElementById('reason-dialog').onclose();
 document.getElementById('chart-undo').onclick();
 if(manualReasons['16:3']!=='W2W'||overrides['16:3']!==false)throw Error('undo reason');
 changeChartSelection([['16:3',true]]);
 if(manualReasons['16:3']!==undefined||overrides['16:3']!==true)throw Error('include');
 document.getElementById('chart-undo').onclick();
 if(manualReasons['16:3']!=='W2W')throw Error('undo include');
 changeChartSelection([['16:3',undefined]]);
 if(Object.keys(overrides).length||Object.keys(manualReasons).length)throw Error('auto reset');
 `,context);
 assert.equal(saved.get('f1stats:selection:v1:1:reasons'),'{}');
});

