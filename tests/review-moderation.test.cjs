const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const blocked = require('../assets/review-moderation.js');
const cases = [
  ['Pelayanannya bagus, terima kasih.', false],
  ['Hasilnya buruk dan perlu diperbaiki.', false],
  ['Pengetikan dan kontrol format sudah rapi.', false],
  ['GOBLOK!', true], ['g0bl0k', true], ['gooooblok', true],
  ['k.o.n.t.o.l', true], ['k o n t o l', true],
  ['anj\u200bing', true], ['góblók', true], ['ｇｏｂｌｏｋ', true],
  ['bangsat.', true], ['b4j1ng4n', true], ['fuck', true],
  ['Assholes', false]
];
for (const [text, expected] of cases) assert.equal(blocked(text), expected, text);
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
assert(html.includes('if (hasReviewProfanity(text))'));
assert(html.includes('REVIEWS = REVIEWS.filter(review => !hasReviewProfanity(review.comment))'));
const sql = fs.readFileSync(path.join(__dirname, '../database/review_moderation.sql'), 'utf8');
assert(sql.includes("before insert or update of comment on public.reviews"));
assert(sql.includes('public.has_review_profanity(new.comment)'));
console.log('PASS: profanity, obfuscated variants, polite criticism, cached review filtering and database trigger guard.');
