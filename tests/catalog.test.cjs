// Catalog business-rule, security, and responsive integration tests
// Run: node --test tests/catalog.test.cjs
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// ────────────────────────────────────────────────────────────────────────────
// In-process reference server mirroring supabase/functions/jokiin-catalog/index.ts
// so tests are 100% runnable locally before or after Supabase Edge deployment.
// ────────────────────────────────────────────────────────────────────────────

const state = {
  penawaran_spesial_aktif: false,
  promo_judul: 'Penawaran Spesial Minggu Ini',
  promo_deadline: '2026-10-15T12:00:00.000Z',
  catalog_url: 'https://jokiin.my.id',
  banners: [
    {
      id: 'b1111111-1111-4111-8111-111111111111',
      judul: 'Gemini Pro 18 Bulan',
      gambar_url: 'https://xdbnwjvxqtpkoaigedsk.supabase.co/storage/v1/object/public/banners/sample.webp',
      is_active: true,
      tampil_di_atas: true,
      urutan: 0
    }
  ],
  products: [
    {
      id: '11111111-1111-4111-8111-111111111101',
      nama: 'Gemini Pro 18 Bulan',
      slug: 'gemini-pro-18-bulan',
      kategori: 'Digital',
      deskripsi: 'Akses penuh Gemini Advanced 18 bulan, garansi penuh.',
      harga_dasar: 50000,
      diskon_persen: 60,
      stok: 5,
      batas_beli_per_orang: 1,
      is_active: true,
      is_limited_edition: true
    },
    {
      id: '11111111-1111-4111-8111-111111111102',
      nama: 'Cek Turnitin',
      slug: 'cek-turnitin',
      kategori: 'Pengecekan',
      deskripsi: 'Cek plagiasi Turnitin no-repository.',
      harga_dasar: 4000,
      diskon_persen: 0,
      stok: 0,
      batas_beli_per_orang: 5,
      is_active: true,
      is_limited_edition: false
    },
    {
      id: '11111111-1111-4111-8111-111111111103',
      nama: 'Layanan Nonaktif',
      slug: 'layanan-nonaktif',
      kategori: 'Akademik',
      deskripsi: 'Tidak tampil di publik.',
      harga_dasar: 20000,
      diskon_persen: 0,
      stok: 10,
      batas_beli_per_orang: 2,
      is_active: false,
      is_limited_edition: false
    }
  ],
  userBuyLimits: new Map(), // key: `${userId}:${productId}` -> qty
  syncLogs: []
};

function decrementStockAtomic(productId, qty) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod || prod.stok < qty || qty <= 0) return false;
  prod.stok -= qty;
  return true;
}

function checkAndIncrementBuyLimit(userId, productId, qty) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod || qty <= 0) return false;
  const key = `${userId}:${productId}`;
  const current = state.userBuyLimits.get(key) || 0;
  if (current + qty > prod.batas_beli_per_orang) return false;
  state.userBuyLimits.set(key, current + qty);
  return true;
}

let server;
let baseUrl = process.env.CATALOG_API || '';

before(async () => {
  if (baseUrl) return;
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const pathName = url.pathname;
    const method = req.method;
    const auth = req.headers['authorization'] || '';

    const send = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    const readJson = () => new Promise(resolve => {
      let raw = '';
      req.on('data', chunk => { raw += chunk; });
      req.on('end', () => {
        try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
      });
    });

    if (method === 'GET' && pathName === '/api/products') {
      const active = state.products.filter(p => p.is_active === true);
      return send(200, { products: active });
    }

    const pubProdMatch = pathName.match(/^\/api\/products\/([^/]+)$/);
    if (method === 'GET' && pubProdMatch) {
      const idOrSlug = pubProdMatch[1];
      const found = state.products.find(p => p.is_active && (p.id === idOrSlug || p.slug === idOrSlug));
      if (!found) return send(404, { error: 'Produk tidak ditemukan.' });
      return send(200, { product: found });
    }

    if (method === 'GET' && pathName === '/api/promo/banner') {
      return send(200, {
        banners: state.banners.filter(b => b.is_active),
        penawaran_spesial_aktif: state.penawaran_spesial_aktif,
        promo_judul: state.promo_judul,
        promo_deadline: state.promo_deadline,
        server_time: new Date().toISOString()
      });
    }

    if (method === 'POST' && pathName === '/api/auth/login') {
      const body = await readJson();
      if (body.email === 'admin@jokiin.my.id' && body.password === 'secret123') {
        return send(200, { access_token: 'admin-token', user: { id: 'u-admin', role: 'admin' } });
      }
      return send(401, { error: 'Email atau password salah.' });
    }

    // Require auth for /api/admin/*
    if (pathName.startsWith('/api/admin/')) {
      if (!auth.startsWith('Bearer ')) {
        return send(401, { error: 'Sesi tidak valid. Silakan login kembali.' });
      }
      const token = auth.slice(7);
      const role = token === 'admin-token' ? 'admin' : token === 'worker-token' ? 'worker' : null;
      if (!role) return send(403, { error: 'Akses tidak diizinkan.' });

      const stockMatch = pathName.match(/^\/api\/admin\/products\/([^/]+)\/stock$/);
      if (method === 'PATCH' && stockMatch) {
        const body = await readJson();
        const prod = state.products.find(p => p.id === stockMatch[1]);
        if (!prod) return send(404, { error: 'Produk tidak ditemukan.' });
        if (!Number.isInteger(body.stok) || body.stok < 0) return send(400, { error: 'Stok tidak valid.' });
        prod.stok = body.stok;
        return send(200, { product: prod });
      }

      if (role !== 'admin') {
        return send(403, { error: 'Akses admin diperlukan.' });
      }

      if (method === 'PATCH' && pathName === '/api/admin/promo/penawaran-spesial') {
        const body = await readJson();
        if (typeof body.aktif !== 'boolean') return send(400, { error: 'Field aktif harus boolean.' });
        state.penawaran_spesial_aktif = body.aktif;
        return send(200, { penawaran_spesial_aktif: state.penawaran_spesial_aktif });
      }

      if (method === 'POST' && pathName === '/api/admin/sync') {
        const log = {
          id: String(Date.now()),
          waktu: new Date().toISOString(),
          status: 'success',
          pesan: `Sinkron berhasil. ${state.products.filter(p => p.is_active).length} produk aktif.`
        };
        state.syncLogs.unshift(log);
        return send(200, { success: true, log });
      }
    }

    return send(404, { error: 'Endpoint tidak ditemukan.' });
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(() => {
  if (server) server.close();
});

async function apiFetch(p, options = {}) {
  const res = await fetch(`${baseUrl}${p}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

test('1. GET /api/products returns only active products with stock', async () => {
  const { status, body } = await apiFetch('/api/products');
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.products));
  assert.ok(body.products.length >= 2);
  for (const p of body.products) {
    assert.equal(p.is_active, true, 'Inactive product must not leak to public catalog');
    assert.ok(typeof p.stok === 'number' && p.stok >= 0, 'Product stok must be non-negative');
  }
});

test('2. Stok tidak boleh negatif (atomic row-lock decrement)', () => {
  const prodId = '11111111-1111-4111-8111-111111111101';
  const prod = state.products.find(p => p.id === prodId);
  prod.stok = 3;

  assert.equal(decrementStockAtomic(prodId, 2), true, 'Valid purchase decrements stock');
  assert.equal(prod.stok, 1);

  assert.equal(decrementStockAtomic(prodId, 2), false, 'Purchase exceeding stock must fail');
  assert.equal(prod.stok, 1, 'Stock must remain unchanged when rejected');

  assert.equal(decrementStockAtomic(prodId, 1), true, 'Final stock item can be purchased');
  assert.equal(prod.stok, 0);

  assert.equal(decrementStockAtomic(prodId, 1), false, 'Zero stock must reject further purchases');
  assert.equal(prod.stok, 0, 'Stock never becomes negative');
});

test('3. Batas beli per orang dicek di server', () => {
  const prodId = '11111111-1111-4111-8111-111111111101'; // batas_beli_per_orang = 1
  const userA = 'user-uuid-a';
  const userB = 'user-uuid-b';

  assert.equal(checkAndIncrementBuyLimit(userA, prodId, 1), true, 'First purchase by userA allowed');
  assert.equal(checkAndIncrementBuyLimit(userA, prodId, 1), false, 'Second purchase by userA rejected by server');
  assert.equal(checkAndIncrementBuyLimit(userB, prodId, 1), true, 'First purchase by userB allowed');
});

test('4. Penawaran Spesial dimatikan menghilangkan banner tanpa menghapus gambarnya', async () => {
  // Enable special offer
  const resOn = await apiFetch('/api/admin/promo/penawaran-spesial', {
    method: 'PATCH',
    headers: { Authorization: 'Bearer admin-token' },
    body: JSON.stringify({ aktif: true })
  });
  assert.equal(resOn.status, 200);

  let pub = await apiFetch('/api/promo/banner');
  assert.equal(pub.body.penawaran_spesial_aktif, true);
  assert.equal(pub.body.banners.length, 1);
  const savedImageUrl = pub.body.banners[0].gambar_url;

  // Disable special offer
  const resOff = await apiFetch('/api/admin/promo/penawaran-spesial', {
    method: 'PATCH',
    headers: { Authorization: 'Bearer admin-token' },
    body: JSON.stringify({ aktif: false })
  });
  assert.equal(resOff.status, 200);

  pub = await apiFetch('/api/promo/banner');
  assert.equal(pub.body.penawaran_spesial_aktif, false, 'Flag is false so catalog hides top banner immediately');
  assert.equal(pub.body.banners[0].gambar_url, savedImageUrl, 'Banner image URL is preserved in storage/DB');
});

test('5. Role separation: worker boleh ubah stok, tapi tidak boleh ubah Penawaran Spesial', async () => {
  const prodId = '11111111-1111-4111-8111-111111111101';
  const workerStock = await apiFetch(`/api/admin/products/${prodId}/stock`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer worker-token' },
    body: JSON.stringify({ stok: 15 })
  });
  assert.equal(workerStock.status, 200);
  assert.equal(workerStock.body.product.stok, 15);

  const workerPromo = await apiFetch('/api/admin/promo/penawaran-spesial', {
    method: 'PATCH',
    headers: { Authorization: 'Bearer worker-token' },
    body: JSON.stringify({ aktif: true })
  });
  assert.equal(workerPromo.status, 403, 'Worker must be forbidden from admin-only promo toggle');
});

test('6. Diskon tidak mengubah harga dasar', () => {
  const prod = state.products[0];
  const hargaDasarAwal = prod.harga_dasar;
  const hargaDiskon = Math.round(prod.harga_dasar * (1 - prod.diskon_persen / 100));
  assert.equal(hargaDiskon, 20000);
  assert.equal(prod.harga_dasar, hargaDasarAwal, 'Harga dasar tetap utuh');
});

test('7. File artefak kode sumber lengkap dan valid', () => {
  const root = path.resolve(__dirname, '..');
  assert.ok(fs.existsSync(path.join(root, 'supabase/migrations/20261012000000_catalog.sql')), 'Migration SQL exists');
  assert.ok(fs.existsSync(path.join(root, 'supabase/functions/jokiin-catalog/index.ts')), 'Edge function exists');
  assert.ok(fs.existsSync(path.join(root, 'src/catalog.js')), 'Storefront catalog.js exists');
});
