const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { planExport, publish, images, informationFiles } = require('../scripts/export-information.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jokiin-export-test-'));
  t.after(() => {
    assert(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep + 'jokiin-export-test-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const out = path.join(root, 'out'), dest = path.join(root, 'destination');
  const write = (base, file, contents) => { fs.mkdirSync(path.dirname(path.join(base, file)), { recursive: true }); fs.writeFileSync(path.join(base, file), contents); };
  write(out, 'information/index.html', '<link href="/_next/static/info.css"><script src="/_next/static/info.js"></script>');
  write(out, 'information/index.txt', 'synthetic RSC');
  for (const file of informationFiles.slice(2)) write(out, file, 'synthetic route segment');
  write(out, 'information/diagnostic.txt', 'not an approved artifact');
  write(out, '_next/static/info.css', 'body{color:black}');
  write(out, '_next/static/info.js', 'console.log("synthetic")');
  write(out, '_next/static/unrelated.js', 'unrelated');
  write(out, 'index.html', 'DO NOT PUBLISH ROOT');
  write(out, '404.html', 'DO NOT PUBLISH FALLBACK');
  images.forEach(file => write(out, file, 'synthetic image'));
  write(dest, 'index.html', 'legacy storefront');
  write(dest, '404.html', 'legacy fallback');
  write(dest, '_next/static/old.js', 'cached old asset');
  return { out, dest, write, backup: path.join(root, 'backup') };
}
test('selective publication preserves storefront, fallback and cached assets', t => {
  const { out, dest, backup } = fixture(t);
  const plan = planExport(out, dest, () => null);
  publish(plan, backup);
  assert.equal(fs.readFileSync(path.join(dest, 'index.html'), 'utf8'), 'legacy storefront');
  assert.equal(fs.readFileSync(path.join(dest, '404.html'), 'utf8'), 'legacy fallback');
  assert.equal(fs.readFileSync(path.join(dest, '_next/static/old.js'), 'utf8'), 'cached old asset');
  assert(!fs.existsSync(path.join(dest, '_next/static/unrelated.js')));
  assert(!fs.existsSync(path.join(dest, 'information/diagnostic.txt')));
  for (const file of ['information/index.html', 'information/index.txt', '_next/static/info.js', '_next/static/info.css'])
    assert.equal(fs.readFileSync(path.join(dest, file), 'utf8'), fs.readFileSync(path.join(out, file), 'utf8'));
});
test('a shared asset collision fails before publishing any Information file', t => {
  const { out, dest, write } = fixture(t);
  write(dest, images[0], 'existing different image');
  assert.throws(() => planExport(out, dest, () => null), /asset collision/);
  assert(!fs.existsSync(path.join(dest, 'information/index.html')));
  assert.equal(fs.readFileSync(path.join(dest, images[0]), 'utf8'), 'existing different image');
});
test('local Information edits are rejected, approved baseline replacement stays paired', t => {
  const { out, dest, write, backup } = fixture(t);
  write(dest, 'information/index.html', 'local work');
  assert.throws(() => planExport(out, dest, () => Buffer.from('baseline')), /Local Information edits/);
  assert.equal(fs.readFileSync(path.join(dest, 'information/index.html'), 'utf8'), 'local work');
  publish(planExport(out, dest, () => Buffer.from('local work')), backup);
  assert.equal(fs.readFileSync(path.join(dest, 'information/index.txt'), 'utf8'), 'synthetic RSC');
});
test('destination edits made after preflight cannot be overwritten', t => {
  const { out, dest, write, backup } = fixture(t);
  const plan = planExport(out, dest, () => null);
  write(dest, 'information/index.html', 'new local work');
  assert.throws(() => publish(plan, backup), /Destination changed after preflight/);
  assert.equal(fs.readFileSync(path.join(dest, 'information/index.html'), 'utf8'), 'new local work');
});
test('every explicit asset reference must exist before publication', t => {
  const { out, dest, write } = fixture(t);
  write(out, 'information/index.html', '<link href="/_next/static/info.css"><script src="/_next/static/missing.js"></script>');
  assert.throws(() => planExport(out, dest, () => null), /Referenced asset missing/);
  assert(!fs.existsSync(path.join(dest, 'information/index.html')));
});

test('an unchanged shared asset edited after preflight prevents publication', t => {
  const { out, dest, write, backup } = fixture(t);
  write(dest, images[0], 'synthetic image');
  const plan = planExport(out, dest, () => null);
  assert.equal(plan.find(item => item.file === images[0]).changed, false);
  write(dest, images[0], 'new local image');
  assert.throws(() => publish(plan, backup), /Destination changed after preflight/);
  assert.equal(fs.readFileSync(path.join(dest, images[0]), 'utf8'), 'new local image');
  assert(!fs.existsSync(path.join(dest, 'information/index.html')));
});

test('a partial staging write is cleaned without publishing destinations', t => {
  const { out, dest, backup } = fixture(t);
  const plan = planExport(out, dest, () => null);
  const write = fs.writeFileSync;
  let partial;
  fs.writeFileSync = (file, bytes, options) => {
    if (String(file).includes('.publication-')) {
      partial = file;
      write(file, 'partial', options);
      throw new Error('synthetic write failure');
    }
    return write(file, bytes, options);
  };
  try { assert.throws(() => publish(plan, backup), /synthetic write failure/); }
  finally { fs.writeFileSync = write; }
  assert(partial);
  assert(!fs.existsSync(partial));
  assert(!fs.existsSync(path.join(dest, 'information/index.html')));
  assert.equal(fs.readFileSync(path.join(dest, 'index.html'), 'utf8'), 'legacy storefront');
});
test('rename failure restores the previous HTML/RSC generation and preserves its backup', t => {
  const { out, dest, write, backup } = fixture(t);
  write(dest, 'information/index.html', 'old HTML');
  write(dest, 'information/index.txt', 'old RSC');
  const plan = planExport(out, dest, file => Buffer.from(file.endsWith('.html') ? 'old HTML' : 'old RSC'));
  const rename = fs.renameSync;
  let failed = false;
  fs.renameSync = (from, to) => {
    if (!failed && to === path.join(dest, 'information/index.txt')) { failed = true; throw new Error('synthetic rename failure'); }
    return rename(from, to);
  };
  try { assert.throws(() => publish(plan, backup), /synthetic rename failure/); }
  finally { fs.renameSync = rename; }
  assert.equal(fs.readFileSync(path.join(dest, 'information/index.html'), 'utf8'), 'old HTML');
  assert.equal(fs.readFileSync(path.join(dest, 'information/index.txt'), 'utf8'), 'old RSC');
  assert.equal(fs.readFileSync(path.join(backup, 'information/index.html'), 'utf8'), 'old HTML');
});
