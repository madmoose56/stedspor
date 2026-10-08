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
