const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
const source = read('grouped-catalog.js').split('(self.webpackChunk_N_E=')[0] + 'globalThis.renderDigitalCatalog = renderDigitalCatalog;})();';
const context = { Intl, URLSearchParams };
vm.runInNewContext(source, context);
const jsx = (type, props, key) => ({ type, props, key });
for (const category of ['topup', 'lainnya']) {
  const product = {c: category, pv: 'Garena', n: 'Free Fire 70 Diamonds', slug: 'ff-70', pr: 10000, st: 5};
  const result = context.renderDigitalCatalog({jsx, jsxs: jsx}, [product], () => ({type: 'standalone'}), false, 'topup', '');
  const ff = result.filter(x => x.props?.href?.endsWith('game=ff'));
  assert.equal(ff.length, 1);
  assert.match(ff[0].props.children[1].props.children[2].props.children, /10\.000/);
  assert(!result.some(x => x.type === 'standalone' || x.props?.href?.includes('provider=Garena')));
}
assert.match(read('order-flow.js'), /const stock = p => Number\(p\.stok\) \|\| 0/);
assert.match(read('pesanan/index.html'), /signal: AbortSignal\.timeout\(15000\)/);
console.log('Digital catalog, stock, and timeout checks passed.');
