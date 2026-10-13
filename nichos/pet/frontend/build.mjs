import fs from 'node:fs';
import path from 'node:path';

const root=path.dirname(new URL(import.meta.url).pathname);
const catalog=JSON.parse(fs.readFileSync(path.join(root,'../backend/catalog.json'),'utf8'));
const rows=catalog.map(p=>[p.name,p.category,p.priceCents/100,p.description]);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const out=path.join(root,'dist');fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
for(const file of ['index.html','style.css','app.js'])fs.copyFileSync(path.join(root,file),path.join(out,file));
fs.cpSync(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
fs.writeFileSync(path.join(out,'catalog.js'),'window.PET_CATALOG='+JSON.stringify(catalog)+';\n');
const links=[];
for(const [i,r] of rows.entries()){
 const url=`produtos/${slug(r[0])}/`;
 fs.mkdirSync(path.join(out,url),{recursive:true});
 const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(r[0])} | Pet Alegria</title><meta name="description" content="${esc(r[3])} Produto e preço demonstrativos."><link rel="stylesheet" href="../../style.css"></head><body><div class="topline">Pet Alegria · Catálogo demonstrativo</div><header><a class="brand" href="../../">🐾 petalegria</a><a href="../../">Voltar à loja</a></header><main class="product-page"><span class="product-art" role="img" aria-label="Ilustração de ${esc(r[0])}" style="--x:${i%6*20}%;--y:${Math.floor(i/6)*20}%"></span><section><p class="category">${esc(r[1])}</p><h1>${esc(r[0])}</h1><p>${esc(r[3])}</p><h2>${r[2].toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</h2><p>Ilustração criada para este catálogo. Produto, preço e disponibilidade demonstrativos; não representam marca ou embalagem comercial confirmada.</p><a class="primary" href="../../?adicionar=${i+1}">Adicionar à sacola</a><p>Não há pagamento ou reserva de estoque nesta versão.</p></section></main><footer><a href="../../">Ver todos os produtos</a></footer></body></html>`;
 fs.writeFileSync(path.join(out,url,'index.html'),html);links.push(url);
}
const base=process.env.SITE_URL;
if(base){const parsed=new URL(base);if(parsed.protocol!=='https:')throw Error('SITE_URL deve usar HTTPS');fs.writeFileSync(path.join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['',...links].map(p=>`<url><loc>${esc(new URL(p,base.endsWith('/')?base:base+'/').href)}</loc></url>`).join('')}</urlset>`)}else fs.rmSync(path.join(out,'sitemap.xml'),{force:true});
fs.writeFileSync(path.join(out,'robots.txt'),`User-agent: *\nAllow: /\n${base?`Sitemap: ${new URL('sitemap.xml',base.endsWith('/')?base:base+'/').href}\n`:''}`);
console.log(`Build concluído: ${rows.length} páginas de produtos em dist/.`);
