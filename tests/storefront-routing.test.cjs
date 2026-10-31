const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync((fs.existsSync(path.join(root, 'tests/fixtures/legacy/index.html')) ? path.join(root, 'tests/fixtures/legacy/index.html') : path.join(root, 'index.html')), 'utf8');
function extract(start, end) {
  const at = html.indexOf(start), until = html.indexOf(end, at + start.length);
  assert(at >= 0 && until > at, 'Routing source boundaries must exist');
  return html.slice(at, until);
}
const renderer = extract('        function renderApp()', '        // ==========================================');
const initializer = extract('        async function initializeApp()', '        window.CONFIG = CONFIG;');

function setup(pathname) {
  const calls = [], nodes = new Map();
  const location = { pathname, replace: value => calls.push(['replace', value]) };
  const context = vm.createContext({
    window: { location, showProductReviews: (...args) => calls.push(['detail', ...args]),
      showTestimoniList: (...args) => calls.push(['list', ...args]) },
    document: { getElementById: id => {
      if (!nodes.has(id)) nodes.set(id, { innerHTML: '' });
      return nodes.get(id);
    } },
    CONFIG: { PRODUCTS: [], steps: [{ num: 1, title: 'Fixture', desc: 'Routing only' }], faq: [] },
    renderPopularServices() {}, renderHargaGrid() {}, renderInformationCenter() {}, renderRecommendations() {},
    resolveTestimonialSlug: slug => 'resolved:' + slug,
  });
  vm.runInContext(renderer, context);
  return { context, calls, nodes, location };
}

for (const route of ['/', '/information/', '/services', '/produk-digital', '/produk-digital/', '/produk-digital/home/']) {
  test('renderApp completes without route scope errors: ' + route, () => {
    const { context, nodes } = setup(route);
    assert.doesNotThrow(() => context.renderApp());
    assert.match(nodes.get('full-carapesan').innerHTML, /Fixture/);
  });
}

test('renderApp preserves testimonial detail instead of replacing it with the list', () => {
  const { context, calls } = setup('/testimonials/joki-ppt');
  context.renderApp();
  assert.deepEqual(calls, [['detail', 'resolved:joki-ppt', false]]);
});

test('renderApp rereads the route after navigation without depending on a digital store bridge', () => {
  const { context, calls, location } = setup('/');
  context.window.handleDigitalStoreRoute = () => assert.fail('Modular digital pages own their rendering');
  context.renderApp();
  location.pathname = '/produk-digital/';
  context.renderApp();
  location.pathname = '/testimonials/joki-ppt';
  context.renderApp();
  assert.deepEqual(calls, [['list', false], ['list', false], ['detail', 'resolved:joki-ppt', false]]);
});

test('initializeApp reaches the existing digital page redirect after rendering', async () => {
  const { context, calls } = setup('/produk-digital/');
  Object.assign(context, {
    bindCheckoutFileDropzone() {}, bindCheckoutValidation() {}, loadPromo() {}, startWebsiteMetrics() {},
    sessionStorage: { getItem: () => null, removeItem() {} },
    localStorage: { getItem: () => null, removeItem() {} },
    history: { replaceState() { assert.fail('No fallback path was supplied'); } },
  });
  vm.runInContext(initializer, context);
  await context.initializeApp();
  assert.deepEqual(calls, [['list', false], ['replace', '/produk-digital/home/']]);
});

function worker() {
  const assetPaths = [], authReads = [];
  const context = vm.createContext({ Request, Response, Headers, URL, TextEncoder, TextDecoder,
    Uint8Array, crypto: globalThis.crypto, console, AbortController, setTimeout, clearTimeout,
    fetch: async url => {
      assert.equal(new URL(url).pathname, '/auth/v1/user');
      authReads.push('/auth/v1/user');
      return Response.json({ id: '92e7a1cb-2136-496a-913b-00cd402c04f5' });
    } });
  vm.runInContext(fs.readFileSync(path.join(root, 'src/worker.js'), 'utf8')
    .replace('export default {', 'globalThis.worker = {'), context);
  const env = { SUPABASE_URL: 'https://auth.fixture.invalid', SUPABASE_ANON_KEY: 'synthetic-only',
    ASSETS: { fetch: async request => {
      const pathname = new URL(request.url).pathname;
      assetPaths.push(pathname);
      return new Response('Asset ' + pathname, { headers: { 'content-type': 'text/html' } });
    } } };
  return { assetPaths, authReads, run: (pathname, headers = {}) =>
    context.worker.fetch(new Request('http://localhost' + pathname, { headers }), env) };
}

test('Worker public routes retain their asset destinations without auth requests', async () => {
  const fixture = worker();
  for (const route of ['/', '/information/']) assert.equal((await fixture.run(route)).status, 200);
  assert.deepEqual(fixture.assetPaths, ['/', '/information/']);
  assert.deepEqual(fixture.authReads, []);
});

test('Worker digital route keeps its login gate and modular home destination', async () => {
  const fixture = worker();
  const guest = await fixture.run('/produk-digital/');
  assert.equal(guest.status, 302);
  assert.equal(guest.headers.get('location'), '/login?redirect=%2Fproduk-digital%2F');
  assert.deepEqual(fixture.assetPaths, []);
  const authorized = await fixture.run('/produk-digital/', { authorization: 'Bearer fixture-token' });
  assert.equal(authorized.status, 200);
  assert.deepEqual(fixture.assetPaths, ['/produk-digital/home/']);
  assert.deepEqual(fixture.authReads, ['/auth/v1/user']);
});
