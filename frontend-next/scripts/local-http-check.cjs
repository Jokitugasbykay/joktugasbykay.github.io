const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const { hash } = require('./export-information.cjs');
const app = path.resolve(__dirname, '..'), root = path.resolve(app, '..');
const cli = process.env.WRANGLER_CLI_PATH;
assert(cli, 'Set WRANGLER_CLI_PATH to cached wrangler-dist/cli.js; no automatic install');
assert.equal(JSON.parse(fs.readFileSync(path.resolve(cli, '../../package.json'))).version, '4.154.0');
const origin = 'http://127.0.0.1:8788';
const args = [cli, 'dev', '--local', '--ip', '127.0.0.1', '--port', '8788',
  '--tunnel=false', '--show-interactive-dev-session=false', '--persist-to', path.join(app, '.verification/wrangler-state')];
const server = cp.spawn(process.execPath, args, { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false', WRANGLER_LOG_PATH: path.join(app, '.verification/wrangler.log') } });
let log = '', exited = false, tunnel = false;
server.on('exit', () => exited = true);
for (const stream of [server.stdout, server.stderr]) stream.on('data', bytes => {
  log += bytes.toString();
  if (/Starting tunnel|Spawning cloudflared|trycloudflare\.com/.test(log)) { tunnel = true; server.kill(); }
});
async function get(relative) {
  const url = new URL(relative, origin);
  assert.equal(url.origin, origin);
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
  const bytes = Buffer.from(await response.arrayBuffer());
  return { url: url.href, status: response.status, location: response.headers.get('location'),
    type: response.headers.get('content-type'), sha256: hash(bytes), bytes };
}
async function main() {
  const results = [];
  try {
    for (let i = 0; i < 45 && !log.includes('Ready on http://127.0.0.1:8788'); i++) {
      assert(!tunnel && !exited, 'Wrangler exited or started a tunnel');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    assert(log.includes('Ready on http://127.0.0.1:8788'), 'Local startup timed out');
    for (const file of ['index.html', 'information/index.html']) {
      const item = await get(file === 'index.html' ? '/' : '/information/');
      assert.equal(item.status, 200); assert.match(item.type, /text\/html/);
      assert.equal(item.sha256, hash(fs.readFileSync(path.join(root, file))));
      results.push(item);
    }
    const slash = await get('/information?probe=a%2Fb');
    assert([200, 301, 302, 307, 308].includes(slash.status));
    if (slash.location) {
      const destination = new URL(slash.location, origin);
      assert.equal(destination.origin, origin); assert.equal(destination.pathname, '/information/');
      assert.equal(destination.search, '?probe=a%2Fb');
    }
    results.push(slash);
    const digital = await get('/produk-digital/');
    assert.equal(digital.status, 302); assert.equal(digital.location, '/login?redirect=%2Fproduk-digital%2F');
    results.push(digital);
    const publication = JSON.parse(fs.readFileSync(path.join(app, '.verification/publication.json')));
    for (const item of publication) {
      const result = await get('/' + item.file);
      if (item.file.endsWith('.html') && result.location) {
        const destination = new URL(result.location, origin);
        assert.equal(destination.origin, origin); assert.equal(destination.pathname, '/information/');
        results.push(result); continue;
      }
      assert.equal(result.status, 200, item.file);
      assert.equal(result.sha256, item.sha256, item.file);
      if (item.file.endsWith('.js')) assert.match(result.type, /javascript/);
      else if (item.file.endsWith('.css')) assert.match(result.type, /text\/css/);
      else if (item.file.endsWith('.txt')) assert.match(result.type, /text\/plain|text\/x-component/);
      if (!item.file.endsWith('.html')) assert(!result.type?.includes('text/html'), 'HTML masquerading as asset');
      results.push(result);
    }
    const missing = await get('/_next/static/chunks/phase1-missing-probe.js');
    results.push({ ...missing, inheritedFallback: missing.type?.includes('text/html') && missing.status === 200 });
    assert(!tunnel && !exited);
  } finally {
    if (!exited) cp.spawnSync('taskkill.exe', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    fs.writeFileSync(path.join(app, '.verification/local-http-results.json'), JSON.stringify(results.map(({ bytes, ...item }) => item), null, 2) + '\n');
    fs.writeFileSync(path.join(app, '.verification/local-session.log'), log);
    console.log(JSON.stringify(results.map(({ bytes, ...item }) => item), null, 2));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
