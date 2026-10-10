import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePopulation,populationUrl,loadPopulation} from '../dist/population.js';

function dataset(){
  return {class:'dataset',id:['Tid','Region','ContentsCode'],size:[3,1,4],updated:'2026-02-27T07:00:00Z',dimension:{Tid:{category:{index:{2026:0,2024:1,2025:2}}},Region:{category:{index:{'0301':0}}},ContentsCode:{category:{index:{LandArealKm2:0,Folkemengde:1,FolkeLandArealKm2:2,ArealKm2:3}}}},value:[426,728714,1709,454,426,717710,1683,454,426,724290,1699,454]};
}

test('maps SSB cells independently of dimension, measure and year order',()=>{
  const result=parsePopulation(dataset(),'0301','Oslo');
  assert.deepEqual(result.latest,{year:'2026',population:728714,area:454,landArea:426,density:1709});
  assert.deepEqual(result.series.map(row=>row.year),['2024','2025','2026']);
  assert.equal(result.change,4424);
  assert.ok(Math.abs(result.changePercent-0.610805)<0.00001);
});

test('does not present zero cells for years before a municipality existed as zero residents',()=>{
  const data=dataset();data.value.splice(4,4,0,0,0,0);
  const result=parsePopulation(data,'0301','Oslo');
  assert.equal(result.series[0].population,null);
  assert.equal(result.series[0].area,null);
});

test('missing values stay unavailable and no annual change is calculated across a gap',()=>{
  const data=dataset();data.value=Object.fromEntries(data.value.map((value,index)=>[index,value]));delete data.value[9];
  const result=parsePopulation(data,'0301','Oslo');
  assert.equal(result.series[1].population,null);
  assert.equal(result.change,null);
  assert.equal(result.changePercent,null);
  data.value[1]=null;
  assert.equal(parsePopulation(data,'0301','Oslo').available,false);
});

test('rejects statistics for another municipality and malformed dimensions',()=>{
  assert.throws(()=>parsePopulation(dataset(),'3201','Bærum'),/annen kommune/);
  const data=dataset();data.size[0]=4;
  assert.throws(()=>parsePopulation(data,'0301','Oslo'),/Ufullstendige/);
});

test('keeps leading zero in municipality query and does not send coordinates to SSB',()=>{
  const url=new URL(populationUrl('0301'));
  assert.equal(url.searchParams.get('valueCodes[Region]'),'0301');
  assert.equal(url.searchParams.get('valueCodes[Tid]'),'top(5)');
  assert.equal(url.searchParams.has('lat'),false);
  assert.throws(()=>populationUrl('301'),/Ugyldig/);
});

test('does not query SSB when municipality lookup fails',async()=>{
  let calls=0;
  await assert.rejects(loadPopulation(Promise.reject(Error('offline')),async()=>{calls++;}),/finne kommunen/);
  assert.equal(calls,0);
});
