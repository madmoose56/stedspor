import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve('dist');const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}fs.readFile(p,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(p)]||'text/plain'});res.end(e?'Not found':b);});}).listen(4188,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4188'));


