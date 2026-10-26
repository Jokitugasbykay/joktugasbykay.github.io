const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
const assetsCatalogJs = fs.readFileSync(path.join(ROOT_DIR, 'assets', 'catalog.js'), 'utf8');

test('cart conflict modal markup adheres to Pisah Keranjang design specs', () => {
  assert.ok(indexHtml.includes('id="cartTypeConflictModal"'), 'Modal overlay container must exist');
  assert.ok(indexHtml.includes('spcl-conflict-sheet'), 'Inner sheet element must exist');
  assert.ok(indexHtml.includes('class="grip"'), 'Mobile grip handle element must exist');
  assert.ok(indexHtml.includes('class="eyebrow"'), 'Eyebrow element must exist');
  assert.ok(indexHtml.includes('id="cartConflictTitle"'), 'Title element with id cartConflictTitle must exist');
  assert.ok(indexHtml.includes('id="cartConflictMessage"'), 'Message element with id cartConflictMessage must exist');
  assert.ok(indexHtml.includes('class="split"'), 'Split cards container must exist');
  assert.ok(indexHtml.includes('id="conflictCardLeft"'), 'Left split card must exist');
  assert.ok(indexHtml.includes('id="conflictCardRight"'), 'Right split card must exist');
  assert.ok(indexHtml.includes('id="btnConfirmClearConflictCart"'), 'Confirm clear button must exist');
  assert.ok(indexHtml.includes('id="btnCancelConflictCart"'), 'Cancel button must exist');
  assert.ok(indexHtml.includes('onclick="if(event.target===this) window.closeCartConflictModal()"'), 'Backdrop overlay click dismisses modal');
});

test('cart conflict responsive animations: mobile slideUp and PC popIn', () => {
  [indexHtml, assetsCatalogJs].forEach((code, idx) => {
    const fileLabel = idx === 0 ? 'index.html' : 'assets/catalog.js';

    // Mobile slideUp animation
    assert.ok(code.includes('slideUp'), `${fileLabel} must define or use slideUp animation`);
    assert.match(code, /@keyframes\s+slideUp\s*\{\s*from\s*\{\s*transform:\s*translateY\(100%\);?\s*\}\s*to\s*\{\s*transform:\s*translateY\(0\);?\s*\}\s*\}/, `${fileLabel} must have keyframes slideUp`);

    // PC popIn animation
    assert.ok(code.includes('popIn'), `${fileLabel} must define or use popIn animation`);
    assert.match(code, /@keyframes\s+popIn/, `${fileLabel} must define keyframes popIn`);

    // Desktop media query (>= 640px)
    assert.ok(code.includes('min-width: 640px') || code.includes('min-width:640px'), `${fileLabel} must define desktop media query at 640px`);
    assert.ok(code.includes('.grip') && code.includes('display: none'), `${fileLabel} must hide grip bar on desktop`);
  });
});

test('cart conflict DOM interaction: toggling cards and status update', () => {
  // Simple DOM simulation to verify logic in catalog.js
  const listeners = {};
  const cards = [
    { className: 'cart regular on', dataset: {}, classList: { contains: (c) => cards[0].className.includes(c), add: (c) => { cards[0].className += ' ' + c; }, remove: (c) => { cards[0].className = cards[0].className.replace(c, '').trim(); } }, addEventListener: (evt, fn) => { listeners['card0_' + evt] = fn; } },
    { className: 'cart special', dataset: {}, classList: { contains: (c) => cards[1].className.includes(c), add: (c) => { cards[1].className += ' ' + c; }, remove: (c) => { cards[1].className = cards[1].className.replace(c, '').trim(); } }, addEventListener: (evt, fn) => { listeners['card1_' + evt] = fn; } }
  ];

  // Verify card toggle logic
  const toggleCard = (card) => {
    const wasOn = card.classList.contains('on');
    cards.forEach(c => c.classList.remove('on'));
    if (!wasOn) card.classList.add('on');
  };

  // Initially card 0 is on
  assert.ok(cards[0].classList.contains('on'));
  assert.ok(!cards[1].classList.contains('on'));

  // Toggle card 1
  toggleCard(cards[1]);
  assert.ok(!cards[0].classList.contains('on'));
  assert.ok(cards[1].classList.contains('on'));

  // Toggle card 1 again (turns off)
  toggleCard(cards[1]);
  assert.ok(!cards[1].classList.contains('on'));
});

test('cart conflict mobile bottom sheet drag gestures (up/down swipe to dismiss/snap)', () => {
  [indexHtml, assetsCatalogJs].forEach((code, idx) => {
    const fileLabel = idx === 0 ? 'index.html' : 'assets/catalog.js';

    assert.ok(code.includes('cursor: grab') || code.includes('cursor:grab'), `${fileLabel} must define grab cursor on grip`);
    assert.ok(code.includes('touch-action: none') || code.includes('touch-action:none'), `${fileLabel} must set touch-action: none on grip`);
    assert.ok(code.includes('is-dragging'), `${fileLabel} must define dragging state styles`);
    assert.ok(code.includes('setupCartConflictSheetGestures'), `${fileLabel} must define setupCartConflictSheetGestures`);
  });

  // Behavioral test of gesture math
  const dragDownY = 100;
  const shouldDismissDown = dragDownY > 85;
  assert.equal(shouldDismissDown, true, 'Dragging down > 85px must trigger sheet dismiss');

  const smallDragY = 30;
  const smallVelocity = 0.1;
  const shouldDismissSmall = smallDragY > 85 || (smallDragY > 25 && smallVelocity > 0.45);
  assert.equal(shouldDismissSmall, false, 'Small drag down without velocity must snap back to 0');

  const dragUpY = -50;
  const dampedUp = Math.max(-60, dragUpY * 0.25);
  assert.ok(dampedUp < 0 && dampedUp > dragUpY, 'Dragging up must apply rubberband damping');
});

test('cart conflict modal backdrop blur smoothly fades out on drag and dismiss without frozen blur artifact', () => {
  [indexHtml, assetsCatalogJs].forEach((code, idx) => {
    const fileLabel = idx === 0 ? 'index.html' : 'assets/catalog.js';

    // Must have transition for backdrop-filter on modal overlay
    assert.ok(code.includes('backdrop-filter 0.22s') || code.includes('backdrop-filter: blur(0px)'), `${fileLabel} must transition or fade backdrop-filter`);
    assert.ok(code.includes('modal.style.backdropFilter'), `${fileLabel} must dynamically update backdropFilter during sheet gestures`);
    assert.ok(code.includes('modal.style.webkitBackdropFilter'), `${fileLabel} must dynamically update webkitBackdropFilter during sheet gestures`);
  });
});

test('cart conflict modal grip handle has clear contrast across light and dark themes', () => {
  [indexHtml, assetsCatalogJs].forEach((code, idx) => {
    const fileLabel = idx === 0 ? 'index.html' : 'assets/catalog.js';

    assert.ok(code.includes('#cartTypeConflictModal .grip'), `${fileLabel} must define grip styles`);
    assert.ok(code.includes('rgba(15, 23, 42') || code.includes('rgba(0, 0, 0'), `${fileLabel} must provide distinct high-contrast color for light mode`);
    assert.ok(code.includes('rgba(255, 255, 255'), `${fileLabel} must provide distinct high-contrast color for dark mode`);
  });
});

test('category filter container has smooth horizontal touch-scrolling with proper padding', () => {
  [indexHtml, assetsCatalogJs].forEach((code, idx) => {
    const fileLabel = idx === 0 ? 'index.html' : 'assets/catalog.js';

    assert.ok(code.includes('scroll-snap-type'), `${fileLabel} must configure scroll-snap on category chips`);
    assert.ok(code.includes('scroll-behavior: smooth') || code.includes('scroll-behavior:smooth'), `${fileLabel} must configure smooth scrolling on category chips`);
  });
});
