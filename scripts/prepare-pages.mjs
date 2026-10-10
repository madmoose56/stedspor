import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const destination=path.join(project,'docs');
const files=['index.html','style.css','app.js','geo.js','plans.js','population.js','address-search.js','manifest.webmanifest','sw.js','icon-192.png','icon-512.png','vendor/leaflet.js','vendor/leaflet.css','vendor/LICENSE-leaflet.txt'];
for(const name of files){if(!fs.existsSync(path.join(project,'dist',name)))throw Error(`Missing PWA file: ${name}`);}
fs.mkdirSync(destination,{recursive:true});
for(const name of files){fs.mkdirSync(path.dirname(path.join(destination,name)),{recursive:true});fs.copyFileSync(path.join(project,'dist',name),path.join(destination,name));}
fs.writeFileSync(path.join(destination,'.nojekyll'),'');
console.log('Prepared GitHub Pages files in docs/. Commit and push docs/ with the source changes.');
