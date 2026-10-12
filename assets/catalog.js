// JOKI.IN Storefront — Dynamic Promo Banner & Live Catalog Sync
// Mengambil data produk, stok, diskon, dan status Penawaran Spesial dari jokiin-catalog API
(function () {
  'use strict';

  const CATALOG_API = 'https://xdbnwjvxqtpkoaigedsk.supabase.co/functions/v1/jokiin-catalog';

  const state = {
    penawaranSpesialAktif: true,
    promoJudul: 'Penawaran Spesial Minggu Ini',
    promoDeadline: null,
    serverTimeOffsetMs: 0,
    banners: [],
    lastApiProducts: [],
    featuredProduct: {
      id: 'gemini-pro-18-bulan',
      nama: 'Gemini Pro 18 Bulan',
      slug: 'gemini-pro-18-bulan',
      kategori: 'Digital',
      deskripsi: 'Akses penuh Gemini Advanced 18 bulan, Garansi penuh selama masa aktif, Akun pribadi siap pakai',
      harga_dasar: 50000,
      diskon_persen: 60,
      stok: 14,
      stok_awal: 20,
      batas_beli_per_orang: 1,
      is_active: true,
      is_limited_edition: true,
      gambar_url: null
    },
    countdownTimer: null,
    isDecorating: false
  };

  function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(num) || 0);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function injectCatalogStyles() {
    if (document.getElementById('jokiin-dynamic-catalog-styles')) return;
    const style = document.createElement('style');
    style.id = 'jokiin-dynamic-catalog-styles';
    style.textContent = `
      #promo-banner-section { margin: 24px 0 10px; font-family: "Plus Jakarta Sans", system-ui, sans-serif; }
      .jokiin-promo-head { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; margin:16px 0 18px; }
      .jokiin-promo-tag { display:inline-block; background:#f59e0b; color:#2b2100; font-weight:800; font-size:12px; letter-spacing:.08em; padding:6px 12px; border-radius:999px; }
      .jokiin-promo-title { margin:10px 0 0; font-size:clamp(24px, 3vw, 34px); font-weight:800; color:var(--text-main, #eef3f1); line-height:1.2; }
      .jokiin-cd { display:flex; gap:8px; }
      .jokiin-cd > div { background:#141c20; color:#eef3f1; border:1px solid #243038; border-radius:10px; padding:6px 10px; text-align:center; font-weight:800; min-width:54px; }
      .jokiin-cd small { display:block; font-size:10px; color:#8a9a95; font-weight:600; }
      .jokiin-lim { position:relative; border-radius:22px; padding:3px; overflow:hidden; background:#1a2a26; box-shadow:0 0 40px rgba(31,209,139,.18); animation:jokiin-promo-glow 2.4s ease-in-out infinite; }
      .jokiin-lim::before { content:""; position:absolute; left:-50%; top:-50%; width:200%; height:200%; background:conic-gradient(from 0deg,transparent 0 55%,#ffd54a 70%,#1fd18b 85%,#4ea1ff 95%,transparent); animation:jokiin-promo-spin 3s linear infinite; }
      .jokiin-lim-in { position:relative; background:#0f161a; color:#eef3f1; border-radius:19px; display:flex; gap:28px; padding:28px; }
      .jokiin-lim-vis { flex:0 0 340px; min-height:240px; border-radius:16px; background:linear-gradient(135deg,#1b3b8f,#6a4bd8 55%,#1fd18b); background-size:cover; background-position:center; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:34px; text-align:center; line-height:1.1; color:#fff; padding:16px; }
      .jokiin-lim-inf { flex:1; display:flex; flex-direction:column; gap:14px; }
      .jokiin-lim-inf h2 { margin:0; font-size:clamp(22px, 2.6vw, 30px); color:#eef3f1; font-weight:800; }
      .jokiin-lim-inf ul { margin:0; padding-left:18px; color:#c4cfca; line-height:1.7; font-size:15px; }
      .jokiin-le-badge { align-self:flex-start; border:1px solid #1fd18b; color:#1fd18b; font-weight:800; font-size:11px; letter-spacing:.1em; padding:5px 10px; border-radius:999px; display:inline-block; }
      .jokiin-lim-pr { font-size:32px; font-weight:800; color:#1fd18b; }
      .jokiin-lim-pr s { font-size:15px; color:#7d8c87; font-weight:400; margin-left:8px; }
      .jokiin-lim-bar { height:8px; border-radius:8px; background:#1d2a2f; overflow:hidden; margin-top:4px; }
      .jokiin-lim-bar i { display:block; height:100%; background:linear-gradient(90deg,#ffd54a,#1fd18b); }
      .jokiin-lim-row { display:flex; gap:10px; flex-wrap:wrap; }
      .jokiin-lim-btn { border:1px solid #2a3a37; background:transparent; color:#1fd18b; font:600 14px "Plus Jakarta Sans",sans-serif; min-height:44px; padding:0 18px; border-radius:12px; cursor:pointer; transition:all .2s ease; }
      .jokiin-lim-btn.f { background:#1fd18b; color:#04251a; border-color:#1fd18b; font-weight:700; }
      .jokiin-lim-btn:hover:not(:disabled) { transform:translateY(-1px); filter:brightness(1.06); }
      .jokiin-lim-btn:disabled { opacity:.45; cursor:not-allowed; }
      .jokiin-catalog-div { display:flex; align-items:center; gap:16px; margin:40px 0 20px; color:#8a9a95; font-size:13px; font-weight:600; letter-spacing:.08em; }
      .jokiin-catalog-div::before, .jokiin-catalog-div::after { content:""; flex:1; height:1px; background:#1d262b; }
      .jokiin-stock-pill { display:inline-block; font-size:11px; font-weight:700; color:#8a9a95; margin-top:4px; }
      .jokiin-stock-pill.habis { color:#ef4444; font-weight:800; }
      @keyframes jokiin-promo-spin { to { transform:rotate(360deg); } }
      @keyframes jokiin-promo-glow { 50% { box-shadow:0 0 56px rgba(255,213,74,.28); } }
      @media (prefers-reduced-motion: reduce) {
        .jokiin-lim, .jokiin-lim::before { animation:none !important; }
      }
      @media (max-width: 760px) {
        .jokiin-lim-in { flex-direction:column; padding:16px; gap:16px; }
        .jokiin-lim-vis { flex:none; min-height:150px; font-size:26px; }
        #hargaFilterContainer { flex-wrap:nowrap !important; overflow-x:auto !important; padding-bottom:6px; }
      }
    `;
    document.head.appendChild(style);
  }

  function getServerNowMs() {
    return Date.now() + state.serverTimeOffsetMs;
  }

  function ensureFeaturedProductInStorefront() {
    if (!window.CONFIG || !Array.isArray(window.CONFIG.PRODUCTS)) return;
    const fp = state.featuredProduct;
    const slug = fp.slug || fp.id;
    const finalPrice = Math.round((fp.harga_dasar || 0) * (1 - (fp.diskon_persen || 0) / 100));
    const existing = window.CONFIG.PRODUCTS.find(p => p.id === slug);
    if (!existing) {
      window.CONFIG.PRODUCTS.push({
        id: slug,
        title: fp.nama,
        category: fp.kategori || 'Digital',
        price: formatRupiah(finalPrice),
        priceNum: finalPrice,
        originalPrice: fp.harga_dasar,
        hasSale: (fp.diskon_persen || 0) > 0,
        stok: fp.stok,
        isLimitedEdition: true,
        batasBeli: fp.batas_beli_per_orang || 1,
        desc: fp.deskripsi || '',
        image: fp.gambar_url || 'assets/catalog/portfolio-02.jpg',
        popularity: 99,
        _isBannerOnly: true
      });
    }
  }

  function toggleDefaultHargaHeader(hide) {
    const tabHarga = document.getElementById('tab-harga');
    if (!tabHarga) return;
    const sub = tabHarga.querySelector(':scope > .section-subtitle');
    const title = tabHarga.querySelector(':scope > .section-title');
    const desc = tabHarga.querySelector(':scope > .section-desc');
    [sub, title, desc].forEach(el => {
      if (el) el.style.display = hide ? 'none' : '';
    });
  }

  function renderPromoBanner() {
    injectCatalogStyles();
    const container = document.getElementById('promo-banner-section');
    if (!container) return;

    if (state.countdownTimer) {
      clearInterval(state.countdownTimer);
      state.countdownTimer = null;
    }

    // Jika Penawaran Spesial dimatikan, banner di paling atas katalog langsung hilang tanpa menghapus gambarnya
    if (!state.penawaranSpesialAktif) {
      container.innerHTML = '';
      toggleDefaultHargaHeader(false);
      return;
    }

    toggleDefaultHargaHeader(true);

    const fp = state.featuredProduct;
    const hargaAkhir = Math.round((fp.harga_dasar || 0) * (1 - (fp.diskon_persen || 0) / 100));
    const maxSlot = Math.max(fp.stok_awal || 20, fp.stok || 1);
    const pct = Math.max(0, Math.min(100, Math.round(((fp.stok || 0) / maxSlot) * 100)));
    const isSoldOut = (fp.stok || 0) <= 0;
    const bannerImg = state.banners[0]?.gambar_url || fp.gambar_url || '';
    const visStyle = bannerImg
      ? `background-image:linear-gradient(rgba(15,22,26,.25),rgba(15,22,26,.25)),url('${escapeHtml(bannerImg)}');`
      : '';

    const benefits = String(fp.deskripsi || 'Akses penuh 18 bulan, Garansi penuh, Langsung aktif')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    container.innerHTML = `
      <div class="jokiin-promo-head">
        <div>
          <span class="jokiin-promo-tag">PROMO TERBATAS</span>
          <h1 class="jokiin-promo-title">${escapeHtml(state.promoJudul || 'Penawaran Spesial Minggu Ini')}</h1>
        </div>
        <div class="jokiin-cd" id="jokiin-promo-cd" aria-label="Hitung mundur promo">
          <div><span data-cd="d">01</span><small>HARI</small></div>
          <div><span data-cd="h">03</span><small>JAM</small></div>
          <div><span data-cd="m">17</span><small>MNT</small></div>
          <div><span data-cd="s">25</span><small>DTK</small></div>
        </div>
      </div>
      <div class="jokiin-lim">
        <div class="jokiin-lim-in">
          <div class="jokiin-lim-vis" style="${visStyle}">${escapeHtml(fp.nama.replace(/\s+\d+\s+Bulan$/i, '') || fp.nama)}</div>
          <div class="jokiin-lim-inf">
            ${fp.is_limited_edition ? `<span class="jokiin-le-badge">LIMITED EDITION</span>` : ''}
            <h2>${escapeHtml(fp.nama)}</h2>
            <ul>
              ${benefits.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
            </ul>
            <div class="jokiin-lim-pr">
              ${formatRupiah(hargaAkhir)}
              ${fp.diskon_persen > 0 ? `<s>${formatRupiah(fp.harga_dasar)}</s>` : ''}
            </div>
            <div>
              <small style="color:#8a9a95">${isSoldOut ? 'Habis terjual' : `Tersisa ${fp.stok} dari ${maxSlot} slot`}</small>
              <div class="jokiin-lim-bar"><i style="width:${pct}%"></i></div>
            </div>
            <div class="jokiin-lim-row">
              <button type="button" class="jokiin-lim-btn f" id="jokiin-promo-buy-btn" ${isSoldOut ? 'disabled' : ''}>
                ${isSoldOut ? 'Habis' : 'Beli Sekarang'}
              </button>
              <button type="button" class="jokiin-lim-btn" id="jokiin-promo-cart-btn" ${isSoldOut ? 'disabled' : ''}>
                Tambah ke Keranjang
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="jokiin-catalog-div">KATALOG LAYANAN</div>
    `;

    const buyBtn = document.getElementById('jokiin-promo-buy-btn');
    const cartBtn = document.getElementById('jokiin-promo-cart-btn');
    if (buyBtn && !isSoldOut) {
      buyBtn.addEventListener('click', () => {
        ensureFeaturedProductInStorefront();
        if (typeof window.directCheckout === 'function') window.directCheckout(fp.slug || fp.id);
      });
    }
    if (cartBtn && !isSoldOut) {
      cartBtn.addEventListener('click', () => {
        ensureFeaturedProductInStorefront();
        if (typeof window.addToCart === 'function') window.addToCart(fp.slug || fp.id);
      });
    }

    startServerCountdown();
  }

  function startServerCountdown() {
    const cdEl = document.getElementById('jokiin-promo-cd');
    if (!cdEl) return;

    const targetMs = state.promoDeadline && Number.isFinite(Date.parse(state.promoDeadline))
      ? Date.parse(state.promoDeadline)
      : (getServerNowMs() + ((1 * 86400 + 3 * 3600 + 17 * 60 + 25) * 1000));

    function updateTick() {
      const diff = Math.max(0, targetMs - getServerNowMs());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      const dEl = cdEl.querySelector('[data-cd="d"]');
      const hEl = cdEl.querySelector('[data-cd="h"]');
      const mEl = cdEl.querySelector('[data-cd="m"]');
      const sEl = cdEl.querySelector('[data-cd="s"]');
      if (dEl) dEl.textContent = String(d).padStart(2, '0');
      if (hEl) hEl.textContent = String(h).padStart(2, '0');
      if (mEl) mEl.textContent = String(m).padStart(2, '0');
      if (sEl) sEl.textContent = String(s).padStart(2, '0');
    }

    updateTick();
    state.countdownTimer = setInterval(updateTick, 1000);
  }

  function applyCatalogProductsToStorefront(apiProducts) {
    if (!Array.isArray(apiProducts) || !apiProducts.length) return;
    state.lastApiProducts = apiProducts;

    // Pick limited edition product for banner if present
    const limited = apiProducts.find(p => p.is_limited_edition && p.is_active !== false);
    if (limited) {
      state.featuredProduct = {
        ...state.featuredProduct,
        ...limited,
        stok_awal: Math.max(20, limited.stok || 20)
      };
    }

    // Merge into CONFIG.PRODUCTS if present
    if (window.CONFIG && Array.isArray(window.CONFIG.PRODUCTS)) {
      const aliasMap = {
        'cek-turnitin': 'turnitin',
        'joki-skripsi': 'skripsi',
        'joki-ppt': 'ppt',
        'joki-proposal-skripsi': 'bimbingan-proposal-skripsi'
      };

      apiProducts.forEach(ap => {
        if (ap.is_active === false) return;
        // Featured promo banner product stays in the top Penawaran Spesial banner
        if (limited && ap.slug === limited.slug) return;

        const finalPrice = Math.round((ap.harga_dasar || 0) * (1 - (ap.diskon_persen || 0) / 100));
        const mappedSlug = aliasMap[ap.slug] || ap.slug;
        const existing = window.CONFIG.PRODUCTS.find(
          cp => cp.id === ap.slug || cp.id === mappedSlug || cp.title.toLowerCase() === String(ap.nama || '').toLowerCase()
        );
        if (existing) {
          existing.priceNum = finalPrice;
          existing.originalPrice = ap.harga_dasar;
          existing.hasSale = (ap.diskon_persen || 0) > 0;
          existing.price = formatRupiah(finalPrice);
          existing.stok = ap.stok;
          existing.isLimitedEdition = Boolean(ap.is_limited_edition);
          existing.batasBeli = ap.batas_beli_per_orang || 1;
        } else {
          window.CONFIG.PRODUCTS.push({
            id: ap.slug || ap.id,
            title: ap.nama,
            category: ap.kategori || 'Akademik',
            price: formatRupiah(finalPrice),
            priceNum: finalPrice,
            originalPrice: ap.harga_dasar,
            hasSale: (ap.diskon_persen || 0) > 0,
            stok: ap.stok,
            isLimitedEdition: Boolean(ap.is_limited_edition),
            batasBeli: ap.batas_beli_per_orang || 1,
            desc: ap.deskripsi || '',
            image: ap.gambar_url || 'assets/catalog/portfolio-06.jpg',
            popularity: 85
          });
        }
      });

      decorateStockAndLimitedBadges();
    }
  }

  function decorateStockAndLimitedBadges() {
    if (state.isDecorating) return;
    const grid = document.getElementById('full-harga');
    if (!grid || !window.CONFIG || !Array.isArray(window.CONFIG.PRODUCTS)) return;

    state.isDecorating = true;
    try {
      grid.querySelectorAll('.service-card').forEach(card => {
        const titleEl = card.querySelector('h3');
        if (!titleEl) return;
        const product = window.CONFIG.PRODUCTS.find(p => p.title === titleEl.textContent.trim());
        if (!product) return;

        // Separate LIMITED EDITION badge above title
        if (product.isLimitedEdition && !card.querySelector('.jokiin-card-le-badge')) {
          const badge = document.createElement('span');
          badge.className = 'jokiin-le-badge jokiin-card-le-badge';
          badge.style.marginBottom = '4px';
          badge.textContent = 'LIMITED EDITION';
          titleEl.parentNode.insertBefore(badge, titleEl);
        }

        // Stock & sold-out handling
        if (typeof product.stok === 'number') {
          let stockEl = card.querySelector('.jokiin-stock-pill');
          if (!stockEl) {
            stockEl = document.createElement('span');
            stockEl.className = 'jokiin-stock-pill';
            const priceBox = card.querySelector('.pricing-price-box');
            if (priceBox) priceBox.appendChild(stockEl);
          }
          if (product.stok <= 0) {
            stockEl.className = 'jokiin-stock-pill habis';
            stockEl.textContent = 'Habis';
            card.querySelectorAll('.cf-card-actions button').forEach((btn, idx) => {
              btn.disabled = true;
              if (idx === 0) btn.textContent = 'Habis';
            });
          } else {
            stockEl.className = 'jokiin-stock-pill';
            stockEl.textContent = `Stok: ${product.stok}`;
          }
        }
      });
    } finally {
      state.isDecorating = false;
    }
  }

  function setupGridObserver() {
    const grid = document.getElementById('full-harga');
    if (!grid || grid.dataset.jokiinObserved === '1') return;
    grid.dataset.jokiinObserved = '1';
    const obs = new MutationObserver(() => {
      if (state.isDecorating) return;
      if (state.lastApiProducts.length) {
        applyCatalogProductsToStorefront(state.lastApiProducts);
      } else {
        decorateStockAndLimitedBadges();
      }
    });
    obs.observe(grid, { childList: true });
  }

  async function syncFromCatalogApi() {
    setupGridObserver();

    // 1. Check local cache broadcast from Workplace admin (instant sync on same browser)
    try {
      const rawCache = localStorage.getItem('jokiin_catalog_cache');
      if (rawCache) {
        const parsed = JSON.parse(rawCache);
        if (typeof parsed.penawaran_spesial_aktif === 'boolean') {
          state.penawaranSpesialAktif = parsed.penawaran_spesial_aktif;
        }
        if (parsed.bannerUrl) {
          state.banners = [{ gambar_url: parsed.bannerUrl, judul: parsed.bannerTitle || 'Promo' }];
        }
        if (Array.isArray(parsed.products)) {
          applyCatalogProductsToStorefront(parsed.products);
        }
      }
    } catch (_) {}

    // Render immediately with default/cached state so banner is visible with zero delay
    renderPromoBanner();

    // 2. Fetch live from Supabase jokiin-catalog Edge Function
    try {
      const [bannerRes, prodRes] = await Promise.all([
        fetch(`${CATALOG_API}/api/promo/banner`).catch(() => null),
        fetch(`${CATALOG_API}/api/products`).catch(() => null)
      ]);

      if (bannerRes && bannerRes.ok) {
        const bData = await bannerRes.json();
        state.penawaranSpesialAktif = Boolean(bData.penawaran_spesial_aktif);
        state.promoJudul = bData.promo_judul || state.promoJudul;
        state.promoDeadline = bData.promo_deadline || null;
        if (bData.server_time && Number.isFinite(Date.parse(bData.server_time))) {
          state.serverTimeOffsetMs = Date.parse(bData.server_time) - Date.now();
        }
        if (Array.isArray(bData.banners)) {
          state.banners = bData.banners;
        }
      }

      if (prodRes && prodRes.ok) {
        const pData = await prodRes.json();
        if (Array.isArray(pData.products)) {
          applyCatalogProductsToStorefront(pData.products);
        }
      }
    } catch (_) {}

    renderPromoBanner();
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'jokiin_catalog_cache') {
      syncFromCatalogApi();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncFromCatalogApi);
  } else {
    syncFromCatalogApi();
  }
})();
