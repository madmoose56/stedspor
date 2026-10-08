# Stedspor

Første PWA-versjon for iPhone. Åpne den publiserte HTTPS-adressen i Safari, og velg Del → Legg til på Hjem-skjerm. Nettsiden er offentlig på https://madmoose56.github.io/stedspor/.

## Funksjoner

- Adressevalg med gate, nummer/bokstav, postnummer og poststed i Norge. Ett treff åpnes direkte; flere treff kan velges og hentes sidevis fra Kartverkets adresseregister.
- GPS ved aktiv knappetrykk, eller manuelt koordinatpunkt. Ingen bakgrunnssporing.
- Nærmeste adresse merkes som nærmeste adresse, ikke som en bekreftet adresse for eiendommen ved punktet.
- Kommune og fylke slås opp direkte fra punktet.
- Gårds-, bruks-, feste- og seksjonsnummer fra Kartverkets eiendoms-API. Flere eiendommer ved samme punkt vises.
- Kartlagte naturtyper etter Miljødirektoratets instruks, verneområder og kulturminnelokaliteter fra Riksantikvaren.
- Samlet og kategorifiltrert liste, sortert etter avstand, innen 100 meter eller 1 kilometer. 1-kilometerlisten inkluderer også treffene innen 100 meter.
- Matrikkelen-kortet kan åpne GeoNorges eiendomskart teig i halv bredde og i full størrelse, med teiggrenser, grensepunkter og matrikkelnummer fra Matrikkelkart WMS.
- Detaljer og lenker til originalkildene. Kulturminner kan være fjernet eller ikke synlige i terrenget.
- Nettfeil vises per datakilde. Ingen oppdiktede eiernavn, signalverdier eller karttreff.
- Manifest, PNG-ikoner og service worker for appskallet. Nye data og kart krever nett; GPS-resultater lagres ikke mellom økter.

## Begrensninger og videre integrasjoner

Eier er **ikke automatisk hentet**. Lenken til [Eiendomsregisteret](https://eiendomsregisteret.kartverket.no/) krever innlogging. Automatisk integrasjon må etableres med avtalt tilgang og riktige vilkår hos Kartverket. Se [eiendomsdata](https://www.kartverket.no/api-og-data/eiendomsdata/).

Mobilnett vises med lenker til Telenor, Telia og ice. Dekning og signalstyrke ved punktet er **ikke integrert**. Avtal en georeferert dekningsdatatjeneste og merk beregnede verdier tydelig. Apple beskriver manglende offentlig signalstyrke-API i [utviklerforumet](https://developer.apple.com/forums/thread/113534). Dette løses ikke automatisk ved native konvertering.

Avstander for eiendom bruker API-feltet `meterFraPunkt`; adresser bruker `meterDistanseTilPunkt`. Natur og kulturminner beregnes til nærmeste del av geometri, med 0 meter ved overlapp. Beregningen bruker lokal meterprojeksjon og er omtrentlig. Matrikkelgrenser og GPS kan være upresise. Dette er en oppslagsapp, ikke dokumentasjon av rettslige grenser.

Kartet nederst kan flyttes og zoomes. Det viser valgt punkt, ringer på 100 m og 1 km, eiendomsgrenser fra Kartverkets WMS og polygoner for naturtyper og verneområder innen 1 km. Naturreservater og øvrige verneområder kan slås av og på hver for seg. Oppsummeringene har tre atskilte avstandsgrupper uten dobbelttelling. Naturtypelaget er ikke en fullstendig klassifikasjon av all natur eller arealdekke.

Offentlige kilder hentes direkte fra nettleseren. CORS, API-endringer og nedetid kan påvirke oppslag. For en produksjonsapp med eier- og dekningsavtaler bør det etableres en backend med hemmeligheter på serveren, validerte datakontrakter, overvåking og avtalt oppdatering.

## Kjør lokalt

Node.js 22 eller nyere anbefales. Ingen npm-avhengigheter kreves for nettversjonen.

```sh
npm test
npm run preview
```

Åpne http://127.0.0.1:4188. GPS på en iPhone krever HTTPS, eller en egnet lokal utviklingsløsning. Hosting konfigureres i `.openai/hosting.json`.

## Senere native iOS med Capacitor

`capacitor.config.json` peker på de samme nettfilene i `dist`. Native app er ikke bygget eller testet i denne leveransen. iOS bygges på Mac med Xcode og må signeres og testes på en ekte iPhone.

Utgangspunkt, etter [Capacitors installasjonsveiledning](https://capacitorjs.com/docs/getting-started) og [iOS-dokumentasjon](https://capacitorjs.com/docs/ios):

```sh
npm install @capacitor/core @capacitor/ios
npm install -D @capacitor/cli
npx cap add ios
npx cap sync ios
npx cap open ios
```

Velg et endelig app-ID før du oppretter plattformen. Legg til en beskrivende `NSLocationWhenInUseUsageDescription` i iOS Info.plist, for eksempel «Stedspor bruker posisjonen din for å finne eiendom, natur og kulturminner i nærheten». Test posisjonstillatelser, CORS fra native origin, eksterne lenker og GPS på fysisk enhet. Ved behov erstattes nettleserens GPS-kall med Capacitors Geolocation-plugin. Service worker støttes ikke nødvendigvis i native WKWebView; appfilene leveres da lokalt av Capacitor.

## Datakilder

- [Kartverket eiendom API](https://api.kartverket.no/eiendom/v1/) – CC BY 4.0.
- [Kartverket adresse API](https://ws.geonorge.no/adresser/v1/) og [kommuneinfo](https://ws.geonorge.no/kommuneinfo/v1/).
- [Miljødirektoratet vern](https://kart.miljodirektoratet.no/arcgis/rest/services/vern/MapServer) og [naturtyper NiN](https://kart.miljodirektoratet.no/arcgis/rest/services/naturtyper_nin/MapServer) – NLOD.
- [Riksantikvaren lokaliteter](https://api.ra.no/LokaliteterEnkeltminnerOgSikringssoner) – NLOD. Områder uten geometri utelates eksplisitt med CQL-filter.
- [Kartverket bakgrunnskart](https://cache.kartverket.no/) og [matrikkel-WMS](https://wms.geonorge.no/skwms1/wms.matrikkel?service=WMS&request=GetCapabilities). Kartbilder lagres ikke uten nett. Leaflet 1.9.4 ligger lokalt i dist/vendor med lisens.



## Kildekode på GitHub

Offentlig repository: https://github.com/madmoose56/stedspor. Se VERSJONER.md for oppdateringer, tagger og forskjellen mellom GitHub og Sites-publisering.


## GitHub Pages

Se GITHUB-PAGES.md for publisering på https://madmoose56.github.io/stedspor/. Kjør npm run pages:prepare før commit av appendringer.

