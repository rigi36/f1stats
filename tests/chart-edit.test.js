import test from 'node:test';import assert from 'node:assert/strict';
import {parseLapSelection,hitPoints} from '../chart-edit.js';
test('specific circles and ranges validate before mutation',()=>{assert.deepEqual([...parseLapSelection('2, 50–53; 52',56)],[2,50,51,52,53]);for(const value of ['','0','57','53-50','2, x','2-99999999'])assert.throws(()=>parseLapSelection(value,56));});
test('overlapping driver points remain separately selectable',()=>{const points=[{x:10,y:10,driver:16},{x:11,y:11,driver:44},{x:200,y:200,driver:1}];assert.deepEqual(hitPoints(points,10,10,15).map(p=>p.driver),[16,44]);});
