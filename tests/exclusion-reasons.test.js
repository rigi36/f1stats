import test from 'node:test';import assert from 'node:assert/strict';import {validateReasons,reasonOptions} from '../exclusion-reasons.js';
test('legacy exclusions need no reason',()=>assert.deepEqual(validateReasons({}, {'16:3':false}),{}));
test('W2W and pit reasons round trip',()=>{const reasons={'16:3':'W2W','16:4':'PIT'};assert.deepEqual(validateReasons(JSON.parse(JSON.stringify(reasons)),{'16:3':false,'16:4':false}),reasons);assert.ok(reasonOptions.some(([c])=>c==='W2W'));});
test('reasons cannot attach to included or unknown laps',()=>{assert.throws(()=>validateReasons({'16:3':'SC'},{'16:3':true}));assert.throws(()=>validateReasons({'16:3':'bogus'},{'16:3':false}));});
