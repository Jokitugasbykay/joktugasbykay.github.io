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
  assert.match(content, /JOKI\.IN, Teman Tugas Mahasiswa/, 'Must include hero title');
  assert.match(content, /Katalog Layanan Akademik/, 'Must include catalog heading');
  assert.match(content, /4 Langkah Mudah Pesan Tugas/, 'Must include steps heading');
  assert.match(content, /Apa Kata Mahasiswa\?/, 'Must include testimonials heading');
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
