const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const code = 'NUG-20261003-' + 'A'.repeat(32);
const row = {id:1,order_code:code,user_id:'owner',customer:{email:'private@example.com'},task:{notes:'private',attachments:['private-link']},items:[{name:'private-service'}],total_price:100000,status:'pending',payment_status:'PENDING',estimated_completion:null,created_at:'2026-10-03T00:00:00Z'};
const context = extra => vm.createContext({Request,Response,Headers,URL,TextEncoder,TextDecoder,Uint8Array,crypto:globalThis.crypto,console,...extra});
const response = value => new Response(JSON.stringify(value), {headers:{'content-type':'application/json'}});
function edge(role) {
  let handler;
  const ctx = context({Deno:{env:{get:n=>n==='SUPABASE_URL'?'https://db.example':'server-test-key'},serve:h=>handler=h},fetch:async url=>{
    const u = new URL(url);
    if(u.pathname.endsWith('/rpc/jokiin_rate_limit')) return response(true);
    if(u.pathname.endsWith('/auth/v1/user')) return response({id:role==='owner'?'owner':'other'});
    if(u.pathname.endsWith('/profiles')) return response([{role:role==='admin'?'admin':'user'}]);
    if(u.pathname.endsWith('/orders')) return response([row]);
    throw Error('Unexpected external request');
  }});
  vm.runInContext(stripTypeScriptTypes(fs.readFileSync(path.join(root,'supabase/functions/jokiin-api/index.ts'),'utf8'),{mode:'transform'}),ctx);
  return handler;
}
for(const role of ['guest','other','owner','admin']) test(`tracking privacy: ${role}`,async()=>{
  const headers={'content-type':'application/json'};
  if(role!=='guest')headers.authorization='Bearer test';
  const res=await edge(role)(new Request('https://edge.example',{method:'POST',headers,body:JSON.stringify({action:'track',orderCode:code})}));
  assert.equal(res.status,200);
  const data=await res.json();
  if(['owner','admin'].includes(role)) assert.equal(data.order.task.notes,'private');
  else {
    assert.equal(data.order.detail_restricted,true);
    for(const field of ['id','user_id','customer','task','notes','items','total_price']) assert.equal(field in data.order,false,field);
  }
});
function worker({allowed=true}={}) {
  const requests=[];
  const ctx=context({fetch:async(url,options)=>{
    requests.push(String(url));
    const u=new URL(url);
    if(u.pathname.endsWith('/rpc/jokiin_rate_limit'))return response(allowed);
    if(u.pathname.endsWith('/payment_orders'))return response([{id:'test-order',user_id:'owner',request_key:'draft-test',order_code:code,total_price:100000,payment_status:'PENDING',payment_url:'https://pay.example/private',mayar_transaction_id:null}]);
    throw Error('Unexpected external request');
  }});
  vm.runInContext(fs.readFileSync(path.join(root,'src/worker.js'),'utf8').replace('export default {','globalThis.worker = {'),ctx);
  return {run:(request,env={})=>ctx.worker.fetch(request,{SUPABASE_URL:'https://db.example',SUPABASE_SERVICE_ROLE_KEY:'server-test-key',...env}),requests};
}
test('status hides payment link and amount without ownership proof',async()=>{
  const w=worker();const res=await w.run(new Request('https://worker.example/api/check-status?order_id=test-order'));
  const data=await res.json();assert.equal(res.status,200);
  assert.equal('payment_url' in data,false);assert.equal('amount' in data,false);assert.equal('transaction_id' in data,false);
});
test('status retains payment link for the checkout browser',async()=>{
  const w=worker();const res=await w.run(new Request('https://worker.example/api/check-status?order_id=test-order',{headers:{'x-order-key':'draft-test'}}));
  const data=await res.json();assert.equal(data.payment_url,'https://pay.example/private');
});
test('rate limit blocks status before querying orders',async()=>{
  const w=worker({allowed:false});const res=await w.run(new Request('https://worker.example/api/check-status?order_id=test-order'));
  assert.equal(res.status,429);assert.equal(w.requests.length,1);
});
test('rate limit blocks uploads before reading file or contacting Drive',async()=>{
  const w=worker({allowed:false});const res=await w.run(new Request('https://worker.example/api/upload-task-file',{method:'POST',body:'file'}));
  assert.equal(res.status,429);assert.equal(w.requests.length,1);
});
test('missing webhook secret fails closed',async()=>{
  const w=worker();const res=await w.run(new Request('https://worker.example/api/mayar-webhook',{method:'POST',body:'{}'}));
  assert.equal(res.status,503);assert.equal(w.requests.length,0);
});
test('webhook rejects invalid token before reading payload',async()=>{
  const w=worker();const res=await w.run(new Request('https://worker.example/api/mayar-webhook',{method:'POST',body:'{}'}),{MAYAR_WEBHOOK_SECRET:'new-server-secret'});
  assert.equal(res.status,401);assert.equal(w.requests.length,1);
});
test('server-only assets cannot be served',async()=>{
  for(const route of ['/.env','/src/worker.js','/supabase/functions/jokiin-api/index.ts','/database/schema.sql']){
    const w=worker();const res=await w.run(new Request('https://worker.example'+route),{ASSETS:{fetch:()=>response('asset')}});
    assert.equal(res.status,404,route);
  }
});
