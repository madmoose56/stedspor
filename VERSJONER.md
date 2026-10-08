# Versjoner og oppdateringer

Repository: https://github.com/madmoose56/stedspor (privat).

Arbeidsmappe: `D:\GitHub\stedspor`.

`main` er hovedgrenen. Første GitHub-versjon er merket `v0.1.0`. Eksisterende Git-historikk fra Sites er beholdt.

## Vanlig oppdatering

Kjør fra arbeidsmappen:

```powershell
git pull --ff-only origin main
# Gjør endringer i dist/ eller andre prosjektfiler.
npm test
node --check dist/app.js
node --check dist/sw.js
git add .
git commit -m "Beskriv endringen"
git push origin main
```

For større endringer kan du bruke en egen gren og pull request:

```powershell
git switch -c feature/beskriv-endringen
# Gjør og test endringer, og commit dem.
git push -u origin feature/beskriv-endringen
```

## Merk en ny versjon

Oppdater `version` i package.json og legg til endringene i CHANGELOG.md. Commit og push først. Merk så den ferdige versjonen, for eksempel:

```powershell
git tag -a v0.2.0 -m "Stedspor 0.2.0"
git push origin v0.2.0
```

Velg alltid et ubrukt versjonsnummer. Ikke flytt tidligere publiserte tagger.

## Nettsiden i Sites

GitHub brukes til kildekode og historikk. Et push til GitHub oppdaterer **ikke automatisk** den publiserte nettsiden https://stedspor.steinarneh.chatgpt.site.

Sites bruker et separat kilderepository. `.openai/hosting.json` beholder koblingen til det eksisterende nettstedet. Ved oppdatering av nettsiden må endringene også synkroniseres og publiseres gjennom Sites. Be for eksempel Codex om å «publisere siste versjon av Stedspor fra D:\GitHub\stedspor til eksisterende Sites-nettsted».

GitHub Pages-oppsettet er beskrevet i GITHUB-PAGES.md. Kjør npm run pages:prepare før commit av appendringer. Det lagres ingen tilgangstokener i prosjektet. Native iOS er fremdeles et senere byggesteg beskrevet i README.md.

