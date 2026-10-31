const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync((fs.existsSync(path.join(ROOT_DIR, 'tests/fixtures/legacy/index.html')) ? path.join(ROOT_DIR, 'tests/fixtures/legacy/index.html') : path.join(ROOT_DIR, 'index.html')), 'utf8');

test('order flow section contains all 5 steps in correct sequence', () => {
  assert.ok(indexHtml.includes('class="order-flow-wrapper"'), 'order-flow-wrapper must exist');
  assert.ok(indexHtml.includes('class="order-flow"'), 'order-flow container must exist');
  assert.ok(indexHtml.includes('Pesanan<br>Dibuat'), 'Step 1 must be Pesanan Dibuat');
  assert.ok(indexHtml.includes('Pembayaran<br>Dikonfirmasi'), 'Step 2 must be Pembayaran Dikonfirmasi');
  assert.ok(indexHtml.includes('Sedang<br>Dikerjakan'), 'Step 3 must be Sedang Dikerjakan');
  assert.ok(indexHtml.includes('Pesanan<br>Selesai'), 'Step 4 must be Pesanan Selesai');
  assert.ok(indexHtml.includes('Hasil<br>Dikirim'), 'Step 5 must be Hasil Dikirim');
});

test('order flow mobile view fits all 5 steps horizontally without right scroll', () => {
  // Mobile rules must eliminate min-width: 700px and overflow-x scroll
  assert.match(indexHtml, /\.order-flow-wrapper\s*\{[^}]*overflow-x:\s*hidden/);
  assert.match(indexHtml, /\.order-flow\s*\{[^}]*min-width:\s*0/);
  assert.match(indexHtml, /\.order-flow\s*\{[^}]*width:\s*100%/);

  // 5 steps must fit with equal flex width and no wrapping
  assert.match(indexHtml, /\.flow-step\s*\{[^}]*width:\s*20%/);
  assert.match(indexHtml, /\.flow-step\s*\{[^}]*flex:\s*1\s+1\s+0/);

  // Connecting line must connect centers of 1st and 5th icons (10% to 10%)
  assert.match(indexHtml, /\.order-flow::before\s*\{[^}]*left:\s*10%/);
  assert.match(indexHtml, /\.order-flow::before\s*\{[^}]*right:\s*10%/);

  // Icons must be scaled down for mobile screens
  assert.match(indexHtml, /\.flow-icon\s*\{[^}]*width:\s*38px/);
});
