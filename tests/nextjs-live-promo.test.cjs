const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const promoStripSource = fs.readFileSync(
  path.join(root, 'frontend-next', 'src', 'components', 'PromoStrip.tsx'),
  'utf8'
);
const orderModalSource = fs.readFileSync(
  path.join(root, 'frontend-next', 'src', 'components', 'OrderModal.tsx'),
  'utf8'
);
const pageSource = fs.readFileSync(
  path.join(root, 'frontend-next', 'src', 'app', 'page.tsx'),
  'utf8'
);
const homePageSource = fs.readFileSync(
  path.join(root, 'frontend-next', 'src', 'app', 'home', 'page.tsx'),
  'utf8'
);
const homeHtmlPath = path.join(root, 'home', 'index.html');
const rootHtmlPath = path.join(root, 'index.html');

// Helper to run pure validation and countdown logic from PromoStrip.tsx
function getPromoLogic() {
  const valStart = promoStripSource.indexOf('export function validatePromoEligibility');
  const compEnd = promoStripSource.indexOf('export default function PromoStrip');

  const rawCode = promoStripSource
    .slice(valStart, compEnd)
    .replace(/export function/g, 'function')
    .replace(': {\n  valid: boolean;\n  campaignId: string;\n  deadlineMs: number;\n  offsetMs: number;\n}', '')
    .replace(': {\n  days: string;\n  hours: string;\n  minutes: string;\n  seconds: string;\n  expired: boolean;\n}', '')
    .replace('(data: unknown)', '(data)')
    .replace('(deadlineMs: number, offsetMs: number = 0)', '(deadlineMs, offsetMs = 0)')
    .replace(/as PromoApiResponse/g, '');

  const sandbox = {
    Date,
    Math,
    Number,
    String,
    Boolean,
    console
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(rawCode, ctx);
  return {
    validatePromoEligibility: ctx.validatePromoEligibility,
    computeTimeLeft: ctx.computeTimeLeft
  };
}

test('1. Promo aktif dan belum kedaluwarsa: tampil dan valid', () => {
  const { validatePromoEligibility, computeTimeLeft } = getPromoLogic();
  const future = new Date(Date.now() + 86400000 * 3).toISOString(); // 3 days ahead
  const serverTime = new Date().toISOString();

  const payload = {
    penawaran_spesial_aktif: true,
    promo_judul: 'Diskon Spesial Semester Ganjil',
    promo_deadline: future,
    server_time: serverTime,
    coupon: 'JOKIHEMAT',
    discount_percent: 25,
    product: {
      id: 'makalah-1',
      nama: 'Joki Makalah',
      is_active: true,
      status: 'active',
      harga_dasar: 50000
    }
  };

  const res = validatePromoEligibility(payload);
  assert.equal(res.valid, true, 'Promo aktif dan valid harus return valid === true');
  assert.equal(res.campaignId, 'Diskon Spesial Semester Ganjil');
  assert.ok(res.deadlineMs > Date.now());

  const timeLeft = computeTimeLeft(res.deadlineMs, res.offsetMs);
  assert.equal(timeLeft.expired, false);
  assert.equal(Number(timeLeft.days) >= 2, true);
  assert.equal(typeof timeLeft.hours, 'string');
  assert.equal(typeof timeLeft.minutes, 'string');
  assert.equal(typeof timeLeft.seconds, 'string');

  // Verify PromoStrip DOM elements exist in source
  assert.match(promoStripSource, /id="promoStrip"/);
  assert.match(promoStripSource, /id="promoBadge"/);
  assert.match(promoStripSource, /id="promoClaim"/);
  assert.match(promoStripSource, /id="promoClose"/);
  assert.match(promoStripSource, /id="promoLead"/);
  assert.match(promoStripSource, /id="promoText"/);
  assert.match(promoStripSource, /id="promoCoupon"/);
  assert.match(promoStripSource, /id="promoTicker"/);
  assert.match(promoStripSource, /id="promoDays"/);
  assert.match(promoStripSource, /id="promoHours"/);
  assert.match(promoStripSource, /id="promoMinutes"/);
  assert.match(promoStripSource, /id="promoSeconds"/);
});

test('2. Admin mematikan promo: tersembunyi', () => {
  const { validatePromoEligibility } = getPromoLogic();
  const future = new Date(Date.now() + 86400000).toISOString();

  const disabledPayload = {
    penawaran_spesial_aktif: false,
    promo_judul: 'Promo Dimatikan',
    promo_deadline: future,
    server_time: new Date().toISOString()
  };

  const res = validatePromoEligibility(disabledPayload);
  assert.equal(res.valid, false, 'Jika penawaran_spesial_aktif false, banner harus tersembunyi');

  const missingFlagPayload = {
    promo_judul: 'Promo Tanpa Flag',
    promo_deadline: future
  };
  assert.equal(validatePromoEligibility(missingFlagPayload).valid, false);
});

test('3. Produk dinonaktifkan: tersembunyi', () => {
  const { validatePromoEligibility } = getPromoLogic();
  const future = new Date(Date.now() + 86400000).toISOString();

  // 3a. Linked product with is_active === false
  const inactiveProductPayload = {
    penawaran_spesial_aktif: true,
    promo_deadline: future,
    product: {
      id: 'p1',
      nama: 'Produk Nonaktif',
      is_active: false,
      status: 'active'
    }
  };
  assert.equal(validatePromoEligibility(inactiveProductPayload).valid, false, 'Produk is_active false harus tersembunyi');

  // 3b. Linked product with status === 'inactive'
  const inactiveStatusPayload = {
    penawaran_spesial_aktif: true,
    promo_deadline: future,
    product: {
      id: 'p1',
      nama: 'Produk Status Inactive',
      is_active: true,
      status: 'inactive'
    }
  };
  assert.equal(validatePromoEligibility(inactiveStatusPayload).valid, false, 'Produk status inactive harus tersembunyi');

  // 3c. Featured product with is_active === false
  const inactiveFeaturedPayload = {
    penawaran_spesial_aktif: true,
    promo_deadline: future,
    featured_product: {
      id: 'p2',
      nama: 'Featured Nonaktif',
      is_active: false
    }
  };
  assert.equal(validatePromoEligibility(inactiveFeaturedPayload).valid, false, 'Featured is_active false harus tersembunyi');

  // 3d. Featured product with status === 'inactive'
  const inactiveFeaturedStatusPayload = {
    penawaran_spesial_aktif: true,
    promo_deadline: future,
    featured_product: {
      id: 'p2',
      status: 'inactive'
    }
  };
  assert.equal(validatePromoEligibility(inactiveFeaturedStatusPayload).valid, false, 'Featured status inactive harus tersembunyi');

  // 3e. Top-level status / is_active inactive
  assert.equal(validatePromoEligibility({ penawaran_spesial_aktif: true, promo_deadline: future, is_active: false }).valid, false);
  assert.equal(validatePromoEligibility({ penawaran_spesial_aktif: true, promo_deadline: future, status: 'inactive' }).valid, false);
});

test('4. Deadline habis: tersembunyi', () => {
  const { validatePromoEligibility, computeTimeLeft } = getPromoLogic();

  // 4a. Past deadline on initial validation
  const past = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
  const expiredPayload = {
    penawaran_spesial_aktif: true,
    promo_deadline: past,
    server_time: new Date().toISOString()
  };
  assert.equal(validatePromoEligibility(expiredPayload).valid, false, 'Deadline lampau harus tersembunyi');

  // 4b. Countdown reaching 0
  const deadlineNow = Date.now();
  const left = computeTimeLeft(deadlineNow, 0);
  assert.equal(left.expired, true, 'Countdown pada batas waktu harus expired = true');
  assert.equal(left.days, '00');
  assert.equal(left.hours, '00');
  assert.equal(left.minutes, '00');
  assert.equal(left.seconds, '00');

  // In source, verify that interval is cleared and banner is hidden on expiry
  assert.match(promoStripSource, /setHidden\(true\)/);
  assert.match(promoStripSource, /setExpired\(true\)/);
  assert.match(promoStripSource, /clearInterval\(timerRef\.current\)/);
});

test('5. API gagal / timeout: tersembunyi (fail-closed, tanpa data palsu)', () => {
  const { validatePromoEligibility } = getPromoLogic();

  // Null, undefined, empty object
  assert.equal(validatePromoEligibility(null).valid, false);
  assert.equal(validatePromoEligibility(undefined).valid, false);
  assert.equal(validatePromoEligibility({}).valid, false);

  // Invalid date format
  assert.equal(validatePromoEligibility({ penawaran_spesial_aktif: true, promo_deadline: 'bukan-tanggal' }).valid, false);

  // Check fail-closed behavior in PromoStrip.tsx
  assert.match(promoStripSource, /catch\s*\(_\)\s*\{[\s\S]*?setHidden\(true\)/, 'Fetch error must fail closed with setHidden(true)');
  assert.match(promoStripSource, /if\s*\(!res\.ok\)\s*\{[\s\S]*?setHidden\(true\)/, 'Non-200 HTTP response must fail closed');
  assert.match(promoStripSource, /AbortController/, 'Must use AbortController with timeout');
});

test('6. Browser refresh: tidak ada flash promo palsu & dismissal 120 menit', () => {
  // 6a. Prerendered HTML at /home and / must render #promoStrip with hidden attribute
  assert(fs.existsSync(homeHtmlPath), 'home/index.html must exist on disk');
  const homeHtml = fs.readFileSync(homeHtmlPath, 'utf8');
  assert.match(
    homeHtml,
    /<aside[^>]*id="promoStrip"[^>]*hidden[^>]*>/,
    'home/index.html must have promoStrip with hidden attribute initially'
  );

  const rootHtml = fs.readFileSync(rootHtmlPath, 'utf8');
  assert.match(
    rootHtml,
    /<aside[^>]*id="promoStrip"[^>]*hidden[^>]*>/,
    'index.html must have promoStrip with hidden attribute initially'
  );

  // Initial state in PromoStrip.tsx is true
  assert.match(
    promoStripSource,
    /const\s*\[hidden,\s*setHidden\]\s*=\s*useState<boolean>\(true\)/,
    'Default hidden state must be true to prevent layout flash'
  );

  // 6b. Dismissal logic: 120 minutes per tab storage
  assert.match(
    promoStripSource,
    /sessionStorage\.setItem\(`jokiin_promo_dismissed_until:\$\{activeCampaignId\}`, String\(dismissUntil\)\)/,
    'Dismissal stores campaign-specific timestamp'
  );
  assert.match(
    promoStripSource,
    /Date\.now\(\)\s*\+\s*120\s*\*\s*60\s*\*\s*1000/,
    'Dismissal duration must be 120 minutes'
  );
});

test('7. Tombol klaim menjalankan alur pemesanan yang benar', () => {
  // 7a. PromoStrip calls onClaimPromo with coupon and product
  assert.match(promoStripSource, /onClaimPromo\(\{[\s\S]*?coupon: couponCode/);

  // 7b. HomePage wires PromoStrip to handleClaimPromo and passes initialCoupon to OrderModal
  assert.match(pageSource, /<PromoStrip onClaimPromo=\{handleClaimPromo\} \/>/);
  assert.match(pageSource, /initialCoupon=\{activePromoCoupon\}/);

  // 7c. OrderModal accepts initialCoupon and passes promo into orderPayload
  assert.match(orderModalSource, /initialCoupon\s*=\s*''/);
  assert.match(orderModalSource, /orderPayload\.promo\s*=\s*cleanCoupon/);

  // 7d. OrderModal submits to /api/checkout/reguler for server-side validation
  assert.match(orderModalSource, /fetch\('\/api\/checkout\/reguler'/);

  // 7e. WhatsApp fallback includes coupon code
  assert.match(orderModalSource, /\$\{couponLine\}/);
});

test('8. Route /home dan fitur katalog tetap berfungsi identik', () => {
  // 8a. /home page re-exports HomePage cleanly
  assert.match(homePageSource, /import HomePage from '\.\.\/page'/);

  // 8b. Exported /home/index.html contains full suite of sections
  const homeHtml = fs.readFileSync(homeHtmlPath, 'utf8');
  assert.match(homeHtml, /id="tab-beranda"/, 'Must contain beranda tab');
  assert.match(homeHtml, /id="tab-layanan"/, 'Must contain layanan tab');
  assert.match(homeHtml, /id="tab-harga"/, 'Must contain harga tab');
  assert.match(homeHtml, /id="tab-testimoni"/, 'Must contain testimoni tab');
  assert.match(homeHtml, /id="tab-bantuan"/, 'Must contain bantuan tab');
  assert.match(homeHtml, /Tugas Kamu/, 'Must contain hero');
  assert.match(homeHtml, /Rekomendasi Produk/, 'Must contain recommendations');
  assert.match(homeHtml, /Solusi untuk Kebutuhan Kuliahmu/, 'Must contain catalog services');
  assert.match(homeHtml, /Pertanyaan yang Sering Diajukan/, 'Must contain FAQ');
});
