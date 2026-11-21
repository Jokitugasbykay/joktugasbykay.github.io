const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');

// Helper to load Worker module
async function loadWorker() {
  const workerMod = await import(pathToFileURL(path.join(root, 'src', 'worker.js')).href);
  return workerMod.default;
}

test('1. Next.js /home route is exported and served by Worker with 200 OK without redirect flash', async () => {
  const homeIndex = path.join(root, 'home', 'index.html');
  assert(fs.existsSync(homeIndex), 'home/index.html must exist in root publication assets');
  const homeContent = fs.readFileSync(homeIndex, 'utf8');
  assert(homeContent.includes('/_next/static/'), 'home/index.html must reference Next.js assets');
  assert(homeContent.includes('Tugas Kamu'), 'home/index.html must include hero title');

  const worker = await loadWorker();
  let requestedAsset = null;
  const env = {
    ASSETS: {
      async fetch(req) {
        requestedAsset = new URL(req.url).pathname;
        return new Response(homeContent, {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' }
        });
      }
    },
    SUPABASE_URL: 'https://xdbnwjvxqtpkoaigedsk.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key'
  };

  // Direct hit to /home
  const resHome = await worker.fetch(new Request('https://jokiin.my.id/home'), env);
  assert.equal(resHome.status, 200, '/home must return 200 directly without redirect');
  assert.equal(requestedAsset, '/home/index.html', 'Worker must fetch /home/index.html from ASSETS');

  // Direct hit to /home/
  const resHomeSlash = await worker.fetch(new Request('https://jokiin.my.id/home/'), env);
  assert.equal(resHomeSlash.status, 200, '/home/ must return 200 directly without redirect');
  assert.equal(requestedAsset, '/home/index.html', 'Worker must fetch /home/index.html from ASSETS for trailing slash');

  // Direct hit to /home with query params (browser refresh with query)
  const resHomeQuery = await worker.fetch(new Request('https://jokiin.my.id/home?ref=catalog'), env);
  assert.equal(resHomeQuery.status, 200, '/home?ref=catalog must return 200');
});

test('2. Frontend assets audit: zero instances of sb_publishable_, sb_secret_, or service_role in client-accessible code', () => {
  const frontendPaths = [
    path.join(root, 'config.js'),
    path.join(root, 'assets', 'catalog.js'),
    path.join(root, 'home', 'index.html'),
    path.join(root, 'index.html'),
    path.join(root, 'login', 'index.html'),
    path.join(root, 'invoice', 'index.html'),
    path.join(root, 'frontend-next', 'src', 'app', 'login', 'page.tsx'),
    path.join(root, 'frontend-next', 'src', 'app', 'invoice', 'page.tsx')
  ];

  const workplacePaths = [
    'C:/Users/Maulana Riski/.gemini/antigravity/scratch/Jokiin-workplace.github.io/extension/js/config.js',
    'C:/Users/Maulana Riski/.gemini/antigravity/scratch/Jokiin-workplace.github.io/js/app.js',
    'C:/Users/Maulana Riski/.gemini/antigravity/scratch/Jokiin-workplace.github.io/js/produk-promo.js'
  ];

  const allFiles = [...frontendPaths, ...workplacePaths];

  for (const f of allFiles) {
    if (!fs.existsSync(f)) continue;
    const content = fs.readFileSync(f, 'utf8');
    assert(!content.includes('sb_publishable_'), `Forbidden sb_publishable_ found in client asset: ${f}`);
    assert(!content.includes('sb_secret_'), `Forbidden sb_secret_ found in client asset: ${f}`);
    assert(!content.includes('service_role'), `Forbidden service_role found in client asset: ${f}`);
  }
});

test('3. Supabase reverse proxy: CORS preflight (OPTIONS) returns 204 with allowed headers', async () => {
  const worker = await loadWorker();
  const env = {
    SUPABASE_URL: 'https://xdbnwjvxqtpkoaigedsk.supabase.co',
    SUPABASE_ANON_KEY: 'synthetic-anon-key'
  };

  const req = new Request('https://jokiin.my.id/api/supabase/rest/v1/services', {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://jokitugasbykay.github.io',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization, apikey'
    }
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://jokitugasbykay.github.io');
  assert.match(res.headers.get('access-control-allow-methods'), /GET/);
  assert.match(res.headers.get('access-control-allow-headers'), /authorization/i);
});

test('4. Supabase reverse proxy: blocks disallowed endpoints and auth admin access', async () => {
  const worker = await loadWorker();
  const env = {
    SUPABASE_URL: 'https://xdbnwjvxqtpkoaigedsk.supabase.co',
    SUPABASE_ANON_KEY: 'synthetic-anon-key'
  };

  // Disallowed prefix
  const resDisallowed = await worker.fetch(new Request('https://jokiin.my.id/api/supabase/unauthorized/path'), env);
  assert.equal(resDisallowed.status, 403, 'Arbitrary prefix must be rejected with 403');

  // Disallowed auth admin endpoint
  const resAdmin = await worker.fetch(new Request('https://jokiin.my.id/api/supabase/auth/v1/admin/users'), env);
  assert.equal(resAdmin.status, 403, '/auth/v1/admin/ must be rejected with 403');
});

test('5. Supabase reverse proxy: strips client apikey, injects server-side anonKey and sets Authorization', async () => {
  const worker = await loadWorker();
  let forwardedUrl = null;
  let forwardedHeaders = null;

  // Mock global fetch
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (typeof url === 'string' && url.includes('supabase.co')) {
      forwardedUrl = url;
      forwardedHeaders = init.headers;
      return new Response(JSON.stringify([{ id: 1, name: 'Service A' }]), {
        status: 200,
        headers: { 'content-type': 'application/json', 'content-range': '0-0/1' }
      });
    }
    return originalFetch(url, init);
  };

  try {
    const env = {
      SUPABASE_URL: 'https://xdbnwjvxqtpkoaigedsk.supabase.co',
      SUPABASE_ANON_KEY: 'secret-server-anon-key-12345'
    };

    // Anonymous client request with placeholder 'public-proxy'
    const reqAnon = new Request('https://jokiin.my.id/api/supabase/rest/v1/services?select=*', {
      headers: {
        'Origin': 'https://jokiin.my.id',
        'apikey': 'public-proxy',
        'authorization': 'Bearer public-proxy'
      }
    });

    const resAnon = await worker.fetch(reqAnon, env);
    assert.equal(resAnon.status, 200);
    assert.equal(forwardedUrl, 'https://xdbnwjvxqtpkoaigedsk.supabase.co/rest/v1/services?select=*');
    assert.equal(forwardedHeaders.get('apikey'), 'secret-server-anon-key-12345', 'Worker must inject server anon key');
    assert.equal(forwardedHeaders.get('authorization'), 'Bearer secret-server-anon-key-12345', 'Worker must set bearer anon key for anonymous requests');
    assert.equal(resAnon.headers.get('access-control-allow-origin'), 'https://jokiin.my.id');

    // Authenticated user request forwarding user JWT token
    const reqUser = new Request('https://jokiin.my.id/api/supabase/auth/v1/user', {
      headers: {
        'Origin': 'chrome-extension://testextensionid',
        'authorization': 'Bearer user-jwt-token-abcdef'
      }
    });

    const resUser = await worker.fetch(reqUser, env);
    assert.equal(resUser.status, 200);
    assert.equal(forwardedHeaders.get('apikey'), 'secret-server-anon-key-12345', 'Worker must inject server anon key');
    assert.equal(forwardedHeaders.get('authorization'), 'Bearer user-jwt-token-abcdef', 'Worker must forward user JWT token');
    assert.equal(resUser.headers.get('access-control-allow-origin'), 'chrome-extension://testextensionid', 'Chrome extension origin must be allowed in CORS');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
