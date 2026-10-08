import {test} from 'node:test';import assert from 'node:assert/strict';import {geometryDistance,haversine} from '../dist/geo.js';
const ring=[[10,60],[10.01,60],[10.01,60.01],[10,60.01],[10,60]];
test('inside polygon has zero distance',()=>assert.equal(geometryDistance([10.005,60.005],{type:'Polygon',coordinates:[ring]}),0));
test('polygon hole is outside the protected area',()=>{const hole=[[10.004,60.004],[10.006,60.004],[10.006,60.006],[10.004,60.006],[10.004,60.004]];const d=geometryDistance([10.005,60.005],{type:'Polygon',coordinates:[ring,hole]});assert.ok(d>50&&d<60);});
test('distance is to boundary, not centroid',()=>{const d=geometryDistance([10.011,60.005],{type:'Polygon',coordinates:[ring]});assert.ok(d>50&&d<60);});
test('100 metre threshold separates neighbours',()=>{const p=[10,60];assert.ok(geometryDistance(p,{type:'Point',coordinates:[10,60.0008]})<100);assert.ok(geometryDistance(p,{type:'Point',coordinates:[10,60.001]})>100);});
test('missing geometry does not become a here result',()=>assert.equal(geometryDistance([10,60],null),Infinity));
test('multipolygon picks closest area',()=>assert.equal(geometryDistance([10.005,60.005],{type:'MultiPolygon',coordinates:[[ring]]}),0));
test('one degree at equator',()=>assert.ok(Math.abs(haversine([0,0],[0,1])-111195)<2));
