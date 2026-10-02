const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const dir = path.join(root, 'assets/review-avatars');
const sql = fs.readFileSync(path.join(root, 'database/legacy_review_avatars.sql'), 'utf8');
const assignments = [...sql.matchAll(/\('([^']+)', 'https:\/\/jokiin\.my\.id\/assets\/review-avatars\/([^']+)'\)/g)];
assert.equal(assignments.length, 207);
assert.equal(new Set(assignments.map(match => match[1])).size, 207);
const hashes = new Set();
for (const [, customer, file] of assignments) {
  assert(file.endsWith('.jpg'));
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, file))).digest('hex');
  if (file === 'default.jpg') continue;
  assert(!hashes.has(hash), `Duplicate photo for ${customer}`);
  hashes.add(hash);
}
assert.equal(hashes.size, 86);
assert(!fs.readdirSync(dir).some(file => file.endsWith('.svg')));
assert(sql.includes('where r.user_id is null and r.customer_name = a.customer_name'));
assert(sql.includes('Existing profile photos changed'));
assert(sql.includes('Duplicate customer avatar'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(!html.includes('Avatar pengganti, bukan foto akun terhubung'));
assert(!html.includes('reviewProfilePhoto'));
for (const className of ['tr-24__avatar-circle', 'tr-03__ava']) {
  const line = html.split('\n').find(line => line.includes(`class="${className}"`));
  assert(line.includes(`<div class="${className}"`));
  assert(!line.includes('href="https://jokiin.my.id/testimonials"'));
  assert(line.includes("setData('text/uri-list','https://jokiin.my.id/testimonials')"));
  assert(line.includes('draggable="false"'));
}
console.log('PASS: 207 customers, 86 unique supplied photos, default fallback, no generated avatars, account-photo guard and page-link drag.');

