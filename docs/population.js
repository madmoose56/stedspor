const API='https://data.ssb.no/api/pxwebapi/v2/tables/11342/data';
export const populationSource='https://www.ssb.no/statbank/table/11342/';
const measures=['Folkemengde','ArealKm2','LandArealKm2','FolkeLandArealKm2'];

export function populationUrl(municipalityCode){
  if(!/^\d{4}$/.test(municipalityCode))throw Error('Ugyldig kommunenummer');
  return `${API}?${new URLSearchParams({lang:'no','valueCodes[Region]':municipalityCode,'valueCodes[ContentsCode]':measures.join(','),'valueCodes[Tid]':'top(5)'})}`;
}

function codes(category){
  if(Array.isArray(category?.index))return category.index;
  return Object.entries(category?.index||{}).sort((a,b)=>a[1]-b[1]).map(([code])=>code);
}

export function parsePopulation(dataset,municipalityCode,municipalityName){
  if(dataset?.class!=='dataset'||!Array.isArray(dataset.id)||dataset.id.length!==3||!Array.isArray(dataset.size)||dataset.size.length!==3)throw Error('Uventet SSB-format');
  const dimensions=['Region','ContentsCode','Tid'];
  if(!dimensions.every(id=>dataset.id.includes(id)))throw Error('Uventede SSB-dimensjoner');
  const region=codes(dataset.dimension?.Region?.category);
  if(region.length!==1||region[0]!==municipalityCode)throw Error('Statistikken gjelder en annen kommune');
  const years=codes(dataset.dimension?.Tid?.category);
  const contents=codes(dataset.dimension?.ContentsCode?.category);
  if(!years.length||years.some(year=>!/^\d{4}$/.test(year))||!measures.every(code=>contents.includes(code)))throw Error('Manglende SSB-variabler');
  for(let i=0;i<dataset.id.length;i++)if(dataset.size[i]!==codes(dataset.dimension[dataset.id[i]]?.category).length)throw Error('Ufullstendige SSB-dimensjoner');
  function read(measure,year){
    const positions={Region:0,ContentsCode:contents.indexOf(measure),Tid:years.indexOf(year)};
    const index=dataset.id.reduce((offset,id,i)=>offset*dataset.size[i]+positions[id],0);
    const value=dataset.value?.[index];
    return typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
  }
  const series=years.map(year=>{
    const area=read('ArealKm2',year),landArea=read('LandArealKm2',year);
    // SSB can return zero in all cells for years before a municipality code existed.
    const available=area>0&&landArea>0;
    return {year,population:available?read('Folkemengde',year):null,area:available?area:null,landArea:available?landArea:null,density:available?read('FolkeLandArealKm2',year):null};
  }).sort((a,b)=>Number(a.year)-Number(b.year));
  const latest=series.at(-1),previous=series.find(row=>Number(row.year)===Number(latest.year)-1);
  const change=latest.population!==null&&previous?.population!==null&&previous?.population!==undefined?latest.population-previous.population:null;
  const changePercent=change!==null&&previous.population>0?change/previous.population*100:null;
  return {municipalityCode,municipalityName,latest,series,change,changePercent,previousYear:previous?.year,updated:dataset.updated||null,available:latest.population!==null};
}

export async function loadPopulation(municipalityPromise,fetchJson,signal){
  let municipality;
  try{municipality=await municipalityPromise;}catch{throw Error('Kunne ikke finne kommunen for valgt sted. Oppdater posisjonen eller velg en adresse.');}
  const code=String(municipality?.kommunenummer||'');
  if(!/^\d{4}$/.test(code))throw Error('Kommunenummer mangler for valgt sted. Oppdater posisjonen eller velg en adresse.');
  try{return parsePopulation(await fetchJson(populationUrl(code),signal),code,municipality.kommunenavn||code);}
  catch{throw Error('Kunne ikke hente statistikk fra SSB. Oppdater posisjonen eller prøv igjen senere.');}
}
