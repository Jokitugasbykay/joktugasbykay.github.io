const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHmac, generateKeySync, timingSafeEqual, webcrypto } = require('node:crypto');

const workerSource = fs.readFileSync(path.join(__dirname, '../src/worker.js'), 'utf8');
const ADMIN = '92e7a1cb-2136-496a-913b-00cd402c04f5';
const OTHER = '00000000-0000-4000-8000-000000000001';
const issuer = 'https://auth.fixture.invalid';
const signingKey = generateKeySync('hmac', { length: 256 });
const attackerKey = generateKeySync('hmac', { length: 256 });
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
function signed(claims, key = signingKey) {
  const body = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode(claims);
  return body + '.' + createHmac('sha256', key).update(body).digest('base64url');
}
function claims(extra = {}) {
  return { iss: issuer, aud: 'authenticated', sub: ADMIN, exp: Math.floor(Date.now() / 1000) + 300, ...extra };
}
// Test-only issuer checks signatures and expiry before returning an identity.
function verifiedIdentity(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || JSON.parse(Buffer.from(parts[0], 'base64url')).alg !== 'HS256') return null;
    const expected = createHmac('sha256', signingKey).update(parts[0] + '.' + parts[1]).digest();
    const actual = Buffer.from(parts[2], 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const value = JSON.parse(Buffer.from(parts[1], 'base64url'));
    if (value.iss !== issuer || value.aud !== 'authenticated' || typeof value.sub !== 'string' || !value.sub ||
      !Number.isFinite(value.exp) || value.exp <= Date.now() / 1000) return null;
    return { id: value.sub, email: value.email || 'synthetic@example.invalid' };
  } catch { return null; }
}

function fixture(options = {}) {
  const calls = [], assets = [], signals = [], deadlines = [];
  const context = vm.createContext({
    Request, Response, Headers, URL, TextEncoder, TextDecoder, Uint8Array, crypto: webcrypto,
    AbortController, clearTimeout,
    setTimeout: (callback, delay) => {
      deadlines.push(delay);
      return setTimeout(callback, options.accelerateTimeout ? 5 : delay);
    },
    fetch: async (url, init) => {
      assert.equal(url, issuer + '/auth/v1/user');
      assert.equal(init.method || 'GET', 'GET');
      assert.equal(init.headers.apikey, 'synthetic-api-key');
      assert.equal(init.redirect, 'manual');
      assert.ok(init.signal);
      calls.push('/auth/v1/user');
      signals.push(init.signal);
      if (options.behavior === 'throw') throw new Error('Synthetic unavailable');
      if (options.behavior === 'fetch-timeout') return new Promise(() => {});
      if (options.behavior === 'body-timeout') return { ok: true, json: () => new Promise(() => {}) };
      if (options.response) return options.response();
      const token = (init.headers.authorization || '').replace(/^Bearer /, '');
      const user = verifiedIdentity(token);
      return user ? Response.json(user) : Response.json({ error: 'invalid token' }, { status: 401 });
    }
  });
  vm.runInContext(workerSource.replace('export default {', 'globalThis.worker = {'), context);
  const env = { SUPABASE_URL: issuer, SUPABASE_ANON_KEY: 'synthetic-api-key',
    ASSETS: { fetch: async request => {
      assets.push(new URL(request.url).pathname);
      return new Response('synthetic digital home', { headers: { 'content-type': 'text/html' } });
    } } };
  return { calls, assets, signals, deadlines,
    async run(route, token, extra = {}) {
      const headers = new Headers(extra.headers);
      if (token !== undefined) headers.set('authorization', 'Bearer ' + token);
      return context.worker.fetch(new Request('https://store.fixture.invalid' + route, { headers }),
        { ...env, ...extra.env });
    }
  };
}

const routes = ['/produk-digital/', '/api/digital-store/auth-verify'];
function denied(response, route, forbidden = false) {
  assert.equal(response.status, forbidden ? 403 : route.startsWith('/api/') ? 401 : 302);
  if (!forbidden && !route.startsWith('/api/')) {
    assert.equal(response.headers.get('location'), '/login?redirect=' + encodeURIComponent(route));
  }
}

test('Synthetic issuer rejects altered signatures and expiry independently', () => {
  const valid = signed(claims());
  assert.equal(verifiedIdentity(valid).id, ADMIN);
  assert.equal(verifiedIdentity(signed(claims(), attackerKey)), null);
  assert.equal(verifiedIdentity(signed(claims({ exp: 1 }))), null);
  assert.equal(verifiedIdentity(encode({ alg: 'none' }) + '.' + encode(claims()) + '.'), null);
});

for (const route of routes) {
  for (const [name, payload] of [
    ['admin subject and email', claims({ email: 'kaylafisika24@gmail.com' })],
    ['admin email only', { email: 'kaylafisika24@gmail.com' }],
    ['admin subject only', { sub: ADMIN }]
  ]) {
    test(route + ' denies forged signature: ' + name, async () => {
      const f = fixture();
      denied(await f.run(route, signed(payload, attackerKey)), route);
      assert.equal(f.calls.length, 1);
      assert.deepEqual(f.assets, []);
    });
  }
  test(route + ' denies expired signed token', async () => {
    const f = fixture();
    denied(await f.run(route, signed(claims({ exp: 1 }))), route);
    assert.equal(f.calls.length, 1);
    assert.deepEqual(f.assets, []);
  });
  test(route + ' denies verified non-admin even with admin email', async () => {
    const f = fixture();
    denied(await f.run(route, signed(claims({ sub: OTHER, email: 'kaylafisika24@gmail.com' }))), route, true);
    assert.equal(f.calls.length, 1);
    assert.deepEqual(f.assets, []);
  });
  test(route + ' accepts cryptographically verified admin', async () => {
    const f = fixture();
    const response = await f.run(route, signed(claims()));
    assert.equal(response.status, 200);
    assert.equal(f.calls.length, 1);
    if (route.startsWith('/api/')) {
      const body = await response.json();
      assert.equal(body.authorized, true);
      assert.equal(body.user.id, ADMIN);
      assert.deepEqual(f.assets, []);
    } else {
      assert.equal(await response.text(), 'synthetic digital home');
      assert.deepEqual(f.assets, ['/produk-digital/home/']);
    }
    assert.deepEqual(f.deadlines, [5000]);
    assert.ok(f.signals.every(signal => signal.aborted));
  });
  for (const behavior of ['throw', 'fetch-timeout', 'body-timeout']) {
    test(route + ' fails closed on ' + behavior, async () => {
      const f = fixture({ behavior, accelerateTimeout: true });
      denied(await f.run(route, signed(claims())), route);
      assert.deepEqual(f.deadlines, [5000]);
      assert.ok(f.signals.every(signal => signal.aborted));
      assert.deepEqual(f.assets, []);
    });
  }
  for (const [name, response] of [
    ['Supabase unavailable', () => new Response(null, { status: 503 })],
    ['Supabase redirect', () => new Response(null, { status: 302, headers: { location: 'https://outside.invalid' } })],
    ['invalid JSON', () => new Response('not JSON')],
    ['missing ID', () => Response.json({ email: 'kaylafisika24@gmail.com' })],
    ['wrong ID type', () => Response.json({ id: 42, email: 'kaylafisika24@gmail.com' })]
  ]) {
    test(route + ' fails closed on ' + name, async () => {
      const f = fixture({ response });
      denied(await f.run(route, signed(claims())), route);
      assert.deepEqual(f.assets, []);
    });
  }
  test(route + ' fails closed when auth configuration is absent', async () => {
    for (const env of [{ SUPABASE_URL: '' }, { SUPABASE_ANON_KEY: '' }]) {
      const f = fixture();
      denied(await f.run(route, signed(claims()), { env }), route);
      assert.deepEqual(f.calls, []);
      assert.deepEqual(f.assets, []);
    }
  });
  test(route + ' validates supported cookies without trusting their claims', async () => {
    const token = signed(claims());
    for (const value of [token, JSON.stringify([token, 'synthetic-refresh']), JSON.stringify({ access_token: token })]) {
      const f = fixture();
      assert.equal((await f.run(route, undefined, { headers: { cookie: 'sb-access-token=' + encodeURIComponent(value) } })).status, 200);
      assert.equal(f.calls.length, 1);
    }
  });
  test(route + ' denies malformed credentials without falling back to a valid cookie', async () => {
    const cookie = 'sb-access-token=' + encodeURIComponent(signed(claims()));
    for (const headers of [{ cookie: 'sb-access-token=%ZZ' }, { authorization: 'Basic malformed', cookie },
      { cookie: 'sb-access-token=' + encodeURIComponent(JSON.stringify({ access_token: {} })) }]) {
      const f = fixture();
      denied(await f.run(route, undefined, { headers }), route);
      assert.deepEqual(f.calls, []);
      assert.deepEqual(f.assets, []);
    }
  });
  test(route + ' denies missing or unsigned tokens', async () => {
    for (const token of [undefined, encode({ alg: 'none' }) + '.' + encode(claims()) + '.', 'malformed']) {
      const f = fixture();
      denied(await f.run(route, token), route);
      assert.deepEqual(f.assets, []);
    }
  });
}
