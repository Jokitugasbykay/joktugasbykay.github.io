const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { hash } = require('./export-information.cjs');
const root = path.resolve(__dirname, '..');
const buildId = fs.readFileSync(path.join(root, '.next/BUILD_ID'), 'utf8').trim();
const files = {};
function walk(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    assert(!entry.isSymbolicLink());
    if (entry.isDirectory()) walk(file);
    else {
      const name = path.relative(path.join(root, 'out'), file).split(path.sep).join('/');
      const bytes = fs.readFileSync(file);
      const text = /\.(html|txt|js|css|json)$/.test(name);
      files[name.split(buildId).join('<BUILD_ID>')] = {
        raw: hash(bytes), normalized: hash(text ? bytes.toString('utf8').split(buildId).join('<BUILD_ID>') : bytes)
      };
    }
  }
}
walk(path.join(root, 'out'));
const snapshot = { buildId, files };
if (process.argv[2] === 'compare') {
  const previous = JSON.parse(fs.readFileSync(path.join(root, '.verification/build-first.json')));
  assert.deepEqual(Object.keys(files).sort(), Object.keys(previous.files).sort(), 'Exported path set changed');
  const changed = Object.keys(files).filter(name => files[name].normalized !== previous.files[name].normalized);
  console.log(JSON.stringify({ files: Object.keys(files).length, normalizedChanged: changed,
    rawIdentical: Object.keys(files).filter(name => files[name].raw === previous.files[name].raw).length,
    normalization: 'Only literal Next BUILD_ID values and BUILD_ID path segments are normalized' }, null, 2));
  assert.deepEqual(changed, [], 'Unexpected nondeterministic export bytes');
} else {
  fs.mkdirSync(path.join(root, '.verification'), { recursive: true });
  fs.writeFileSync(path.join(root, '.verification/build-first.json'), JSON.stringify(snapshot, null, 2) + '\n');
  console.log('Recorded export files:', Object.keys(files).length);
}
