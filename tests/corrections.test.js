import test from 'node:test';import assert from 'node:assert/strict';
import {correctStints} from '../data-corrections.js';
import {strategyLabels} from '../strategy.js';
import {prepareLaps} from '../pace.js';
const stints=[{driver_number:18,stint_number:1,compound:'MEDIUM',lap_start:1,lap_end:1,tyre_age_at_start:0},{driver_number:18,stint_number:2,compound:'SOFT',lap_start:2,lap_end:41,tyre_age_at_start:0},{driver_number:18,stint_number:3,compound:'SOFT',lap_start:42,lap_end:55,tyre_age_at_start:0}];
const pits=[{driver_number:18,lap_number:15},{driver_number:18,lap_number:41}];
test('verified Stroll correction fixes all lap tyre assignments without mutating raw data',()=>{
 const corrected=correctStints(11396,stints,pits);
 assert.deepEqual(corrected.map(s=>[s.lap_start,s.lap_end]),[[1,15],[16,41],[42,55]]);
 const laps=prepareLaps([{driver_number:18,lap_number:15,lap_duration:120},{driver_number:18,lap_number:16,lap_duration:103}],corrected,pits,[]);
 assert.equal(laps[0].compound,'MEDIUM');assert.equal(laps[1].compound,'SOFT');assert.equal(laps[1].tyre_age,0);assert.equal(stints[0].lap_end,1);
 assert.deepEqual(correctStints(11396,corrected,pits),corrected);
});
test('correction requires exact session, anomaly and corroborating pit stops',()=>{
 assert.deepEqual(correctStints(11395,stints,pits),stints);assert.deepEqual(correctStints(11396,stints,[]),stints);
});
test('short stint endpoint stays on the baseline and true x position when labels fit',()=>{
 const labels=strategyLabels([{lap_end:13},{lap_end:22},{lap_end:24}],n=>105+n/56*1240,s=>s.length*11);
 assert.ok(labels.every(l=>l.center===l.anchor));
 const close=strategyLabels([{lap_end:22},{lap_end:23}],n=>n*20,s=>s.length*11);
 assert.ok(close[1].center-close[1].width/2>=close[0].center+close[0].width/2+4);
});
