import {bounds,geometryDistance} from './geo.js';

export const PLAN_START_URL='https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/collections/planomrade/items';
export const BERGEN_PLAN_URL='https://kart.bergen.kommune.no/arcgis/rest/services/Plan/Reguleringsplaner_p%C3%A5_grunnen/MapServer';
const labelsCache=new Map();
const statusNames={0:'Planinitiativ',1:'Planlegging igangsatt',2:'Planforslag',3:'Gjeldende plan',4:'Opphevet',5:'Utgått/erstattet',6:'Vedtatt plan med utsatt rettsvirkning',9:'Avvist',10:'Trukket/uaktuell'};
const typeNames={30:'Eldre reguleringsplan',31:'Mindre reguleringsendring',32:'Bebyggelsesplan etter reguleringsplan',33:'Bebyggelsesplan etter kommuneplan',34:'Områderegulering',35:'Detaljregulering'};
const query=(base,params)=>`${base}?${new URLSearchParams(params)}`;
const valid=(point,item)=>{item.distance=geometryDistance(point,item.geometry);return Number.isFinite(item.distance)&&item.distance>=0&&item.distance<=1000;};
const unique=items=>[...new Map(items.map(item=>[item.key,item])).values()];
const safeLink=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
const dateText=value=>{if(value===null||value===undefined||value==='')return null;const date=new Date(value);return Number.isNaN(date.getTime())?null:date.toISOString().slice(0,10);};

async function startedPlans(point,fetchJson,signal){
  const features=[],visited=new Set();let next=query(PLAN_START_URL,{f:'json',bbox:bounds(point,1020).join(','),limit:500});
  for(let page=0;next&&page<20;page++){
    signal?.throwIfAborted();const u=new URL(next);
    if(u.origin!=='https://plandata.ft.dibk.no'||!u.pathname.startsWith('/services/rest/planleggingigangsatt/collections/planomrade/items')||visited.has(u.href))throw Error('Uventet neste planside');
    visited.add(u.href);const data=await fetchJson(u.href,signal);signal?.throwIfAborted();
    if(!Array.isArray(data.features))throw Error('Ugyldige plandata');features.push(...data.features);
    const link=data.links?.find(link=>link.rel==='next');next=link?new URL(link.href,u).href:null;
    if(page===19&&next)throw Error('For mange planområder');
  }
  return unique(features.map((feature,index)=>{
    const a=feature.properties??{},id=a.nasjonalArealplanId??{};
    return {key:`plan:start:${feature.id??a.identifikasjon?.lokalId??index}`,type:'plan',kind:'start',title:a.plannavn||`Planoppstart ${id.planid||feature.id||''}`,subtitle:`Planlegging igangsatt · ${a.plantype||'Planområde'}`,geometry:feature.geometry,
      href:safeLink(a.link)||safeLink(feature.links?.find(link=>link.rel==='related'&&link.title?.startsWith('Arealplan'))?.href),source:'DiBK – planlegging igangsatt',
      data:{planId:id.planid,municipality:id.kommunenummer,status:'Planlegging igangsatt',planType:a.plantype,purpose:null,announced:a.kunngjøringsdatoVarselOmPlanoppstart,updated:a.oppdateringsdato}};
  }).filter(item=>valid(point,item)));
}

async function layerLabels(layer,fetchJson,signal){
  if(labelsCache.has(layer))return labelsCache.get(layer);
  const metadata=await fetchJson(query(`${BERGEN_PLAN_URL}/${layer}`,{f:'json'}),signal),labels=new Map();
  for(const entry of metadata.drawingInfo?.renderer?.uniqueValueInfos??[])if(entry.label)labels.set(String(entry.value),entry.label);
  labelsCache.set(layer,labels);return labels;
}

async function bergenLayer(point,layer,fetchJson,signal){
  const features=[],labelsPromise=layer===44?Promise.resolve(new Map()):layerLabels(layer,fetchJson,signal).catch(()=>new Map());
  for(let page=0;page<20;page++){
    signal?.throwIfAborted();const data=await fetchJson(query(`${BERGEN_PLAN_URL}/${layer}/query`,{f:'geojson',where:'1=1',geometry:bounds(point,1020).join(','),geometryType:'esriGeometryEnvelope',inSR:4326,spatialRel:'esriSpatialRelIntersects',outFields:'*',outSR:4326,returnGeometry:true,geometryPrecision:6,resultOffset:page*500,resultRecordCount:500,orderByFields:'OBJECTID'}),signal);
    signal?.throwIfAborted();if(!Array.isArray(data.features))throw Error('Ugyldige kommunale plandata');features.push(...data.features);
    if(!data.exceededTransferLimit&&!data.properties?.exceededTransferLimit&&data.features.length<500)break;
    if(!data.features.length||page===19)throw Error('Ufullstendige kommunale plandata');
  }
  const labels=await labelsPromise;signal?.throwIfAborted();
  return unique(features.map((feature,index)=>{
    const a=feature.properties??{},isArea=layer===44,code=isArea?null:a.RPAREALFORMAL??a.REGFORM;
    const purpose=code===null||code===undefined?null:labels.get(String(code))||`Arealformål – kode ${code}`;
    const title=isArea?a.PLANNAVN||`Reguleringsplan ${a.PLANID||''}`:purpose||a.BESKRIVELSE||'Arealformål uten oppgitt kode';
    const register=a.PLANID?query('https://www.arealplaner.no/bergen4601/gi',{funksjon:'VisPlan',planidentifikasjon:a.PLANID,kommunenummer:'4601'}):null;
    return {key:`plan:bergen:${layer}:${a.OBJECTID??feature.id??index}`,type:'plan',kind:isArea?'area':'purpose',title,subtitle:`${isArea?statusNames[a.PLANSTAT]||'Planstatus ikke oppgitt':layer===42?'Reguleringsformål – eldre lov':'Arealformål'} · Plan-ID ${a.PLANID||'ikke oppgitt'} · På grunnen`,geometry:feature.geometry,href:safeLink(a.URL)||register,source:'Bergen kommune',
      data:{planId:a.PLANID,municipality:'4601',status:isArea?statusNames[a.PLANSTAT]||`Kode ${a.PLANSTAT??'ikke oppgitt'}`:'Arealformål fra kommunens reguleringskart',planType:isArea?typeNames[a.PLANTYPE]||String(a.PLANTYPE??'Ikke oppgitt'):null,purpose,purposeCode:code,fieldName:a.FELTNAVN,description:a.BESKRIVELSE,level:'På grunnen/vannoverflaten',effective:dateText(a.IKRAFT)}};
  }).filter(item=>valid(point,item)));
}

export async function loadPlans(point,fetchJson,signal,municipalityPromise=Promise.resolve(null)){
  const start=startedPlans(point,fetchJson,signal);start.catch(()=>{});
  const jobs=[{id:'start',label:'Planoppstart (DiBK)',run:start}];
  const municipality=await municipalityPromise.catch(()=>null);signal?.throwIfAborted();
  if(String(municipality?.kommunenummer)==='4601')for(const [layer,label] of [[44,'Planområder (Bergen)'],[43,'Arealformål (Bergen)'],[42,'Reguleringsformål etter eldre lov (Bergen)']])jobs.push({id:`bergen-${layer}`,label,run:bergenLayer(point,layer,fetchJson,signal)});
  const results=await Promise.allSettled(jobs.map(job=>job.run));signal?.throwIfAborted();
  const sources=results.map((result,index)=>({id:jobs[index].id,label:jobs[index].label,status:result.status==='fulfilled'?'ok':'error'}));
  if(String(municipality?.kommunenummer)!=='4601')sources.push({id:'local',label:'Vedtatte planer og arealformål',status:'unavailable',note:'Automatisk oppslag i vedtatte planer og arealformål er foreløpig tilgjengelig for Bergen. Planoppstart hentes fra DiBK der kommunen har levert data.'});
  return {items:unique(results.flatMap(result=>result.status==='fulfilled'?result.value:[])),sources};
}
