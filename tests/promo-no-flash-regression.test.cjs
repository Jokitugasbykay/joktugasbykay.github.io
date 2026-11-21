const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const catalogJsSource = fs.readFileSync(path.join(ROOT_DIR, 'assets', 'catalog.js'), 'utf8');

function createMockBrowserEnv({ initialStorage = {}, apiResponses = {} } = {}) {
  const storage = { ...initialStorage };
  const elements = new Map();

  class MockElement {
    constructor(tagName, id = '') {
      this.tagName = tagName.toUpperCase();
      this.id = id;
      this.attributes = new Map();
      this.style = {};
      this._innerHTML = '';
      this.childNodes = [];
      this.dataset = {};
    }

    setAttribute(name, val) {
      this.attributes.set(name, String(val));
      if (name === 'hidden') this.hidden = true;
    }

    removeAttribute(name) {
      this.attributes.delete(name);
      if (name === 'hidden') this.hidden = false;
    }

    hasAttribute(name) {
      return this.attributes.has(name);
    }

    getAttribute(name) {
      return this.attributes.get(name) || null;
    }

    get innerHTML() {
      return this._innerHTML;
    }

    set innerHTML(val) {
      this._innerHTML = val;
    }

    querySelector(selector) {
      // Basic mock selector for countdown elements
      const cdMatch = selector.match(/\[data-cd="([dhms])"\]/);
      if (cdMatch) {
        return { textContent: '' };
      }
      return null;
    }

    querySelectorAll() {
      return [];
    }

    addEventListener() {}
    removeEventListener() {}
  }

  const promoBanner = new MockElement('div', 'promo-banner-section');
  promoBanner.setAttribute('hidden', '');
  promoBanner.style.display = 'none';

  const fullHarga = new MockElement('div', 'full-harga');
  const tabHarga = new MockElement('div', 'tab-harga');
  const previewLayanan = new MockElement('div', 'preview-layanan');
  const promoCd = new MockElement('div', 'jokiin-promo-cd');

  elements.set('promo-banner-section', promoBanner);
  elements.set('full-harga', fullHarga);
  elements.set('tab-harga', tabHarga);
  elements.set('preview-layanan', previewLayanan);
  elements.set('jokiin-promo-cd', promoCd);

  const document = {
    readyState: 'complete',
    getElementById(id) {
      if (elements.has(id)) return elements.get(id);
      const el = new MockElement('div', id);
      elements.set(id, el);
      return el;
    },
    createElement(tag) {
      return new MockElement(tag);
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
    removeEventListener() {}
  };

  const window = {
    document,
    CONFIG: {
      PRODUCTS: [
        { id: 'tugas-kuliah', title: 'Tugas Kuliah Reguler', category: 'Akademik', priceNum: 35000, hasSale: false },
        { id: 'bimbingan-skripsi', title: 'Bimbingan Skripsi', category: 'Akademik', priceNum: 150000, hasSale: false }
      ]
    },
    localStorage: {
      getItem(k) { return storage[k] || null; },
      setItem(k, v) { storage[k] = String(v); },
      removeItem(k) { delete storage[k]; }
    },
    addEventListener() {},
    removeEventListener() {},
    addToCart() {},
    directCheckout() {},
    openSpecialCheckout() {},
    hydrateSpecialCheckoutUI() {}
  };

  const fetchMock = async (url) => {
    const urlStr = String(url);
    if (apiResponses[urlStr]) {
      const resp = apiResponses[urlStr];
      if (resp.delayMs) {
        await new Promise(r => setTimeout(r, resp.delayMs));
      }
      if (resp.throwError) {
        throw new Error(resp.throwError);
      }
      if (resp.status && resp.status !== 200) {
        return {
          ok: false,
          status: resp.status,
          json: async () => resp.body || {}
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => resp.body
      };
    }
    // Default response: promo expired, regular products only
    if (urlStr.includes('/api/promo/banner')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          penawaran_spesial_aktif: false,
          promo_deadline: '2026-10-29T17:00:00.000Z',
          server_time: new Date().toISOString()
        })
      };
    }
    if (urlStr.includes('/api/products')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          products: [
            { id: 'p1', nama: 'Tugas Kuliah', slug: 'tugas-kuliah', is_active: true, stok: 50, harga_dasar: 35000 }
          ]
        })
      };
    }
    return {
      ok: false,
      status: 404,
      json: async () => ({})
    };
  };

  return { window, document, elements, fetchMock };
}

test('1. Initial DOM & Frame 0: Container #promo-banner-section is fail-closed before any API fetch', () => {
  const { window, document, elements, fetchMock } = createMockBrowserEnv();
  const banner = elements.get('promo-banner-section');

  assert.equal(banner.hasAttribute('hidden'), true, 'Container must start with hidden attribute');
  assert.equal(banner.style.display, 'none', 'Container must start with display:none');
  assert.equal(banner.innerHTML.trim(), '', 'Container must start empty');

  // Verify that catalogJsSource does not initialize penawaranSpesialAktif to true
  assert.match(catalogJsSource, /penawaranSpesialAktif:\s*false/, 'state.penawaranSpesialAktif must be initialized to false');
  assert.match(catalogJsSource, /featuredProduct:\s*null/, 'state.featuredProduct must be initialized to null');
});

test('2. Promo disabled (penawaran_spesial_aktif: false): Banner remains completely hidden after API returns', async () => {
  const { window, document, elements, fetchMock } = createMockBrowserEnv({
    apiResponses: {
      'https://jokiin-payment-api.gamingyoga14.workers.dev/api/promo/banner': {
        body: {
          penawaran_spesial_aktif: false,
          promo_deadline: '2026-10-29T17:00:00.000Z',
          server_time: new Date().toISOString()
        }
      }
    }
  });

  const banner = elements.get('promo-banner-section');
  const context = vm.createContext({
    window,
    document,
    localStorage: window.localStorage,
    fetch: fetchMock,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    String,
    Number,
    Boolean,
    Array,
    Object,
    JSON,
    Intl,
    MutationObserver: class { observe() {} disconnect() {} }
  });

  vm.runInContext(catalogJsSource, context);
  await new Promise(r => setTimeout(r, 50));

  assert.equal(banner.innerHTML.trim(), '', 'Banner must remain empty when promo is inactive');
  assert.equal(banner.hasAttribute('hidden'), true, 'Banner must retain hidden attribute');
  assert.equal(banner.style.display, 'none', 'Banner style.display must be none');
});

test('3. Slow API: No flash occurs while API request is pending', async () => {
  const { window, document, elements, fetchMock } = createMockBrowserEnv({
    apiResponses: {
      'https://jokiin-payment-api.gamingyoga14.workers.dev/api/promo/banner': {
        delayMs: 200,
        body: {
          penawaran_spesial_aktif: false,
          promo_deadline: '2026-10-29T17:00:00.000Z',
          server_time: new Date().toISOString()
        }
      }
    }
  });

  const banner = elements.get('promo-banner-section');
  const context = vm.createContext({
    window,
    document,
    localStorage: window.localStorage,
    fetch: fetchMock,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    String,
    Number,
    Boolean,
    Array,
    Object,
    JSON,
    Intl,
    MutationObserver: class { observe() {} disconnect() {} }
  });

  vm.runInContext(catalogJsSource, context);

  // Check midway during the slow API fetch (50ms)
  await new Promise(r => setTimeout(r, 50));
  assert.equal(banner.innerHTML.trim(), '', 'Midway through slow fetch: Banner MUST remain empty (no flash)');
  assert.equal(banner.hasAttribute('hidden'), true, 'Midway through slow fetch: hidden attribute preserved');

  // Check after fetch completes (300ms)
  await new Promise(r => setTimeout(r, 250));
  assert.equal(banner.innerHTML.trim(), '', 'After slow fetch: Banner still empty');
  assert.equal(banner.hasAttribute('hidden'), true, 'After slow fetch: hidden attribute preserved');
});

test('4. API network timeout / error: Fails closed without displaying promo banner', async () => {
  const { window, document, elements, fetchMock } = createMockBrowserEnv({
    apiResponses: {
      'https://jokiin-payment-api.gamingyoga14.workers.dev/api/promo/banner': {
        throwError: 'Failed to fetch (network error)'
      }
    }
  });

  const banner = elements.get('promo-banner-section');
  const context = vm.createContext({
    window,
    document,
    localStorage: window.localStorage,
    fetch: fetchMock,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    String,
    Number,
    Boolean,
    Array,
    Object,
    JSON,
    Intl,
    MutationObserver: class { observe() {} disconnect() {} }
  });

  vm.runInContext(catalogJsSource, context);
  await new Promise(r => setTimeout(r, 50));

  assert.equal(banner.innerHTML.trim(), '', 'Network error: Banner must fail closed');
  assert.equal(banner.hasAttribute('hidden'), true);
});

test('5. API 404 status: Fails closed without displaying promo banner', async () => {
  const { window, document, elements, fetchMock } = createMockBrowserEnv({
    apiResponses: {
      'https://jokiin-payment-api.gamingyoga14.workers.dev/api/promo/banner': {
        status: 404,
        body: { error: 'Not found' }
      }
    }
  });

  const banner = elements.get('promo-banner-section');
  const context = vm.createContext({
    window,
    document,
    localStorage: window.localStorage,
    fetch: fetchMock,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    String,
    Number,
    Boolean,
    Array,
    Object,
    JSON,
    Intl,
    MutationObserver: class { observe() {} disconnect() {} }
  });

  vm.runInContext(catalogJsSource, context);
  await new Promise(r => setTimeout(r, 50));

  assert.equal(banner.innerHTML.trim(), '', '404 status: Banner must fail closed');
  assert.equal(banner.hasAttribute('hidden'), true);
});

test('6. Stale cache with expired promo deadline: Does not trigger banner display', async () => {
  const staleExpiredCache = JSON.stringify({
    penawaran_spesial_aktif: true,
    promo_deadline: '2026-10-25T00:00:00.000Z', // In the past
    promo_judul: 'Promo Kadaluarsa'
  });

  const { window, document, elements, fetchMock } = createMockBrowserEnv({
    initialStorage: {
      'jokiin_catalog_cache': staleExpiredCache
    }
  });

  const banner = elements.get('promo-banner-section');
  const context = vm.createContext({
    window,
    document,
    localStorage: window.localStorage,
    fetch: fetchMock,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    String,
    Number,
    Boolean,
    Array,
    Object,
    JSON,
    Intl,
    MutationObserver: class { observe() {} disconnect() {} }
  });

  vm.runInContext(catalogJsSource, context);
  await new Promise(r => setTimeout(r, 50));

  assert.equal(banner.innerHTML.trim(), '', 'Expired cached promo must NEVER render');
  assert.equal(banner.hasAttribute('hidden'), true);
});

test('7. Valid & active promo: Renders successfully when server confirms active, valid deadline, and stock', async () => {
  const futureDeadline = new Date(Date.now() + 86400000 * 3).toISOString(); // 3 days in future
  const { window, document, elements, fetchMock } = createMockBrowserEnv({
    apiResponses: {
      'https://jokiin-payment-api.gamingyoga14.workers.dev/api/promo/banner': {
        body: {
          penawaran_spesial_aktif: true,
          promo_deadline: futureDeadline,
          promo_judul: 'Promo Spesial Aktif',
          server_time: new Date().toISOString()
        }
      },
      'https://jokiin-payment-api.gamingyoga14.workers.dev/api/products': {
        body: {
          products: [
            {
              id: 'p-special-1',
              nama: 'Paket Spesial Aktif',
              slug: 'paket-spesial-aktif',
              is_active: true,
              is_limited_edition: true,
              stok: 10,
              harga_dasar: 60000,
              diskon_persen: 50
            }
          ]
        }
      }
    }
  });

  const banner = elements.get('promo-banner-section');
  const context = vm.createContext({
    window,
    document,
    localStorage: window.localStorage,
    fetch: fetchMock,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    String,
    Number,
    Boolean,
    Array,
    Object,
    JSON,
    Intl,
    MutationObserver: class { observe() {} disconnect() {} }
  });

  vm.runInContext(catalogJsSource, context);
  await new Promise(r => setTimeout(r, 50));

  assert.equal(banner.hasAttribute('hidden'), false, 'Active promo should remove hidden attribute');
  assert.ok(banner.innerHTML.includes('Paket Spesial Aktif'), 'Banner should display the active product name');
  assert.ok(banner.innerHTML.includes('PROMO TERBATAS'), 'Banner should have promo badge');
});

test('8. Inactive or missing limited product: Promo banner is NOT rendered even if penawaran_spesial_aktif is true', async () => {
  const futureDeadline = new Date(Date.now() + 86400000 * 3).toISOString();
  const { window, document, elements, fetchMock } = createMockBrowserEnv({
    apiResponses: {
      'https://jokiin-payment-api.gamingyoga14.workers.dev/api/promo/banner': {
        body: {
          penawaran_spesial_aktif: true,
          promo_deadline: futureDeadline,
          server_time: new Date().toISOString()
        }
      },
      // API products has NO limited edition product (all regular)
      'https://jokiin-payment-api.gamingyoga14.workers.dev/api/products': {
        body: {
          products: [
            { id: 'p1', nama: 'Tugas Reguler', slug: 'tugas-reguler', is_active: true, is_limited_edition: false, stok: 20 }
          ]
        }
      }
    }
  });

  const banner = elements.get('promo-banner-section');
  const context = vm.createContext({
    window,
    document,
    localStorage: window.localStorage,
    fetch: fetchMock,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    String,
    Number,
    Boolean,
    Array,
    Object,
    JSON,
    Intl,
    MutationObserver: class { observe() {} disconnect() {} }
  });

  vm.runInContext(catalogJsSource, context);
  await new Promise(r => setTimeout(r, 50));

  assert.equal(banner.innerHTML.trim(), '', 'Banner must not render if limited edition product is missing');
  assert.equal(banner.hasAttribute('hidden'), true);
});

test('9. Regular storefront products: Unaffected and functional in catalogue views', () => {
  let products = [];
  const nextDataPath = path.join(ROOT_DIR, 'frontend-next', 'src', 'data', 'catalog-data.ts');
  if (fs.existsSync(nextDataPath)) {
    const nextData = require(nextDataPath);
    products = nextData.PRODUCTS;
  } else {
    const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
    const match = indexHtml.match(/PRODUCTS:\s*(\[[\s\S]*?\n\s*\])\s*,\s*socialMedia/);
    if (match) {
      const sandbox = {};
      vm.runInNewContext('products = ' + match[1], sandbox);
      products = sandbox.products;
    }
  }

  assert.ok(Array.isArray(products), 'PRODUCTS must be an array');
  const regularProducts = products.filter(p => !p._isBannerOnly);
  assert.ok(regularProducts.length >= 4, 'Must have at least 4 regular catalogue products');

  // Verify regular products do not have expired sales or fake sales
  for (const p of regularProducts) {
    assert.ok(p.id !== 'gemini-pro-18-bulan', 'gemini-pro-18-bulan must be marked _isBannerOnly');
    assert.ok(p.priceNum > 0, `${p.id} must have a valid price`);
  }

  // Check gemini-pro-18-bulan configuration
  const gemini = products.find(p => p.id === 'gemini-pro-18-bulan');
  assert.ok(gemini, 'Gemini Pro product preserved in catalog data for historic reference');
  assert.equal(gemini._isBannerOnly, true, 'Gemini Pro must be _isBannerOnly');
  assert.equal(gemini.hasSale, false, 'Gemini Pro must have hasSale: false');
  assert.equal(gemini.isLimitedEdition, false, 'Gemini Pro must have isLimitedEdition: false');
});

test('10. Countdown lifecycle: Countdown stops and banner tears down cleanly when deadline expires', async () => {
  // Promo expires in 100ms
  const nearDeadline = new Date(Date.now() + 100).toISOString();
  const { window, document, elements, fetchMock } = createMockBrowserEnv({
    apiResponses: {
      'https://jokiin-payment-api.gamingyoga14.workers.dev/api/promo/banner': {
        body: {
          penawaran_spesial_aktif: true,
          promo_deadline: nearDeadline,
          promo_judul: 'Hampir Habis',
          server_time: new Date().toISOString()
        }
      },
      'https://jokiin-payment-api.gamingyoga14.workers.dev/api/products': {
        body: {
          products: [
            {
              id: 'p-exp',
              nama: 'Expiring Deal',
              slug: 'expiring-deal',
              is_active: true,
              is_limited_edition: true,
              stok: 5,
              harga_dasar: 50000,
              diskon_persen: 50
            }
          ]
        }
      }
    }
  });

  const banner = elements.get('promo-banner-section');
  const context = vm.createContext({
    window,
    document,
    localStorage: window.localStorage,
    fetch: fetchMock,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    String,
    Number,
    Boolean,
    Array,
    Object,
    JSON,
    Intl,
    MutationObserver: class { observe() {} disconnect() {} }
  });

  vm.runInContext(catalogJsSource, context);
  await new Promise(r => setTimeout(r, 40));

  // Initially rendered while deadline is still in future
  assert.ok(banner.innerHTML.includes('Expiring Deal'), 'Rendered while active');

  // Wait past the deadline and timer tick
  await new Promise(r => setTimeout(r, 1100));

  // Verify that it automatically tore down without page reload
  assert.equal(banner.innerHTML.trim(), '', 'Banner must automatically clear when deadline expires');
  assert.equal(banner.hasAttribute('hidden'), true, 'Banner must hide when deadline expires');
  assert.equal(banner.style.display, 'none', 'Banner display must be set to none');
});
