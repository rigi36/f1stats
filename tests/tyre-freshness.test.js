import test from 'node:test';import assert from 'node:assert/strict';import {prepareLaps} from '../pace.js';
test('new vs used describes the fitted set for the whole stint',()=>{
 const laps=[{driver_number:1,lap_number:10,lap_duration:90},{driver_number:2,lap_number:10,lap_duration:90}];
 const stints=[{driver_number:1,lap_start:1,lap_end:20,stint_number:1,compound:'SOFT',tyre_age_at_start:0},{driver_number:2,lap_start:1,lap_end:20,stint_number:1,compound:'SOFT',tyre_age_at_start:3}];
 const rows=prepareLaps(laps,stints,[],[]);assert.equal(rows[0].tyre_age,9);assert.equal(rows[0].tyre_fresh,true);assert.equal(rows[1].tyre_age,12);assert.equal(rows[1].tyre_fresh,false);
});
test('missing age and absent stint stay unknown, never imply new tyres',()=>{
 const laps=[{driver_number:1,lap_number:5,lap_duration:90},{driver_number:2,lap_number:5,lap_duration:90}];
 const rows=prepareLaps(laps,[{driver_number:1,lap_start:1,lap_end:20,compound:'HARD',tyre_age_at_start:null}],[],[]);for(const row of rows){assert.equal(row.tyre_fresh,null);assert.equal(row.tyre_age,null);}
});
