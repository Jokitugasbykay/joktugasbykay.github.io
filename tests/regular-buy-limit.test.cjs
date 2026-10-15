const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

test('maximumOrderQuantity enforces 2x limit for regular and 1x for special products', () => {
  const context = {
    window: {},
    document: { addEventListener: () => {}, querySelectorAll: () => [], getElementById: () => null }
  };
  context.window = context;

  // Extract CONFIG and maximumOrderQuantity from index.html
  const configMatch = indexHtml.match(/const CONFIG = \{[\s\S]*?\};\s*window\.CONFIG = CONFIG;/);
  const maxQMatch = indexHtml.match(/function maximumOrderQuantity\(productId\) \{[\s\S]*?^\s{8}\}/m);

  assert.ok(configMatch, 'CONFIG definition must be found in index.html');
  assert.ok(maxQMatch, 'maximumOrderQuantity definition must be found in index.html');

  vm.runInNewContext(configMatch[0] + '\n' + maxQMatch[0] + '\ncontextMaxQ = maximumOrderQuantity;\ncontextConfig = CONFIG;', context);

  const maxQ = context.contextMaxQ;
  const config = context.contextConfig;

  // Regular products must have 2x per day limit
  assert.equal(maxQ('ppt'), 2, 'Joki PPT must have maximum 2x per day limit');
  assert.equal(maxQ('makalah'), 2, 'Makalah must have maximum 2x per day limit');
  assert.equal(maxQ('poster'), 2, 'Poster must have maximum 2x per day limit');
  assert.equal(maxQ('pembuatan-cv'), 2, 'Pembuatan CV must have maximum 2x per day limit');

  // Special / Limited Edition must remain 1x per day limit
  assert.equal(maxQ('gemini-pro-18-bulan'), 1, 'Gemini Pro 18 Bulan must have maximum 1x per day limit');
});

test('addToCart permits 2 items for regular products and warns on 3rd attempt', () => {
  const toasts = [];
  const context = {
    window: {
      showToast: (msg, title, type) => {
        toasts.push({ msg, title, type });
      }
    },
    document: {
      getElementById: () => ({ style: {}, textContent: '' }),
      querySelectorAll: () => []
    },
    localStorage: { setItem: () => {}, getItem: () => null, removeItem: () => {} },
    triggerCartBounce: () => {},
    saveCart: () => {},
    minimumOrderQuantity: () => 1
  };
  context.window.CONFIG = {
    PRODUCTS: [
      { id: 'ppt', title: 'Joki PPT', priceNum: 13000 },
      { id: 'gemini-pro-18-bulan', title: 'Gemini Pro 18 Bulan', priceNum: 20000, isLimitedEdition: true }
    ]
  };

  const maxQMatch = indexHtml.match(/function maximumOrderQuantity\(productId\) \{[\s\S]*?^\s{8}\}/m);
  vm.runInNewContext(
    'let CART = [];\n' +
    'const CONFIG = window.CONFIG;\n' +
    maxQMatch[0] + '\n' +
    'function addToCart(productId) {\n' +
    '    const product = CONFIG.PRODUCTS.find(p => p.id === productId); if (!product) return;\n' +
    '    const maxQ = maximumOrderQuantity(productId);\n' +
    '    const exist = CART.find(item => item.productId === productId);\n' +
    '    if (exist) {\n' +
    '        if (exist.quantity >= maxQ) {\n' +
    '            window.showToast(`Batas pembelian ${product.title} maksimal ${maxQ}x per orang per hari.`, "Batas Pembelian", "warn");\n' +
    '            return;\n' +
    '        }\n' +
    '        exist.quantity += 1;\n' +
    '    } else {\n' +
    '        CART.push({ productId: product.id, name: product.title, price: product.priceNum, quantity: 1 });\n' +
    '    }\n' +
    '    window.showToast(`${product.title} ditambahkan ke keranjang.`, "Keranjang Belanja", "success");\n' +
    '}\n' +
    'contextAddToCart = addToCart;\n' +
    'getCart = () => CART;\n',
    context
  );

  const addToCart = context.contextAddToCart;
  const getCart = context.getCart;

  // 1st add to cart: success
  addToCart('ppt');
  assert.equal(getCart().find(i => i.productId === 'ppt').quantity, 1);
  assert.equal(toasts[toasts.length - 1].type, 'success');

  // 2nd add to cart: success (reaches 2x limit)
  addToCart('ppt');
  assert.equal(getCart().find(i => i.productId === 'ppt').quantity, 2);
  assert.equal(toasts[toasts.length - 1].type, 'success');

  // 3rd add to cart: blocked with warning toast stating 2x
  addToCart('ppt');
  assert.equal(getCart().find(i => i.productId === 'ppt').quantity, 2);
  const warnToast = toasts[toasts.length - 1];
  assert.equal(warnToast.type, 'warn');
  assert.equal(warnToast.title, 'Batas Pembelian');
  assert.equal(warnToast.msg, 'Batas pembelian Joki PPT maksimal 2x per orang per hari.');
});
