// JOKI.IN Storefront - Dynamic Promo Banner, Cart Type Separation & Special Checkout
// Mengambil data produk, stok, diskon, dan status Penawaran Spesial dari jokiin-catalog API
// serta memisahkan keranjang & alur checkout REGULER (NUG...) vs SPESIAL (SPCL...)
(function () {
  'use strict';

  const CATALOG_API = 'https://jokiin-payment-api.gamingyoga14.workers.dev';

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
      deskripsi: 'Akses penuh Gemini Advanced 18 bulan, Garansi selama 1 minggu, Akun pribadi siap pakai',
      harga_dasar: 50000,
      diskon_persen: 60,
      stok: 12,
      stok_awal: 20,
      total_sold: 80,
      batas_beli_per_orang: 1,
      is_active: true,
      is_limited_edition: true,
      gambar_url: null
    },
    specialCheckoutQty: 1,
    specialCheckoutInFlight: false,
    pendingConflictAction: null,
    countdownTimer: null,
    isDecorating: false,
    hooksInstalled: false
  };

  function getCartSessionId() {
    try {
      let id = localStorage.getItem('jokiin_cart_session_id');
      if (!id) {
        id = (globalThis.crypto?.randomUUID?.() || ('cart-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)));
        localStorage.setItem('jokiin_cart_session_id', id);
      }
      return id;
    } catch (_) {
      return 'guest-default';
    }
  }

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
      .jokiin-promo-tag { display:inline-block; background:#ffd54a; color:#2b2100; font-weight:800; font-size:12px; letter-spacing:.08em; padding:6px 12px; border-radius:999px; }
      .jokiin-promo-title { margin:10px 0 0; font-size:clamp(24px, 3vw, 34px); font-weight:800; color:var(--text-main, #0f172a); line-height:1.2; }
      .jokiin-cd { display:flex; gap:8px; }
      .jokiin-cd > div { border-radius:10px; padding:6px 10px; text-align:center; font-weight:800; min-width:54px; transition:background .2s, border-color .2s, color .2s; }
      .jokiin-cd small { display:block; font-size:10px; font-weight:600; margin-top:2px; }
      .jokiin-lim { position:relative; border-radius:22px; padding:3px; overflow:hidden; transition:background .2s, box-shadow .2s; }
      .jokiin-lim::before { content:""; position:absolute; left:-50%; top:-50%; width:200%; height:200%; background:conic-gradient(from 0deg,transparent 0 55%,#ffd54a 70%,#1fd18b 85%,#4ea1ff 95%,transparent); animation:jokiin-promo-spin 3s linear infinite; }
      .jokiin-lim-in { position:relative; border-radius:19px; display:flex; gap:28px; padding:28px; transition:background .2s, border-color .2s, color .2s; }
      .jokiin-lim-vis { flex:0 0 340px; min-height:240px; border-radius:16px; background-image: var(--desk-banner, linear-gradient(135deg,#1b3b8f,#6a4bd8 55%,#1fd18b)); background-size:cover; background-position:center; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:34px; text-align:center; line-height:1.1; color:#fff; padding:16px; box-shadow:0 8px 24px rgba(0,0,0,0.12); }
      .jokiin-lim-inf { flex:1; display:flex; flex-direction:column; gap:14px; }
      .jokiin-lim-inf h2 { margin:0; font-size:clamp(22px, 2.6vw, 30px); font-weight:800; line-height:1.2; }
      .jokiin-lim-inf ul { margin:0; padding-left:18px; line-height:1.7; font-size:15px; }
      .jokiin-le-badge { display:none !important; }
      .jokiin-lim-pr { font-size:32px; font-weight:800; }
      .jokiin-lim-pr s { font-size:15px; font-weight:400; margin-left:8px; }
      .jokiin-lim-bar { height:8px; border-radius:8px; overflow:hidden; margin-top:4px; }
      .jokiin-lim-bar i { display:block; height:100%; background:linear-gradient(90deg,#ffd54a,#1fd18b); }
      .jokiin-lim-row { display:flex; gap:10px; flex-wrap:wrap; }
      .jokiin-lim-btn { font:600 14px "Plus Jakarta Sans",sans-serif; min-height:44px; padding:0 18px; border-radius:12px; cursor:pointer; transition:all .2s ease; }
      .jokiin-lim-btn.f { font-weight:700; }
      .jokiin-lim-btn:hover:not(:disabled) { transform:translateY(-1px); filter:brightness(1.06); }
      .jokiin-lim-btn:disabled { opacity:.45; cursor:not-allowed; }
      .jokiin-desk-only { display: block; }
      .jokiin-mob-only { display: none; }
      .jokiin-catalog-div { display:flex; align-items:center; gap:16px; margin:40px 0 20px; font-size:13px; font-weight:600; letter-spacing:.08em; }
      .jokiin-catalog-div::before, .jokiin-catalog-div::after { content:""; flex:1; height:1px; }
      .jokiin-stock-pill { display:inline-block; font-size:11px; font-weight:700; margin-top:4px; }
      .jokiin-stock-pill.habis { color:#ef4444 !important; font-weight:800; }

      /* Penawaran Terbatas (Dark Theme Default) */
      .jokiin-promo-title { color: #eef3f1; }
      .jokiin-cd > div { background: #141c20; color: #eef3f1; border: 1px solid #243038; }
      .jokiin-cd small { color: #8a9a95; }
      .jokiin-lim { background: #1a2a26; box-shadow: 0 0 40px rgba(31, 209, 139, .18); animation: jokiin-promo-glow 2.4s ease-in-out infinite; }
      .jokiin-lim-in { background: #0f161a; color: #eef3f1; }
      .jokiin-lim-inf h2 { color: #eef3f1; }
      .jokiin-lim-inf ul { color: #c4cfca; }
      .jokiin-le-badge { background: rgba(255, 213, 74, .14); border: 1px solid #ffd54a; color: #ffd54a; }
      .jokiin-lim-pr { color: #1fd18b; }
      .jokiin-lim-pr s { color: #7d8c87; }
      .jokiin-lim-bar { background: #1d2a2f; }
      .jokiin-stock-slot { color: #8a9a95; }
      .jokiin-sold-info { font-size: 13px; font-weight: 600; color: #8a9a95; margin-top: 6px; letter-spacing: 0.01em; }
      .jokiin-card-sold-info { display: block; font-size: 11px; font-weight: 600; color: #8a9a95; margin-top: 2px; }
      .jokiin-lim-btn.f { background: #1fd18b; color: #04251a; border: 1px solid #1fd18b; }
      .jokiin-lim-btn:not(.f) { border: 1px solid #2a3a37; background: transparent; color: #1fd18b; }
      .jokiin-lim-btn:not(.f):hover:not(:disabled) { background: rgba(31, 209, 139, 0.08); border-color: #1fd18b; }
      .jokiin-catalog-div { color: #8a9a95; }
      .jokiin-catalog-div::before, .jokiin-catalog-div::after { background: #1d262b; }

      /* Penawaran Terbatas (Light Mode Overrides) */
      :root:not([data-theme="dark"]) .jokiin-promo-title,
      html[data-theme="light"] .jokiin-promo-title { color: #0f172a; }
      :root:not([data-theme="dark"]) .jokiin-cd > div,
      html[data-theme="light"] .jokiin-cd > div { background: #ffffff; color: #0f172a; border-color: #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
      :root:not([data-theme="dark"]) .jokiin-cd small,
      html[data-theme="light"] .jokiin-cd small { color: #64748b; }
      :root:not([data-theme="dark"]) .jokiin-lim,
      html[data-theme="light"] .jokiin-lim { background: #e6f7ef; box-shadow: 0 10px 30px rgba(7, 150, 105, 0.12); animation: jokiin-promo-glow-light 2.4s ease-in-out infinite; }
      :root:not([data-theme="dark"]) .jokiin-lim-in,
      html[data-theme="light"] .jokiin-lim-in { background: #ffffff; color: #0f172a; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
      :root:not([data-theme="dark"]) .jokiin-lim-inf h2,
      html[data-theme="light"] .jokiin-lim-inf h2 { color: #0f172a; }
      :root:not([data-theme="dark"]) .jokiin-lim-inf ul,
      html[data-theme="light"] .jokiin-lim-inf ul { color: #475569; }
      :root:not([data-theme="dark"]) .jokiin-le-badge,
      html[data-theme="light"] .jokiin-le-badge { background: #fef3c7; border-color: #f59e0b; color: #b45309; }
      :root:not([data-theme="dark"]) .jokiin-lim-pr,
      html[data-theme="light"] .jokiin-lim-pr { color: #059669; }
      :root:not([data-theme="dark"]) .jokiin-lim-pr s,
      html[data-theme="light"] .jokiin-lim-pr s { color: #94a3b8; }
      :root:not([data-theme="dark"]) .jokiin-lim-bar,
      html[data-theme="light"] .jokiin-lim-bar { background: #e2e8f0; }
      :root:not([data-theme="dark"]) .jokiin-stock-slot,
      html[data-theme="light"] .jokiin-stock-slot { color: #64748b; }
      :root:not([data-theme="dark"]) .jokiin-sold-info,
      html[data-theme="light"] .jokiin-sold-info { color: #64748b; }
      :root:not([data-theme="dark"]) .jokiin-card-sold-info,
      html[data-theme="light"] .jokiin-card-sold-info { color: #64748b; }
      :root:not([data-theme="dark"]) .jokiin-lim-btn.f,
      html[data-theme="light"] .jokiin-lim-btn.f { background: #079669; color: #ffffff; border-color: #079669; box-shadow: 0 2px 8px rgba(7, 150, 105, 0.2); }
      :root:not([data-theme="dark"]) .jokiin-lim-btn:not(.f),
      html[data-theme="light"] .jokiin-lim-btn:not(.f) { border-color: #cbd5e1; background: #ffffff; color: #0f766e; }
      :root:not([data-theme="dark"]) .jokiin-lim-btn:not(.f):hover:not(:disabled),
      html[data-theme="light"] .jokiin-lim-btn:not(.f):hover:not(:disabled) { background: #f0fdf4; border-color: #079669; color: #079669; }
      :root:not([data-theme="dark"]) .jokiin-catalog-div,
      html[data-theme="light"] .jokiin-catalog-div { color: #64748b; }
      :root:not([data-theme="dark"]) .jokiin-catalog-div::before,
      :root:not([data-theme="dark"]) .jokiin-catalog-div::after,
      html[data-theme="light"] .jokiin-catalog-div::before,
      html[data-theme="light"] .jokiin-catalog-div::after { background: #e2e8f0; }

      /* Cart Conflict Modal */
      #cartTypeConflictModal {
        --bg-page: #0c0f0e;
        --surface: #161a18;
        --line: #262c29;
        --text: #f1f3f0;
        --muted: #8d958f;
        --accent: #2fd08a;
        --accent-ink: #04150d;
        --warn: #e7b547;
      }
      :root:not([data-theme="dark"]) #cartTypeConflictModal,
      html[data-theme="light"] #cartTypeConflictModal {
        --bg-page: #f8fafc;
        --surface: #ffffff;
        --line: #e2e8f0;
        --text: #0f172a;
        --muted: #64748b;
        --accent: #10b981;
        --accent-ink: #ffffff;
        --warn: #d97706;
      }
      #cartTypeConflictModal.modal-overlay,
      #cartTypeConflictModal.spcl-conflict-modal-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.7);
        display: flex; align-items: flex-end; justify-content: center;
        z-index: 99999; padding: 0; -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
        box-sizing: border-box;
        transition: background-color 0.22s ease-out, backdrop-filter 0.22s ease-out, -webkit-backdrop-filter 0.22s ease-out;
      }
      #cartTypeConflictModal .sheet,
      #cartTypeConflictModal .spcl-conflict-sheet {
        width: 100%; max-width: 460px; background: var(--surface); color: var(--text);
        border-top: 1px solid var(--line); border-radius: 20px 20px 0 0;
        animation: slideUp .32s cubic-bezier(.2,.8,.2,1) both;
        padding: 12px 22px calc(22px + env(safe-area-inset-bottom, 0px));
        box-sizing: border-box;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Plus Jakarta Sans", sans-serif;
      }
      @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      @media (min-width: 640px) {
        #cartTypeConflictModal.modal-overlay,
        #cartTypeConflictModal.spcl-conflict-modal-overlay {
          align-items: center; padding: 16px;
        }
        #cartTypeConflictModal .sheet,
        #cartTypeConflictModal .spcl-conflict-sheet {
          max-width: 420px; border: 1px solid var(--line); border-radius: 20px;
          padding: 26px 26px 24px; animation: popIn .2s ease-out both;
        }
        #cartTypeConflictModal .grip { display: none !important; }
        @keyframes popIn {
          from { opacity: 0; transform: translateY(8px) scale(.97); }
          to { opacity: 1; transform: none; }
        }
      }
      @media (prefers-reduced-motion: reduce) {
        #cartTypeConflictModal .sheet,
        #cartTypeConflictModal .spcl-conflict-sheet { animation: none !important; }
      }
      #cartTypeConflictModal .grip {
        width: 42px; height: 5px; border-radius: 999px;
        background: rgba(15, 23, 42, 0.32);
        margin: 0 auto 18px; cursor: grab; touch-action: none; position: relative;
        transition: background-color .15s, transform .15s;
      }
      :root[data-theme="dark"] #cartTypeConflictModal .grip,
      html[data-theme="dark"] #cartTypeConflictModal .grip {
        background: rgba(255, 255, 255, 0.35);
      }
      :root:not([data-theme="dark"]) #cartTypeConflictModal .grip,
      html:not([data-theme="dark"]) #cartTypeConflictModal .grip {
        background: rgba(15, 23, 42, 0.32);
      }
      #cartTypeConflictModal .grip::before { content: ""; position: absolute; top: -14px; bottom: -16px; left: -35px; right: -35px; cursor: grab; }
      #cartTypeConflictModal .grip:hover, #cartTypeConflictModal .grip:active { background: rgba(15, 23, 42, 0.6); }
      :root[data-theme="dark"] #cartTypeConflictModal .grip:hover,
      :root[data-theme="dark"] #cartTypeConflictModal .grip:active { background: rgba(255, 255, 255, 0.7); }
      #cartTypeConflictModal .sheet.is-dragging, #cartTypeConflictModal .spcl-conflict-sheet.is-dragging { user-select: none; -webkit-user-select: none; cursor: grabbing; }
      #cartTypeConflictModal .sheet.is-dragging .grip, #cartTypeConflictModal .spcl-conflict-sheet.is-dragging .grip { cursor: grabbing; background: rgba(15, 23, 42, 0.6); transform: scale(1.08); }
      :root[data-theme="dark"] #cartTypeConflictModal .sheet.is-dragging .grip,
      :root[data-theme="dark"] #cartTypeConflictModal .spcl-conflict-sheet.is-dragging .grip { background: rgba(255, 255, 255, 0.7); }
      #cartTypeConflictModal .eyebrow { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--warn); font-weight: 600; margin-bottom: 10px; }
      #cartTypeConflictModal h1,
      #cartTypeConflictModal .spcl-conflict-title { font-size: 22px; font-weight: 650; letter-spacing: -0.01em; margin-bottom: 8px; color: var(--text); line-height: 1.25; }
      #cartTypeConflictModal p.desc,
      #cartTypeConflictModal .spcl-conflict-msg { font-size: 15px; line-height: 1.55; color: var(--muted); margin-bottom: 20px; }
      #cartTypeConflictModal .split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 22px; }
      #cartTypeConflictModal .cart { border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; background: var(--bg-page); cursor: pointer; transition: border-color .15s, color .15s; box-sizing: border-box; }
      #cartTypeConflictModal .cart.regular.on { border-color: var(--accent); }
      #cartTypeConflictModal .cart.regular.on strong { color: var(--accent); }
      #cartTypeConflictModal .cart.special.on { border-color: var(--warn); }
      #cartTypeConflictModal .cart.special.on strong { color: var(--warn); }
      #cartTypeConflictModal .cart small { display: block; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
      #cartTypeConflictModal .cart strong { font-size: 14px; font-weight: 600; color: var(--text); }
      #cartTypeConflictModal .btn { display: block; width: 100%; padding: 15px; border-radius: 12px; font-size: 15px; font-weight: 600; border: 0; cursor: pointer; font-family: inherit; box-sizing: border-box; text-align: center; text-decoration: none; }
      #cartTypeConflictModal .btn-primary,
      #cartTypeConflictModal .spcl-conflict-btn-confirm { background: var(--accent); color: var(--accent-ink); margin-bottom: 6px; }
      #cartTypeConflictModal .btn-ghost,
      #cartTypeConflictModal .spcl-conflict-btn-cancel { background: transparent; color: var(--muted); font-weight: 500; }
      #cartTypeConflictModal .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

      @keyframes jokiin-promo-spin { to { transform:rotate(360deg); } }
      @keyframes jokiin-promo-glow { 50% { box-shadow:0 0 56px rgba(255,213,74,.28); } }
      @keyframes jokiin-promo-glow-light { 50% { box-shadow: 0 10px 38px rgba(7, 150, 105, 0.22), 0 4px 14px rgba(255, 213, 74, 0.2); } }
      @media (prefers-reduced-motion: reduce) {
        .jokiin-lim, .jokiin-lim::before, .jokiin-lim-btn { animation:none !important; transition:none !important; }
      }
      @media (max-width: 760px) {
        .jokiin-desk-only { display: none !important; }
        .jokiin-mob-only { display: block !important; }
        .jokiin-lim-in { flex-direction:column; padding:16px; gap:16px; }
        .jokiin-lim-vis {
          width: 100% !important;
          aspect-ratio: 16 / 9 !important;
          min-height: unset !important;
          height: auto !important;
          flex: none !important;
          border-radius: 14px !important;
          background-image: var(--mob-banner, var(--desk-banner, linear-gradient(135deg,#1b3b8f,#6a4bd8 55%,#1fd18b))) !important;
          background-size: cover !important;
          background-position: center !important;
        }
        #hargaFilterContainer, .filter-pills {
          flex-wrap: nowrap !important;
          overflow-x: auto !important;
          padding: 4px 6px 4px 4px !important;
          scroll-behavior: smooth;
          scroll-snap-type: x proximity;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
          -webkit-overflow-scrolling: touch;
        }
        #hargaFilterContainer .filter-pill, .filter-pills .filter-pill {
          scroll-snap-align: start;
          flex-shrink: 0;
        }
        #hargaFilterContainer::-webkit-scrollbar, .filter-pills::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function getServerNowMs() {
    return Date.now() + state.serverTimeOffsetMs;
  }

  function getStore() {
    return window.__JOKIIN_STORE__ || null;
  }

  function getProductsList() {
    return window.CONFIG?.PRODUCTS || getStore()?.CONFIG?.PRODUCTS || [];
  }

  function ensureFeaturedProductInStorefront() {
    const products = getProductsList();
    if (!Array.isArray(products)) return;
    const fp = state.featuredProduct;
    const slug = fp.slug || fp.id || 'gemini-pro-18-bulan';
    const finalPrice = Math.round((fp.harga_dasar || 0) * (1 - (fp.diskon_persen || 0) / 100));
    const existing = products.find(p => p.id === slug);
    if (!existing) {
      products.push({
        id: slug,
        title: fp.nama || 'Gemini Pro 18 Bulan',
        category: fp.kategori || 'Digital',
        price: formatRupiah(finalPrice),
        priceNum: finalPrice,
        originalPrice: fp.harga_dasar,
        hasSale: (fp.diskon_persen || 0) > 0,
        stok: fp.stok,
        isLimitedEdition: true,
        batasBeli: fp.batas_beli_per_orang || 1,
        desc: fp.deskripsi || '',
        image: fp.gambar_url || 'assets/catalog/gemini-pro.png',
        popularity: 99,
        _isBannerOnly: true
      });
    } else {
      existing.title = fp.nama || existing.title;
      existing.image = fp.gambar_url || 'assets/catalog/gemini-pro.png';
      existing.priceNum = finalPrice;
      existing.originalPrice = fp.harga_dasar;
      existing.hasSale = (fp.diskon_persen || 0) > 0;
      existing.price = formatRupiah(finalPrice);
      existing.stok = fp.stok;
      existing.isLimitedEdition = true;
      existing._isBannerOnly = true;
    }
  }

  function isProductSpesial(productId) {
    if (!productId) return false;
    const fp = state.featuredProduct;
    if (productId === 'gemini-pro-18-bulan' || productId === fp.slug || productId === fp.id) return true;
    const prod = getProductsList().find(p => p.id === productId);
    if (prod && (prod.isLimitedEdition || prod.is_limited_edition)) return true;
    const apiProd = state.lastApiProducts.find(p => p.slug === productId || p.id === productId);
    return Boolean(apiProd && apiProd.is_limited_edition);
  }

  function getActiveCartItems() {
    const store = getStore();
    if (store && typeof store.getCart === 'function') {
      return store.getCart() || [];
    }
    return [];
  }

  function getActiveCartTipe() {
    const items = getActiveCartItems();
    if (items.length > 0) {
      const hasSpesial = items.some(item => isProductSpesial(item.productId));
      return hasSpesial ? 'SPESIAL' : 'REGULER';
    }
    const currentTab = getStore()?.getCurrentTab?.() || '';
    if (currentTab === 'checkout-spesial') return 'SPESIAL';
    return null;
  }

  async function syncServerCartAdd(productId, qty) {
    try {
      await fetch(`${CATALOG_API}/api/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart_id: getCartSessionId(),
          product_slug: productId,
          qty: qty || 1
        })
      });
    } catch (_) {}
  }

  async function syncServerCartClear() {
    try {
      await fetch(`${CATALOG_API}/api/cart?cart_id=${encodeURIComponent(getCartSessionId())}`, {
        method: 'DELETE'
      });
    } catch (_) {}
  }

  function setupCartConflictCardToggles() {
    const modalCards = document.querySelectorAll('#cartTypeConflictModal .cart');
    modalCards.forEach(card => {
      if (card.dataset.toggleBound === 'true') return;
      card.dataset.toggleBound = 'true';
      const toggle = () => {
        const wasOn = card.classList.contains('on');
        modalCards.forEach(c => c.classList.remove('on'));
        if (!wasOn) card.classList.add('on');
      };
      card.addEventListener('click', toggle);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    });
  }

  function setupCartConflictSheetGestures() {
    const modal = document.getElementById('cartTypeConflictModal');
    if (!modal) return;
    const sheet = modal.querySelector('.sheet') || modal.querySelector('.spcl-conflict-sheet');
    const grip = modal.querySelector('.grip');
    if (!sheet) return;
    if (modal.dataset.gesturesBound === 'true') return;
    modal.dataset.gesturesBound = 'true';

    let isDragging = false;
    let startY = 0;
    let currentY = 0;
    let startTime = 0;
    let activePointerId = null;

    function resetSheetStyles() {
      sheet.classList.remove('is-dragging');
      sheet.style.transition = '';
      sheet.style.transform = '';
      sheet.style.animation = '';
      modal.style.transition = '';
      modal.style.backgroundColor = '';
      modal.style.backdropFilter = '';
      modal.style.webkitBackdropFilter = '';
    }

    function onPointerDown(e) {
      if (window.innerWidth >= 640) return;
      if (e.button && e.button !== 0) return;

      const isGrip = grip && (e.target === grip || grip.contains(e.target));
      const sheetRect = sheet.getBoundingClientRect();
      const isTopZone = !e.target.closest('button, a, input, .cart') && (e.clientY - sheetRect.top <= 54);

      if (!isGrip && !isTopZone) return;

      isDragging = true;
      startY = e.clientY;
      currentY = e.clientY;
      startTime = Date.now();
      activePointerId = e.pointerId !== undefined ? e.pointerId : null;

      if (activePointerId !== null && grip && typeof grip.setPointerCapture === 'function' && isGrip) {
        try { grip.setPointerCapture(activePointerId); } catch (_) {}
      }

      sheet.classList.add('is-dragging');
      sheet.style.animation = 'none';
      sheet.style.transition = 'none';
      if (e.cancelable) e.preventDefault();
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      if (activePointerId !== null && e.pointerId !== undefined && e.pointerId !== activePointerId) return;

      currentY = e.clientY;
      const dy = currentY - startY;

      if (dy > 0) {
        sheet.style.transform = `translateY(${dy}px)`;
        const sheetH = sheet.offsetHeight || 380;
        const progress = Math.min(1, Math.max(0, dy / sheetH));
        modal.style.backgroundColor = `rgba(0, 0, 0, ${(0.7 * (1 - progress * 0.75)).toFixed(3)})`;
        const blurPx = Math.max(0, 4 * (1 - progress));
        modal.style.backdropFilter = `blur(${blurPx.toFixed(1)}px)`;
        modal.style.webkitBackdropFilter = `blur(${blurPx.toFixed(1)}px)`;
      } else {
        const damped = Math.max(-60, dy * 0.25);
        sheet.style.transform = `translateY(${damped}px)`;
        modal.style.backgroundColor = '';
        modal.style.backdropFilter = '';
        modal.style.webkitBackdropFilter = '';
      }
      if (e.cancelable) e.preventDefault();
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      if (activePointerId !== null && e.pointerId !== undefined && e.pointerId !== activePointerId) return;

      isDragging = false;
      sheet.classList.remove('is-dragging');

      if (activePointerId !== null && grip && typeof grip.releasePointerCapture === 'function') {
        try { grip.releasePointerCapture(activePointerId); } catch (_) {}
      }
      activePointerId = null;

      const dy = (e.clientY !== undefined ? e.clientY : currentY) - startY;
      const elapsed = Math.max(1, Date.now() - startTime);
      const velocity = dy / elapsed;

      const sheetH = sheet.offsetHeight || 380;
      const shouldDismiss = dy > 85 || (dy > 25 && velocity > 0.45);

      if (shouldDismiss) {
        sheet.style.transition = 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)';
        sheet.style.transform = `translateY(${Math.max(sheetH + 20, 450)}px)`;
        modal.style.transition = 'background-color 0.22s ease-out, backdrop-filter 0.22s ease-out, -webkit-backdrop-filter 0.22s ease-out';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        modal.style.backdropFilter = 'blur(0px)';
        modal.style.webkitBackdropFilter = 'blur(0px)';
        document.body.classList.remove('modal-open');

        let closed = false;
        const finalizeClose = () => {
          if (closed) return;
          closed = true;
          sheet.removeEventListener('transitionend', finalizeClose);
          if (typeof window.closeCartConflictModal === 'function') {
            window.closeCartConflictModal();
          }
          resetSheetStyles();
        };
        sheet.addEventListener('transitionend', finalizeClose);
        setTimeout(finalizeClose, 250);
      } else {
        sheet.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
        sheet.style.transform = 'translateY(0)';
        modal.style.transition = 'background-color 0.25s ease-out, backdrop-filter 0.25s ease-out, -webkit-backdrop-filter 0.25s ease-out';
        modal.style.backgroundColor = '';
        modal.style.backdropFilter = '';
        modal.style.webkitBackdropFilter = '';

        let snapped = false;
        const finalizeSnap = () => {
          if (snapped) return;
          snapped = true;
          sheet.removeEventListener('transitionend', finalizeSnap);
          resetSheetStyles();
        };
        sheet.addEventListener('transitionend', finalizeSnap);
        setTimeout(finalizeSnap, 270);
      }
    }

    if (window.PointerEvent) {
      if (grip) grip.addEventListener('pointerdown', onPointerDown);
      sheet.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    } else {
      const touchWrapper = (fn) => (e) => {
        const touch = e.touches[0] || e.changedTouches[0];
        if (touch) {
          fn({
            clientY: touch.clientY,
            target: e.target,
            button: 0,
            cancelable: e.cancelable,
            preventDefault: () => e.preventDefault()
          });
        }
      };
      if (grip) grip.addEventListener('touchstart', touchWrapper(onPointerDown), { passive: false });
      sheet.addEventListener('touchstart', touchWrapper(onPointerDown), { passive: false });
      window.addEventListener('touchmove', touchWrapper(onPointerMove), { passive: false });
      window.addEventListener('touchend', touchWrapper(onPointerUp));
      window.addEventListener('touchcancel', touchWrapper(onPointerUp));
    }
  }

  function showCartConflictModal(conflictExistingTipe, onConfirmClear) {
    state.pendingConflictAction = onConfirmClear;
    const modal = document.getElementById('cartTypeConflictModal');
    const titleEl = document.getElementById('cartConflictTitle');
    const msgEl = document.getElementById('cartConflictMessage');
    const clearBtn = document.getElementById('btnConfirmClearConflictCart') || document.getElementById('btnConflictClearCart');
    const leftCard = document.getElementById('conflictCardLeft');
    const leftLabel = document.getElementById('conflictCardLeftLabel');
    const leftStatus = document.getElementById('conflictCardLeftStatus');
    const rightCard = document.getElementById('conflictCardRight');
    const rightLabel = document.getElementById('conflictCardRightLabel');
    const rightStatus = document.getElementById('conflictCardRightStatus');

    if (!modal) {
      if (typeof onConfirmClear === 'function') onConfirmClear();
      return;
    }

    setupCartConflictCardToggles();
    setupCartConflictSheetGestures();

    modal.style.backgroundColor = '';
    modal.style.backdropFilter = '';
    modal.style.webkitBackdropFilter = '';
    modal.style.transition = '';
    const sheet = modal.querySelector('.sheet') || modal.querySelector('.spcl-conflict-sheet');
    if (sheet) {
      sheet.classList.remove('is-dragging');
      sheet.style.transform = '';
      sheet.style.transition = '';
      sheet.style.animation = '';
    }

    if (conflictExistingTipe === 'REGULER') {
      if (titleEl) titleEl.textContent = 'Pesanan spesial dibayar terpisah';
      if (msgEl) {
        msgEl.textContent = 'Penawaran Spesial tidak bisa digabung dengan keranjang reguler. Kosongkan keranjang reguler, atau selesaikan pesanan spesial lebih dulu.';
      }
      if (clearBtn) {
        clearBtn.textContent = 'Kosongkan Keranjang Reguler';
      }
      if (leftCard) {
        leftCard.className = 'cart regular on';
        leftCard.setAttribute('data-cart', 'regular');
      }
      if (leftLabel) leftLabel.textContent = 'Keranjang reguler';
      if (leftStatus) leftStatus.textContent = 'Akan dikosongkan';

      if (rightCard) {
        rightCard.className = 'cart special';
        rightCard.setAttribute('data-cart', 'special');
      }
      if (rightLabel) rightLabel.textContent = 'Penawaran Spesial';
      if (rightStatus) rightStatus.textContent = 'Tetap disimpan';
    } else {
      if (titleEl) titleEl.textContent = 'Pesanan reguler dibayar terpisah';
      if (msgEl) {
        msgEl.textContent = 'Keranjang reguler tidak bisa digabung dengan Penawaran Spesial. Kosongkan Penawaran Spesial, atau selesaikan pesanan reguler lebih dulu.';
      }
      if (clearBtn) {
        clearBtn.textContent = 'Kosongkan Penawaran Spesial';
      }
      if (leftCard) {
        leftCard.className = 'cart special on';
        leftCard.setAttribute('data-cart', 'special');
      }
      if (leftLabel) leftLabel.textContent = 'Penawaran Spesial';
      if (leftStatus) leftStatus.textContent = 'Akan dikosongkan';

      if (rightCard) {
        rightCard.className = 'cart regular';
        rightCard.setAttribute('data-cart', 'regular');
      }
      if (rightLabel) rightLabel.textContent = 'Keranjang reguler';
      if (rightStatus) rightStatus.textContent = 'Tetap disimpan';
    }

    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
  }

  window.closeCartConflictModal = function () {
    state.pendingConflictAction = null;
    const modal = document.getElementById('cartTypeConflictModal');
    if (modal) {
      modal.style.display = 'none';
      modal.style.backgroundColor = '';
      modal.style.backdropFilter = '';
      modal.style.webkitBackdropFilter = '';
      modal.style.transition = '';
      const sheet = modal.querySelector('.sheet') || modal.querySelector('.spcl-conflict-sheet');
      if (sheet) {
        sheet.classList.remove('is-dragging');
        sheet.style.transform = '';
        sheet.style.transition = '';
        sheet.style.animation = '';
      }
    }
    if (!document.querySelector('.modal-overlay[style*="display: flex"]')) {
      document.body.classList.remove('modal-open');
    }
  };

  window.confirmClearCartForConflict = async function () {
    const action = state.pendingConflictAction;
    state.pendingConflictAction = null;
    window.closeCartConflictModal();
    const store = getStore();
    if (store && typeof store.setCart === 'function') {
      store.setCart([]);
    } else if (typeof window.clearCart === 'function') {
      window.clearCart();
    }
    await syncServerCartClear();
    if (typeof action === 'function') {
      action();
    }
  };

  function clearSpecialCheckoutErrors() {
    ['Nama', 'Nim', 'Wa', 'Gmail'].forEach(field => {
      const errEl = document.getElementById('errSpcl' + field);
      const inputEl = document.getElementById('spcl' + field);
      if (errEl) {
        errEl.textContent = '';
        errEl.classList.remove('is-visible');
        errEl.setAttribute('hidden', '');
      }
      if (inputEl) {
        inputEl.removeAttribute('aria-invalid');
      }
    });
  }

  function setSpecialFieldError(fieldSuffix, message) {
    const errEl = document.getElementById('errSpcl' + fieldSuffix);
    const inputEl = document.getElementById('spcl' + fieldSuffix);
    if (errEl) {
      errEl.textContent = message;
      errEl.removeAttribute('hidden');
      errEl.classList.add('is-visible');
    }
    if (inputEl) {
      inputEl.setAttribute('aria-invalid', 'true');
    }
  }

  function bindSpecialCheckoutInputs() {
    const wrap = document.getElementById('tab-checkout-spesial');
    if (!wrap || wrap.dataset.boundInputs === '1') return;
    wrap.dataset.boundInputs = '1';

    const waInput = document.getElementById('spclWa');
    if (waInput) {
      waInput.addEventListener('input', () => {
        // Hanya angka, dan hilangkan angka 0 di awal jika diketik
        const digits = waInput.value.replace(/\D/g, '').replace(/^0+/, '');
        if (waInput.value !== digits) waInput.value = digits;
        const errEl = document.getElementById('errSpclWa');
        if (errEl) {
          errEl.textContent = '';
          errEl.classList.remove('is-visible');
          errEl.setAttribute('hidden', '');
        }
        waInput.removeAttribute('aria-invalid');
      });
    }

    ['spclNama', 'spclNim', 'spclWa', 'spclGmail'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const suffix = id.replace(/^spcl/, '');
      el.addEventListener('input', () => {
        const errEl = document.getElementById('errSpcl' + suffix);
        if (errEl) {
          errEl.textContent = '';
          errEl.classList.remove('is-visible');
          errEl.setAttribute('hidden', '');
        }
        el.removeAttribute('aria-invalid');
      });
      // Pastikan keyboard di mobile tidak menutupi field yang sedang diisi
      el.addEventListener('focus', () => {
        setTimeout(() => {
          try {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch (_) {}
        }, 180);
      });
    });
  }

  window.hydrateSpecialCheckoutUI = function (qtyOverride) {
    injectCatalogStyles();
    ensureFeaturedProductInStorefront();
    bindSpecialCheckoutInputs();

    const fp = state.featuredProduct;
    const qty = Math.max(1, Number(qtyOverride) || state.specialCheckoutQty || 1);
    state.specialCheckoutQty = qty;
    const unitPrice = Math.round((fp.harga_dasar || 0) * (1 - (fp.diskon_persen || 0) / 100));
    const total = unitPrice * qty;

    const prodTitleEl = document.getElementById('spclProdTitle');
    const prodQtyPriceEl = document.getElementById('spclProdQtyPrice');
    const prodSubtotalEl = document.getElementById('spclProdSubtotal');
    const prodThumbEl = document.getElementById('spclProdThumb');
    const sumThumbEl = document.getElementById('spclSumThumb');
    const sumProdNameEl = document.getElementById('spclSumProdName');
    const sumUnitPriceEl = document.getElementById('spclSumUnitPrice');
    const sumSubtotalEl = document.getElementById('spclSumSubtotal');
    const sumTotalEl = document.getElementById('spclSumTotal');
    const mobileBtnTotalEl = document.getElementById('spclMobileBtnTotal');

    if (prodTitleEl) prodTitleEl.textContent = fp.nama || 'Gemini Pro 18 Bulan';
    if (prodQtyPriceEl) prodQtyPriceEl.textContent = `${qty} × ${formatRupiah(unitPrice)} · Batas 1x per hari · Akun Pribadi · Garansi 1 minggu`;
    if (prodSubtotalEl) prodSubtotalEl.textContent = formatRupiah(total);
    if (sumProdNameEl) sumProdNameEl.textContent = fp.nama || 'Gemini Pro 18 Bulan';
    if (sumUnitPriceEl) sumUnitPriceEl.textContent = formatRupiah(unitPrice);
    if (sumSubtotalEl) sumSubtotalEl.textContent = formatRupiah(total);
    if (sumTotalEl) sumTotalEl.textContent = formatRupiah(total);
    if (mobileBtnTotalEl) mobileBtnTotalEl.textContent = formatRupiah(total);

    const bannerImg = state.banners?.find(b => !/mobile/i.test(b.judul || '') && b.urutan !== 1)?.gambar_url || state.banners?.find(b => b.gambar_url)?.gambar_url || fp.gambar_url || '';
    if (bannerImg) {
      if (prodThumbEl) {
        prodThumbEl.style.backgroundImage = `url('${bannerImg}')`;
        prodThumbEl.textContent = '';
      }
      if (sumThumbEl) {
        sumThumbEl.style.backgroundImage = `url('${bannerImg}')`;
      }
    }

    // Pre-fill user data if logged in
    const user = getStore()?.getCurrentUser?.();
    if (user) {
      const nInput = document.getElementById('spclNama');
      const gInput = document.getElementById('spclGmail');
      const wInput = document.getElementById('spclWa');
      if (nInput && !nInput.value && user.name) nInput.value = user.name;
      if (gInput && !gInput.value && user.email) gInput.value = user.email;
      if (wInput && !wInput.value && user.phone) {
        wInput.value = String(user.phone).replace(/\D/g, '').replace(/^(62|0)+/, '');
      }
    }
  };

  window.openSpecialCheckout = function (qtyOverride) {
    clearSpecialCheckoutErrors();
    window.hydrateSpecialCheckoutUI(qtyOverride || 1);

    if (typeof window.closeModal === 'function') {
      window.closeModal('cartModal');
    }
    if (typeof window.switchTab === 'function') {
      window.switchTab('checkout-spesial');
    }
  };

  window.cancelSpecialCheckout = function () {
    const prev = getStore()?.getLastActiveTab?.() || 'harga';
    if (typeof window.switchTab === 'function') {
      window.switchTab(prev);
    }
  };

  window.submitSpecialCheckout = async function () {
    if (state.specialCheckoutInFlight) return;
    clearSpecialCheckoutErrors();

    const nama = (document.getElementById('spclNama')?.value || '').trim();
    const nim = (document.getElementById('spclNim')?.value || '').trim();
    const countryCode = (document.getElementById('spclWaCountry')?.value || '62').trim();
    const waRaw = (document.getElementById('spclWa')?.value || '').trim();
    const gmail = (document.getElementById('spclGmail')?.value || '').trim().toLowerCase();

    let hasError = false;
    let firstInvalidEl = null;

    if (!nama || nama.length < 2) {
      setSpecialFieldError('Nama', 'Nama lengkap wajib diisi (minimal 2 karakter).');
      hasError = true;
      firstInvalidEl = firstInvalidEl || document.getElementById('spclNama');
    }

    if (nim.length > 40) {
      setSpecialFieldError('Nim', 'NIM maksimal 40 karakter.');
      hasError = true;
      firstInvalidEl = firstInvalidEl || document.getElementById('spclNim');
    }

    if (!waRaw) {
      setSpecialFieldError('Wa', 'Nomor WhatsApp wajib diisi.');
      hasError = true;
      firstInvalidEl = firstInvalidEl || document.getElementById('spclWa');
    } else if (!/^[1-9][0-9]{7,14}$/.test(waRaw)) {
      setSpecialFieldError('Wa', 'Nomor WhatsApp hanya boleh angka dan tidak diawali 0 (contoh: 81234567890).');
      hasError = true;
      firstInvalidEl = firstInvalidEl || document.getElementById('spclWa');
    }

    if (!gmail) {
      setSpecialFieldError('Gmail', 'Alamat Gmail wajib diisi.');
      hasError = true;
      firstInvalidEl = firstInvalidEl || document.getElementById('spclGmail');
    } else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(gmail)) {
      setSpecialFieldError('Gmail', 'Masukkan alamat Gmail yang valid (@gmail.com).');
      hasError = true;
      firstInvalidEl = firstInvalidEl || document.getElementById('spclGmail');
    }

    if (hasError) {
      if (firstInvalidEl) {
        firstInvalidEl.focus();
      }
      return;
    }

    const fp = state.featuredProduct;
    if ((fp.stok || 0) <= 0) {
      setSpecialFieldError('Gmail', 'Maaf, stok Penawaran Spesial sudah habis.');
      return;
    }

    state.specialCheckoutInFlight = true;
    const btnDesktop = document.getElementById('spclSubmitBtnDesktop');
    const btnMobile = document.getElementById('spclSubmitBtnMobile');
    const unitPrice = Math.round((fp.harga_dasar || 0) * (1 - (fp.diskon_persen || 0) / 100));
    const total = unitPrice * (state.specialCheckoutQty || 1);

    if (btnDesktop) {
      btnDesktop.disabled = true;
      btnDesktop.textContent = 'Memproses...';
    }
    if (btnMobile) {
      btnMobile.disabled = true;
      btnMobile.textContent = 'Memproses...';
    }

    try {
      const res = await fetch(`${CATALOG_API}/api/checkout/spesial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_slug: fp.slug || 'gemini-pro-18-bulan',
          qty: state.specialCheckoutQty || 1,
          nama,
          nim,
          country_code: countryCode,
          whatsapp: waRaw,
          gmail,
          cart_id: getCartSessionId()
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || 'Pesanan belum dapat diproses. Silakan coba lagi.';
        if (data.field_errors && typeof data.field_errors === 'object') {
          if (data.field_errors.nama) setSpecialFieldError('Nama', data.field_errors.nama);
          if (data.field_errors.whatsapp) setSpecialFieldError('Wa', data.field_errors.whatsapp);
          if (data.field_errors.gmail) setSpecialFieldError('Gmail', data.field_errors.gmail);
          return;
        }
        if (data.field === 'nama') {
          setSpecialFieldError('Nama', msg);
        } else if (data.field === 'whatsapp') {
          setSpecialFieldError('Wa', msg);
        } else {
          setSpecialFieldError('Gmail', msg);
        }
        return;
      }

      const order = data.order || {};
      const orderCode = String(order.order_code || order.id || order.orderCode || data.order_code || data.id || '').trim();
      const paymentUrl = data.paymentUrl || data.payment_url || order.paymentUrl || order.payment_url || null;
      const expiresAt = data.expires_at || order.expires_at || data.expiryTime || null;
      const transactionId = data.transaction_id || order.mayar_transaction_id || null;

      if (typeof data.remaining_stock === 'number') {
        state.featuredProduct.stok = data.remaining_stock;
        ensureFeaturedProductInStorefront();
        renderPromoBanner();
      }

      // Bersihkan keranjang jika berisi item spesial
      const store = getStore();
      if (store && typeof store.getCart === 'function') {
        const currentCart = store.getCart();
        if (currentCart.some(i => isProductSpesial(i.productId))) {
          store.setCart([]);
        }
      }

      try {
        localStorage.setItem('jokiin_last_order_id', orderCode);
      } catch (_) {}

      const normalizedOrder = {
        id: orderCode,
        orderCode: orderCode,
        gateway: 'mayar',
        tipe: 'SPESIAL',
        status: order.status || 'pending',
        orderStatus: 'WAITING_PAYMENT',
        paymentStatus: 'PENDING',
        paymentMethod: 'Mayar / QRIS',
        subtotal: Number(order.subtotal || order.total || total),
        discount: 0,
        paymentFee: 0,
        total: Number(order.total || total),
        paymentUrl: paymentUrl,
        expiryTime: expiresAt,
        transactionId: transactionId,
        customer: order.customer || { name: nama, nim, whatsapp: countryCode + waRaw, email: gmail },
        task: order.task || { title: fp.nama || 'Gemini Pro 18 Bulan', deadline: '-', notes: 'Penawaran Spesial Limited Edition' },
        items: order.items || [{ productId: fp.slug || 'gemini-pro-18-bulan', name: fp.nama || 'Gemini Pro 18 Bulan', price: Number(order.total || total), quantity: state.specialCheckoutQty || 1 }],
        emailConfirmation: order.emailConfirmation || { sent: true, to: gmail, orderId: orderCode },
        createdAt: order.createdAt || new Date().toISOString()
      };

      if (store) {
        if (typeof store.savePendingMayarOrder === 'function') {
          store.savePendingMayarOrder(normalizedOrder);
        }
        store.setCurrentOrder(normalizedOrder);
        store.renderOrderSuccess(normalizedOrder);
      }
      try {
        history.replaceState(null, '', `/payment/pending?order_id=${encodeURIComponent(orderCode)}`);
      } catch (_) {}

      if (typeof window.startPaymentPolling === 'function') {
        window.startPaymentPolling(orderCode);
      }
      if (typeof window.switchTab === 'function') {
        window.switchTab('order-success');
      }
      if (typeof window.showToast === 'function') {
        window.showToast(
          paymentUrl
            ? `Pesanan ${orderCode} berhasil dibuat! Menghubungkan ke Mayar...`
            : `Pesanan ${orderCode} berhasil dibuat!`,
          'Penawaran Spesial',
          'success'
        );
      }

      if (paymentUrl) {
        setTimeout(() => {
          try {
            window.location.assign(paymentUrl);
          } catch (_) {
            window.location.href = paymentUrl;
          }
        }, 600);
      }
    } catch (err) {
      setSpecialFieldError('Gmail', err?.message || 'Gagal menghubungi server checkout.');
    } finally {
      state.specialCheckoutInFlight = false;
      if (btnDesktop) {
        btnDesktop.disabled = false;
        btnDesktop.textContent = 'Beli sekarang';
      }
      if (btnMobile) {
        btnMobile.disabled = false;
        btnMobile.textContent = 'Beli sekarang';
      }
    }
  };

  function installStorefrontHooks() {
    if (state.hooksInstalled) return;
    if (typeof window.addToCart !== 'function' || typeof window.directCheckout !== 'function' || typeof window.goToCheckout !== 'function') {
      return;
    }
    state.hooksInstalled = true;

    const origAddToCart = window.addToCart;
    const origDirectCheckout = window.directCheckout;
    const origGoToCheckout = window.goToCheckout;
    const origClearCart = window.clearCart;

    window.addToCart = function (productId) {
      ensureFeaturedProductInStorefront();
      const targetIsSpesial = isProductSpesial(productId);
      const targetTipe = targetIsSpesial ? 'SPESIAL' : 'REGULER';
      const activeTipe = getActiveCartTipe();

      if (activeTipe && activeTipe !== targetTipe) {
        showCartConflictModal(activeTipe, () => {
          window.addToCart(productId);
        });
        return;
      }

      if (targetIsSpesial) {
        const fp = state.featuredProduct;
        if ((fp.stok || 0) <= 0) {
          if (typeof window.showToast === 'function') window.showToast('Stok Penawaran Spesial sudah habis.', 'Stok Habis', 'error');
          return;
        }
        const items = getActiveCartItems();
        const existing = items.find(i => i.productId === productId);
        const maxLimit = fp.batas_beli_per_orang || 1;
        if (existing && existing.quantity >= maxLimit) {
          if (typeof window.showToast === 'function') {
            window.showToast(`Batas pembelian Penawaran Spesial maksimal ${maxLimit}x per hari per orang.`, 'Batas Pembelian', 'warn');
          }
          return;
        }
      }

      origAddToCart(productId);
      syncServerCartAdd(productId, 1);
    };

    window.directCheckout = function (productId) {
      ensureFeaturedProductInStorefront();
      const targetIsSpesial = isProductSpesial(productId);
      const targetTipe = targetIsSpesial ? 'SPESIAL' : 'REGULER';
      const activeTipe = getActiveCartTipe();

      if (activeTipe && activeTipe !== targetTipe) {
        showCartConflictModal(activeTipe, () => {
          if (targetIsSpesial) {
            window.openSpecialCheckout(1);
          } else {
            origDirectCheckout(productId);
          }
        });
        return;
      }

      if (targetIsSpesial) {
        window.openSpecialCheckout(1);
        return;
      }

      origDirectCheckout(productId);
    };

    window.goToCheckout = function () {
      const items = getActiveCartItems();
      if (items.length > 0 && items.some(i => isProductSpesial(i.productId))) {
        const spItem = items.find(i => isProductSpesial(i.productId));
        window.openSpecialCheckout(spItem?.quantity || 1);
        return;
      }
      origGoToCheckout();
    };

    if (typeof origClearCart === 'function') {
      window.clearCart = function () {
        origClearCart();
        syncServerCartClear();
      };
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
    ensureFeaturedProductInStorefront();
    installStorefrontHooks();

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
    const desktopBannerObj = state.banners?.find(b => !/mobile/i.test(b.judul || '') && b.urutan !== 1);
    const mobileBannerObj = state.banners?.find(b => /mobile/i.test(b.judul || '') || b.urutan === 1);

    const desktopBanner = desktopBannerObj?.gambar_url || (!/mobile/i.test(fp.nama || '') ? fp.gambar_url || '' : '');
    const mobileBanner = mobileBannerObj?.gambar_url || '';

    const hasDesktopPhoto = Boolean(desktopBanner && String(desktopBanner).trim());
    const hasMobilePhoto = Boolean(mobileBanner && String(mobileBanner).trim());

    const visStyle = [
      hasDesktopPhoto ? `--desk-banner:url('${escapeHtml(desktopBanner)}');` : '',
      hasMobilePhoto ? `--mob-banner:url('${escapeHtml(mobileBanner)}');` : '',
      'background-size:cover; background-position:center;'
    ].filter(Boolean).join(' ');

    const rawOfferTitle = fp.nama.replace(/\s+\d+\s+Bulan$/i, '') || fp.nama;
    const deskText = hasDesktopPhoto ? '' : `<span class="jokiin-desk-only">${escapeHtml(rawOfferTitle)}</span>`;
    const mobText = hasMobilePhoto ? '' : `<span class="jokiin-mob-only">${escapeHtml(rawOfferTitle)}</span>`;
    const visText = `${deskText}${mobText}`;

    const benefits = String(fp.deskripsi || 'Akses penuh 18 bulan, Garansi selama 1 minggu, Langsung aktif')
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
          <div class="jokiin-lim-vis" style="${visStyle}">${visText}</div>
          <div class="jokiin-lim-inf">
            <h2>${escapeHtml(fp.nama)}</h2>
            <ul>
              ${benefits.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
            </ul>
            <div class="jokiin-lim-pr">
              ${formatRupiah(hargaAkhir)}
              ${fp.diskon_persen > 0 ? `<s>${formatRupiah(fp.harga_dasar)}</s>` : ''}
            </div>
            <div>
              <small class="jokiin-stock-slot">${isSoldOut ? 'Habis terjual' : `Tersisa ${fp.stok} dari ${maxSlot} slot`}</small>
              <div class="jokiin-lim-bar"><i style="width:${pct}%"></i></div>
              <div class="jokiin-sold-info">${(fp.total_sold !== undefined && fp.total_sold !== null) ? fp.total_sold : 80} terjual</div>
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
        installStorefrontHooks();
        window.directCheckout(fp.slug || fp.id || 'gemini-pro-18-bulan');
      });
    }
    if (cartBtn && !isSoldOut) {
      cartBtn.addEventListener('click', () => {
        ensureFeaturedProductInStorefront();
        installStorefrontHooks();
        window.addToCart(fp.slug || fp.id || 'gemini-pro-18-bulan');
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
        total_sold: typeof limited.total_sold === 'number' ? limited.total_sold : (state.featuredProduct.total_sold ?? 80),
        stok_awal: Math.max(20, state.featuredProduct.stok_awal || 20)
      };
    }

    ensureFeaturedProductInStorefront();

    const products = getProductsList();
    if (Array.isArray(products)) {
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
        const existing = products.find(
          cp => cp.id === ap.slug || cp.id === mappedSlug || cp.title.toLowerCase() === String(ap.nama || '').toLowerCase()
        );
        const isLimited = Boolean(ap.is_limited_edition);
        const batasBeli = isLimited
          ? Math.max(1, Number(ap.batas_beli_per_orang) || 1)
          : Math.max(2, Number(ap.batas_beli_per_orang) || 2);
        if (existing) {
          existing.priceNum = finalPrice;
          existing.originalPrice = ap.harga_dasar;
          existing.hasSale = (ap.diskon_persen || 0) > 0;
          existing.price = formatRupiah(finalPrice);
          existing.stok = ap.stok;
          existing.isLimitedEdition = isLimited;
          existing.batasBeli = batasBeli;
          if (typeof ap.total_sold === 'number') existing.total_sold = ap.total_sold;
        } else {
          products.push({
            id: ap.slug || ap.id,
            title: ap.nama,
            category: ap.kategori || 'Akademik',
            price: formatRupiah(finalPrice),
            priceNum: finalPrice,
            originalPrice: ap.harga_dasar,
            hasSale: (ap.diskon_persen || 0) > 0,
            stok: ap.stok,
            isLimitedEdition: isLimited,
            batasBeli: batasBeli,
            desc: ap.deskripsi || '',
            image: ap.gambar_url || 'assets/catalog/portfolio-06.jpg',
            popularity: 85,
            total_sold: typeof ap.total_sold === 'number' ? ap.total_sold : 0
          });
        }
      });

      decorateStockAndLimitedBadges();
    }
  }

  function decorateStockAndLimitedBadges() {
    if (state.isDecorating) return;
    const grid = document.getElementById('full-harga');
    const products = getProductsList();
    if (!grid || !Array.isArray(products)) return;

    state.isDecorating = true;
    try {
      grid.querySelectorAll('.service-card').forEach(card => {
        const titleEl = card.querySelector('h3');
        if (!titleEl) return;
        const product = products.find(p => p.title === titleEl.textContent.trim());
        if (!product) return;

        const existingLeBadge = card.querySelector('.jokiin-card-le-badge, .jokiin-le-badge');
        if (existingLeBadge) existingLeBadge.remove();

        let stockEl = card.querySelector('.jokiin-stock-pill');
        if (typeof product.stok === 'number') {
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
        } else if (stockEl) {
          stockEl.remove();
        }

        let soldEl = card.querySelector('.jokiin-card-sold-info');
        if (typeof product.total_sold === 'number' && product.total_sold > 0) {
          if (!soldEl) {
            soldEl = document.createElement('span');
            soldEl.className = 'jokiin-card-sold-info';
            const priceBox = card.querySelector('.pricing-price-box');
            if (priceBox) priceBox.appendChild(soldEl);
          }
          soldEl.textContent = `${product.total_sold} terjual`;
        } else if (soldEl) {
          soldEl.remove();
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
    injectCatalogStyles();
    setupGridObserver();
    ensureFeaturedProductInStorefront();
    installStorefrontHooks();
    bindSpecialCheckoutInputs();

    // 1. Check local cache broadcast from Workplace admin
    try {
      const rawCache = localStorage.getItem('jokiin_catalog_cache');
      if (rawCache) {
        const parsed = JSON.parse(rawCache);
        if (typeof parsed.penawaran_spesial_aktif === 'boolean') {
          state.penawaranSpesialAktif = parsed.penawaran_spesial_aktif;
        }
        if (parsed.promo_deadline) {
          state.promoDeadline = parsed.promo_deadline;
        }
        if (parsed.promo_judul) {
          state.promoJudul = parsed.promo_judul;
        }
        if (parsed.bannerUrl || parsed.bannerMobileUrl) {
          const banners = [];
          if (parsed.bannerUrl) banners.push({ gambar_url: parsed.bannerUrl, judul: parsed.bannerTitle || 'Promo (Desktop)', urutan: 0 });
          if (parsed.bannerMobileUrl) banners.push({ gambar_url: parsed.bannerMobileUrl, judul: (parsed.bannerTitle || 'Promo') + ' (Mobile)', urutan: 1 });
          state.banners = banners;
        }
        if (Array.isArray(parsed.products)) {
          applyCatalogProductsToStorefront(parsed.products);
        }
      }
    } catch (_) {}

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

      // Pastikan seluruh data dari Supabase public.services ter-update
      try {
        const sRes = await fetch('https://xdbnwjvxqtpkoaigedsk.supabase.co/rest/v1/services?is_active=eq.true&order=id.asc', {
          headers: {
            apikey: 'sb_publishable_WuihnHZo0ZJbVGCMe1sWJg_QVdRKw4z',
            Authorization: 'Bearer sb_publishable_WuihnHZo0ZJbVGCMe1sWJg_QVdRKw4z'
          }
        }).catch(() => null);
        if (sRes && sRes.ok) {
          const sRows = await sRes.json();
          if (Array.isArray(sRows) && sRows.length) {
            const mapped = sRows.map(s => {
              const isLimited = Boolean(s.slug === 'gemini-pro-18-bulan' || s.is_limited_edition || s.sale_label === 'LIMITED EDITION');
              let stokVal = null;
              if (typeof s.stok === 'number') {
                stokVal = s.stok;
              } else if (s.stok !== undefined && s.stok !== null && s.stok !== '' && !isNaN(Number(s.stok))) {
                stokVal = Number(s.stok);
              }
              return {
                id: s.id,
                nama: s.name,
                slug: s.slug,
                kategori: s.category || 'Akademik',
                deskripsi: s.description || '',
                harga_dasar: Number(s.price || 0),
                diskon_persen: Number(s.sale_percent || 0),
                stok: stokVal,
                is_active: s.is_active !== false,
                is_limited_edition: isLimited
              };
            });
            applyCatalogProductsToStorefront(mapped);
          }
        }
      } catch (_) {}

      // Ambil data jumlah terjual riil dari Supabase product_sales view
      try {
        const salesRes = await fetch('https://xdbnwjvxqtpkoaigedsk.supabase.co/rest/v1/product_sales', {
          headers: {
            apikey: 'sb_publishable_WuihnHZo0ZJbVGCMe1sWJg_QVdRKw4z',
            Authorization: 'Bearer sb_publishable_WuihnHZo0ZJbVGCMe1sWJg_QVdRKw4z'
          }
        }).catch(() => null);
        if (salesRes && salesRes.ok) {
          const salesRows = await salesRes.json();
          if (Array.isArray(salesRows)) {
            const productsList = getProductsList() || [];
            salesRows.forEach(row => {
              const count = Number(row.total_sold || 0);
              const slug = String(row.product_slug || '').trim();
              if (slug === 'gemini-pro-18-bulan' || slug === state.featuredProduct.slug || slug === state.featuredProduct.id) {
                state.featuredProduct.total_sold = count;
              }
              const p = productsList.find(it => it.id === slug || it.slug === slug);
              if (p) p.total_sold = count;
            });
            decorateStockAndLimitedBadges();
          }
        }
      } catch (_) {}
    } catch (_) {}

    renderPromoBanner();
    window.hydrateSpecialCheckoutUI();
  }

  window.addEventListener('jokiin:store-ready', () => {
    ensureFeaturedProductInStorefront();
    installStorefrontHooks();
    if (state.lastApiProducts.length) {
      applyCatalogProductsToStorefront(state.lastApiProducts);
    }
    renderPromoBanner();
    window.hydrateSpecialCheckoutUI();
  });

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
