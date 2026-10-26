// JOKI.IN Digital Store - Main Entry Point
import { renderCategorySection, setupRowScrollObserver } from './catalog.js';
import { HeroCarousel } from './carousel.js';
import { API_ENDPOINTS, DEFAULT_HERO_SLIDES } from './config.js';
import { ProductDetailModal } from './product-detail.js';
import { SearchController } from './search.js';
import { store } from './state.js';
import { showToast } from './toast.js';
class DigitalStoreApp {
    productModal = new ProductDetailModal();
    heroCarousel = null;
    searchController = null;
    constructor() {
        this.init();
    }
    async checkAuth() {
        const ADMIN_KAYLA_ID = '92e7a1cb-2136-496a-913b-00cd402c04f5';
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return true;
        }
        try {
            let hasToken = false;
            let userId = null;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i) || '';
                if (key.includes('auth-token')) {
                    try {
                        const raw = localStorage.getItem(key);
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            userId = parsed?.user?.id || parsed?.id || null;
                            hasToken = true;
                        }
                    }
                    catch {
                        // ignore JSON parse error
                    }
                }
            }
            if (!hasToken) {
                window.location.replace('/login?redirect=' + encodeURIComponent(window.location.pathname));
                return false;
            }
            if (userId && userId !== ADMIN_KAYLA_ID) {
                document.body.innerHTML = `
          <div style="min-height: 100vh; display: grid; place-items: center; background: #0f172a; color: #f8fafc; font-family: sans-serif; text-align: center; padding: 20px;">
            <div style="max-width: 440px; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 36px 24px;">
              <div style="display: inline-block; padding: 4px 12px; background: rgba(239,68,68,0.15); color: #ef4444; border-radius: 99px; font-weight: 700; font-size: 12px; margin-bottom: 16px;">AKSES TERBATAS</div>
              <h2 style="margin: 0 0 12px; font-size: 20px;">Khusus Admin Kayla</h2>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">Halaman ini sedang dalam masa pengembangan dan pengujian internal khusus Admin Kayla.</p>
              <a href="/" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Kembali ke Beranda</a>
            </div>
          </div>
        `;
                return false;
            }
            return true;
        }
        catch {
            return true;
        }
    }
    async init() {
        const isAllowed = await this.checkAuth();
        if (!isAllowed)
            return;
        this.initCategoryNav();
        this.initHero();
        this.initSearch();
        this.initHeaderActions();
        this.initCatalogListeners();
        // Subscribe to state changes to re-render catalog
        store.subscribe(() => {
            this.renderCatalog();
        });
        // Initial render with sample products
        this.renderCatalog();
        // Check backend API for live products
        await this.loadLiveProducts();
    }
    initCategoryNav() {
        const nav = document.getElementById('catnav');
        if (!nav)
            return;
        const { categories, filter } = store.getState();
        const navItems = [['all', 'Semua'], ...categories.map((c) => [c.id, c.t])];
        nav.innerHTML = navItems
            .map(([id, title]) => `<button type="button" data-c="${id}" aria-current="${id === filter ? 'true' : 'false'}">${title}</button>`)
            .join('');
        nav.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-c]');
            if (!btn || !btn.dataset.c)
                return;
            this.setCategory(btn.dataset.c);
        });
    }
    setCategory(categoryId) {
        store.setFilter(categoryId);
        const nav = document.getElementById('catnav');
        if (nav) {
            nav.querySelectorAll('button[data-c]').forEach((b) => {
                b.setAttribute('aria-current', b.dataset.c === categoryId ? 'true' : 'false');
            });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    initHero() {
        const track = document.getElementById('track');
        const dots = document.getElementById('dots');
        const prevBtn = document.getElementById('hp');
        const nextBtn = document.getElementById('hx');
        if (!track || !dots)
            return;
        this.heroCarousel = new HeroCarousel(DEFAULT_HERO_SLIDES, track, dots, prevBtn, nextBtn, (action) => {
            if (action === 'all') {
                this.setCategory('all');
            }
            else {
                const map = ['unggulan', 'ai', 'game'];
                const idx = parseInt(action, 10);
                if (!isNaN(idx) && map[idx]) {
                    this.setCategory(map[idx]);
                }
            }
        });
    }
    initSearch() {
        const qInput = document.getElementById('q');
        const sfForm = document.getElementById('sf');
        const clrBtn = document.getElementById('clr');
        if (!qInput || !sfForm || !clrBtn)
            return;
        this.searchController = new SearchController(qInput, sfForm, clrBtn, (query) => {
            store.setQuery(query);
        });
        const noResBtn = document.getElementById('nrb');
        noResBtn?.addEventListener('click', () => {
            this.searchController?.clear();
        });
    }
    initHeaderActions() {
        const cartBtn = document.getElementById('cart');
        cartBtn?.addEventListener('click', () => {
            showToast('Keranjang menunggu integrasi checkout');
        });
        const accBtn = document.getElementById('acc');
        accBtn?.addEventListener('click', () => {
            showToast('Akses tetap dicek di server (hanya admin terverifikasi)');
        });
    }
    initCatalogListeners() {
        const catContainer = document.getElementById('sections');
        if (!catContainer)
            return;
        catContainer.addEventListener('click', (e) => {
            const target = e.target;
            // Scroll arrows
            const scrollBtn = target.closest('[data-d]');
            if (scrollBtn && scrollBtn.dataset.d) {
                const direction = parseInt(scrollBtn.dataset.d, 10);
                const row = scrollBtn.closest('section')?.querySelector('.row');
                if (row) {
                    row.scrollBy({ left: direction * row.clientWidth * 0.8, behavior: 'smooth' });
                }
                return;
            }
            // View All link
            const viewAll = target.closest('[data-all]');
            if (viewAll && viewAll.dataset.all) {
                e.preventDefault();
                this.setCategory(viewAll.dataset.all);
                showToast('Menampilkan semua produk kategori ini');
                return;
            }
            // Buy / View Product button
            const buyBtn = target.closest('[data-buy]');
            if (buyBtn && buyBtn.dataset.buy) {
                const productKey = buyBtn.dataset.buy;
                const state = store.getState();
                const found = state.products.find((p) => (p.slug || p.n) === productKey);
                if (found) {
                    this.productModal.show(found);
                }
                else {
                    showToast('Halaman detail produk sedang disiapkan');
                }
            }
        });
    }
    renderCatalog() {
        const catEl = document.getElementById('sections');
        if (!catEl)
            return;
        const { categories, products, filter, query } = store.getState();
        const cleanQuery = query.trim().toLowerCase();
        let shownCount = 0;
        let html = '';
        for (const cat of categories) {
            if (filter !== 'all' && filter !== cat.id)
                continue;
            let items = products.filter((p) => p.c === cat.id);
            if (cleanQuery) {
                items = items.filter((p) => (p.n + p.pv + p.ds).toLowerCase().includes(cleanQuery));
            }
            if (cleanQuery && items.length === 0)
                continue;
            shownCount += items.length;
            html += renderCategorySection(cat, items);
        }
        catEl.innerHTML = html;
        // Empty state handling
        const noRes = document.getElementById('nores');
        const noResText = document.getElementById('nrt');
        if (noRes) {
            const showEmpty = Boolean(cleanQuery && shownCount === 0);
            noRes.hidden = !showEmpty;
            if (showEmpty && noResText) {
                noResText.textContent = `Tidak ada hasil untuk "${query}". Coba kata kunci lain atau pilih kategori.`;
            }
        }
        // Bind scroll observers for dynamic arrow enabling/disabling
        catEl.querySelectorAll('.row').forEach(setupRowScrollObserver);
    }
    async loadLiveProducts() {
        try {
            const res = await fetch(API_ENDPOINTS.PRODUCTS);
            if (!res.ok)
                return;
            const liveList = await res.json();
            if (!Array.isArray(liveList) || liveList.length === 0)
                return;
            const mappedProducts = liveList.map((item) => {
                const discountPrice = Math.round(item.harga_dasar * (1 - (item.diskon_persen || 0) / 100));
                let categoryId = 'unggulan';
                const kat = (item.kategori || '').toLowerCase();
                if (kat.includes('ai') || kat.includes('aplikasi'))
                    categoryId = 'ai';
                else if (kat.includes('game'))
                    categoryId = 'game';
                else if (kat.includes('sosmed') || kat.includes('social'))
                    categoryId = 'sosmed';
                else if (kat.includes('desain') || kat.includes('video'))
                    categoryId = 'kreatif';
                else if (kat.includes('ebook') || kat.includes('aset'))
                    categoryId = 'ebook';
                return {
                    id: item.id,
                    c: categoryId,
                    n: item.nama,
                    pv: 'JOKI.IN Verified',
                    ds: item.deskripsi || 'Layanan digital terpercaya dari JOKI.IN.',
                    pr: discountPrice,
                    st: item.stok || 0,
                    old: item.diskon_persen > 0 ? item.harga_dasar : undefined,
                    slug: item.slug,
                    gambar_url: item.gambar_url,
                };
            });
            // Merge live products with samples, avoiding duplicates by slug
            const current = store.getState().products;
            const combined = [...mappedProducts];
            for (const p of current) {
                if (!combined.some((c) => c.slug === p.slug || c.n === p.n)) {
                    combined.push(p);
                }
            }
            store.setProducts(combined);
        }
        catch {
            // Fallback to sample data gracefully
        }
    }
}
// Bootstrap on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new DigitalStoreApp());
}
else {
    new DigitalStoreApp();
}
