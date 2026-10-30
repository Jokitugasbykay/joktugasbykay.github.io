const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

function block(start, end) {
  const at = html.indexOf(start), until = html.indexOf(end, at);
  assert(at >= 0 && until > at, start);
  return html.slice(at, until);
}
function storefront() {
  const warnings = [];
  const ctx = vm.createContext({window: {
    showToast: (msg, title, type) => { if (type === 'warn') warnings.push(msg); },
    saveCheckoutState() {}, cancelCheckout() {}
  }, saveCart() {}, triggerCartBounce() {}, renderCartItems() {}, renderCheckoutSummary() {}});
  vm.runInContext(`
    const CONFIG = {PRODUCTS: [
      {id:'ppt',title:'Joki PPT',priceNum:13000,batasBeli:2},
      {id:'makalah',title:'Joki Makalah',priceNum:2000,minimumQuantity:10},
      {id:'gemini-pro-18-bulan',title:'Gemini',priceNum:20000,isLimitedEdition:true,batasBeli:1},
      {id:'special-other',is_limited_edition:true,batas_beli_per_orang:3}
    ]};
    let CART = [], checkoutMode = 'cart', directCheckoutItem = null, currentTab = 'checkout';
  ` + block('        function minimumOrderQuantity(', '        function productPriceLabel(')
    + block('        function sanitizeCart(', '        async function loadCart(')
    + block('        window.addToCart =', '        function updateCartBadge(')
    + block('        window.changeCartQty =', '        window.clearCart =')
    + block('        window.changeCheckoutQty =', '        function renderPaymentGrid('), ctx);
  return {ctx, warnings, run: code => vm.runInContext(code, ctx)};
}

test('regular quantities ignore account limits; only special products have ceilings', () => {
  const {run} = storefront();
  assert.equal(run("maximumOrderQuantity('ppt')"), Infinity);
  assert.equal(run("maximumOrderQuantity('makalah')"), Infinity);
  assert.equal(run("minimumOrderQuantity('makalah')"), 10);
  assert.equal(run("maximumOrderQuantity('gemini-pro-18-bulan')"), 1);
  assert.equal(run("maximumOrderQuantity('special-other')"), 3);
});

test('real cart and checkout handlers allow more than 2 and 100 regular units', () => {
  const {run, warnings} = storefront();
  run("for(let i=0;i<101;i++) window.addToCart('ppt'); window.changeCartQty('ppt',1); window.changeCheckoutQty('ppt',1);");
  assert.equal(run('CART[0].quantity'), 103);
  assert.deepEqual(warnings, []);
  run("checkoutMode='direct'; directCheckoutItem={productId:'ppt',quantity:101}; window.changeCheckoutQty('ppt',1);");
  assert.equal(run('directCheckoutItem.quantity'), 102);
  run("window.addToCart('gemini-pro-18-bulan'); window.addToCart('gemini-pro-18-bulan');");
  assert.equal(run("CART.find(i=>i.productId==='gemini-pro-18-bulan').quantity"), 1);
  assert.equal(warnings.length, 1);
});

test('restored carts retain normal quantities and clamp special quantities', () => {
  const {run} = storefront();
  assert.equal(run("sanitizeCart([{productId:'ppt',quantity:500}])[0].quantity"), 500);
  assert.equal(run("sanitizeCart([{productId:'gemini-pro-18-bulan',quantity:500}])[0].quantity"), 1);
  for (const quantity of ['0', '-1', '1.5', 'NaN', 'Infinity', 'Number.MAX_SAFE_INTEGER+1']) {
    assert.equal(run(`sanitizeCart([{productId:'ppt',quantity:${quantity}}]).length`), 0);
  }
});

test('normal cart has no quota badge or disabled plus; special cart keeps both', () => {
  const {ctx, run} = storefront();
  const elements = new Map();
  ctx.document = {getElementById:id=>{if(!elements.has(id)) elements.set(id, {});return elements.get(id);}};
  ctx.escapeHTML = String;
  ctx.formatRupiah = String;
  ctx.productPriceLabel = product => String(product.priceNum);
  run(block('        function renderCartItems(', '        window.changeCartQty ='));
  run("CART=[{productId:'ppt',name:'PPT',price:13000,quantity:500}];renderCartItems();");
  assert.doesNotMatch(elements.get('cartItemsContainer').innerHTML, /Batas|disabled/);
  run("CART=[{productId:'gemini-pro-18-bulan',name:'Gemini',price:20000,quantity:1}];renderCartItems();");
  assert.match(elements.get('cartItemsContainer').innerHTML, /Batas 1x per hari/);
  assert.match(elements.get('cartItemsContainer').innerHTML, /disabled/);
});

test('Worker accepts 101 regular units but rejects invalid quantities and special items', async () => {
  const ctx = vm.createContext({Request, Response, Headers, URL, TextEncoder, TextDecoder, Uint8Array, crypto, console,
    fetch: async url => {
      const endpoint = new URL(url).pathname;
      if (endpoint.endsWith('/rpc/jokiin_rate_limit')) return Response.json(true);
      if (endpoint.endsWith('/services')) return Response.json([{id:1,slug:'artikel',name:'Artikel',price:8000,is_active:true}]);
      throw Error('Unexpected request: ' + endpoint);
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/worker.js'), 'utf8').replace('export default {', 'globalThis.worker = {'), ctx);
  async function checkout(quantity, productId = 'artikel') {
    return ctx.worker.fetch(new Request('https://worker.example/api/create-mayar-payment', {
      method:'POST', headers:{'Content-Type':'application/json',Origin:'https://jokiin.my.id'},
      body:JSON.stringify({customer:{name:'Test',email:'test@gmail.com'},task:{title:'Test',notes:'Test',deadline:'2027-01-01'},items:[{productId,quantity}],amount:0})
    }), {SUPABASE_URL:'https://db.example',SUPABASE_SERVICE_ROLE_KEY:'test-key'});
  }
  const quote = await checkout(101);
  const quoteData = await quote.json();
  assert.equal(quote.status, 409, JSON.stringify(quoteData));
  assert.match(quoteData.error, /Harga berubah/);
  for (const quantity of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER]) {
    assert.equal((await checkout(quantity)).status, 400, 'Reject invalid quantity or unsafe total');
  }
  assert.equal((await checkout(1, 'gemini-pro-18-bulan')).status, 409);
});

test('Edge checkout forwards 101 regular units and rejects noninteger quantities', async () => {
  const compileTypeScript = require('./compile-typescript.cjs');
  let handler, submitted;
  const ctx = vm.createContext({Request, Response, Headers, URL, TextEncoder, TextDecoder, Uint8Array, crypto, console,
    Deno:{env:{get:name=>name==='SUPABASE_URL'?'https://db.example':'test-key'},serve:fn=>{handler=fn;}},
    fetch:async(url, options)=>{
      const endpoint = new URL(url).pathname;
      if (endpoint.endsWith('/rpc/jokiin_rate_limit')) return Response.json(true);
      if (endpoint.endsWith('/rpc/jokiin_create_order')) {submitted=JSON.parse(options.body);return Response.json({order_code:'test-order'});}
      throw Error('Unexpected request: ' + endpoint);
    }
  });
  vm.runInContext(compileTypeScript(fs.readFileSync(path.join(__dirname, '../supabase/functions/jokiin-api/index.ts'), 'utf8')), ctx);
  async function checkout(quantity) {
    submitted=null;
    return handler(new Request('https://edge.example', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      action:'checkout',requestKey:crypto.randomUUID(),customer:{name:'Test',email:'test@gmail.com',whatsapp:'628123456789'},
      task:{title:'Test',notes:'Test',deadline:'2027-01-01'},items:[{productId:'artikel',quantity}],paymentMethod:'QRIS',expectedTotal:808000
    })}));
  }
  const response = await checkout(101);
  assert.equal(response.status, 200, JSON.stringify(await response.json()));
  assert.equal(submitted.p_items[0].quantity, 101);
  for (const quantity of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal((await checkout(quantity)).status, 400);
    assert.equal(submitted, null);
  }
});
