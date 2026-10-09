const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const login = fs.readFileSync(path.join(root, 'login/index.html'), 'utf8');

test('login permits local redirects, rejects external and executable URLs', async () => {
  const start = login.indexOf('window.submitLogin =');
  const code = login.slice(start, login.indexOf('// Submit Register', start));
  for (const [input, expected] of [['/testimonials?service=makalah#reviews', '/testimonials?service=makalah#reviews'], ['https://jokiin.my.id/prices', '/prices'], ['https://other.example/', '/'], ['//other.example/', '/'], ['javascript:alert(1)', '/'], ['https://[', '/']]) {
    let destination;
    const context = vm.createContext({URL, URLSearchParams, setTimeout: fn => fn(), showAlert: () => {}, document: {getElementById: id => ({value: id === 'loginEmail' ? 'test@gmail.com' : 'password123'})}, window: {location: {origin: 'https://jokiin.my.id', search: '?redirect=' + encodeURIComponent(input), replace: url => {destination = url;}}}, supabase: {auth: {signInWithPassword: async () => ({data: {}, error: null})}}});
    vm.runInContext(code, context);
    await context.window.submitLogin();
    assert.equal(destination, expected, input);
  }
});

test('all page inline scripts and local JavaScript parse', () => {
  const pages = ['index.html', 'login/index.html', 'admin/index.html', 'payment/index.html', 'invoice/index.html', '404.html'];
  const scripts = pages.flatMap(file => [...fs.readFileSync(path.join(root, file), 'utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match => ({file, code: match[1]})));
  for (const dir of ['assets', 'src']) {
    for (const file of fs.readdirSync(path.join(root, dir)).filter(name => name.endsWith('.js'))) scripts.push({file: dir + '/' + file, code: fs.readFileSync(path.join(root, dir, file), 'utf8')});
  }
  for (const {file, code} of scripts) {
    const result = spawnSync(process.execPath, ['--check', '--input-type=module'], {input: code, encoding: 'utf8'});
    assert.equal(result.status, 0, file + '\n' + result.stderr);
  }
});
