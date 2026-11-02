const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const workerSource = fs.readFileSync(path.join(root, 'src/worker.js'), 'utf8');

const TEST_ANON_KEY = 'mock_server_anon_secret_key_abcdef123456';
const TEST_USER_JWT = 'mock_user_jwt_token_987654321';
const TEST_SERVICE_KEY = 'mock_service_role_key_danger_super_admin';

function createMockWorker({
  anonKey = TEST_ANON_KEY,
  upstreamHandler = null,
  envExtra = {}
} = {}) {
  const interceptedUpstreamRequests = [];

  const defaultUpstream = async (url, options = {}) => {
    interceptedUpstreamRequests.push({
      url: String(url),
      method: options.method || 'GET',
      headers: options.headers ? new Headers(options.headers) : new Headers(),
      body: options.body
    });

    const parsed = new URL(url);
    if (parsed.pathname.startsWith('/auth/v1/')) {
      return new Response(JSON.stringify({ id: 'user_123', email: 'kayla@example.com' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    if (parsed.pathname.startsWith('/rest/v1/')) {
      return new Response(JSON.stringify([{ id: 1, name: 'Service A' }]), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'content-range': '0-0/1'
        }
      });
    }
    if (parsed.pathname.startsWith('/functions/v1/')) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ notFound: true }), {
      status: 404,
      headers: { 'content-type': 'application/json' }
    });
  };

  const context = vm.createContext({
    Request,
    Response,
    Headers,
    URL,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    crypto: globalThis.crypto,
    AbortController: globalThis.AbortController,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    console,
    fetch: async (url, options) => {
      if (upstreamHandler) {
        return upstreamHandler(url, options, interceptedUpstreamRequests);
      }
      return defaultUpstream(url, options);
    }
  });

  vm.runInContext(
    workerSource.replace('export default {', 'globalThis.worker = {'),
    context
  );

  const env = {
    SUPABASE_URL: 'https://db-mock.supabase.co',
    SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: TEST_SERVICE_KEY,
    ...envExtra
  };

  return {
    fetch: (request) => context.worker.fetch(request, env),
    intercepted: interceptedUpstreamRequests
  };
}

// 1. Browser tidak bisa mengirim key upstream (client apikey is stripped)
test('1. Client apikey is stripped and not forwarded upstream', async () => {
  const worker = createMockWorker();
  const res = await worker.fetch(new Request('https://jokiin.my.id/api/supabase/rest/v1/services', {
    headers: {
      origin: 'https://jokiin.my.id',
      apikey: 'fake_client_attacker_key'
    }
  }));

  assert.equal(res.status, 200);
  assert.equal(worker.intercepted.length, 1);
  const upstream = worker.intercepted[0];
  assert.equal(upstream.headers.get('apikey'), TEST_ANON_KEY);
  assert.notEqual(upstream.headers.get('apikey'), 'fake_client_attacker_key');
});

// 2. Worker menyuntikkan apikey dari Worker Secret (env.SUPABASE_ANON_KEY)
test('2. Worker injects apikey from env.SUPABASE_ANON_KEY', async () => {
  const worker = createMockWorker();
  const res = await worker.fetch(new Request('https://jokiin.my.id/api/supabase/rest/v1/services', {
    headers: { origin: 'https://jokiin.my.id' }
  }));

  assert.equal(res.status, 200);
  const upstream = worker.intercepted[0];
  assert.equal(upstream.headers.get('apikey'), TEST_ANON_KEY);
});

// 3. Tidak ada secret di HTML atau JavaScript source yang dipublikasikan
test('3. No hardcoded Supabase keys in frontend tracked source files', async () => {
  const filesToCheck = [
    'config.js',
    'assets/catalog.js',
    'assets/invoice-page.js',
    'frontend-next/src/app/login/page.tsx',
    'frontend-next/src/app/invoice/page.tsx'
  ];

  for (const rel of filesToCheck) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, 'utf8');
    assert.equal(
      /sb_publishable_/.test(content),
      false,
      `File ${rel} should not contain sb_publishable_`
    );
    assert.equal(
      /sb_secret_/.test(content),
      false,
      `File ${rel} should not contain sb_secret_`
    );
  }
});

// 4. Login Auth tanpa user JWT dapat berfungsi melalui proxy
test('4. Anonymous auth requests inject Bearer anonKey into Authorization header', async () => {
  const worker = createMockWorker();
  const res = await worker.fetch(new Request('https://jokiin.my.id/api/supabase/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: {
      origin: 'https://jokiin.my.id',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ email: 'user@example.com', password: 'secretpassword' })
  }));

  assert.equal(res.status, 200);
  const upstream = worker.intercepted[0];
  assert.equal(upstream.headers.get('apikey'), TEST_ANON_KEY);
  assert.equal(upstream.headers.get('authorization'), `Bearer ${TEST_ANON_KEY}`);
});

// 5. User JWT diteruskan untuk request terautentikasi (RLS tetap berlaku)
test('5. User JWT is preserved in Authorization header for authenticated requests', async () => {
  const worker = createMockWorker();
  const res = await worker.fetch(new Request('https://jokiin.my.id/api/supabase/auth/v1/user', {
    headers: {
      origin: 'https://jokiin.my.id',
      authorization: `Bearer ${TEST_USER_JWT}`
    }
  }));

  assert.equal(res.status, 200);
  const upstream = worker.intercepted[0];
  assert.equal(upstream.headers.get('apikey'), TEST_ANON_KEY);
  assert.equal(upstream.headers.get('authorization'), `Bearer ${TEST_USER_JWT}`);
});

// 6. RLS tetap menggunakan identitas user, bukan service role
test('6. Worker proxy never substitutes user JWT with service role key', async () => {
  const worker = createMockWorker();
  const res = await worker.fetch(new Request('https://jokiin.my.id/api/supabase/rest/v1/orders', {
    headers: {
      origin: 'https://jokiin.my.id',
      authorization: `Bearer ${TEST_USER_JWT}`
    }
  }));

  assert.equal(res.status, 200);
  const upstream = worker.intercepted[0];
  assert.notEqual(upstream.headers.get('authorization'), `Bearer ${TEST_SERVICE_KEY}`);
  assert.notEqual(upstream.headers.get('apikey'), TEST_SERVICE_KEY);
  assert.equal(upstream.headers.get('authorization'), `Bearer ${TEST_USER_JWT}`);
  assert.equal(upstream.headers.get('apikey'), TEST_ANON_KEY);
});

// 7. Admin Auth endpoint ditolak
test('7. Admin Auth endpoint is blocked (403 Forbidden)', async () => {
  const worker = createMockWorker();
  const res = await worker.fetch(new Request('https://jokiin.my.id/api/supabase/auth/v1/admin/users', {
    headers: { origin: 'https://jokiin.my.id' }
  }));

  assert.equal(res.status, 403);
  const data = await res.json();
  assert.match(data.error, /admin/i);
  assert.equal(worker.intercepted.length, 0);
});

// 8. Arbitrary path ditolak
test('8. Arbitrary path outside allowlist is rejected (404 Not Found)', async () => {
  const worker = createMockWorker();
  const res = await worker.fetch(new Request('https://jokiin.my.id/api/supabase/database/tables', {
    headers: { origin: 'https://jokiin.my.id' }
  }));

  assert.equal(res.status, 404);
  const data = await res.json();
  assert.match(data.error, /tidak diizinkan/i);
  assert.equal(worker.intercepted.length, 0);
});

// 9. Path traversal ditolak
test('9. Path traversal attempts are rejected (400 Bad Request)', async () => {
  const worker = createMockWorker();
  // Double-encoded path traversal
  const res1 = await worker.fetch(new Request('https://jokiin.my.id/api/supabase/rest/v1/%252e%252e/secret', {
    headers: { origin: 'https://jokiin.my.id' }
  }));
  assert.equal(res1.status, 400);

  // Path traversal in query string
  const res2 = await worker.fetch(new Request('https://jokiin.my.id/api/supabase/rest/v1/services?file=../../etc/passwd', {
    headers: { origin: 'https://jokiin.my.id' }
  }));
  assert.equal(res2.status, 400);

  // Multiple slashes
  const res3 = await worker.fetch(new Request('https://jokiin.my.id/api/supabase/rest/v1//secret', {
    headers: { origin: 'https://jokiin.my.id' }
  }));
  assert.equal(res3.status, 400);

  assert.equal(worker.intercepted.length, 0);
});

// 10. CORS origin tidak dikenal ditolak
test('10. Unknown CORS origin is rejected (403 Forbidden)', async () => {
  const worker = createMockWorker();
  const res = await worker.fetch(new Request('https://jokiin.my.id/api/supabase/rest/v1/services', {
    headers: { origin: 'https://malicious-attacker.com' }
  }));

  assert.equal(res.status, 403);
  assert.equal(worker.intercepted.length, 0);
});

// 11. Wildcard extension origin tidak diizinkan
test('11. Wildcard chrome-extension origin is rejected (403 Forbidden)', async () => {
  const worker = createMockWorker();
  const res = await worker.fetch(new Request('https://jokiin.my.id/api/supabase/rest/v1/services', {
    headers: { origin: 'chrome-extension://any-arbitrary-extension-id' }
  }));

  assert.equal(res.status, 403);
  assert.equal(worker.intercepted.length, 0);
});

// 12. Secret tidak tersedia menghasilkan fail-closed
test('12. Missing SUPABASE_ANON_KEY results in 503 fail-closed response', async () => {
  const worker = createMockWorker({ anonKey: '' });
  const res = await worker.fetch(new Request('https://jokiin.my.id/api/supabase/rest/v1/services', {
    headers: { origin: 'https://jokiin.my.id' }
  }));

  assert.equal(res.status, 503);
  const data = await res.json();
  assert.match(data.error, /secret belum dikonfigurasi/i);
  assert.equal(worker.intercepted.length, 0);
});

// 13. Upstream error dan timeout ditangani dengan aman
test('13. Upstream network failure is handled safely (502 Bad Gateway)', async () => {
  const worker = createMockWorker({
    upstreamHandler: async () => {
      throw new Error('Connection refused upstream');
    }
  });

  const res = await worker.fetch(new Request('https://jokiin.my.id/api/supabase/rest/v1/services', {
    headers: { origin: 'https://jokiin.my.id' }
  }));

  assert.equal(res.status, 502);
  const data = await res.json();
  assert.match(data.error, /Gagal terhubung ke upstream/i);
});

// 14. Response tidak membocorkan API key
test('14. Response headers and response body do not leak SUPABASE_ANON_KEY', async () => {
  const worker = createMockWorker({
    upstreamHandler: async () => {
      return new Response(JSON.stringify({ status: 'ok', data: [] }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-custom-upstream': 'safe'
        }
      });
    }
  });

  const res = await worker.fetch(new Request('https://jokiin.my.id/api/supabase/rest/v1/services', {
    headers: { origin: 'https://jokiin.my.id' }
  }));

  assert.equal(res.status, 200);
  for (const [key, val] of res.headers.entries()) {
    assert.equal(val.includes(TEST_ANON_KEY), false, `Header ${key} leaked key`);
    assert.equal(val.includes(TEST_SERVICE_KEY), false, `Header ${key} leaked service key`);
  }
  const bodyText = await res.text();
  assert.equal(bodyText.includes(TEST_ANON_KEY), false, 'Body leaked anon key');
  assert.equal(bodyText.includes(TEST_SERVICE_KEY), false, 'Body leaked service key');
});

// 15. Catalog routes (/api/products, /api/promo/banner, /api/cart, /api/orders/*) use env.SUPABASE_ANON_KEY
test('15. Catalog proxy routes inject env.SUPABASE_ANON_KEY and do not use service role key', async () => {
  const worker = createMockWorker();
  const routes = ['/api/products', '/api/promo/banner', '/api/cart', '/api/orders/ord_123'];
  for (const route of routes) {
    worker.intercepted.length = 0;
    const res = await worker.fetch(new Request(`https://jokiin.my.id${route}`));
    assert.equal(res.status, 200, `Route ${route} should respond with 200`);
    assert.equal(worker.intercepted.length, 1, `Route ${route} should make 1 upstream request`);
    const upstream = worker.intercepted[0];
    assert.equal(upstream.headers.get('apikey'), TEST_ANON_KEY);
    assert.notEqual(upstream.headers.get('apikey'), TEST_SERVICE_KEY);
  }
});

// 16. Catalog proxy routes fail-closed with HTTP 503 when SUPABASE_ANON_KEY is empty, even when service role key exists
test('16. Catalog routes fail-closed (503) when SUPABASE_ANON_KEY is missing/empty even if service role exists', async () => {
  const worker = createMockWorker({ anonKey: '' });
  const routes = ['/api/products', '/api/promo/banner', '/api/cart', '/api/orders/ord_123', '/api/checkout/reguler'];
  for (const route of routes) {
    worker.intercepted.length = 0;
    const res = await worker.fetch(new Request(`https://jokiin.my.id${route}`, {
      method: route.includes('checkout') ? 'POST' : 'GET',
      headers: { 'content-type': 'application/json' },
      body: route.includes('checkout') ? JSON.stringify({}) : undefined
    }));
    assert.equal(res.status, 503, `Route ${route} should fail-closed with 503`);
    const data = await res.json();
    assert.match(data.error, /secret belum dikonfigurasi/i);
    assert.equal(worker.intercepted.length, 0, `Route ${route} must not send service role key upstream`);
  }
});

// 17. Attacker sending apikey header or query parameter when SUPABASE_ANON_KEY is empty still fails with 503
test('17. Browser sending apikey when SUPABASE_ANON_KEY is empty still fails with 503 without leaking service role', async () => {
  const worker = createMockWorker({ anonKey: '' });
  const res = await worker.fetch(new Request('https://jokiin.my.id/api/products?apikey=attacker_custom_key', {
    headers: {
      apikey: 'attacker_header_key'
    }
  }));
  assert.equal(res.status, 503);
  assert.equal(worker.intercepted.length, 0);
});

// 18. Catalog proxy routes preserve user JWT in Authorization header and never substitute with service role
test('18. Catalog proxy preserves user JWT and never overwrites it with service role key', async () => {
  const worker = createMockWorker();
  const res = await worker.fetch(new Request('https://jokiin.my.id/api/orders/ord_123', {
    headers: {
      authorization: `Bearer ${TEST_USER_JWT}`
    }
  }));
  assert.equal(res.status, 200);
  assert.equal(worker.intercepted.length, 1);
  const upstream = worker.intercepted[0];
  assert.equal(upstream.headers.get('authorization'), `Bearer ${TEST_USER_JWT}`);
  assert.notEqual(upstream.headers.get('authorization'), `Bearer ${TEST_SERVICE_KEY}`);
  assert.equal(upstream.headers.get('apikey'), TEST_ANON_KEY);
  assert.notEqual(upstream.headers.get('apikey'), TEST_SERVICE_KEY);
});

// 19. Catalog proxy strips client apikey from query parameters and headers
test('19. Catalog proxy strips client apikey from query params and headers upstream', async () => {
  const worker = createMockWorker();
  const res = await worker.fetch(new Request('https://jokiin.my.id/api/products?kategori=digital&apikey=malicious_key', {
    headers: {
      apikey: 'malicious_header_key'
    }
  }));
  assert.equal(res.status, 200);
  assert.equal(worker.intercepted.length, 1);
  const upstream = worker.intercepted[0];
  const upstreamUrl = new URL(upstream.url);
  assert.equal(upstreamUrl.searchParams.has('apikey'), false, 'Upstream URL must not have apikey query param');
  assert.equal(upstreamUrl.searchParams.get('kategori'), 'digital');
  assert.equal(upstream.headers.get('apikey'), TEST_ANON_KEY);
  assert.notEqual(upstream.headers.get('apikey'), 'malicious_header_key');
});

// 20. Catalog proxy responses never leak keys in headers or body
test('20. Catalog proxy responses never leak SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY', async () => {
  const worker = createMockWorker({
    upstreamHandler: async () => {
      return new Response(JSON.stringify({ status: 'ok', items: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
  });
  const res = await worker.fetch(new Request('https://jokiin.my.id/api/products'));
  assert.equal(res.status, 200);
  for (const [key, val] of res.headers.entries()) {
    assert.equal(val.includes(TEST_ANON_KEY), false, `Header ${key} leaked anon key`);
    assert.equal(val.includes(TEST_SERVICE_KEY), false, `Header ${key} leaked service key`);
  }
  const bodyText = await res.text();
  assert.equal(bodyText.includes(TEST_ANON_KEY), false, 'Body leaked anon key');
  assert.equal(bodyText.includes(TEST_SERVICE_KEY), false, 'Body leaked service key');
});
