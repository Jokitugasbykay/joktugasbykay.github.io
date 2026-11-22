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
        try {
            const response = await fetch(API_ENDPOINTS.AUTH_VERIFY, {
                credentials: 'same-origin', cache: 'no-store', redirect: 'error',
            });
            if (response.status === 401) {
                window.location.replace('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
                return false;
            }
            return response.ok && (await response.json()).authorized === true;
        } catch {
            return false;
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
        nav.replaceChildren(...navItems.map(([id, title]) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.c = id;
          button.setAttribute('aria-current', String(id === filter));
          button.textContent = title;
          return button;
        }));
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
