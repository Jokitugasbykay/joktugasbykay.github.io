const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const outDir = path.resolve(__dirname, '..', 'out');
const srcDir = path.resolve(__dirname, '..', 'src', 'app');

test('storefront root route is statically exported with catalog and hero', () => {
  const rootHtmlPath = path.join(outDir, 'index.html');
  assert(fs.existsSync(rootHtmlPath), 'index.html must exist in out/');
  const content = fs.readFileSync(rootHtmlPath, 'utf8');
  assert.match(content, /Tugas Kamu/, 'Must include hero title');
  assert.match(content, /Serahkan ke/, 'Must include hero brand lead');
  assert.match(content, /Rekomendasi Produk/, 'Must include recommendations heading');
  assert.match(content, /Apa Kata Mahasiswa/, 'Must include testimonials heading');
});

test('admin route is statically exported with expected markup and controls', () => {
  const adminHtmlPath = path.join(outDir, 'admin', 'index.html');
  assert(fs.existsSync(adminHtmlPath), 'admin/index.html must exist in out/');
  const content = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(content, /Pesanan/, 'Must include Pesanan title/heading');
  assert.match(content, /Folder Lampiran/, 'Must include Folder Lampiran tab');
  assert.match(content, /Token admin/, 'Must include Token admin placeholder');
});

test('invoice route is statically exported with Suspense fallback and client hydration', () => {
  const invoiceHtmlPath = path.join(outDir, 'invoice', 'index.html');
  assert(fs.existsSync(invoiceHtmlPath), 'invoice/index.html must exist in out/');
  const content = fs.readFileSync(invoiceHtmlPath, 'utf8');
  assert.match(content, /Memuat invoice\.\.\./, 'Must include Suspense fallback');

  // Verify component source contains required controls
  const srcContent = fs.readFileSync(path.join(srcDir, 'invoice', 'page.tsx'), 'utf8');
  assert.match(srcContent, /Kembali ke JOKI\.IN/, 'Must include back link in source');
  assert.match(srcContent, /Cetak Invoice/, 'Must include print button in source');
  assert.match(srcContent, /Deskripsi/, 'Must include table header Deskripsi in source');
});

test('login route is statically exported with Suspense fallback and client hydration', () => {
  const loginHtmlPath = path.join(outDir, 'login', 'index.html');
  assert(fs.existsSync(loginHtmlPath), 'login/index.html must exist in out/');
  const content = fs.readFileSync(loginHtmlPath, 'utf8');
  assert.match(content, /Memuat halaman\.\.\./, 'Must include Suspense fallback');

  // Verify component source contains required controls
  const srcContent = fs.readFileSync(path.join(srcDir, 'login', 'page.tsx'), 'utf8');
  assert.match(srcContent, /Masuk Sekarang/, 'Must include Masuk button in source');
  assert.match(srcContent, /Buat Akun Baru/, 'Must include Daftar button in source');
  assert.match(srcContent, /Kembali ke Beranda/, 'Must include safe back link in source');
});

test('payment route is statically exported with Suspense fallback and redirect', () => {
  const paymentHtmlPath = path.join(outDir, 'payment', 'index.html');
  assert(fs.existsSync(paymentHtmlPath), 'payment/index.html must exist in out/');
  const content = fs.readFileSync(paymentHtmlPath, 'utf8');
  assert.match(content, /Mengalihkan ke/, 'Must include redirect message in HTML');

  const srcContent = fs.readFileSync(path.join(srcDir, 'payment', 'page.tsx'), 'utf8');
  assert.match(srcContent, /halaman utama/, 'Must include link text in source');
});

test('produk-digital storefront and home routes are statically exported', () => {
  const digitalHtmlPath = path.join(outDir, 'produk-digital', 'index.html');
  assert(fs.existsSync(digitalHtmlPath), 'produk-digital/index.html must exist in out/');
  const digitalHomeHtmlPath = path.join(outDir, 'produk-digital', 'home', 'index.html');
  assert(fs.existsSync(digitalHomeHtmlPath), 'produk-digital/home/index.html must exist in out/');

  const content = fs.readFileSync(digitalHtmlPath, 'utf8');
  assert.match(content, /Memuat JOKI\.IN Digital Store\.\.\./, 'Must include Suspense fallback');

  const srcContent = fs.readFileSync(path.join(srcDir, 'produk-digital', 'page.tsx'), 'utf8');
  assert.match(srcContent, /ADMIN_ONLY/, 'Must include admin restriction logic in source');
  assert.match(srcContent, /Digital Store/, 'Must include Digital Store brand tag in source');
  assert.match(srcContent, /Keranjang belanja/, 'Must include Cart button in source');
});

test('produk-digital checkout route is statically exported with Suspense fallback', () => {
  const checkoutHtmlPath = path.join(outDir, 'produk-digital', 'checkout', 'index.html');
  assert(fs.existsSync(checkoutHtmlPath), 'produk-digital/checkout/index.html must exist in out/');
  const content = fs.readFileSync(checkoutHtmlPath, 'utf8');
  assert.match(content, /Memuat halaman checkout\.\.\./, 'Must include Suspense fallback');

  const srcContent = fs.readFileSync(path.join(srcDir, 'produk-digital', 'checkout', 'page.tsx'), 'utf8');
  assert.match(srcContent, /Konfirmasi Checkout Produk Digital/, 'Must include checkout heading in source');
  assert.match(srcContent, /Bayar Sekarang via Mayar/, 'Must include payment submit button in source');
});

test('produk-digital pesanan route is statically exported with Suspense fallback', () => {
  const pesananHtmlPath = path.join(outDir, 'produk-digital', 'pesanan', 'index.html');
  assert(fs.existsSync(pesananHtmlPath), 'produk-digital/pesanan/index.html must exist in out/');
  const content = fs.readFileSync(pesananHtmlPath, 'utf8');
  assert.match(content, /Memuat status pesanan\.\.\./, 'Must include Suspense fallback');

  const srcContent = fs.readFileSync(path.join(srcDir, 'produk-digital', 'pesanan', 'page.tsx'), 'utf8');
  assert.match(srcContent, /Perbarui Status Pembayaran/, 'Must include refresh button in source');
});
