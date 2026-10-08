import test from 'node:test';
import assert from 'node:assert/strict';
import {addressParams} from '../dist/address-search.js';
test('address search preserves leading zero in postal code and splits house letter',()=>{const p=addressParams({street:' Myntgata ',number:'3 a',postcode:'0151',place:' Oslo '});assert.equal(p.adressenavn,'Myntgata');assert.equal(p.nummer,3);assert.equal(p.bokstav,'A');assert.equal(p.postnummer,'0151');assert.equal(p.poststed,'Oslo');});
test('number without letter excludes suffixed houses',()=>assert.equal(addressParams({street:'Myntgata',number:'3'}).bokstav,''));
test('optional fields allow a street search and subsequent pages',()=>{const p=addressParams({street:'Storgata'},2);assert.equal(p.side,2);assert.equal(p.treffPerSide,20);assert.equal(p.utkoordsys,4258);assert.ok(!('postnummer' in p));assert.ok(!('nummer' in p));});
test('invalid address fields are rejected before requesting data',()=>{assert.throws(()=>addressParams({street:'  '}));assert.throws(()=>addressParams({street:'Gate',postcode:'151'}));assert.throws(()=>addressParams({street:'Gate',number:'3/4'}));});
