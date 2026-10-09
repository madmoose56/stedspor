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
  showModal(){this.open=true;}
}
function harness({addresses=[{...address,adressenavn:'Fjern gate',meterDistanseTilPunkt:250},address],failure=false,hold=false,cultureFeatures=[],leaflet,cultureFailure=false}={}){
  const elements=new Map(),get=selector=>{if(!elements.has(selector))elements.set(selector,new Element());return elements.get(selector);};
  const callbacks=[],requests=[];let release;
  const pending=hold?new Promise(resolve=>release=resolve):null;
  const context={URL,URLSearchParams,AbortController,AbortSignal,Date,Math,Number,Promise,setTimeout,clearTimeout,console,nearestAddressFields,geometryDistance,bounds,
    addEventListener(){},window:{L:leaflet},L:leaflet,ResizeObserver:class{observe(){}},navigator:{geolocation:{getCurrentPosition(ok,error){callbacks.push({ok,error});}}},
    document:{querySelector:get,querySelectorAll:()=>[],createElement:()=>new Element()},
    fetch:async url=>{requests.push(String(url));let data={features:[],links:[],eiendom:[]};
      if(String(url).includes('/adresser/v1/punktsok')){if(failure)throw Error('Offline');if(pending)await pending;data={adresser:addresses,metadata:{totaltAntallTreff:addresses.length}};}
      if(String(url).includes('api.ra.no/')){if(cultureFailure)throw Error('Offline');data={features:cultureFeatures,links:[]};}
      return {ok:true,json:async()=>data};}
  };
  vm.runInNewContext(fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .+;\r?\n/gm,''),context);
  for(const key of ['culture','protected','reserve'])get('#layer-'+key).checked=true;
  for(const [selector,value] of [['#search-street','Tidligere gate'],['#search-number','9'],['#search-postcode','0001'],['#search-place','Tidligere sted']])get(selector).value=value;
  return {get,requests,callbacks,release,toggleCulture(enabled){get('#layer-culture').checked=enabled;context.updateMapLayers();},start(){get('#locate').onclick();},position(){return callbacks.at(-1).ok({coords:{longitude:10.7387,latitude:59.9075,accuracy:8}});}};
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

test('GPS mode hides search heading, help, submit and status even after a GPS error',()=>{
  const f=harness();f.start();
  for(const id of ['#address-title','#address-help','#search-address','#address-status'])assert.equal(f.get(id).hidden,true);
  f.callbacks[0].error({code:3});assert.equal(f.get('#address-status').hidden,true);assert.match(f.get('#notice').textContent,/GPS brukte for lang tid/);
});
test('Address switches from GPS mode to the ordinary search without closing the panel or starting GPS',async()=>{
  const f=harness();f.start();await f.position();const before=f.requests.length;
  f.get('#choose-address').onclick();
  assert.equal(f.get('#address-panel').hidden,false);
  for(const id of ['#address-title','#address-help','#search-address'])assert.equal(f.get(id).hidden,false);
  assert.equal(f.get('#address-status').hidden,true,'Old GPS status stays removed');
  assert.deepEqual(values(f),['Myntgata','3A','0151','OSLO']);assert.equal(f.requests.length,before);assert.equal(f.callbacks.length,1);
});

function fakeLeaflet(){
  const maps=[],markers=[],groups=[],tiles=[];
  class Layer{
    constructor(kind,options={}){this.kind=kind;this.options=options;this.layers=[];this.events={};}
    addTo(target){target.layers.push(this);this.parent=target;return this;}
    bindTooltip(text){this.tooltip=text;return this;}bindPopup(text){this.popup=text;return this;}
    on(name,fn){this.events[name]=fn;return this;}bringToFront(){}setLatLng(){return this;}
    clearLayers(){this.layers=[];}getLayers(){return this.layers;}getRadius(){return this.options.radius;}
    getBounds(){return {isValid:()=>true,getCenter:()=>({lat:59.9075,lng:10.7387})};}
  }
  const tileLayer=(url,options)=>{tiles.push(url);return new Layer('tile',options);};tileLayer.wms=tileLayer;
  const L={tileLayer,
    map(){const m={layers:[],attributionControl:{addAttribution(){}},setView(){return this;},invalidateSize(){},fitBounds(){},hasLayer(layer){return this.layers.includes(layer);},removeLayer(layer){this.layers=this.layers.filter(l=>l!==layer);}};maps.push(m);return m;},
    layerGroup(){const group=new Layer('group');groups.push(group);return group;},
    circleMarker:()=>new Layer('position'),circle:(point,options)=>new Layer('ring',options),
    geoJSON:(geometry,options)=>new Layer('geometry',{geometry,...options}),
    divIcon:options=>options,marker(point,options){const marker=new Layer('marker',{point,...options});markers.push(marker);return marker;},
    control:()=>({addTo(){this.onAdd();}}),DomUtil:{create:()=>new Element()},DomEvent:{disableClickPropagation(){},disableScrollPropagation(){}}
  };L.control.scale=()=>({addTo(){}});return {L,maps,markers,groups,tiles};
}
const heritage=(id,title,lat)=>({id,geometry:{type:'Point',coordinates:[10.7387,lat]},properties:{navn:title,lokalitetskategori:'L-ARK',vernetype:'Fredet'}});
test('Culture map markers match the global list numbers across distance groups and open the right details',async()=>{
  const map=fakeLeaflet(),f=harness({leaflet:map.L,cultureFeatures:[heritage(3,'Fjernt minne',59.912),heritage(2,'Nært minne',59.908),heritage(1,'Her-minne',59.9075)]});
  f.start();await f.position();
  const group=map.groups.find(g=>g.layers.some(l=>l.kind==='marker'));
  const markers=group.layers.filter(l=>l.kind==='marker');
  assert.deepEqual(markers.map(m=>m.options.icon.html),['K1','K2','K3']);
  for(const [index,title] of ['Her-minne','Nært minne','Fjernt minne'].entries()){
    assert.equal(markers[index].options.title,`K${index+1} · ${title}`);
    assert(f.get('#culture-overview').innerHTML.includes(`K${index+1} · ${title}`));
  }
  assert(f.get('#results').innerHTML.includes('K2 · Nært minne'));
  markers[1].events.click();assert.equal(f.get('#detail').open,true);assert(f.get('#detail-content').innerHTML.includes('K2 · Nært minne'));
  assert.equal(group.layers.filter(l=>l.kind==='geometry').length,3);
  assert(!map.tiles.some(url=>url.includes('wms.matrikkel')),'Removed field property layer makes no WMS requests');
  const before=f.requests.length;f.toggleCulture(false);assert(!map.maps[0].hasLayer(group));f.toggleCulture(true);assert(map.maps[0].hasLayer(group));assert.equal(f.requests.length,before);
});
test('A new point clears old culture markers while the next lookup is loading',async()=>{
  const map=fakeLeaflet(),features=[heritage(1,'Tidligere minne',59.9075)],f=harness({leaflet:map.L,cultureFeatures:features});
  f.start();await f.position();const group=map.groups.find(g=>g.layers.some(l=>l.kind==='marker'));features.length=0;
  const lookup=f.get('#example').onclick();assert.equal(group.layers.length,0);await lookup;assert.equal(group.layers.length,0);
});
test('Culture service errors are visible on the map instead of implying no heritage sites',async()=>{
  const map=fakeLeaflet(),f=harness({leaflet:map.L,cultureFailure:true});f.start();await f.position();
  assert.equal(f.get('#map-errors').hidden,false);assert.match(f.get('#map-errors').textContent,/Kulturminner kunne ikke hentes/);
});

test('Culture lookup keeps only sites within the 1 km circle, including at the boundary and excluding bounding-box corners',async()=>{
  const point=[10.7387,59.9075],inside=bounds(point,999),outside=bounds(point,1001),corner=bounds(point,900);
  const cornerFeature=heritage(4,'Utenfor i kartutsnittets hjørne',corner[3]);cornerFeature.geometry.coordinates[0]=corner[2];
  const map=fakeLeaflet(),f=harness({leaflet:map.L,cultureFeatures:[
    heritage(1,'Nært kulturminne',59.908),heritage(2,'Innenfor grensen',inside[3]),heritage(3,'Utenfor grensen',outside[3]),cornerFeature,
    {id:5,geometry:null,properties:{navn:'Ukjent plassering'}}
  ]});
  f.start();await f.position();
  const overview=f.get('#culture-overview').innerHTML;
  assert(overview.includes('K1 · Nært kulturminne'));assert(overview.includes('K2 · Innenfor grensen'));
  for(const title of ['Utenfor grensen','Utenfor i kartutsnittets hjørne','Ukjent plassering'])assert(!overview.includes(title));
  const group=map.groups.find(g=>g.layers.some(l=>l.kind==='marker'));
  assert.deepEqual(group.layers.filter(l=>l.kind==='marker').map(m=>m.options.title),['K1 · Nært kulturminne','K2 · Innenfor grensen']);
});
