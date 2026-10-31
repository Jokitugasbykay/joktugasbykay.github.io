const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const LEGACY_BASELINE_SHA = '3a4d84021450b21979c61c606c209d17a19d7b90f5c015691a0f8d7d889feb90';
const APPROVED_PAGE_ROUTES = [
  'index.html',
  '_not-found/index.html',
  'admin/index.html',
  'invoice/index.html',
  'login/index.html',
  'payment/index.html',
  'information/index.html',
  'produk-digital/index.html',
  'produk-digital/home/index.html',
  'produk-digital/checkout/index.html',
  'produk-digital/pesanan/index.html'
];

const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toLowerCase();

function walk(root, folder = root) {
  const files = [];
  if (!fs.existsSync(folder)) return files;
  for (const name of fs.readdirSync(folder)) {
    const file = path.join(folder, name);
    const stat = fs.lstatSync(file);
    assert(!stat.isSymbolicLink(), 'Symlinks are not publication inputs');
    if (stat.isDirectory()) {
      files.push(...walk(root, file));
    } else if (stat.isFile()) {
      files.push(path.relative(root, file).split(path.sep).join('/'));
    }
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

function planStorefrontExport(outDir, destination) {
  assert(fs.existsSync(outDir), 'Next.js build output directory missing: ' + outDir);
  assert(fs.existsSync(path.join(outDir, 'index.html')), 'Storefront index.html missing from Next.js export');

  // Verify legacy index preservation before planning export
  const legacyIndexPath = path.join(destination, 'legacy', 'index.html');
  assert(fs.existsSync(legacyIndexPath), 'Legacy index.html MUST be preserved at legacy/index.html before export');
  const legacySha = hash(fs.readFileSync(legacyIndexPath));
  assert.equal(legacySha, LEGACY_BASELINE_SHA, 'legacy/index.html SHA mismatch; cannot overwrite root index safely');

  const inventory = walk(outDir);
  const selected = new Set();

  for (const file of inventory) {
    // Only accept Next.js routes, Next.js static assets, or metadata txt files
    const isApprovedRoute = APPROVED_PAGE_ROUTES.some(r => file === r || file.startsWith(path.dirname(r) + '/__next.'));
    const isStaticAsset = file.startsWith('_next/static/');
    const isTxtMetadata = file.endsWith('.txt');
    const isPublicAsset = file.startsWith('assets/');

    if (isApprovedRoute || isStaticAsset || isTxtMetadata || isPublicAsset) {
      selected.add(file);
    }
  }

  // Pre-flight collision and change detection
  return [...selected].sort().map(file => {
    const bytes = fs.readFileSync(target(outDir, file));
    const dest = target(destination, file);
    const previous = fs.existsSync(dest) ? fs.readFileSync(dest) : null;

    // Detect collisions with non-migrated critical files
    if (previous && !previous.equals(bytes)) {
      assert(
        file === 'index.html' ||
        file.startsWith('__next.') ||
        file.endsWith('.txt') ||
        file.startsWith('_not-found/') ||
        file.startsWith('admin/') ||
        file.startsWith('invoice/') ||
        file.startsWith('login/') ||
        file.startsWith('payment/') ||
        file.startsWith('information/') ||
        file.startsWith('produk-digital/') ||
        file.startsWith('_next/static/'),
        'Unexpected destination collision: ' + file
      );
    }

    return {
      file,
      bytes,
      dest,
      sha256: hash(bytes),
      previousHash: previous ? hash(previous) : null,
      changed: !previous?.equals(bytes)
    };
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

  const changedItems = plan.filter(item => item.changed);
  const staged = [];
  const replaced = [];

  try {
    for (const item of changedItems) {
      fs.mkdirSync(path.dirname(item.dest), { recursive: true });
      const temp = item.dest + '.publication-' + crypto.randomUUID();
      staged.push({ ...item, temp });
      fs.writeFileSync(temp, item.bytes, { flag: 'wx' });
    }

    for (const item of staged) {
      fs.renameSync(item.temp, item.dest);
      replaced.push(item);
    }
  } catch (error) {
    const recoveryErrors = [];
    for (const item of replaced.reverse()) {
      try {
        const bytes = previous.get(item.dest);
        if (bytes) fs.writeFileSync(item.dest, bytes);
        else fs.unlinkSync(item.dest);
      } catch (recovery) {
        recoveryErrors.push(recovery.message);
      }
    }
    if (recoveryErrors.length) {
      throw new AggregateError([error, ...recoveryErrors], 'Publication failed; restore durable backup: ' + backupDirectory);
    }
    throw error;
  } finally {
    for (const item of staged) {
      if (fs.existsSync(item.temp)) fs.unlinkSync(item.temp);
    }
  }
}

if (require.main === module) {
  const app = path.resolve(__dirname, '..');
  const destination = path.resolve(app, '..');
  const outDir = path.join(app, 'out');

  const plan = planStorefrontExport(outDir, destination);
  const result = plan.map(({ file, sha256, changed }) => ({ file, sha256, changed }));

  const checkOnly = process.argv.includes('--check');
  if (!checkOnly) {
    const backupDir = path.join(app, '.verification', 'storefront-backup-' + crypto.randomUUID());
    publish(plan, backupDir);
  }

  fs.mkdirSync(path.join(app, '.verification'), { recursive: true });
  fs.writeFileSync(
    path.join(app, '.verification', 'storefront-publication.json'),
    JSON.stringify(result, null, 2) + '\n'
  );

  console.log(JSON.stringify({
    checkOnly,
    totalFiles: result.length,
    changedFiles: result.filter(r => r.changed).length,
    files: result
  }, null, 2));
}

module.exports = { planStorefrontExport, publish, hash, LEGACY_BASELINE_SHA, APPROVED_PAGE_ROUTES };
