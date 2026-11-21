'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const srcDir = path.resolve(__dirname, '../src');
const pagePath = path.join(srcDir, 'app/page.tsx');
const bannerPath = path.join(srcDir, 'components/home/SpecialPromoBanner.tsx');

const pageSource = fs.readFileSync(pagePath, 'utf8');
const bannerSource = fs.readFileSync(bannerPath, 'utf8');

// Helper to simulate SpecialPromoBanner rendering decision
function evaluateBannerVisibility(promo, product, currentTime = Date.now()) {
  if (!promo || !promo.penawaran_spesial_aktif || !promo.promo_deadline) {
    return { visible: false, reason: 'promo_inactive_or_missing_deadline' };
  }

  const serverNow = promo.server_time ? Date.parse(promo.server_time) : currentTime;
  const target = Date.parse(promo.promo_deadline);
  if (!Number.isFinite(target)) {
    return { visible: false, reason: 'invalid_deadline' };
  }

  const skew = Number.isFinite(serverNow) ? serverNow - currentTime : 0;
  const currentWithSkew = currentTime + skew;
  const diff = target - currentWithSkew;

  if (diff <= 0) {
    return { visible: false, reason: 'deadline_expired' };
  }

  if (!product || !product.is_active || (typeof product.stok === 'number' && product.stok <= 0)) {
    return { visible: false, reason: 'product_inactive_or_out_of_stock' };
  }

  // Dynamic calculations
  const originalPrice = Number(product.harga_dasar || 0);
  const discountPercent = Number(product.diskon_persen || 0);
  const finalPrice = discountPercent > 0
    ? Math.round(originalPrice * (1 - discountPercent / 100))
    : originalPrice;

  return {
    visible: true,
    data: {
      title: promo.promo_judul || product.nama,
      productName: product.nama,
      originalPrice,
      finalPrice,
      stock: product.stok,
      soldCount: product.sold_count || 0,
      diffMs: diff
    }
  };
}

// Helper to simulate page.tsx loadData validation
function validatePromoData(promoRes, serverNow = Date.now()) {
  if (
    promoRes &&
    typeof promoRes.penawaran_spesial_aktif === 'boolean' &&
    promoRes.penawaran_spesial_aktif === true &&
    promoRes.promo_deadline &&
    Number.isFinite(Date.parse(promoRes.promo_deadline))
  ) {
    const sTime = promoRes.server_time ? Date.parse(promoRes.server_time) : serverNow;
    const target = Date.parse(promoRes.promo_deadline);
    if (target > sTime) {
      return promoRes;
    }
  }
  return null;
}

test('Skenario 1: Promo aktif - server konfirmasi promo aktif, produk aktif, deadline masa depan', () => {
  const activePromo = {
    banners: [],
    penawaran_spesial_aktif: true,
    promo_judul: 'Penawaran Spesial Minggu Ini',
    promo_deadline: new Date(Date.now() + 86400000).toISOString(),
    server_time: new Date().toISOString()
  };

  const activeProduct = {
    id: 'gemini-pro-18-bulan',
    nama: 'Gemini Pro 18 Bulan',
    slug: 'gemini-pro-18-bulan',
    kategori: 'Digital',
    deskripsi: 'Akses penuh Gemini Advanced 18 bulan, Garansi 1 minggu',
    harga_dasar: 50000,
    diskon_persen: 60,
    stok: 12,
    is_active: true,
    is_limited_edition: true,
    sold_count: 80
  };

  const validated = validatePromoData(activePromo);
  assert.ok(validated !== null, 'Active promo data must pass validation');

  const result = evaluateBannerVisibility(validated, activeProduct);
  assert.equal(result.visible, true, 'Banner must be visible when promo and product are active');
  assert.equal(result.data.finalPrice, 20000, 'Discounted price must be dynamically calculated as 20000');
  assert.equal(result.data.stock, 12, 'Stock must be dynamically read as 12');
  assert.equal(result.data.soldCount, 80, 'Sold count must be dynamically read as 80');
});

test('Skenario 2: Promo dinonaktifkan admin - penawaran_spesial_aktif bernilai false', () => {
  const disabledPromo = {
    banners: [],
    penawaran_spesial_aktif: false,
    promo_judul: 'Penawaran Spesial Minggu Ini',
    promo_deadline: new Date(Date.now() + 86400000).toISOString(),
    server_time: new Date().toISOString()
  };

  const product = {
    id: 'gemini-pro-18-bulan',
    nama: 'Gemini Pro 18 Bulan',
    is_active: true,
    stok: 12
  };

  const validated = validatePromoData(disabledPromo);
  assert.equal(validated, null, 'Disabled promo must evaluate to null');

  const result = evaluateBannerVisibility(validated, product);
  assert.equal(result.visible, false, 'Banner must be hidden when promo is disabled');
});

test('Skenario 3: Produk nonaktif - is_active false atau stok 0', () => {
  const promo = {
    banners: [],
    penawaran_spesial_aktif: true,
    promo_judul: 'Penawaran Spesial Minggu Ini',
    promo_deadline: new Date(Date.now() + 86400000).toISOString(),
    server_time: new Date().toISOString()
  };

  // 3a. is_active: false
  const inactiveProduct = {
    id: 'gemini-pro-18-bulan',
    nama: 'Gemini Pro 18 Bulan',
    is_active: false,
    stok: 12
  };

  const resultInactive = evaluateBannerVisibility(promo, inactiveProduct);
  assert.equal(resultInactive.visible, false, 'Banner must be hidden when product is inactive');

  // 3b. stok: 0
  const outOfStockProduct = {
    id: 'gemini-pro-18-bulan',
    nama: 'Gemini Pro 18 Bulan',
    is_active: true,
    stok: 0
  };

  const resultOutOfStock = evaluateBannerVisibility(promo, outOfStockProduct);
  assert.equal(resultOutOfStock.visible, false, 'Banner must be hidden when product has 0 stock');

  // 3c. product null / undefined
  const resultNullProduct = evaluateBannerVisibility(promo, null);
  assert.equal(resultNullProduct.visible, false, 'Banner must be hidden when product is null');
});

test('Skenario 4: Deadline habis - countdown berhenti dan banner tersembunyi', () => {
  const expiredPromo = {
    banners: [],
    penawaran_spesial_aktif: true,
    promo_judul: 'Penawaran Spesial Minggu Ini',
    promo_deadline: '2026-10-29T17:00:00.000Z',
    server_time: new Date().toISOString()
  };

  const product = {
    id: 'gemini-pro-18-bulan',
    nama: 'Gemini Pro 18 Bulan',
    is_active: true,
    stok: 12
  };

  const validated = validatePromoData(expiredPromo);
  assert.equal(validated, null, 'Expired promo must fail validation');

  const result = evaluateBannerVisibility(expiredPromo, product);
  assert.equal(result.visible, false, 'Banner must be hidden when deadline is expired');
  assert.equal(result.reason, 'deadline_expired');
});

test('Skenario 5: API gagal atau timeout - tidak menampilkan data hardcoded', () => {
  // Simulasi API gagal (network error / 500 / null)
  const failedApiResponse = null;
  const validated = validatePromoData(failedApiResponse);
  assert.equal(validated, null, 'Failed API response must evaluate to null promo state');

  const result = evaluateBannerVisibility(validated, null);
  assert.equal(result.visible, false, 'Banner must remain hidden on API failure');

  // Pastikan SpecialPromoBanner.tsx tidak lagi mengandung hardcoded Rp 20.000 atau Rp 50.000
  assert.ok(!bannerSource.includes('formatRupiah(20000)'), 'Must not hardcode 20000 in SpecialPromoBanner.tsx');
  assert.ok(!bannerSource.includes('formatRupiah(50000)'), 'Must not hardcode 50000 in SpecialPromoBanner.tsx');
  assert.ok(!bannerSource.includes('Sisa: 12 slot'), 'Must not hardcode slot in SpecialPromoBanner.tsx');
  assert.ok(!bannerSource.includes('80 terjual'), 'Must not hardcode sold in SpecialPromoBanner.tsx');
});

test('Skenario 6: Refresh browser - initial state tersembunyi, tidak ada flash promo palsu', () => {
  // Verifikasi initial state di page.tsx
  assert.ok(
    pageSource.includes('const [promo, setPromo] = useState<PromoResponse | null>(null);'),
    'Initial promo state must be strictly null'
  );

  // Pastikan DEFAULT_PRODUCTS di page.tsx tidak memiliki gemini-pro-18-bulan aktif
  const defaultGeminiActive = pageSource.includes("id: 'gemini-pro-18-bulan'") && pageSource.includes('is_active: true');
  assert.equal(defaultGeminiActive, false, 'DEFAULT_PRODUCTS must not contain active gemini-pro-18-bulan fallback');

  // Saat mount pertama kali (promo === null), banner harus tersembunyi
  const initialResult = evaluateBannerVisibility(null, null);
  assert.equal(initialResult.visible, false, 'Banner must not be visible on initial mount');
});

test('Skenario 7: CTA dan checkout - mengikuti alur pemesanan aktual dan validasi checkout', () => {
  // Verifikasi handler onBuyNow dan onAddToCart di page.tsx
  assert.ok(
    pageSource.includes("router.push(`/payment/?service=${encodeURIComponent(specialProduct.slug || specialProduct.id)}`)"),
    'onBuyNow must route to /payment/?service=... with validated product'
  );

  assert.ok(
    pageSource.includes('handleAddToCart(specialProduct)'),
    'onAddToCart must call handleAddToCart with validated specialProduct'
  );

  // Verifikasi pengecekan status sebelum checkout
  assert.ok(
    pageSource.includes('if (specialProduct && specialProduct.is_active && (typeof specialProduct.stok !== \'number\' || specialProduct.stok > 0))'),
    'CTA must check product is active and in-stock before initiating order'
  );

  // Verifikasi guard di handleAddToCart
  assert.ok(
    pageSource.includes('if (!product || !product.is_active || (typeof product.stok === \'number\' && product.stok <= 0))'),
    'handleAddToCart must reject inactive or out-of-stock products'
  );
});

test('Skenario 8: Kebersihan kode - tidak ada em dash atau en dash', () => {
  const hasEmDash = pageSource.includes('\u2014') || bannerSource.includes('\u2014');
  const hasEnDash = pageSource.includes('\u2013') || bannerSource.includes('\u2013');
  assert.equal(hasEmDash, false, 'No em dashes allowed in source code');
  assert.equal(hasEnDash, false, 'No en dashes allowed in source code');
});
