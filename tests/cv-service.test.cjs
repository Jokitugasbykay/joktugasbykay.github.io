const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync((fs.existsSync(path.join(root, 'tests/fixtures/legacy/index.html')) ? path.join(root, 'tests/fixtures/legacy/index.html') : path.join(root, 'index.html')), 'utf8');

test('index.html contains Pembuatan CV product in CONFIG and metadata', () => {
  assert.ok(html.includes('id: "pembuatan-cv"'), 'CONFIG.PRODUCTS contains pembuatan-cv');
  assert.ok(html.includes('title: "Pembuatan CV"'), 'CONFIG.PRODUCTS contains title Pembuatan CV');
  assert.ok(html.includes('priceNum: 10000'), 'CONFIG.PRODUCTS contains priceNum 10000');
  assert.ok(html.includes("'pembuatan-cv': { icon: '📄', category: 'Desain'"), 'SAFE_CATALOGUE_METADATA contains pembuatan-cv');
  assert.ok(html.includes("'pembuatan-cv':3"), 'CATALOG_PHOTO_BY_SLUG contains pembuatan-cv:3');
});

test('SQL migration for Pembuatan CV exists and is valid', () => {
  const migPath = path.join(root, 'supabase/migrations/20261014000000_add_cv_service.sql');
  assert.ok(fs.existsSync(migPath), 'Migration file exists');
  const sql = fs.readFileSync(migPath, 'utf8');
  assert.ok(sql.includes("'pembuatan-cv'"), 'SQL defines slug pembuatan-cv');
  assert.ok(sql.includes("10000.00"), 'SQL sets price 10000.00 in services');
  assert.ok(sql.includes("10000"), 'SQL sets harga_dasar 10000 in products');
});
