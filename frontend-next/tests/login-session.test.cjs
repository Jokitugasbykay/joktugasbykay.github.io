const assert = require('node:assert/strict');
const test = require('node:test');
const { saveAuthSession, SUPABASE_URL } = require('../src/lib/auth-session.ts');

test('login persists a refreshable session for the storefront Supabase client', (t) => {
  const values = new Map();
  const cookie = { value: '' };
  const document = Object.defineProperty({}, 'cookie', {
    get: () => cookie.value,
    set: (value) => { cookie.value = value.split(';', 1)[0]; },
  });
  for (const [name, value] of Object.entries({
    document,
    location: { protocol: 'https:' },
    localStorage: {
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    t.after(() => previous ? Object.defineProperty(globalThis, name, previous) : delete globalThis[name]);
    Object.defineProperty(globalThis, name, { value, configurable: true });
  }

  const session = { access_token: 'eyJfixture', expires_in: 3600, user: { id: 'synthetic-user' } };
  assert.throws(() => saveAuthSession(session), /Sesi tidak lengkap/);
  assert.equal(values.size, 0);
  assert.equal(cookie.value, '');

  saveAuthSession({ ...session, refresh_token: 'fixture-refresh', provider_token: 'omit-me' });
  const storageKey = 'sb-' + new URL(SUPABASE_URL).hostname.split('.')[0] + '-auth-token';
  const stored = JSON.parse(values.get(storageKey));
  assert.equal(stored.user.id, session.user.id);
  assert.equal(stored.access_token, session.access_token);
  assert.equal(stored.refresh_token, 'fixture-refresh');
  assert.ok(stored.expires_at > Math.floor(Date.now() / 1000));
  assert.equal(stored.provider_token, undefined);
  assert.equal(cookie.value, 'sb-access-token=eyJfixture');
});
