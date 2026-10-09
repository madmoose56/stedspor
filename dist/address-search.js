export function addressParams({street,number='',postcode='',place=''},page=0){
  street=street.trim();number=number.trim();postcode=postcode.trim();place=place.trim();
  if(!street)throw Error('Skriv inn et gatenavn.');
  if(postcode&&!/^\d{4}$/.test(postcode))throw Error('Postnummer må ha fire sifre.');
  const p={adressenavn:street,utkoordsys:4258,treffPerSide:20,side:page};
  if(number){const match=number.match(/^(\d+)\s*([a-zæøå]?)$/i);if(!match)throw Error('Skriv husnummer, eventuelt med én bokstav, for eksempel 3A.');p.nummer=Number(match[1]);p.bokstav=match[2].toUpperCase();}
  if(postcode)p.postnummer=postcode;
  if(place)p.poststed=place;
  return p;
}

export function nearestAddressFields(items){
  const nearest=items.filter(item=>item.type==='address'&&Number.isFinite(item.distance)&&item.distance>=0).sort((a,b)=>a.distance-b.distance)[0];
  if(!nearest)return null;
  const address=nearest.data??{};
  return {street:address.adressenavn??'',number:address.nummer==null?'':String(address.nummer)+(address.bokstav??'').toUpperCase(),postcode:String(address.postnummer??''),place:address.poststed??'',label:address.adressetekst??nearest.title,distance:nearest.distance};
}
