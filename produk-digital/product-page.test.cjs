const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, 'order-flow.js'), 'utf8').replace('export { showCheckout };', '');
async function check(game, expected, products, expectedPackages) {
  const title = {textContent: ''};
  const status = {textContent: '', hidden: false};
  const root = {children: [], append(el) { this.children.push(el); }};
  const node = tag => ({tag, textContent: '', children: [], append(...items) {this.children.push(...items);}});
  const document = {body:{dataset:{page:'produk'}}, title:'', querySelector(s) {return s==='main'?root:s==='#status'?status:title;}, createElement:node};
  const context = {document, location:{search:'?game='+game}, URLSearchParams, Intl, AbortSignal, fetch:async () => ({ok:true,json:async()=>({ok:true, products})})};
  vm.runInNewContext(script, context);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(title.textContent, expected);
  if (expectedPackages) assert.equal(root.children[0].children.length, expectedPackages);
  else assert.equal(status.textContent, 'Belum ada paket aktif untuk layanan ini.');
}
(async()=>{
  const items=[{nama:'Mobile Legends 5 Diamonds',slug:'mlbb-5-diamonds',harga_dasar:2590,stok:1},{nama:'Honor of Kings 80 Token',slug:'hok-80-token',harga_dasar:16000,stok:1}];
  await check('hok','Honor of Kings',items,1);
  await check('mlbb','Mobile Legends',items,1);
  await check('zzz','Zenless Zone Zero',items,0);
  console.log('Product page game selection and live catalog checks passed.');
})();
