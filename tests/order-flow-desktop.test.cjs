const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
const desktopCss = fs.readFileSync(path.join(ROOT_DIR, 'assets', 'desktop-storefront.css'), 'utf8');

test('root document prevents desktop horizontal page scrolling and scrollbar leaks', () => {
  // html and body must clip horizontal overflow so 100vw full-width sections do not spawn a green horizontal scrollbar
  assert.match(indexHtml, /html\s*\{[^}]*overflow-x:\s*clip/);
  assert.match(indexHtml, /body\s*\{[^}]*overflow-x:\s*clip/);
  assert.match(desktopCss, /html,\s*body\s*\{[^}]*overflow-x:\s*clip\s*!important/);
});

test('desktop order-flow-wrapper is a contained card without horizontal overflow', () => {
  // Base index.html order-flow-wrapper
  assert.match(indexHtml, /\.order-flow-wrapper\s*\{[^}]*max-width:\s*920px/);
  assert.match(indexHtml, /\.order-flow-wrapper\s*\{[^}]*margin:\s*0\s+auto/);
  assert.match(indexHtml, /\.order-flow-wrapper\s*\{[^}]*overflow-x:\s*hidden/);

  // Base index.html order-flow
  assert.match(indexHtml, /\.order-flow\s*\{[^}]*min-width:\s*0/);
  assert.match(indexHtml, /\.order-flow\s*\{[^}]*max-width:\s*860px/);

  // Desktop stylesheet: card containment restored (not stripped to border:0 or transparent)
  assert.match(desktopCss, /\.container\s+#tab-bantuan\s+\.order-flow-wrapper\s*\{[^}]*max-width:\s*920px/);
  assert.match(desktopCss, /\.container\s+#tab-bantuan\s+\.order-flow-wrapper\s*\{[^}]*border-radius:\s*16px/);
  assert.match(desktopCss, /\.container\s+#tab-bantuan\s+\.order-flow-wrapper\s*\{[^}]*background:\s*var\(--desktop-paper\)/);
  assert.match(desktopCss, /\.container\s+#tab-bantuan\s+\.order-flow-wrapper\s*\{[^}]*overflow:\s*hidden/);
});

test('desktop track-section is centered with proper card styling', () => {
  assert.match(indexHtml, /\.track-section\s*\{[^}]*max-width:\s*920px/);
  assert.match(indexHtml, /\.track-section\s*\{[^}]*margin:\s*0\s+auto/);

  assert.match(desktopCss, /\.container\s+#tab-bantuan\s+\.track-section\s*\{[^}]*max-width:\s*920px/);
  assert.match(desktopCss, /\.container\s+#tab-bantuan\s+\.track-section\s*\{[^}]*border-radius:\s*16px/);
  assert.match(desktopCss, /\.container\s+#tab-bantuan\s+\.track-section\s*\{[^}]*background:\s*var\(--desktop-paper\)/);
});
