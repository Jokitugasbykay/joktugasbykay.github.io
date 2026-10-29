const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ADMIN_KAYLA_ID = '92e7a1cb-2136-496a-913b-00cd402c04f5';
const OTHER_USER_ID = '6e47e77b-a9db-429a-a716-7e45aa932e7a';

const context = (extra) =>
  vm.createContext({
    Request,
    Response,
    Headers,
    URL,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    atob: globalThis.atob,
    btoa: globalThis.btoa,
    Buffer,
    crypto: globalThis.crypto,
    console,
    AbortController, setTimeout, clearTimeout,
    ...extra,
  });

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });

function setupWorkerMock() {
  const mockDb = {
    products: [
      {
        id: '03d664e2-a799-45f8-8952-3e1e1a7efe59',
        nama: 'Gemini Pro 18 Bulan',
        slug: 'gemini-pro-18-bulan',
        kategori: 'Akun AI & Produktivitas',
        deskripsi: 'Akses penuh Gemini Advanced 18 bulan',
        harga_dasar: 50000,
        diskon_persen: 30,
        stok: 10,
        is_active: true,
      },
    ],
    payment_orders: [],
  };

  const ctx = context({
    fetch: async (url, options = {}) => {
      const u = new URL(url);
      const auth = (options.headers && (options.headers.authorization || options.headers.Authorization)) || '';

      // Auth endpoint
      if (u.pathname.endsWith('/auth/v1/user')) {
        if (auth.includes('kayla-token')) {
          return jsonResponse({ id: ADMIN_KAYLA_ID, email: 'kaylafisika24@gmail.com' });
        }
        if (auth.includes('other-token')) {
          return jsonResponse({ id: OTHER_USER_ID, email: 'other@example.com' });
        }
        return jsonResponse({ error: 'invalid token' }, 401);
      }

      // Rest endpoints
      if (u.pathname.includes('/rest/v1/products')) {
        return jsonResponse(mockDb.products);
      }
      if (u.pathname.includes('/rest/v1/promo_banners')) {
        return jsonResponse([]);
      }
      if (u.pathname.includes('/rest/v1/payment_orders')) {
        if (options.method === 'POST') {
          const body = JSON.parse(options.body || '{}');
          mockDb.payment_orders.push(body);
          return jsonResponse([body]);
        }
        return jsonResponse(mockDb.payment_orders);
      }
      if (u.pathname.includes('/rest/v1/order_items')) {
        return jsonResponse([]);
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
  };
}

test('Digital Store Gate: Unauthenticated visitor accessing /produk-digital/home gets 302 redirect to /login', async () => {
  const w = setupWorkerMock();
  const req = new Request('https://jokiin.my.id/produk-digital/home', {
    headers: { accept: 'text/html' },
  });
  const res = await w.run(req);
  assert.equal(res.status, 302);
  const location = res.headers.get('location');
  assert.ok(location && location.includes('/login?redirect='));
});

test('Digital Store Gate: Logged-in non-Kayla account gets HTTP 403 Forbidden', async () => {
  const w = setupWorkerMock();
  const req = new Request('https://jokiin.my.id/produk-digital/home', {
    headers: {
      accept: 'text/html',
      cookie: 'sb-access-token=other-token',
    },
  });
  const res = await w.run(req);
  assert.equal(res.status, 403);
  const text = await res.text();
  assert.ok(text.includes('403') || text.includes('Akses Ditolak') || text.includes('Admin Kayla'));
});

test('Digital Store Gate: Verified Admin Kayla gets HTTP 200 and access to Storefront', async () => {
  const w = setupWorkerMock();
  const req = new Request('https://jokiin.my.id/produk-digital/home', {
    headers: {
      accept: 'text/html',
      cookie: 'sb-access-token=kayla-token',
    },
  });
  const res = await w.run(req);
  assert.equal(res.status, 200);
});

test('Digital Store API: auth-verify returns 401 for unauthenticated, 403 for non-Kayla, 200 for Kayla', async () => {
  const w = setupWorkerMock();

  // 1. Unauthenticated
  const req1 = new Request('https://jokiin.my.id/api/digital-store/auth-verify');
  const res1 = await w.run(req1);
  assert.equal(res1.status, 401);

  // 2. Non-Kayla
  const req2 = new Request('https://jokiin.my.id/api/digital-store/auth-verify', {
    headers: { authorization: 'Bearer other-token' },
  });
  const res2 = await w.run(req2);
  assert.equal(res2.status, 403);

  // 3. Admin Kayla
  const req3 = new Request('https://jokiin.my.id/api/digital-store/auth-verify', {
    headers: { authorization: 'Bearer kayla-token' },
  });
  const res3 = await w.run(req3);
  assert.equal(res3.status, 200);
  const data = await res3.json();
  assert.equal(data.authorized, true);
  assert.equal(data.user.id, ADMIN_KAYLA_ID);
});

test('Digital Store API: products cannot be queried by guests or non-Kayla', async () => {
  const w = setupWorkerMock();

  // Guest
  const res1 = await w.run(new Request('https://jokiin.my.id/api/digital-store/products'));
  assert.equal(res1.status, 401);

  // Non-Kayla
  const res2 = await w.run(
    new Request('https://jokiin.my.id/api/digital-store/products', {
      headers: { authorization: 'Bearer other-token' },
    })
  );
  assert.equal(res2.status, 403);

  // Admin Kayla
  const res3 = await w.run(
    new Request('https://jokiin.my.id/api/digital-store/products', {
      headers: { authorization: 'Bearer kayla-token' },
    })
  );
  assert.equal(res3.status, 200);
  const data = await res3.json();
  assert.ok(Array.isArray(data.products));
  assert.equal(data.products.length, 1);
});

test('Existing JOKI.IN routes remain completely accessible and unaffected', async () => {
  const w = setupWorkerMock();

  // Health
  const resHealth = await w.run(new Request('https://jokiin.my.id/api/health'));
  assert.equal(resHealth.status, 200);

  // Main page
  const resHome = await w.run(new Request('https://jokiin.my.id/'));
  assert.equal(resHome.status, 200);

  // Services page
  const resServices = await w.run(new Request('https://jokiin.my.id/services'));
  assert.equal(resServices.status, 200);
});

test('Digital Store Gate: forged Admin Kayla JWT is rejected by Supabase verification', async () => {
  const w = setupWorkerMock();
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: ADMIN_KAYLA_ID, email: 'kaylafisika24@gmail.com', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const jwt = header + '.' + payload + '.mockSignature';

  const req = new Request('https://jokiin.my.id/produk-digital/home', {
    headers: {
      accept: 'text/html',
      cookie: 'sb-access-token=' + jwt,
    },
  });
  const res = await w.run(req);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/login?redirect=%2Fproduk-digital%2Fhome');
});

test('Digital Store Gate: env.ASSETS internal redirect handling resolves to 200 OK', async () => {
  const w = setupWorkerMock();
  let assetFetchCount = 0;
  const customEnv = {
    ASSETS: {
      fetch: async (req) => {
        assetFetchCount++;
        const u = new URL(req.url);
        if (u.pathname === '/produk-digital/home/') {
          return new Response(null, { status: 307, headers: { location: '/produk-digital/home/index.html' } });
        }
        return new Response('<html>ok</html>', { status: 200, headers: { 'content-type': 'text/html' } });
      }
    }
  };

  const req = new Request('https://jokiin.my.id/produk-digital/home', {
    headers: {
      accept: 'text/html',
      cookie: 'sb-access-token=kayla-token',
    },
  });
  const res = await w.run(req, customEnv);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), '<html>ok</html>');
  assert.equal(assetFetchCount, 2);
});
