const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');

test('catalog order details require the verified owner', async (t) => {
  let handler;
  const calls = [];
  t.mock.method(global, 'fetch', async (input, options) => {
    const url = new URL(input);
    assert.equal(url.hostname, 'stub.invalid');
    calls.push(url.pathname);
    if (url.pathname === '/auth/v1/user') {
      return Response.json({ id: options.headers.Authorization.slice(7) });
    }
    if (url.pathname === '/rest/v1/orders') {
      assert.ok(url.searchParams.has('user_id'));
      const ownsOrder = url.searchParams.get('user_id') === 'eq.owner';
      return Response.json(ownsOrder ? [{ nama: 'Synthetic owner' }] : []);
    }
    assert.equal(url.pathname, '/rest/v1/order_items');
    return Response.json([]);
  });
  const previousDeno = global.Deno;
  t.after(() => {
    if (previousDeno === undefined) delete global.Deno;
    else global.Deno = previousDeno;
  });
  global.Deno = {
    env: { get: (key) => ({ SUPABASE_URL: 'https://stub.invalid', SUPABASE_SERVICE_ROLE_KEY: 'test-only' })[key] },
    serve: (fn) => { handler = fn; },
  };
    const source = readFileSync(require('node:path').join(__dirname, '../supabase/functions/jokiin-catalog/index.ts'), 'utf8');
  const js = stripTypeScriptTypes(source, { mode: 'transform' });
  await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

  const url = 'https://stub.invalid/api/orders/NUG' + 'A'.repeat(26);
  for (const [token, status, paths] of [
    ['', 401, []],
    ['other', 404, ['/auth/v1/user', '/rest/v1/orders']],
    ['owner', 200, ['/auth/v1/user', '/rest/v1/orders', '/rest/v1/order_items']],
  ]) {
    calls.length = 0;
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    const response = await handler(new Request(url, { headers }));
    assert.equal(response.status, status);
    assert.deepEqual(calls, paths);
    if (token === 'owner') assert.equal((await response.json()).order.nama, 'Synthetic owner');
  }
});
