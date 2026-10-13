import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
const here=path.dirname(fileURLToPath(import.meta.url)),staticRoot=path.resolve(here,'../frontend/dist');
const dataDir=path.resolve(process.env.DATA_DIR||path.join(here,'data'));fs.mkdirSync(dataDir,{recursive:true});
const db=new DatabaseSync(path.join(dataDir,'pet.sqlite'));
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,price_cents INTEGER NOT NULL,description TEXT NOT NULL,stock INTEGER NOT NULL CHECK(stock>=0)); CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,total_cents INTEGER NOT NULL,items TEXT NOT NULL);');
const seed=JSON.parse(fs.readFileSync(path.join(here,'catalog.json'),'utf8'));
for(const p of seed)db.prepare('INSERT OR IGNORE INTO products VALUES(?,?,?,?,?,?)').run(p.id,p.name,p.category,p.priceCents,p.description,p.stock);
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
const error=(status,message)=>Object.assign(new Error(message),{status});
const getProduct=db.prepare('SELECT * FROM products WHERE id=?');
const asProduct=p=>({id:p.id,name:p.name,category:p.category,priceCents:p.price_cents,description:p.description,stock:p.stock});
async function readBody(req){if(!req.headers['content-type']?.startsWith('application/json'))throw error(415,'Envie application/json.');let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>16384)throw error(413,'Pedido muito grande.')}try{return JSON.parse(body)}catch{throw error(400,'JSON inválido.')}}
function createOrder(body){
 if(!body||!Array.isArray(body.items)||body.items.length<1||body.items.length>seed.length)throw error(400,'Informe os itens do pedido.');const seen=new Set();
 for(const item of body.items){if(!item||!Number.isSafeInteger(item.productId)||!Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>99||seen.has(item.productId))throw error(400,'Itens ou quantidades inválidos.');seen.add(item.productId)}
 db.exec('BEGIN IMMEDIATE');try{
 const items=body.items.map(item=>{const p=getProduct.get(item.productId);if(!p)throw error(400,'Produto não encontrado.');if(p.stock<item.quantity)throw error(409,`Estoque demonstrativo insuficiente para ${p.name}.`);return {productId:p.id,name:p.name,quantity:item.quantity,unitPriceCents:p.price_cents}});
 const totalCents=items.reduce((sum,p)=>sum+p.quantity*p.unitPriceCents,0),order={id:crypto.randomUUID(),createdAt:new Date().toISOString(),status:'demonstrativo',totalCents,items};
 for(const item of items)db.prepare('UPDATE products SET stock=stock-? WHERE id=?').run(item.quantity,item.productId);
 db.prepare('INSERT INTO orders VALUES(?,?,?,?)').run(order.id,order.createdAt,totalCents,JSON.stringify(items));db.exec('COMMIT');return order;
 }catch(e){db.exec('ROLLBACK');throw e}
}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');
 try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname==='/api/health'&&req.method==='GET')return json(res,200,{status:'ok',mode:'demo'});
 if(pathname==='/api/products'&&req.method==='GET')return json(res,200,{mode:'demo',products:db.prepare('SELECT * FROM products ORDER BY id').all().map(asProduct)});
 if(pathname==='/api/orders'&&req.method==='POST'){if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)throw error(403,'Origem não permitida.');return json(res,201,createOrder(await readBody(req)))}
 if(pathname.startsWith('/api/'))return json(res,404,{error:'Endpoint não encontrado.'});
 if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return json(res,405,{error:'Método não permitido.'})}
 if(pathname.split('/').some(p=>p.startsWith('.')))throw error(404,'Arquivo não encontrado.');
 let file=path.resolve(staticRoot,'.'+pathname);if(!file.startsWith(staticRoot+path.sep)&&file!==staticRoot)throw error(404,'Arquivo não encontrado.');
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file)||!fs.statSync(file).isFile())throw error(404,'Arquivo não encontrado.');
 const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':fs.statSync(file).size});if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);
 }catch(e){if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'Falha interna do servidor.'});if(!e.status)console.error('Falha no servidor:',e.message)}
});
server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Pet Alegria: frontend + API em modo demonstrativo'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{db.close();process.exit(0)}));
