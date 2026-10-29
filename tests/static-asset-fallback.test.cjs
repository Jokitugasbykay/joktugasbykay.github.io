// Direct Worker Handler Regression Tests with Mocked Asset Bindings
// Note: These unit tests verify the exported fetch handler logic in src/worker.js
// using Node.js built-ins and mocked asset bindings (not full Miniflare runtime).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const workerPath = path.join(root, 'src', 'worker.js');

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const rootHtmlSha = sha256(fs.readFileSync(path.join(root, 'index.html')));
const infoHtmlSha = sha256(fs.readFileSync(path.join(root, 'information', 'index.html')));

const MIME_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function createMockAssets(rootDir) {
  return {
    async fetch(req) {
      const url = new URL(req.url);
      let relativePath = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
      if (relativePath.endsWith('/')) {
        relativePath += 'index.html';
      }
      const fullPath = path.join(rootDir, relativePath);

      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const ext = path.extname(fullPath).toLowerCase();
        const contentType = MIME_MAP[ext] || 'application/octet-stream';
        const body = fs.readFileSync(fullPath);
        return new Response(body, {
          status: 200,
          headers: { 'content-type': contentType }
        });
      }

      return new Response('Not Found', {
        status: 404,
        headers: { 'content-type': 'text/plain; charset=utf-8' }
      });
    }
  };
}

let worker = null;
let env = null;

test.before(async () => {
  const mod = await import(pathToFileURL(workerPath).href);
  worker = mod.default;
  assert.equal(typeof worker.fetch, 'function', 'Worker must export a fetch handler');

  env = {
    ASSETS: createMockAssets(root),
    SUPABASE_URL: 'https://xdbnwjvxqtpkoaigedsk.supabase.co'
  };
});

test('1. Valid Next.js CSS asset returns 200 with text/css Content-Type', async () => {
  const req = new Request('http://localhost/_next/static/css/6658b19d1e04204c.css');
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const type = res.headers.get('content-type') || '';
  assert.match(type, /text\/css/);
  assert.doesNotMatch(type, /text\/html/);
  const body = await res.text();
  assert(body.includes('--primary'), 'CSS body must contain style rules');
});

test('2. Valid Next.js JS chunk returns 200 with javascript Content-Type', async () => {
  const req = new Request('http://localhost/_next/static/chunks/117-38f9c61b866640a7.js');
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const type = res.headers.get('content-type') || '';
  assert.match(type, /javascript/);
  assert.doesNotMatch(type, /text\/html/);
  const body = await res.text();
  assert(body.includes('webpackChunk_N_E'), 'JS chunk must contain webpack bundle content');
});

test('3. Missing asset on /_next/static/ returns 404 (not 200 HTML storefront)', async () => {
  const req = new Request('http://localhost/_next/static/chunks/phase1-missing-probe.js');
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 404, 'Missing static build asset must return 404');
  const type = res.headers.get('content-type') || '';
  assert.doesNotMatch(type, /text\/html/, 'Missing static asset must not receive HTML Content-Type');
  const bytes = Buffer.from(await res.arrayBuffer());
  assert.notEqual(sha256(bytes), rootHtmlSha, 'Missing static asset must not return storefront index.html');
});

test('4. Root storefront / returns 200 with HTML body matching index.html', async () => {
  const req = new Request('http://localhost/');
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const type = res.headers.get('content-type') || '';
  assert.match(type, /text\/html/);
  const bytes = Buffer.from(await res.arrayBuffer());
  assert.equal(sha256(bytes), rootHtmlSha, 'Root body must match disk index.html');
});

test('5. Information Center /information/ returns 200 with HTML matching export', async () => {
  const req = new Request('http://localhost/information/');
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const type = res.headers.get('content-type') || '';
  assert.match(type, /text\/html/);
  const bytes = Buffer.from(await res.arrayBuffer());
  assert.equal(sha256(bytes), infoHtmlSha, 'Information Center body must match disk information/index.html');
});

test('6. Unauthenticated Digital Store /produk-digital/ redirects with 302 to login', async () => {
  const req = new Request('http://localhost/produk-digital/');
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/login?redirect=%2Fproduk-digital%2F');
});

test('7. Legacy non-asset route fallback returns 200 with storefront index.html', async () => {
  const req = new Request('http://localhost/legacy-client-side-spa-route');
  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200, 'Legacy non-asset route must receive SPA fallback');
  const type = res.headers.get('content-type') || '';
  assert.match(type, /text\/html/);
  const bytes = Buffer.from(await res.arrayBuffer());
  assert.equal(sha256(bytes), rootHtmlSha, 'Legacy SPA fallback must serve root index.html');
});
