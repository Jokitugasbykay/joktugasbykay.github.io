const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pages = ['index.html', '404.html', 'login/index.html', 'payment/index.html', 'invoice/index.html', 'admin/index.html'];

test('local page resources and CSS URLs resolve after removing retired assets', () => {
  const missing = [];
  function check(file, value) {
    if (!value || value.includes('${') || /^(?:data:|blob:|#)/.test(value)) return;
    const url = new URL(value, 'https://jokiin.my.id/' + file);
    if (url.origin !== 'https://jokiin.my.id') return;
    const local = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!local.startsWith(root + path.sep) || !fs.existsSync(local)) missing.push(file + ': ' + value);
  }
  for (const file of pages) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    for (const tag of text.matchAll(/<(?:img|script|link)\b[^>]*>/gi)) {
      const attr = tag[0].match(/\b(?:src|href)=["']([^"']+)["']/i);
      if (attr) check(file, attr[1]);
    }
  }
  for (const name of fs.readdirSync(path.join(root, 'assets')).filter(name => name.endsWith('.css'))) {
    const file = 'assets/' + name;
    for (const match of fs.readFileSync(path.join(root, file), 'utf8').matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)) check(file, match[1]);
  }
  assert.deepEqual(missing, []);
});
