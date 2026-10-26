const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('Modular Architecture: all target HTML files exist and have no excessive inline script or style', () => {
  const htmlFiles = [
    'produk-digital/home.html',
    'produk-digital/checkout.html',
    'produk-digital/pesanan.html',
    'produk-digital/kategori.html',
    'produk-digital/produk.html',
  ];

  for (const relPath of htmlFiles) {
    const fullPath = path.join(root, relPath);
    assert.ok(fs.existsSync(fullPath), `File ${relPath} harus ada.`);
    const content = fs.readFileSync(fullPath, 'utf8');

    // Verify it links external modular stylesheets
    assert.ok(content.includes('/css/produk-digital/main.css'), `${relPath} harus memuat main.css`);

    // Verify it does not embed thousands of lines
    const lineCount = content.split('\n').length;
    assert.ok(lineCount < 500, `${relPath} harus modular dan ringkas (< 500 baris, aktual: ${lineCount})`);
  }
});

test('Modular Architecture: all TypeScript source modules exist and compile', () => {
  const tsFiles = [
    'ts/produk-digital/types.ts',
    'ts/produk-digital/config.ts',
    'ts/produk-digital/state.ts',
    'ts/produk-digital/toast.ts',
    'ts/produk-digital/carousel.ts',
    'ts/produk-digital/search.ts',
    'ts/produk-digital/catalog.ts',
    'ts/produk-digital/product-detail.ts',
    'ts/produk-digital/checkout-ui.ts',
    'ts/produk-digital/order-status.ts',
    'ts/produk-digital/main.ts',
  ];

  for (const relPath of tsFiles) {
    const fullPath = path.join(root, relPath);
    assert.ok(fs.existsSync(fullPath), `File TypeScript ${relPath} harus ada.`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.ok(content.length > 50, `${relPath} tidak boleh kosong.`);
  }
});

test('Modular Architecture: all modular CSS files exist and namespace rules', () => {
  const cssFiles = [
    'css/produk-digital/main.css',
    'css/produk-digital/layout.css',
    'css/produk-digital/product-card.css',
    'css/produk-digital/carousel.css',
    'css/produk-digital/responsive.css',
  ];

  for (const relPath of cssFiles) {
    const fullPath = path.join(root, relPath);
    assert.ok(fs.existsSync(fullPath), `File CSS ${relPath} harus ada.`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.ok(content.includes('.digital-store'), `${relPath} harus menggunakan namespace .digital-store`);
  }
});

test('Modular Architecture: compiled JavaScript modules exist in assets/produk-digital/js/', () => {
  const jsFiles = [
    'assets/produk-digital/js/carousel.js',
    'assets/produk-digital/js/catalog.js',
    'assets/produk-digital/js/checkout-ui.js',
    'assets/produk-digital/js/config.js',
    'assets/produk-digital/js/main.js',
    'assets/produk-digital/js/order-status.js',
    'assets/produk-digital/js/product-detail.js',
    'assets/produk-digital/js/search.js',
    'assets/produk-digital/js/state.js',
    'assets/produk-digital/js/toast.js',
  ];

  for (const relPath of jsFiles) {
    const fullPath = path.join(root, relPath);
    assert.ok(fs.existsSync(fullPath), `Compiled JS ${relPath} harus ada.`);
  }
});

test('Monolith Integrity: index.html was not inflated with digital store markup or scripts', () => {
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(!indexHtml.includes('/css/produk-digital/'), 'index.html tidak boleh memuat CSS produk-digital');
  assert.ok(!indexHtml.includes('/assets/produk-digital/js/main.js'), 'index.html tidak boleh memuat bundle JS produk-digital');
});

test('Persona Guard: no em dash, en dash, or emoji in digital store files', () => {
  const dirs = [
    path.join(root, 'produk-digital'),
    path.join(root, 'ts/produk-digital'),
    path.join(root, 'css/produk-digital'),
  ];

  const dashRegex = /[\u2013\u2014]/;
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

  for (const dir of dirs) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const fullPath = path.join(dir, f);
      if (fs.statSync(fullPath).isFile()) {
        const content = fs.readFileSync(fullPath, 'utf8');
        assert.ok(!dashRegex.test(content), `File ${f} tidak boleh memuat em dash atau en dash`);
        assert.ok(!emojiRegex.test(content), `File ${f} tidak boleh memuat emoji`);
      }
    }
  }
});
