const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ADMIN_KAYLA_ID = '92e7a1cb-2136-496a-913b-00cd402c04f5';

const context = (extra) =>
  vm.createContext({
    Request,
    Response,
    Headers,
    URL,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    crypto: globalThis.crypto,
    console,
    ...extra,
  });

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });

function setupWorkerEnv() {
  const mockProducts = [
    {
      id: '03d664e2-a799-45f8-8952-3e1e1a7efe59',
      nama: 'Gemini Pro 18 Bulan',
      slug: 'gemini-pro-18-bulan',
      kategori: 'Akun AI & Produktivitas',
      harga_dasar: 50000,
      diskon_persen: 30,
      stok: 5,
      is_active: true,
    },
    {
      id: '06f1a5e6-a47b-499e-871a-94915e38cbc9',
      nama: 'Akun Habis Test',
      slug: 'akun-habis-test',
      kategori: 'Akun AI & Produktivitas',
      harga_dasar: 100000,
      diskon_persen: 0,
      stok: 0,
      is_active: true,
    },
  ];

  const mockOrders = [];
  const mockOrderItems = [];

  const ctx = context({
    fetch: async (url, options = {}) => {
      const u = new URL(url);
      const auth = (options.headers && (options.headers.authorization || options.headers.Authorization)) || '';

      if (u.pathname.endsWith('/auth/v1/user')) {
        if (auth.includes('kayla-token')) {
          return jsonResponse({ id: ADMIN_KAYLA_ID, email: 'kaylafisika24@gmail.com' });
        }
        return jsonResponse({ error: 'invalid token' }, 401);
      }

      if (u.pathname.includes('/rest/v1/products')) {
        const slugMatch = u.search.match(/slug=eq\.([^&]+)/);
        if (slugMatch) {
          const decodedSlug = decodeURIComponent(slugMatch[1]);
          const found = mockProducts.filter((p) => p.slug === decodedSlug);
          return jsonResponse(found);
        }
        return jsonResponse(mockProducts);
      }

      if (u.pathname.includes('/rest/v1/promo_banners')) {
        return jsonResponse([]);
      }

      if (u.pathname.includes('/rest/v1/payment_orders')) {
        if (options.method === 'POST') {
          const body = JSON.parse(options.body || '{}');
          mockOrders.push(body);
          return jsonResponse([body]);
        }
        if (options.method === 'PATCH') {
          const body = JSON.parse(options.body || '{}');
          const codeMatch = u.search.match(/order_code=eq\.([^&]+)/);
          if (codeMatch) {
            const code = decodeURIComponent(codeMatch[1]);
            const target = mockOrders.find((o) => o.order_code === code);
            if (target) Object.assign(target, body);
          }
          return jsonResponse([{ success: true }]);
        }
        const codeMatch = u.search.match(/order_code=eq\.([^&]+)/);
        if (codeMatch) {
          const code = decodeURIComponent(codeMatch[1]);
          const found = mockOrders.filter((o) => o.order_code === code);
          return jsonResponse(found);
        }
        return jsonResponse(mockOrders);
      }

      if (u.pathname.includes('/rest/v1/order_items')) {
        if (options.method === 'POST') {
          const items = JSON.parse(options.body || '[]');
          mockOrderItems.push(...items);
          return jsonResponse(items);
        }
        return jsonResponse(mockOrderItems);
      }

      if (u.pathname.endsWith('/rpc/jokiin_rate_limit')) {
        return jsonResponse(true);
      }

      throw new Error(`Unexpected request to: ${url}`);
    },
  });

  const workerCode = fs
    .readFileSync(path.join(root, 'src/worker.js'), 'utf8')
    .replace('export default {', 'globalThis.worker = {');
  vm.runInContext(workerCode, ctx);

  return {
    run: (req, env = {}) =>
      ctx.worker.fetch(req, {
        SUPABASE_URL: 'https://db.example',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        ASSETS: {
          fetch: async () => new Response('<html>index.html shell</html>', { status: 200, headers: { 'content-type': 'text/html' } }),
        },
        ...env,
      }),
    mockOrders,
    mockOrderItems,
  };
}

test('Digital Store Checkout: calculates trusted price (Rp50.000 - 30% = Rp35.000 x 2 = Rp70.000)', async () => {
  const w = setupWorkerEnv();
  const req = new Request('https://jokiin.my.id/api/digital-store/checkout', {
    method: 'POST',
    headers: {
      authorization: 'Bearer kayla-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      slug: 'gemini-pro-18-bulan',
      qty: 2,
      customer: {
        name: 'Admin Kayla',
        email: 'kaylafisika24@gmail.com',
        whatsapp: '081234567890',
      },
    }),
  });

  const res = await w.run(req);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.total, 70000);
  assert.ok(data.order_code.startsWith('DGT'), 'Order code should start with DGT prefix');

  // Verify saved order in mock db
  assert.equal(w.mockOrders.length, 1);
  assert.equal(w.mockOrders[0].total, 70000);
  assert.equal(w.mockOrders[0].tipe, 'DIGITAL');
  assert.equal(w.mockOrders[0].user_id, ADMIN_KAYLA_ID);
  assert.equal(w.mockOrders[0].payment_status, 'PENDING');
});

test('Digital Store Checkout: rejects out-of-stock product with 409', async () => {
  const w = setupWorkerEnv();
  const req = new Request('https://jokiin.my.id/api/digital-store/checkout', {
    method: 'POST',
    headers: {
      authorization: 'Bearer kayla-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      slug: 'akun-habis-test',
      qty: 1,
      customer: {
        name: 'Admin Kayla',
        email: 'kaylafisika24@gmail.com',
        whatsapp: '081234567890',
      },
    }),
  });

  const res = await w.run(req);
  assert.equal(res.status, 409);
  const data = await res.json();
  assert.ok(data.error.includes('Stok'));
});

test('Digital Store Checkout: rejects non-existent product with 404', async () => {
  const w = setupWorkerEnv();
  const req = new Request('https://jokiin.my.id/api/digital-store/checkout', {
    method: 'POST',
    headers: {
      authorization: 'Bearer kayla-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      slug: 'produk-palsu-123',
      qty: 1,
    }),
  });

  const res = await w.run(req);
  assert.equal(res.status, 404);
});

test('Digital Store Order Status: returns digital order details for Admin Kayla', async () => {
  const w = setupWorkerEnv();

  // Create an order first
  await w.run(
    new Request('https://jokiin.my.id/api/digital-store/checkout', {
      method: 'POST',
      headers: {
        authorization: 'Bearer kayla-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        slug: 'gemini-pro-18-bulan',
        qty: 1,
        customer: {
          name: 'Admin Kayla',
          email: 'kaylafisika24@gmail.com',
        },
      }),
    })
  );

  const orderCode = w.mockOrders[0].order_code;

  // Query order status
  const res = await w.run(
    new Request(`https://jokiin.my.id/api/digital-store/orders/${orderCode}`, {
      headers: { authorization: 'Bearer kayla-token' },
    })
  );

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.order.order_code, orderCode);
  assert.equal(data.order.tipe, 'DIGITAL');
});
