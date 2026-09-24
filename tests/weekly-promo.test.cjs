const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(__dirname, '../src/worker.js'), 'utf8').replace('export default {', 'globalThis.worker = {');
const week = 7 * 86400000;
const start = new Date(Date.now() - 60000).toISOString();
const end = new Date(Date.now() - 60000 + week).toISOString();
let campaign = {active:true,starts_at:start,ends_at:end,coupon:'KAY30',discount_percent:30,text:'Promo tujuh hari'};
const fetchMock = async (url, options = {}) => {
  const u = new URL(url);
  let data;
  if (u.pathname.endsWith('/site_settings')) data = [{value:campaign}];
  else if (u.pathname.endsWith('/services')) data = [{id:1,slug:'makalah',name:'Makalah',price:2000,is_active:true,sale_percent:10,sale_amount:0}];
  else if (u.pathname.endsWith('/payment_orders')) data = options.method === 'POST' ? [{id:10}] : [];
  else if (u.pathname.endsWith('/payments/create')) data = {data:{link:'https://pay.example/checkout',transactionId:'tx-test'}};
  else throw new Error(`Unexpected request ${u.pathname}`);
  return new Response(JSON.stringify(data),{status:200});
};
const ctx = vm.createContext({Response,Request,URL,console,crypto,fetch:fetchMock});
vm.runInContext(source,ctx);
const env = {SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test',MAYAR_API_KEY:'test'};
async function call(url,body) {
  const req = new Request(url,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:undefined);
  const res = await ctx.worker.fetch(req,env);
  return {status:res.status,data:await res.json()};
}
(async () => {
  assert.equal((await call('https://example.com/api/promo')).data.promo.discount_percent,30);
  assert.deepEqual(JSON.parse(JSON.stringify((await call('https://example.com/api/promo?code=kay30')).data)), {valid:true,discount_percent:30});
  assert.equal((await call('https://example.com/api/promo?code=OTHER')).data.valid,false);
  const payment = {customer:{name:'Kay',email:'kay@gmail.com'},task:{title:'Tugas',notes:'Kerjakan',deadline:'2026-09-30'},items:[{productId:'makalah',quantity:2}],promo:'KAY30',amount:3000,draftKey:'req-promo-test'};
  // Product sale: Rp2.000 x 90% x 2 = Rp3.600; campaign 30% -> Rp2.520.
  assert.equal((await call('https://example.com/api/create-mayar-payment',payment)).status,409);
  payment.amount = 2520;
  const paid = await call('https://example.com/api/create-mayar-payment',payment);
  assert.equal(paid.status,201);
  assert.equal(paid.data.total,2520);
  payment.promo = 'SALAH';
  assert.equal((await call('https://example.com/api/create-mayar-payment',payment)).status,409);
  campaign = {...campaign,ends_at:new Date(Date.now()-1000).toISOString()};
  assert.equal((await call('https://example.com/api/promo')).data.promo.active,false);
  payment.promo = 'KAY30';
  assert.equal((await call('https://example.com/api/create-mayar-payment',payment)).status,409);
  console.log('PASS: weekly promo validation, product sale stacking, and expired code rejection.');
})().catch(err => {console.error(err);process.exitCode=1});
