'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const parentRoot = path.resolve(root, '..');
const outDir = path.join(root, 'out');
const srcDir = path.join(root, 'src');

test('1. Static export directory contains exact matching URLs', () => {
  const expectedRoutes = [
    'index.html',
    'invoice/index.html',
    'payment/index.html',
    'login/index.html',
    'admin/index.html',
    '404.html'
  ];

  for (const rel of expectedRoutes) {
    const filePath = path.join(outDir, rel);
    assert.ok(fs.existsSync(filePath), `Export file must exist: ${rel}`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('<!DOCTYPE html>') || content.includes('<html'), `File must contain valid HTML: ${rel}`);
  }
});

test('2. No em dashes or en dashes exist across all Next.js sources', () => {
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== 'out') {
          scanDir(fullPath);
        }
      } else if (/\.(ts|tsx|js|mjs|css|json)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          assert.ok(
            !/[\u2013\u2014]/.test(line),
            `Found em/en dash in ${fullPath}:${idx + 1} -> ${line.trim()}`
          );
        });
      }
    }
  }

  scanDir(srcDir);
});

test('3. Next.js constants and business rules match production specifications', () => {
  const constantsPath = path.join(srcDir, 'lib/constants.ts');
  const content = fs.readFileSync(constantsPath, 'utf8');
  assert.ok(content.includes('regularMaxQty: 2'), 'Regular product max quantity must be 2');
  assert.ok(content.includes('specialMaxQty: 1'), 'Special product max quantity must be 1');
  assert.ok(content.includes('nightStart: 22'), 'Night hours start at 22');
  assert.ok(content.includes('nightEnd: 5'), 'Night hours end at 5');
});

test('4. CSS variables and animated border classes exist', () => {
  const cssPath = path.join(srcDir, 'app/globals.css');
  const content = fs.readFileSync(cssPath, 'utf8');
  assert.ok(content.includes('--bg-primary: #0a0e11'), 'Dark theme background must be #0a0e11');
  assert.ok(content.includes('--accent-green: #1fd18b'), 'Dark theme accent green must be #1fd18b');
  assert.ok(content.includes('.promo-lim'), 'Promo limit card class must exist');
  assert.ok(content.includes('conic-gradient'), 'Conic gradient spin border animation must exist');
});

test('5. Supabase configuration matches root client config', () => {
  const rootConfigPath = path.join(parentRoot, 'config.js');
  const nextConstantsPath = path.join(srcDir, 'lib/constants.ts');
  const rootConfig = fs.readFileSync(rootConfigPath, 'utf8');
  const nextConstants = fs.readFileSync(nextConstantsPath, 'utf8');

  assert.ok(rootConfig.includes('/api/supabase'), 'Root config must contain Supabase proxy URL');
  assert.ok(nextConstants.includes('/api/supabase'), 'Next.js constants must contain Supabase proxy URL');
  assert.ok(!nextConstants.includes('sb_publishable_'), 'Next.js constants must not contain publishable key');
});

test('6. Invoice export HTML contains prerendered loading fallback matching original page', () => {
  const invoiceHtml = fs.readFileSync(path.join(outDir, 'invoice/index.html'), 'utf8');
  assert.ok(invoiceHtml.includes('Memuat invoice...'), 'Invoice export must contain prerendered fallback matching original invoice/index.html');
});

test('7. Login export HTML contains staff portal credentials input fields', () => {
  const loginHtml = fs.readFileSync(path.join(outDir, 'login/index.html'), 'utf8');
  assert.ok(loginHtml.includes('Portal Staf JOKI.IN'), 'Login export must contain header text');
  assert.ok(loginHtml.includes('nama@jokiin.my.id'), 'Login export must contain email placeholder');
});

test('8. Admin export HTML contains token auth input and status dropdown', () => {
  const adminHtml = fs.readFileSync(path.join(outDir, 'admin/index.html'), 'utf8');
  assert.ok(adminHtml.includes('Admin Pesanan'), 'Admin export must contain title text');
  assert.ok(adminHtml.includes('Token admin'), 'Admin export must contain token placeholder');
  assert.ok(adminHtml.includes('Sudah dibayar'), 'Admin export must contain paid option');
});

test('9. Root export HTML contains header, promo limits, and catalog markers', () => {
  const indexHtml = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('JOKI.IN'), 'Home export must contain brand name');
  assert.ok(indexHtml.includes('Katalog Layanan &amp; Produk') || indexHtml.includes('Katalog Layanan & Produk'), 'Home export must contain catalog section');
});

test('10. 404 export HTML contains error message and return link', () => {
  const notFoundHtml = fs.readFileSync(path.join(outDir, '404.html'), 'utf8');
  assert.ok(notFoundHtml.includes('404'), '404 export must contain 404 status code');
  assert.ok(notFoundHtml.includes('Halaman Tidak Ditemukan'), '404 export must contain error description');
  assert.ok(notFoundHtml.includes('Kembali ke Beranda'), '404 export must contain return link');
});
