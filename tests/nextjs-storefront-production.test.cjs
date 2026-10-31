const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const LEGACY_BASELINE_SHA = '3a4d84021450b21979c61c606c209d17a19d7b90f5c015691a0f8d7d889feb90';
const hash = buf => crypto.createHash('sha256').update(buf).digest('hex').toLowerCase();

test('1. Root index.html is modernized Next.js export (< 100 KB, not monolithic 536 KB)', () => {
  const rootIndex = path.join(root, 'index.html');
  assert(fs.existsSync(rootIndex), 'Root index.html must exist');
  const stat = fs.statSync(rootIndex);
  assert(stat.size < 100000, `Root index.html must be < 100 KB, actual: ${stat.size} bytes`);
  assert(stat.size > 10000, `Root index.html must have valid content, actual: ${stat.size} bytes`);

  const content = fs.readFileSync(rootIndex, 'utf8');
  assert(content.includes('/_next/static/'), 'Root index.html must reference Next.js static chunks');
  assert(content.includes('Tugas Kamu'), 'Root index.html must include hero title');
  assert(content.includes('Teman Tugas Mahasiswa'), 'Root index.html must include brand tagline');
  assert(content.includes('Rekomendasi Produk'), 'Root index.html must include recommendations heading');
});

test('2. Legacy monolith index.html is securely preserved in legacy/ with exact SHA-256', () => {
  const legacyIndex = path.join(root, 'legacy', 'index.html');
  assert(fs.existsSync(legacyIndex), 'legacy/index.html must exist as durable backup');
  const legacyBytes = fs.readFileSync(legacyIndex);
  assert.equal(hash(legacyBytes), LEGACY_BASELINE_SHA, 'legacy/index.html must match exact baseline SHA-256');
});

test('3. Next.js static asset references in root index.html exist on disk', () => {
  const content = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const matches = [...content.matchAll(/(?:\/_next\/static\/)([\w./%-]+\.(?:js|css))/g)];
  assert(matches.length > 0, 'Must have Next.js script or CSS references');

  for (const m of matches) {
    const rel = path.join('_next', 'static', m[1]);
    const full = path.join(root, rel);
    assert(fs.existsSync(full), `Referenced Next.js asset missing on disk: ${rel}`);
  }
});

test('4. All migrated App Router routes are present on disk with index.html', () => {
  const routes = [
    'admin/index.html',
    'invoice/index.html',
    'login/index.html',
    'payment/index.html',
    'information/index.html',
    'produk-digital/index.html',
    'produk-digital/home/index.html',
    'produk-digital/checkout/index.html',
    'produk-digital/pesanan/index.html'
  ];

  for (const r of routes) {
    const full = path.join(root, r);
    assert(fs.existsSync(full), `Migrated route missing index.html: ${r}`);
  }
});

test('5. Worker blocks public access to /legacy/ and /frontend-next/ (HTTP 404)', async () => {
  const workerMod = await import(pathToFileURL(path.join(root, 'src', 'worker.js')).href);
  const worker = workerMod.default;

  const env = {
    ASSETS: {
      async fetch() {
        return new Response('Asset Served', { status: 200 });
      }
    },
    SUPABASE_URL: 'https://db.example'
  };

  // Test /legacy and /legacy/index.html
  const resLegacy = await worker.fetch(new Request('http://localhost/legacy/index.html'), env);
  assert.equal(resLegacy.status, 404, '/legacy/index.html must return 404');

  const resLegacyDir = await worker.fetch(new Request('http://localhost/legacy/'), env);
  assert.equal(resLegacyDir.status, 404, '/legacy/ must return 404');

  // Test /frontend-next/
  const resFrontendNext = await worker.fetch(new Request('http://localhost/frontend-next/package.json'), env);
  assert.equal(resFrontendNext.status, 404, '/frontend-next/ must return 404');
});

test('6. Worker serves new Next.js index.html for root / request', async () => {
  const workerMod = await import(pathToFileURL(path.join(root, 'src', 'worker.js')).href);
  const worker = workerMod.default;

  const rootIndexContent = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  const env = {
    ASSETS: {
      async fetch(req) {
        const u = new URL(req.url);
        if (u.pathname === '/' || u.pathname === '/index.html') {
          return new Response(rootIndexContent, {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' }
          });
        }
        return new Response('Not found', { status: 404 });
      }
    },
    SUPABASE_URL: 'https://db.example'
  };

  const res = await worker.fetch(new Request('http://localhost/'), env);
  assert.equal(res.status, 200);
  const body = await res.text();
  assert(body.includes('Tugas Kamu'), 'Root request must serve Next.js storefront');
  assert(body.includes('/_next/static/'), 'Root request must contain Next.js assets');
});
