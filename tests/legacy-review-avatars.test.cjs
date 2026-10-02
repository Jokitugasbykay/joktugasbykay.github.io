const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const sql = fs.readFileSync(path.join(root, 'database/legacy_review_avatars.sql'), 'utf8');
const assignments = [...sql.matchAll(/\((\d+), 'https:\/\/jokiin\.my\.id\/assets\/review-avatars\/([^']+)'\)/g)];
assert.equal(assignments.length, 206);
assert.equal(new Set(assignments.map(match => match[1])).size, 206);
assert.equal(assignments.filter(match => match[2] === 'default.jpg').length, 8);
const unique = new Set();
for (const [, , filename] of assignments) {
  const bytes = fs.readFileSync(path.join(root, 'assets/review-avatars', filename));
  if (filename === 'default.jpg') continue;
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  assert(!unique.has(hash), `Duplicate avatar: ${filename}`);
  unique.add(hash);
}
assert.equal(unique.size, 198);
assert(sql.includes("r.user_id is null and nullif(trim(r.user_photo), '') is null"));
assert(sql.includes('Existing profile photos changed'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const className of ['tr-24__avatar-circle', 'tr-03__ava']) {
  const line = html.split('\n').find(line => line.includes(`class="${className}"`));
  assert(line.includes('href="https://jokiin.my.id/testimonials"'));
  assert(line.includes('draggable="false"'));
  assert(line.includes('Avatar pengganti, bukan foto akun terhubung'));
}
console.log('PASS: 206 assignments, 198 unique pictures, 8 defaults, existing-photo guard and page-link drag.');
