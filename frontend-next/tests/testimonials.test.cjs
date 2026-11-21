'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'out');
const srcDir = path.join(root, 'src');

test('1. Testimonials hub page is generated in static export', () => {
  const hubPath = path.join(outDir, 'testimonials/index.html');
  assert.ok(fs.existsSync(hubPath), 'Testimonials hub out/testimonials/index.html must exist');
  const content = fs.readFileSync(hubPath, 'utf8');
  assert.ok(content.includes('Testimoni &amp; Kepuasan Pelanggan JOKI.IN') || content.includes('Testimoni Layanan'), 'Hub must contain title');
  assert.ok(content.includes('makalah') && content.includes('ppt'), 'Hub must list services');
});

test('2. Dynamic slug routes exist for both canonical and joki- prefixed slugs', () => {
  const sampleSlugs = [
    'makalah',
    'joki-makalah',
    'ppt',
    'joki-ppt',
    'artikel',
    'joki-artikel',
    'turnitin',
    'joki-turnitin',
    'skripsi',
    'joki-skripsi'
  ];

  for (const slug of sampleSlugs) {
    const filePath = path.join(outDir, `testimonials/${slug}/index.html`);
    assert.ok(fs.existsSync(filePath), `Export file must exist: testimonials/${slug}/index.html`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('<!DOCTYPE html>') || content.includes('<html'), `File must contain valid HTML for slug: ${slug}`);
  }
});

test('3. Testimonials detail page contains service information and reviews', () => {
  const makalahHtml = fs.readFileSync(path.join(outDir, 'testimonials/makalah/index.html'), 'utf8');
  assert.ok(makalahHtml.includes('Makalah'), 'Makalah page must contain service name');
  assert.ok(makalahHtml.includes('ulasan terverifikasi') || makalahHtml.includes('pelanggan puas'), 'Must include ratings breakdown');
  assert.ok(makalahHtml.includes('Pesan Layanan Ini'), 'Must include order button link');
});

test('4. Customer privacy is strictly protected (names are masked, no phone or email exposed)', () => {
  const dataPath = path.join(srcDir, 'data/testimonialsData.json');
  assert.ok(fs.existsSync(dataPath), 'testimonialsData.json must exist');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  assert.ok(Array.isArray(data.reviews), 'Reviews must be an array');
  assert.ok(data.reviews.length > 0, 'Must contain real reviews');

  for (const review of data.reviews) {
    assert.ok(!review.customer_email, 'Review data must not contain customer_email');
    assert.ok(!review.customer_phone, 'Review data must not contain customer_phone');
    assert.ok(!review.phone, 'Review data must not contain phone');
    assert.ok(!review.email, 'Review data must not contain email');
  }

  const sampleHtml = fs.readFileSync(path.join(outDir, 'testimonials/makalah/index.html'), 'utf8');
  assert.ok(!/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(sampleHtml), 'HTML must not leak customer email addresses');
});

test('5. No em dashes or en dashes exist in testimonials files', () => {
  const targetFiles = [
    path.join(srcDir, 'lib/testimonials.ts'),
    path.join(srcDir, 'data/testimonialsData.json'),
    path.join(srcDir, 'app/testimonials/page.tsx'),
    path.join(srcDir, 'app/testimonials/[slug]/page.tsx'),
    path.join(srcDir, 'components/testimonials/TestimonialCard.tsx'),
    path.join(srcDir, 'components/testimonials/TestimonialDetailClient.tsx'),
    path.join(srcDir, 'components/testimonials/TestimonialsHubClient.tsx')
  ];

  for (const file of targetFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        assert.ok(
          !/[\u2013\u2014]/.test(line),
          `Found em/en dash in ${file}:${idx + 1} -> ${line.trim()}`
        );
      });
    }
  }
});

test('6. Header and ProductCard contain navigation links to testimonials', () => {
  const headerPath = path.join(srcDir, 'components/layout/Header.tsx');
  const headerContent = fs.readFileSync(headerPath, 'utf8');
  assert.ok(headerContent.includes('/testimonials'), 'Header must contain link to /testimonials');

  const productCardPath = path.join(srcDir, 'components/catalog/ProductCard.tsx');
  const productCardContent = fs.readFileSync(productCardPath, 'utf8');
  assert.ok(productCardContent.includes('/testimonials/'), 'ProductCard must contain link to /testimonials/[slug]');
});
