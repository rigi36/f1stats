import test from 'node:test';
import assert from 'node:assert/strict';
import {tyreContext} from '../chart.js';
const drivers=[{driver_number:16},{driver_number:44}];
const stints=[{driver_number:16,stint_number:1,lap_start:1,lap_end:15,compound:'MEDIUM'},{driver_number:16,stint_number:2,lap_start:16,lap_end:30,compound:'MEDIUM'},{driver_number:44,stint_number:1,lap_start:1,lap_end:20,compound:'HARD'}];
test('tyres retain actual stints, clip to range and do not infer pits',()=>{
 const rows=tyreContext(drivers,stints,[{driver_number:16,lap_number:15}],{from:10,to:25});
 assert.deepEqual(rows[0].stints.map(s=>[s.start,s.end,s.compound]),[[10,15,'MEDIUM'],[16,25,'MEDIUM']]);
 assert.deepEqual(rows[0].pits.map(p=>p.lap_number),[15]);assert.equal(rows[1].pits.length,0);
 assert.equal(stints[0].lap_start,1);
});
test('PIT markers respect driver, window and selected stint',()=>{
 const rows=tyreContext([drivers[0]],stints,[{driver_number:16,lap_number:15},{driver_number:16,lap_number:30},{driver_number:44,lap_number:20}],{from:10,to:35,stint:'1'});
 assert.equal(rows.length,1);assert.equal(rows[0].stints.length,1);assert.deepEqual(rows[0].pits.map(p=>p.lap_number),[15]);
 assert.equal(tyreContext([drivers[0]],stints,[],{from:31,to:40})[0].stints.length,0);
});
