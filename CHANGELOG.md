# Endringslogg

## Ikke utgitt

- Tema 20: Befolkning og områdestatistikk med kommunens folketall, tetthet, areal, landareal, årlig endring og fem siste årganger fra SSB. År, geografisk nivå og kilder vises; manglende tall og oppslagsfeil håndteres uten å vise gamle tall for et nytt sted.

- Nytt tema Arealplaner og regulering: planoppstart fra DiBK og kommunale planområder/arealformål fra Bergen, med kartlag, 1 km-avgrensning, plan-ID, status, kildelenker og tydelig dekning/feil per kilde.

- Fjernet Velg sted uten GPS og den samlede Rundt deg-listen. I nærheten viser kulturminner, verneområder, eiendommer og adresser i hvert sitt felt innen 1 km, med uavhengig kildestatus og Vis flere.

- Min posisjon starter automatisk ved åpning og står til venstre. Velg adresse står til høyre og avbryter et ventende GPS-oppslag. Naturtyper er fjernet fra datakilder, kartlag, kategorier og visninger.

- Fjernet de to separate oversiktskortene for natur/verneområder og kulturminner over kartet. Kartlag og trefflisten i I nærheten beholdes.

- Kulturminneoversikten angir 1 km fra valgt posisjon. Liste og kart bruker samme avgrensning; treff utenfor sirkelen utelates selv om de ligger innenfor søkets firkantede kartutsnitt.

- Kartvalget Eiendomsgrenser er fjernet. Kulturminner vises som områder og trykkbare K-markører med samme nummer i oversikten, trefflisten og detaljene.

- GPS-adressefeltet viser bare adressefeltene: overskrift, søkehjelp, søkeknapp og adressestatus skjules når Min posisjon er valgt. Adresse åpner det vanlige adressesøket igjen.

- Min posisjon åpner adressefeltet og fyller gate, husnummer/bokstav, postnummer og poststed fra nærmeste registrerte Kartverket-adresse. Avstanden vises; sene GPS-svar og manuelle redigeringer beskyttes.

- Fjernet forklaringsteksten under den nærmeste adressen i adressekortet.

- Eiendomskartet er kvadratisk i full kortbredde. Knappen Full størrelse ligger i kartet med to tekstlinjer. Kildehenvisning vises utenfor kartbildet.

- Eiendomskart teig fra GeoNorges Matrikkelkart WMS kan åpnes i Matrikkelen-kortet ved valgt posisjon. Forhåndsvisning med halv bredde og utvidelse til full størrelse.

- Ny overskrift: Sted info. Adressevalg til venstre og Min posisjon til høyre.
- Norske adressesøk med gate, husnummer/bokstav, postnummer og poststed fra Kartverket. Valgt adresse bruker eksisterende stedsoppslag og kart.

- Økt små tekststørrelser og underoverskrifter, med relativ skriftstørrelse, større trykkflater og fleksibel tekstbryting på mobil.

- Valgt avstandsring fyller tilgjengelig kartutsnitt med liten kant. En kompakt knapp bytter mellom 100 m og 1 km. Alle nye posisjonsoppslag starter på 100 m.

- Kartet starter med 100 meters utsnitt. Velg 100 m eller 1 km øverst til høyre; begge valg sentrerer kartet på posisjonen.

- Nye oppsummeringer nederst for natur/vern og kulturminner, gruppert ved punktet, innen 100 m og mellom 100 m og 1 km.
- Interaktivt kart nederst med Kartverkets bakgrunnskart, eiendomsgrenser, naturreservater, øvrige verneområder og naturtyper. Lokal Leaflet 1.9.4, avstandsringer og retur til valgt posisjon.

- Fjernet Stedskart-boksen. Resultatene vises i full bredde, med manuelt stedsvalg under GPS-knappen.

## 0.1.0 – 2026-10-08

- Første PWA med GPS og manuelt koordinatoppslag.
- Adresse, kommune/fylke, eiendom, verneområder, naturtyper og kulturminnelokaliteter fra offentlige datakilder.
- Avstandssorterte treff innen 100 meter og 1 kilometer.
- Kart, kategoriutvalg og detaljvisning.
- Manifest, appikoner og service worker for appskallet.
- Capacitor-konfigurasjon for senere native iOS-arbeid.
- Eier- og mobildekningsintegrasjon er ikke tilkoblet; kildelenker og begrensninger vises i appen.
- GitHub-repository og versjonsrutine etablert.
