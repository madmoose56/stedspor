import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPlans,PLAN_START_URL} from '../dist/plans.js';
import {bounds} from '../dist/geo.js';
const point=[10.7387,59.9075];
const feature=(id,coordinates=point)=>({id,geometry:{type:'Point',coordinates},properties:{plannavn:`Plan ${id}`,nasjonalArealplanId:{kommunenummer:'0301',planid:`P${id}`},plantype:'Detaljregulering',kunngjøringsdatoVarselOmPlanoppstart:'2026-01-02'}});

test('Plan starts are filtered to a 1 km circle, deduplicated and never labelled as adopted plans or purposes',async()=>{
  const extent=bounds(point,900),outside=bounds(point,1001);
  const data=await loadPlans(point,async()=>({features:[feature(1),feature(1),feature(2,[point[0],outside[3]]),feature(3,[extent[2],extent[3]]),{id:4,geometry:null,properties:{}}]}));
  assert.equal(data.items.length,1);assert.equal(data.items[0].data.status,'Planlegging igangsatt');assert.equal(data.items[0].data.purpose,null);assert.equal(data.items[0].data.planId,'P1');assert.equal(data.sources.at(-1).status,'unavailable');
});
test('All documented next pages are read, and unsafe pagination is treated as missing source data',async()=>{
  let count=0;const fetchJson=async()=>++count===1?{features:[feature(1)],links:[{rel:'next',href:PLAN_START_URL+'?offset=1'}]}:{features:[feature(2)],links:[]};
  const data=await loadPlans(point,fetchJson);assert.equal(data.items.length,2);assert.equal(count,2);
  let requests=0;const invalid=await loadPlans(point,async()=>{requests++;return {features:[feature(1)],links:[{rel:'next',href:'https://elsewhere.example/'}]};});
  assert.equal(requests,1);assert.equal(invalid.sources[0].status,'error');assert.equal(invalid.items.length,0);
});
test('Bergen exposes plans, new and older purpose codes and official names from the municipal renderer',async()=>{
  const requests=[];const result=await loadPlans(point,async url=>{
    requests.push(url);if(url.startsWith(PLAN_START_URL))return {features:[]};
    const layer=Number(new URL(url).pathname.split('/').at(new URL(url).pathname.includes('/query')?-2:-1));
    if(!url.includes('/query'))return {drawingInfo:{renderer:{uniqueValueInfos:[{value:layer===43?'1110':'110',label:layer===43?'1110 - Boligbebyggelse':'Områder for boliger'}]}}};
    return {features:[{id:layer,geometry:{type:'Point',coordinates:point},properties:{OBJECTID:layer,PLANNAVN:'Kommunal plan',PLANID:'0007',PLANSTAT:3,PLANTYPE:35,RPAREALFORMAL:layer===43?1110:undefined,REGFORM:layer===42?110:undefined,IKRAFT:0,URL:'javascript:alert(1)'}}]};
  },undefined,Promise.resolve({kommunenummer:'4601'}));
  assert.equal(result.items.length,3);assert.equal(result.sources.length,4);assert(result.sources.every(source=>source.status==='ok'));
  const plan=result.items.find(item=>item.kind==='area'),purposes=result.items.filter(item=>item.kind==='purpose');
  assert.equal(plan.data.status,'Gjeldende plan');assert.equal(plan.data.planType,'Detaljregulering');assert.equal(plan.data.effective,'1970-01-01');assert.equal(plan.data.planId,'0007');assert(plan.href.startsWith('https://www.arealplaner.no/'));
  assert(purposes.some(item=>item.title==='1110 - Boligbebyggelse'));assert(purposes.some(item=>item.title==='Områder for boliger'));
  assert(requests.filter(url=>url.includes('/query')).every(url=>new URL(url).searchParams.get('inSR')==='4326'));
});
test('An unavailable municipal source does not remove open national results or imply no planning exists',async()=>{
  const result=await loadPlans(point,async url=>{if(url.startsWith(PLAN_START_URL))return {features:[feature(1)]};throw Error('Service unavailable');},undefined,Promise.resolve({kommunenummer:'4601'}));
  assert.equal(result.items.length,1);assert.equal(result.sources[0].status,'ok');assert.equal(result.sources.filter(source=>source.status==='error').length,3);
});
test('Empty coverage and malformed responses are distinct from a source returning no matches',async()=>{
  const empty=await loadPlans(point,async()=>({features:[]}));assert.equal(empty.sources[0].status,'ok');assert.equal(empty.sources[1].status,'unavailable');
  const broken=await loadPlans(point,async()=>({}));assert.equal(broken.sources[0].status,'error');
});
test('Cancelled lookups stop before any next page is requested',async()=>{
  const controller=new AbortController();let count=0;
  await assert.rejects(loadPlans(point,async()=>{count++;controller.abort();return {features:[],links:[{rel:'next',href:PLAN_START_URL+'?offset=1'}]};},controller.signal),{name:'AbortError'});
  assert.equal(count,1);
});
