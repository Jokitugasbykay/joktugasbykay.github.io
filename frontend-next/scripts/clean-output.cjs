const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = fs.realpathSync(path.resolve(__dirname, '..'));
assert.equal(path.basename(root), 'frontend-next');
assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).name, 'jokiin-information-pilot');
for (const name of ['.next', 'out']) {
  const directory = path.resolve(root, name);
  assert.equal(path.dirname(directory), root);
  if (fs.existsSync(directory)) {
    assert(!fs.lstatSync(directory).isSymbolicLink());
    assert.equal(fs.realpathSync(directory), directory);
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
console.log('Removed only nested .next and out generated directories');
