const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('No em or en dashes exist across client storefront, catalog, and worker files', () => {
  const targetFiles = [
    'index.html',
    'src/catalog.js',
    'assets/catalog.js',
    'src/worker.js',
    'login/index.html',
    'supabase/functions/jokiin-catalog/index.ts',
    'supabase/functions/jokiin-api/index.ts',
    'api/create-mayar-payment.php',
  ];

  for (const rel of targetFiles) {
    const fullPath = path.join(root, rel);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      assert.ok(
        !/[\u2013\u2014]/.test(line),
        `Found em/en dash in ${rel}:${idx + 1} -> ${line.trim()}`
      );
    });
  }
});

test('Mayar payment requests pass customer name as name and product info in description', () => {
  const workerCode = fs.readFileSync(path.join(root, 'src/worker.js'), 'utf8');
  const catalogEdgeCode = fs.readFileSync(path.join(root, 'supabase/functions/jokiin-catalog/index.ts'), 'utf8');
  const phpCode = fs.readFileSync(path.join(root, 'api/create-mayar-payment.php'), 'utf8');

  // Must not set Mayar customer name to "Pembayaran JOKI.IN - ..."
  assert.ok(!workerCode.includes('name: `Pembayaran JOKI.IN -'), 'worker.js must not send product name as Mayar customer name');
  assert.ok(!catalogEdgeCode.includes('name: `Pembayaran JOKI.IN -'), 'jokiin-catalog must not send product name as Mayar customer name');
  assert.ok(!phpCode.includes("'name' => str_clip('JOKI.IN -"), 'create-mayar-payment.php must not send product name as Mayar customer name');

  // Must set name to customerName and include product in description
  assert.ok(workerCode.includes('name: customerName'), 'worker.js must use customerName for Mayar payment name');
  assert.ok(catalogEdgeCode.includes('name: customerName'), 'jokiin-catalog must use customerName for Mayar payment name');
  assert.ok(phpCode.includes("'name' => str_clip($customerName"), 'create-mayar-payment.php must use customerName for Mayar payment name');

  // Description must include order and product details
  assert.ok(workerCode.includes('description: `Pesanan Penawaran Spesial JOKI.IN ${orderCode} - ${prodName}`'), 'worker.js special order description must include product name');
  assert.ok(catalogEdgeCode.includes('description: `Pesanan JOKI.IN ${orderCode} - ${prodName}`'), 'jokiin-catalog order description must include product name');
});
