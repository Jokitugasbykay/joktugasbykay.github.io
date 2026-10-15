const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

test('mobile view ensures full-bleed promo strip and header without viewport margins or overflow leaks', () => {
  // 1. Mobile root elements (html, body) must have zero margin, zero padding, and overflow-x: clip
  assert.match(
    indexHtml,
    /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?html,\s*body\s*\{[^}]*padding:\s*0\s*!important/
  );
  assert.match(
    indexHtml,
    /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?html,\s*body\s*\{[^}]*overflow-x:\s*clip\s*!important/
  );

  // 2. Filter containers must be separated from html/body so they don't leak padding onto page root
  assert.ok(
    !indexHtml.match(/html,\s*body,\s*#hargaFilterContainer/),
    'html, body must not be grouped with horizontal scroll filter containers'
  );

  // 3. Top promo strip must be edge-to-edge full width with no margins or border-radius
  assert.match(
    indexHtml,
    /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?#promoStrip\.promo-strip\s*\{[^}]*width:\s*100%\s*!important/
  );
  assert.match(
    indexHtml,
    /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?#promoStrip\.promo-strip\s*\{[^}]*margin:\s*0\s*!important/
  );

  // 4. Mobile header inside container must use exact container padding offsets (16px) for full bleed
  assert.match(
    indexHtml,
    /\.container>header\s*\{[^}]*width:\s*calc\(100%\s*\+\s*32px\)/
  );
  assert.match(
    indexHtml,
    /\.container>header\s*\{[^}]*margin-left:\s*-16px/
  );
  assert.match(
    indexHtml,
    /\.container>header\s*\{[^}]*margin-right:\s*-16px/
  );
});
