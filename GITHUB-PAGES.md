# Publisering med GitHub Pages

Nettadresse: https://madmoose56.github.io/stedspor/

GitHub Pages skal bruke grenen `main`, mappen `/docs`.

`dist/` er appens kildefiler for nettpublisering og Capacitor. `docs/` er den genererte publiseringskopien. Ikke rediger direkte i `docs/`.

Ved hver oppdatering, kjør fra `D:\GitHub\stedspor`:

```powershell
git pull --ff-only origin main
# Rediger appen i dist/.
npm test
npm run pages:prepare
git add .
git commit -m "Beskriv endringen"
git push origin main
```

GitHub bygger og publiserer den nye nettsiden etter push til `main`. Se Actions og Settings → Pages i repositoriet for status. Dette nettstedet er separat fra den tidligere Sites-adressen; den oppdateres ikke av GitHub Pages.

## iPhone

Åpne GitHub Pages-adressen i Safari → Del → Legg til på Hjem-skjerm. Alle appfiler bruker relative stier, og PWA-manifestets identitet og scope følger prosjektmappen `/stedspor/`. Nye kart og oppslag krever internett. Native Capacitor bruker fortsatt `dist/`, ikke `docs/`.
