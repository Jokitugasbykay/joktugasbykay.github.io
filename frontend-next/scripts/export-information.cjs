const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const BASELINE = '5c2cb378f729b26e9dc87e7d5033b012794a7eaa';
const images = ['assets/brand-light-lockup.png', 'assets/brand-dark-lockup.png',
  'assets/icon/instagram-logo.webp', 'assets/icon/tiktok icon.png'];
const informationFiles = ['information/index.html', 'information/index.txt', 'information/__next._full.txt',
  'information/__next._tree.txt', 'information/__next.information/__PAGE__.txt'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function walk(root, folder = root) {
  const files = [];
  for (const name of fs.readdirSync(folder)) {
    const file = path.join(folder, name), stat = fs.lstatSync(file);
    assert(!stat.isSymbolicLink(), 'Symlinks are not publication inputs');
    if (stat.isDirectory()) files.push(...walk(root, file));
    else if (stat.isFile()) files.push(path.relative(root, file).split(path.sep).join('/'));
  }
  return files;
}
function target(root, relative) {
  assert(!path.isAbsolute(relative) && !relative.split('/').includes('..'));
  const result = path.resolve(root, relative);
  assert(result.startsWith(path.resolve(root) + path.sep));
  for (let current = result; current !== path.resolve(root); current = path.dirname(current)) {
    if (fs.existsSync(current)) assert(!fs.lstatSync(current).isSymbolicLink(), 'Symlink in destination');
  }
  return result;
}
function planExport(out, destination, baselineBytes) {
  const inventory = walk(out);
  for (const file of informationFiles) assert(inventory.includes(file), 'Required Information artifact missing: ' + file);
  const selected = new Set(informationFiles);
  const pending = [...selected];
  while (pending.length) {
    const file = pending.pop();
    if (!/\.(html|txt|js|css)$/.test(file)) continue;
    const contents = fs.readFileSync(target(out, file), 'utf8').replace(/\\\//g, '/').replace(/\\"/g, '"');
    const references = new Set();
    for (const match of contents.matchAll(/(?:\/_next\/static\/|(?<![\w/])static\/)([\w./%-]+\.(?:js|css|woff2?|ttf|svg|png|webp))/g))
      references.add('_next/static/' + decodeURIComponent(match[1]));
    if (/\.(html|css)$/.test(file)) {
      for (const match of contents.matchAll(/(?:src|href)=["']([^"']+)["']|url\(\s*["']?([^"')\s]+)["']?\s*\)/g)) {
        const value = match[1] || match[2];
        if (!/^(?:https?:|data:|#)/.test(value) && /\.(?:js|css|woff2?|ttf|svg|png|webp)(?:\?|$)/.test(value)) {
          const relative = value.startsWith('/') ? value.slice(1) : path.posix.join(path.posix.dirname(file), value);
          references.add(decodeURIComponent(relative.split('?')[0]));
        }
      }
    }
    for (const asset of references) {
      assert(/^_next\/static\/.*\.(js|css|woff2?|ttf|svg|png|webp)$/.test(asset) || images.includes(asset), 'Unapproved asset reference: ' + asset);
      target(out, asset);
      assert(inventory.includes(asset), 'Referenced asset missing: ' + asset);
      if (!selected.has(asset)) { selected.add(asset); pending.push(asset); }
    }
  }
  assert([...selected].some(file => file.endsWith('.css')), 'CSS dependency closure missing');
  assert([...selected].some(file => file.endsWith('.js')), 'JS dependency closure missing');
  images.forEach(file => { assert(inventory.includes(file), 'Required public image missing: ' + file); selected.add(file); });
  // Plan every collision before any writes. Existing shared/hash assets must be identical.
  return [...selected].sort().map(file => {
    const bytes = fs.readFileSync(target(out, file)), dest = target(destination, file);
    const previous = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
    if (previous && !previous.equals(bytes)) {
      assert(file.startsWith('information/'), 'Existing asset collision: ' + file);
      const expected = baselineBytes(file);
      assert(expected && previous.equals(expected), 'Local Information edits would be overwritten: ' + file);
    }
    return { file, bytes, dest, sha256: hash(bytes), previousHash: previous ? hash(previous) : null,
      changed: !previous?.equals(bytes) };
  });
}
function publish(plan, backupDirectory) {
  assert(backupDirectory, 'A durable backup directory is required');
  fs.mkdirSync(backupDirectory, { recursive: true });
  const previous = new Map();
  for (const item of plan) {
    const bytes = fs.existsSync(item.dest) ? fs.readFileSync(item.dest) : null;
    assert.equal(bytes ? hash(bytes) : null, item.previousHash, 'Destination changed after preflight: ' + item.file);
    if (!item.changed) continue;
    previous.set(item.dest, bytes);
    if (bytes) {
      const backup = target(backupDirectory, item.file);
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      fs.writeFileSync(backup, bytes, { flag: 'wx' });
    }
  }
  // All replacements are staged before changing any destination. Preserve backups for recovery.
  const ordered = [...plan].sort((a, b) => Number(a.file.startsWith('information/')) - Number(b.file.startsWith('information/')));
  const staged = [], replaced = [];
  try {
    for (const item of ordered.filter(item => item.changed)) {
      fs.mkdirSync(path.dirname(item.dest), { recursive: true });
      const temp = item.dest + '.publication-' + crypto.randomUUID();
      staged.push({ ...item, temp });
      fs.writeFileSync(temp, item.bytes, { flag: 'wx' });
    }
    for (const item of staged) { fs.renameSync(item.temp, item.dest); replaced.push(item); }
  } catch (error) {
    const recoveryErrors = [];
    for (const item of replaced.reverse()) {
      try {
        const bytes = previous.get(item.dest);
        if (bytes) fs.writeFileSync(item.dest, bytes);
        else fs.unlinkSync(item.dest);
      } catch (recovery) { recoveryErrors.push(recovery.message); }
    }
    if (recoveryErrors.length) throw new AggregateError([error, ...recoveryErrors], 'Publication failed; restore durable backup: ' + backupDirectory);
    throw error;
  } finally {
    for (const item of staged) if (fs.existsSync(item.temp)) fs.unlinkSync(item.temp);
  }
}
if (require.main === module) {
  const app = path.resolve(__dirname, '..'), destination = path.resolve(app, '..');
  const baselineBytes = file => {
    try { return cp.execFileSync('git', ['cat-file', '--filters', `${BASELINE}:${file}`], { cwd: destination, stdio: ['ignore', 'pipe', 'ignore'] }); }
    catch { return null; }
  };
  const plan = planExport(path.join(app, 'out'), destination, baselineBytes);
  const result = plan.map(({ file, sha256, changed }) => ({ file, sha256, changed }));
  if (!process.argv.includes('--check')) publish(plan, path.join(app, '.verification', 'publication-backup-' + crypto.randomUUID()));
  fs.mkdirSync(path.join(app, '.verification'), { recursive: true });
  fs.writeFileSync(path.join(app, '.verification/publication.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ checkOnly: process.argv.includes('--check'), files: result }, null, 2));
}
module.exports = { planExport, publish, hash, images, informationFiles };
