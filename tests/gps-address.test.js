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
function harness({addresses=[{...address,adressenavn:'Fjern gate',meterDistanseTilPunkt:250},address],failure=false,hold=false,cultureFeatures=[],leaflet,cultureFailure=false,protectedFeatures=[],gpsAvailable=true,properties=[]}={}){
  const elements=new Map(),get=selector=>{if(['#nature-overview','#culture-overview','#coordinates','#example','#latitude','#longitude','#results','#source-status','#more'].includes(selector))return null;if(!elements.has(selector))elements.set(selector,new Element());return elements.get(selector);};
  const callbacks=[],requests=[],pageEvents=new Map();let release;
  const pending=hold?new Promise(resolve=>release=resolve):null;
  const context={URL,URLSearchParams,AbortController,AbortSignal,Date,Math,Number,Promise,setTimeout,clearTimeout,console,nearestAddressFields,geometryDistance,bounds,
    addEventListener(name,fn){pageEvents.set(name,fn);},window:{L:leaflet},L:leaflet,ResizeObserver:class{observe(){}},navigator:{geolocation:gpsAvailable?{getCurrentPosition(ok,error){callbacks.push({ok,error});}}:undefined},
    document:{readyState:'loading',querySelector:get,querySelectorAll:()=>[],createElement:()=>new Element()},
    fetch:async url=>{requests.push(String(url));let data={features:[],links:[],eiendom:[]};
      if(String(url).includes('/adresser/v1/punktsok')){if(failure)throw Error('Offline');if(pending)await pending;data={adresser:addresses,metadata:{totaltAntallTreff:addresses.length}};}
      if(String(url).includes('api.ra.no/')){if(cultureFailure)throw Error('Offline');data={features:cultureFeatures,links:[]};}
      if(String(url).includes('/services/vern/'))data={features:protectedFeatures};
      if(String(url).includes('/eiendom/v1/punkt'))data={eiendom:properties,metadata:{totaltAntallTreff:properties.length}};
      return {ok:true,json:async()=>data};}
  };
  vm.runInNewContext(fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .+;\r?\n/gm,''),context);
  for(const key of ['culture','protected','reserve'])get('#layer-'+key).checked=true;
  for(const [selector,value] of [['#search-street','Tidligere gate'],['#search-number','9'],['#search-postcode','0001'],['#search-place','Tidligere sted']])get(selector).value=value;
  return {get,requests,callbacks,release,open(){pageEvents.get('DOMContentLoaded')();},showAllNearby(){context.renderNear();},more(type){context.showMoreNearby(type);},chooseAddress(data){return context.chooseAddress(data);},toggleCulture(enabled){get('#layer-culture').checked=enabled;context.updateMapLayers();},start(){get('#locate').onclick();},position(){return callbacks.at(-1).ok({coords:{longitude:10.7387,latitude:59.9075,accuracy:8}});}};
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
  const f=harness();f.start();await f.chooseAddress({...address,representasjonspunkt:{lon:10.74,lat:59.91}});const requestCount=f.requests.length;await f.position();assert.equal(f.requests.length,requestCount);assert.equal(f.get('#position-label').textContent,'Adresse: Myntgata 3A, 0151 OSLO');assert.equal(f.get('#search-street').value,'Tidligere gate');
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
  f.start();await f.position();f.showAllNearby();
  const group=map.groups.find(g=>g.layers.some(l=>l.kind==='marker'));
  const markers=group.layers.filter(l=>l.kind==='marker');
  assert.deepEqual(markers.map(m=>m.options.icon.html),['K1','K2','K3']);
  for(const [index,title] of ['Her-minne','Nært minne','Fjernt minne'].entries()){
    assert.equal(markers[index].options.title,`K${index+1} · ${title}`);
    assert(f.get('#near-culture').innerHTML.includes(`K${index+1} · ${title}`));
  }
  assert(f.get('#near-culture').innerHTML.includes('K2 · Nært minne'));
  markers[1].events.click();assert.equal(f.get('#detail').open,true);assert(f.get('#detail-content').innerHTML.includes('K2 · Nært minne'));
  assert.equal(group.layers.filter(l=>l.kind==='geometry').length,3);
  assert(!map.tiles.some(url=>url.includes('wms.matrikkel')),'Removed field property layer makes no WMS requests');
  const before=f.requests.length;f.toggleCulture(false);assert(!map.maps[0].hasLayer(group));f.toggleCulture(true);assert(map.maps[0].hasLayer(group));assert.equal(f.requests.length,before);
});
test('A new point clears old culture markers while the next lookup is loading',async()=>{
  const map=fakeLeaflet(),features=[heritage(1,'Tidligere minne',59.9075)],f=harness({leaflet:map.L,cultureFeatures:features});
  f.start();await f.position();const group=map.groups.find(g=>g.layers.some(l=>l.kind==='marker'));features.length=0;
  const lookup=f.chooseAddress({...address,representasjonspunkt:{lon:10.74,lat:59.91}});assert.equal(group.layers.length,0);await lookup;assert.equal(group.layers.length,0);
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
  f.start();await f.position();f.showAllNearby();
  const overview=f.get('#near-culture').innerHTML;
  assert(overview.includes('K1 · Nært kulturminne'));assert(overview.includes('K2 · Innenfor grensen'));
  for(const title of ['Utenfor grensen','Utenfor i kartutsnittets hjørne','Ukjent plassering'])assert(!overview.includes(title));
  const group=map.groups.find(g=>g.layers.some(l=>l.kind==='marker'));
  assert.deepEqual(group.layers.filter(l=>l.kind==='marker').map(m=>m.options.title),['K1 · Nært kulturminne','K2 · Innenfor grensen']);
});

test('Opening the app starts GPS once, fills its address and loads protected areas without querying nature types',async()=>{
  const protectedFeature={geometry:{type:'Point',coordinates:[10.7387,59.9075]},properties:{OBJECTID:7,offisieltNavn:'Eksempelreservat',verneform:'NR'}};
  const f=harness({protectedFeatures:[protectedFeature]});f.open();f.open();
  assert.equal(f.callbacks.length,1);assert.equal(f.get('#locate').attributes['aria-pressed'],'true');assert.equal(f.get('#choose-address').attributes['aria-pressed'],'false');
  await f.position();assert.deepEqual(values(f),['Myntgata','3A','0151','OSLO']);assert.equal(f.get('#locate').disabled,false);
  assert.equal(f.requests.length,5);assert(f.requests.some(url=>url.includes('/services/vern/')));assert(!f.requests.some(url=>/naturtype/i.test(url)));
  assert(f.get('#here-content').innerHTML.includes('Eksempelreservat'));assert(!/naturtype/i.test(f.get('#here-content').innerHTML+f.get('#near-protected').innerHTML));
});
test('Choosing an address cancels an automatic GPS callback before it can submit the old position',async()=>{
  const f=harness();f.open();f.get('#choose-address').onclick();await f.position();
  assert.equal(f.requests.length,0);assert.equal(f.get('#locate').disabled,false);assert.equal(f.get('#locate').attributes['aria-pressed'],'false');
  assert.equal(f.get('#choose-address').attributes['aria-pressed'],'true');assert.equal(f.get('#address-panel').hidden,false);assert.equal(f.get('#search-address').hidden,false);
});
test('A manual address choice before startup is respected',()=>{
  const f=harness();f.get('#choose-address').onclick();f.open();assert.equal(f.callbacks.length,0);assert.equal(f.get('#address-panel').hidden,false);
});
test('Automatic startup keeps manual address selection available when GPS is unavailable or denied',()=>{
  for(const available of [true,false]){
    const f=harness({gpsAvailable:available});f.open();if(available)f.callbacks[0].error({code:1});
    assert.equal(f.requests.length,0);assert.equal(f.get('#locate').disabled,false);assert.equal(f.get('#notice').hidden,false);assert.equal(f.get('#position-label').textContent,'Velg adresse eller min posisjon');
    f.get('#choose-address').onclick();assert.equal(f.get('#address-panel').hidden,false);assert.equal(f.get('#search-address').hidden,false);
  }
});

test('Choosing an address during automatic data loading prevents late GPS address autofill',async()=>{
  const f=harness({hold:true});f.open();const lookup=f.position();f.get('#choose-address').onclick();
  f.get('#search-street').value='Manuell gate';f.release();await lookup;
  assert.deepEqual(values(f),['Manuell gate','9','0001','Tidligere sted']);assert.equal(f.get('#locate').disabled,false);assert.equal(f.get('#search-address').hidden,false);
});

test('Nearby cards keep categories and their errors separate, with independent pagination and the 1 km limit',async()=>{
  const addresses=Array.from({length:80},(_,index)=>({...address,adressekode:index,adressetekst:`Adresse ${index}`,meterDistanseTilPunkt:index*10}));
  addresses.push({...address,adressetekst:'Adresse utenfor',meterDistanseTilPunkt:1001});
  const f=harness({addresses,cultureFailure:true,protectedFeatures:[{geometry:{type:'Point',coordinates:[10.7387,59.9075]},properties:{OBJECTID:1,offisieltNavn:'Mitt reservat',verneform:'NR'}}],properties:[{kommunenummer:'0301',gardsnummer:1,bruksnummer:2,meterFraPunkt:25}]});
  f.open();await f.position();
  assert.match(f.get('#near-culture').innerHTML,/Kunne ikke hente data/);
  assert.match(f.get('#near-protected').innerHTML,/Mitt reservat/);assert(!f.get('#near-protected').innerHTML.includes('Adresse 0'));
  assert.match(f.get('#near-property').innerHTML,/Gnr. 1 \/ bnr. 2/);
  assert.match(f.get('#near-address').innerHTML,/80 treff/);assert(!f.get('#near-address').innerHTML.includes('Adresse utenfor'));
  assert.equal((f.get('#near-address').innerHTML.match(/class="result"/g)||[]).length,40);assert.match(f.get('#near-address').innerHTML,/Vis flere adresser/);
  const propertyHtml=f.get('#near-property').innerHTML,requests=f.requests.length;
  f.more('address');assert.equal((f.get('#near-address').innerHTML.match(/class="result"/g)||[]).length,80);assert(!f.get('#near-address').innerHTML.includes('Vis flere adresser'));
  assert.equal(f.get('#near-property').innerHTML,propertyHtml);assert.equal(f.requests.length,requests,'Showing more uses loaded results');
});
