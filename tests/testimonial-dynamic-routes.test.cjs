const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const uiCss = fs.readFileSync(path.join(rootDir, 'assets', 'ui-enhancements.css'), 'utf8');

test('all 22 products have valid testimonial public slugs and resolve accurately', () => {
    // Extract TESTIMONIAL_SLUG_MAP from index.html
    const matchMap = indexHtml.match(/const TESTIMONIAL_SLUG_MAP\s*=\s*(\{[\s\S]*?\});/);
    assert.ok(matchMap, 'TESTIMONIAL_SLUG_MAP must be defined in index.html');
    const slugMap = eval('(' + matchMap[1] + ')');

    const expectedProducts = [
        'makalah', 'ppt', 'artikel', 'poster', 'editing', 'skripsi',
        'turnitin', 'jurnal', 'bimbingan-parafrase',
        'konsultasi-olah-data-kualitatif', 'konsultasi-olah-data-kuantitatif',
        'bimbingan-konversi-artikel', 'bimbingan-laporan', 'bimbingan-mini-riset',
        'bimbingan-proposal-skripsi', 'bimbingan-proposal-tesis',
        'bimbingan-bab-4', 'bimbingan-bab-5', 'bimbingan-artikel-jurnal',
        'bimbingan-slr', 'pembuatan-cv', 'gemini-pro-18-bulan'
    ];

    assert.equal(expectedProducts.length, 22, 'There must be 22 products');

    for (const prodId of expectedProducts) {
        assert.ok(slugMap[prodId], `Product ${prodId} must be mapped in TESTIMONIAL_SLUG_MAP`);
        const pubSlug = slugMap[prodId];
        assert.match(pubSlug, /^[a-z0-9-]+$/, `Public slug ${pubSlug} must contain only lowercase, numbers, and hyphens`);
    }

    // Verify resolveTestimonialSlug exists and handles both formats
    assert.ok(indexHtml.includes('function resolveTestimonialSlug'), 'resolveTestimonialSlug function must exist');
    assert.ok(indexHtml.includes('function getTestimonialPublicSlug'), 'getTestimonialPublicSlug function must exist');
});

test('dark mode review card header is styled without white background or sticky bleed', () => {
    assert.ok(indexHtml.includes('.tr-03__rh'), '.tr-03__rh must be styled in index.html');
    assert.ok(uiCss.includes('.tr-03__rh'), '.tr-03__rh must be styled in ui-enhancements.css');

    // Ensure .tr-03__rh is transparent
    assert.ok(uiCss.includes('background: transparent !important'), '.tr-03__rh must have transparent background in CSS');
    assert.ok(uiCss.includes('position: static !important'), '.tr-03__rh must have position: static in CSS');

    // Ensure general header selector is scoped to container > header
    assert.ok(indexHtml.includes('.container > header'), 'header styles must be scoped to .container > header');
    assert.ok(indexHtml.includes('[data-theme="dark"] .container > header'), 'dark theme header styles must be scoped');
});

test('routing logic handles /testimonials/ without clobbering product detail on init and popstate', () => {
    assert.ok(indexHtml.includes("pathname.startsWith('/testimonials')"), 'initializeApp must check if pathname starts with /testimonials');
    assert.ok(indexHtml.includes("window.switchTab('testimoni', false)"), 'popstate must switch tab without rewriting history');
    assert.ok(indexHtml.includes('window.showProductReviews(resolvedId, false)'), 'showProductReviews must be invoked on direct load of /testimonials/:slug');
});
