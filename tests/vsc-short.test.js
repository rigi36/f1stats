import test from 'node:test';import assert from 'node:assert/strict';
import {neutralizations,prepareLaps,included} from '../pace.js';
test('short VSC DEPLOYED starts an interval; only full-track clear ends it',()=>{
 const messages=[{date:'2026-10-25T20:06:06Z',message:'VSC DEPLOYED',lap_number:2},{date:'2026-10-25T20:06:11Z',message:'TRACK CLEAR',scope:'Sector',flag:'CLEAR'},{date:'2026-10-25T20:06:20Z',message:'VSC ENDING',lap_number:2},{date:'2026-10-25T20:06:30Z',message:'TRACK CLEAR',scope:'Track',flag:'CLEAR',lap_number:2}];
 const intervals=neutralizations(messages);assert.equal(intervals.length,1);assert.equal(intervals[0].end,Date.parse('2026-10-25T20:06:30Z'));
 const laps=[{driver_number:1,lap_number:2,lap_duration:100,date_start:'2026-10-25T20:05:00Z'},{driver_number:16,lap_number:2,lap_duration:103,date_start:'2026-10-25T20:05:10Z'},{driver_number:1,lap_number:3,lap_duration:90,date_start:'2026-10-25T20:06:40Z'}];
 assert.deepEqual(prepareLaps(laps,[],[],messages).map(l=>included(l)),[false,false,true]);
});
