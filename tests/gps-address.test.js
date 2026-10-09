import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {nearestAddressFields} from '../dist/address-search.js';
import {geometryDistance,bounds} from '../dist/geo.js';

const address={adressenavn:'Myntgata',nummer:3,bokstav:'a',postnummer:'0151',poststed:'OSLO',adressetekst:'Myntgata 3A',kommunenummer:'0301',adressekode:123,meterDistanseTilPunkt:30};
class Element{
  constructor(){this.value='';this.textContent='';this.innerHTML='';this.hidden=true;this.disabled=false;this.dataset={};this.handlers={};this.attributes={};this.classList={toggle(){}};}
  addEventListener(name,fn){this.handlers[name]=fn;}setAttribute(name,value){this.attributes[name]=value;}
  querySelector(){return new Element();}querySelectorAll(){return [];}remove(){}focus(){}
}
function harness({addresses=[{...address,adressenavn:'Fjern gate',meterDistanseTilPunkt:250},address],failure=false,hold=false}={}){
  const elements=new Map(),get=selector=>{if(!elements.has(selector))elements.set(selector,new Element());return elements.get(selector);};
  const callbacks=[],requests=[];let release;
  const pending=hold?new Promise(resolve=>release=resolve):null;
  const context={URL,URLSearchParams,AbortController,AbortSignal,Date,Math,Number,Promise,setTimeout,clearTimeout,console,nearestAddressFields,geometryDistance,bounds,
    addEventListener(){},window:{},navigator:{geolocation:{getCurrentPosition(ok,error){callbacks.push({ok,error});}}},
    document:{querySelector:get,querySelectorAll:()=>[],createElement:()=>new Element()},
    fetch:async url=>{requests.push(String(url));let data={features:[],links:[],eiendom:[]};
      if(String(url).includes('/adresser/v1/punktsok')){if(failure)throw Error('Offline');if(pending)await pending;data={adresser:addresses,metadata:{totaltAntallTreff:addresses.length}};}
      return {ok:true,json:async()=>data};}
  };
  vm.runInNewContext(fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .+;\r?\n/gm,''),context);
  for(const [selector,value] of [['#search-street','Tidligere gate'],['#search-number','9'],['#search-postcode','0001'],['#search-place','Tidligere sted']])get(selector).value=value;
  return {get,requests,callbacks,release,start(){get('#locate').onclick();},position(){return callbacks.at(-1).ok({coords:{longitude:10.7387,latitude:59.9075,accuracy:8}});}};
}
const values=fixture=>['#search-street','#search-number','#search-postcode','#search-place'].map(id=>fixture.get(id).value);

test('GPS opens the panel and fills the nearest address, with house letter and leading postal zero',async()=>{
  const f=harness();assert.equal(f.requests.length,0);f.start();assert.equal(f.get('#address-panel').hidden,false);assert.equal(f.get('#choose-address').attributes['aria-expanded'],'true');
  await f.position();assert.deepEqual(values(f),['Myntgata','3A','0151','OSLO']);assert.match(f.get('#address-status').textContent,/30 m fra GPS-posisjonen/);
  assert(!f.requests.some(url=>url.includes('/adresser/v1/sok')),'Autofill reuses the existing point lookup, without submitting an address search');
});
test('Manual edits while GPS address data is pending are preserved',async()=>{
  const f=harness({hold:true});f.start();const lookup=f.position();f.get('#search-street').value='Min egen gate';f.get('#address-search').handlers.input();f.release();await lookup;
  assert.deepEqual(values(f),['Min egen gate','9','0001','Tidligere sted']);
});
for(const config of [{addresses:[]},{failure:true}])test(`Missing GPS address data preserves typed fields (${config.failure?'server failure':'no addresses'})`,async()=>{
  const f=harness(config),before=values(f);f.start();await f.position();assert.deepEqual(values(f),before);assert.match(f.get('#address-status').textContent,/ikke endret/);
});
test('Denied GPS preserves address fields and enables the position button again',()=>{
  const f=harness(),before=values(f);f.start();f.callbacks[0].error({code:1});assert.deepEqual(values(f),before);assert.equal(f.get('#locate').disabled,false);assert.equal(f.requests.length,0);
});
test('A late GPS callback cannot replace a newer manually chosen point',async()=>{
  const f=harness();f.start();await f.get('#example').onclick();const requestCount=f.requests.length;await f.position();assert.equal(f.requests.length,requestCount);assert.equal(f.get('#position-label').textContent,'Eksempel: Akershus festning');assert.equal(f.get('#search-street').value,'Tidligere gate');
});
test('Nearest address ignores invalid distances and does not invent missing street or house numbers',()=>{
  const fields=nearestAddressFields([{type:'address',distance:NaN,data:address},{type:'address',distance:0,data:{postnummer:'0001',poststed:'Sted',adressetekst:'Matrikkeladresse'}}]);
  assert.equal(fields.street,'');assert.equal(fields.number,'');assert.equal(fields.postcode,'0001');assert.equal(nearestAddressFields([]),null);
});
