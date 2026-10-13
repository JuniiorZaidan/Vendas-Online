import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const port=s.address().port;await new Promise(r=>s.close(r));return port}
async function start(port,data){const p=spawn(process.execPath,['backend/server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),DATA_DIR:data},stdio:['ignore','pipe','pipe']});let logs='';p.stderr.on('data',s=>logs+=s);for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${port}/api/health`)).ok)return p}catch{}if(p.exitCode!==null)throw Error(logs);await new Promise(r=>setTimeout(r,50))}p.kill();throw Error('Servidor não iniciou: '+logs)}
async function stop(p){await new Promise(r=>{p.once('exit',r);p.kill('SIGTERM')})}
test('Catálogo, preços no servidor, estoque transacional, validação e persistência',async()=>{
 const port=await freePort(),dir=mkdtempSync(path.join(tmpdir(),'pet-test-'));let p;
 const base=`http://127.0.0.1:${port}`;const post=items=>fetch(base+'/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items,totalCents:1})});
 try{p=await start(port,dir);let catalog=await (await fetch(base+'/api/products')).json();assert.equal(catalog.products.length,34);
 let response=await post([{productId:1,quantity:2}]);assert.equal(response.status,201);const order=await response.json();assert.equal(order.totalCents,25980);assert.equal(order.status,'demonstrativo');assert.match(order.id,/^[a-f0-9-]{36}$/);
 assert.equal((await post([{productId:1,quantity:0}])).status,400);assert.equal((await post([{productId:999,quantity:1}])).status,400);assert.equal((await post([{productId:1,quantity:1},{productId:1,quantity:1}])).status,400);
 assert.equal((await post([{productId:2,quantity:1},{productId:1,quantity:49}])).status,409);catalog=await (await fetch(base+'/api/products')).json();assert.equal(catalog.products.find(x=>x.id===2).stock,50);assert.equal(catalog.products[0].stock,48);
 const concurrent=await Promise.all([post([{productId:1,quantity:30}]),post([{productId:1,quantity:30}])]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[201,409]);
 assert.equal((await fetch(base+'/.git/config')).status,404);assert.equal((await fetch(base+'/backend/data/pet.sqlite')).status,404);
 const cross=await fetch(base+'/api/orders',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://foreign.invalid'},body:JSON.stringify({items:[{productId:2,quantity:1}]})});assert.equal(cross.status,403);
 await stop(p);p=null;p=await start(port,dir);catalog=await (await fetch(base+'/api/products')).json();assert.equal(catalog.products[0].stock,18);
 }finally{if(p)await stop(p);rmSync(dir,{recursive:true,force:true})}
});
