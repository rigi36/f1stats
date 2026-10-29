import test from 'node:test';
import assert from 'node:assert/strict';
import {teamKey,teamStyles,orderedDrivers,moveDriver} from '../presentation.js';
import {chartSeries} from '../chart.js';
test('team aliases share colours, distinct teams do not',()=>{
 const teams=['McLaren','Ferrari','Mercedes','Red Bull Racing','Racing Bulls','Alpine','Aston Martin','Williams','Haas F1 Team','Audi','Cadillac'];
 const palette=teamStyles(teams.map(team_name=>({team_name})));
 assert.equal(new Set(palette.values()).size,teams.length);
 assert.equal(teamKey('RB'),teamKey('Racing Bulls'));
 assert.equal(teamKey('Kick Sauber'),'sauber');
 assert.equal(palette.get('mclaren'),'#ff9418');assert.equal(palette.get('ferrari'),'#ff4055');
});
test('manual order moves both directions and appends newcomers',()=>{
 assert.deepEqual(moveDriver([1,2,3],1,2),[2,3,1]);
 assert.deepEqual(moveDriver([1,2,3],3,0),[3,1,2]);
 assert.deepEqual(orderedDrivers([1,2,3,4].map(driver_number=>({driver_number})),[3,1,2]).map(d=>d.driver_number),[3,1,2,4]);
});
test('chart preserves order, bounds and manual exclusions/restorations',()=>{
 const drivers=[{driver_number:2},{driver_number:1}],laps=[{driver_number:1,lap_number:2,lap_duration:80,reasons:[]},{driver_number:2,lap_number:2,lap_duration:81,reasons:['PIT']},{driver_number:2,lap_number:3,lap_duration:82,reasons:[]},{driver_number:2,lap_number:4,lap_duration:83,reasons:[]}];
 const series=chartSeries(drivers,laps,{'2:2':true,'2:3':false},{from:2,to:3});
 assert.deepEqual(series.map(s=>s.driver.driver_number),[2,1]);
 assert.deepEqual(series[0].laps.map(l=>l.lap_number),[2]);assert.equal(series[0].laps[0].lap_duration,81);
});
