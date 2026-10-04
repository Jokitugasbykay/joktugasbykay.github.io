const assert = require('node:assert/strict');
const { censorReviewText } = require('../assets/review-moderation.js');
for (const [input,output] of [['anjing','an**g'],['anjing anjing','an**g an**g'],['GOBLOK!','GO**K!'],['g0bl0k','g0**k'],['k.o.n.t.o.l','k.**l'],['Hasilnya buruk dan perlu diperbaiki.','Hasilnya buruk dan perlu diperbaiki.'],['Pengetikan dan kontrol format sudah rapi.','Pengetikan dan kontrol format sudah rapi.'],['Harga mahal, hasilnya bagus.','Harga mahal, hasilnya bagus.']]) assert.equal(censorReviewText(input),output);
for (const input of ['anj\u200bing','góblók','ｇｏｂｌｏｋ','jancuk','pantek','bangsat','ngentot']) {
    const output=censorReviewText(input); assert(output.includes('**'),input); assert.equal(censorReviewText(output),output);
}
assert.equal(censorReviewText('Yahudi dan Prabowo'), 'Yahudi dan Prabowo');
console.log('PASS: partial censorship, repeated/obfuscated words, safe criticism and idempotence.');
