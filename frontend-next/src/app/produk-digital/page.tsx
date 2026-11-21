'use client';

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './digital.module.css';
import CubeLoader from '../../components/CubeLoader';
import { DigitalProduct } from '../../types/digital';
import {
  ADMIN_KAYLA_ID,
  DEFAULT_DIGITAL_CATEGORIES,
  DEFAULT_DIGITAL_PRODUCTS,
  DIGITAL_API_ENDPOINTS,
  formatRupiah,
  normalizeDigitalCategory,
} from '../../data/digital-data';

const CATEGORY_ICONS: Record<string, string> = {
  all: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  search: 'M15.5 15.5 21 21M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z',
  close: 'm6 6 12 12M18 6 6 18',
  topup: 'M12 3 21 12l-9 9-9-9 9-9Zm0 4-5 5 5 5 5-5-5-5Z',
  voucher: 'M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V6Zm5 0v3m0 3v2m0 3v1',
  pulsa: 'M7 3h10v18H7zM10 6h4m-3 12h2',
  pln: 'm13 2-9 12h7l-1 8 10-13h-7l1-7Z',
  software: 'M3 5h18v12H3zM8 21h8m-4-4v4',
  giftcard: 'M3 10h18v11H3zM2 6h20v4H2zm10 0v15m0-15H8a2 2 0 1 1 2-2c0 1.1 2 2 2 2Zm0 0h4a2 2 0 1 0-2-2c0 1.1-2 2-2 2Z',
  lainnya: 'M5 5h.01M12 5h.01M19 5h.01M5 12h.01M12 12h.01M19 12h.01M5 19h.01M12 19h.01M19 19h.01',
};

const UPCOMING_PREVIEW = [
  { name: 'Free Fire Diamonds', brand: 'Garena', description: 'Isi ulang Diamond Free Fire.', art: 'freeFire', image: 'free-fire.webp' },
  { name: 'Steam Wallet IDR', brand: 'Steam', description: 'Voucher saldo untuk Steam Wallet.', art: 'steam', image: 'steam.svg', wordmark: 'STEAM' },
  { name: 'Netflix Premium', brand: 'Netflix', description: 'Langganan hiburan Netflix.', art: 'netflix', image: 'netflix.svg', wordmark: 'NETFLIX' },
  { name: 'Spotify Premium', brand: 'Spotify', description: 'Langganan musik Spotify.', art: 'spotify', image: 'spotify.svg', wordmark: 'Spotify' },
];

function CategoryIcon({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={CATEGORY_ICONS[id] || CATEGORY_ICONS.lainnya} />
    </svg>
  );
}

function DigitalStoreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'forbidden' | 'unauthenticated'>('loading');
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<DigitalProduct | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Verifikasi Autentikasi Admin Kayla
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Izinkan development environment
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      setAuthStatus('authorized');
      loadLiveProducts();
      return;
    }

    try {
      let token: string | null = null;
      let userId: string | null = null;

      // Periksa cookie sb-access-token
      const match = document.cookie.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }

      // Periksa local storage untuk token Supabase Auth
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || '';
        if (key.includes('auth-token')) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              userId = parsed?.user?.id || parsed?.id || null;
              if (parsed?.access_token) token = parsed.access_token;
            }
          } catch (_) {}
        }
      }

      if (!token && !userId) {
        setAuthStatus('unauthenticated');
        router.replace('/login?redirect=' + encodeURIComponent(window.location.pathname));
        return;
      }

      if (userId && userId !== ADMIN_KAYLA_ID) {
        setAuthStatus('forbidden');
        return;
      }

      // Verifikasi token ke backend API
      fetch(DIGITAL_API_ENDPOINTS.AUTH_VERIFY, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => {
          if (res.status === 403) {
            setAuthStatus('forbidden');
          } else if (res.status === 401) {
            setAuthStatus('unauthenticated');
            router.replace('/login?redirect=' + encodeURIComponent(window.location.pathname));
          } else if (res.ok) {
            setAuthStatus('authorized');
            loadLiveProducts(token || undefined);
          } else {
            setAuthStatus('forbidden');
          }
        })
        .catch(() => setAuthStatus('forbidden'));
    } catch (_) {
      setAuthStatus('forbidden');
    }
  }, [router]);

  const loadLiveProducts = async (token?: string) => {
    setCatalogStatus('loading');
    try {
      const res = await fetch(DIGITAL_API_ENDPOINTS.PRODUCTS, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Catalog fetch failed');
      {
        const data = await res.json();
        if (Array.isArray(data.products) && data.products.length > 0) {
          const mapped: DigitalProduct[] = data.products.map((p: any) => ({
            id: p.id,
            c: normalizeDigitalCategory(p.kategori || p.category),
            n: p.nama,
            pv: p.provider || p.brand || (
              p.nama.toLowerCase().includes('mobile legend') || p.nama.toLowerCase().includes('mlbb') ? 'Mobile Legends' :
              p.nama.toLowerCase().includes('genshin') ? 'Genshin Impact' :
              p.nama.toLowerCase().includes('chronal') ? 'Chronal Nexus' :
              'JOKI.IN Store'
            ),
            ds: p.deskripsi || '',
            pr: Math.round(Number(p.harga_dasar) * (1 - (Number(p.diskon_persen) || 0) / 100)),
            st: Number(p.stok) || 0,
            old: p.diskon_persen ? Number(p.harga_dasar) : undefined,
            slug: p.slug,
            gambar_url: p.gambar_url || p.image_url,
            is_active: p.is_active,
            is_limited_edition: p.is_limited_edition,
          }));
          setProducts(mapped);
          setCatalogStatus('ready');
        } else {
          setProducts(DEFAULT_DIGITAL_PRODUCTS);
          setCatalogStatus('ready');
        }
      }
    } catch (_) {
      setProducts(DEFAULT_DIGITAL_PRODUCTS);
      setCatalogStatus('ready');
    }
  };

  const handleBuyNow = (product: DigitalProduct, quantity: number = 1) => {
    const slug = product.slug || product.id || '';
    router.push(`/produk-digital/checkout/?slug=${encodeURIComponent(slug)}&qty=${quantity}`);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesCategory = selectedCategory === 'all' || prod.c === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        prod.n.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.ds.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const showFeaturedPreview = catalogStatus === 'ready' && products.length === 0 && selectedCategory === 'all' && !searchQuery.trim();

  if (authStatus === 'loading') {
    return (
      <div className={styles.deniedWrap}>
        <CubeLoader text="Memeriksa hak akses Admin Kayla..." />
      </div>
    );
  }

  if (authStatus === 'forbidden') {
    return (
      <div className={styles.deniedWrap}>
        <div className={styles.deniedCard}>
          <div className={styles.deniedBadge}>AKSES TERBATAS</div>
          <h2 style={{ margin: '0 0 12px', fontSize: '20px' }}>Khusus Admin Kayla</h2>
          <p style={{ color: '#a4b0b4', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px' }}>
            Halaman ini sedang dalam masa pengembangan dan pengujian internal khusus Admin Kayla.
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              background: '#008e70',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Kembali ke Beranda
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.navWrap}>
          <Link href="/produk-digital" className={styles.logo} aria-label="JOKI.IN Digital Store">
            <img className={styles.logoImage} src="/assets/produk-digital/jokiin-logo-white.png" alt="JOKI.IN" width="124" height="40" />

          </Link>

          <Link href="/produk-digital/pesanan" className={styles.ordersLink}>
            Pesanan Saya
          </Link>

          <a href="/" className={styles.backLink}>
            Beranda
          </a>
        </div>

        <div className={styles.subNavWrap}>
          <nav className={styles.catNav} aria-label="Kategori Produk">
            <button
              type="button"
              className={`${styles.catBtn} ${selectedCategory === 'all' ? styles.catBtnActive : ''}`}
              aria-pressed={selectedCategory === 'all'}
              onClick={() => { setSelectedCategory('all'); document.getElementById('catalogGrid')?.scrollIntoView(); }}
            >
              <CategoryIcon id="all" /> Semua Produk
            </button>
            {DEFAULT_DIGITAL_CATEGORIES.filter((cat) => cat.id !== 'software' && cat.id !== 'giftcard').map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`${styles.catBtn} ${selectedCategory === cat.id ? styles.catBtnActive : ''}`}
                aria-pressed={selectedCategory === cat.id}
                onClick={() => { setSelectedCategory(cat.id); setSearchQuery(''); document.getElementById('catalogGrid')?.scrollIntoView(); }}
              >
                <CategoryIcon id={cat.id} /> {cat.t}
              </button>
            ))}
          </nav>
          <form className={styles.searchForm} role="search" onSubmit={(e) => { e.preventDefault(); document.getElementById('catalogGrid')?.scrollIntoView(); }}>
            <CategoryIcon id="search" />
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Cari produk digital..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Cari produk digital"
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => setSearchQuery('')}
                aria-label="Hapus pencarian"
              >
                <CategoryIcon id="close" />
              </button>
            )}
          </form>
        </div>
      </header>

      <main className={styles.mainContent}>
        <section className={styles.hero} aria-label="Top up game dan beli produk digital">
          <div className={styles.heroCopy}>
            <div className={styles.heroTag}><b>JOKI.IN Digital Store</b></div><h1 className={styles.heroTitle}>Top Up Game, Langganan<br />Premium, &amp; Voucher Digital</h1>
            <p className={styles.heroDesc}>Proses cepat, aman, dan terpercaya untuk semua kebutuhan digital kamu.</p>
            <div className={styles.heroActions}>
              <button type="button" className={styles.heroBtn} onClick={() => { setSelectedCategory('topup'); setSearchQuery(''); document.getElementById('catalogGrid')?.scrollIntoView(); }}>
                <CategoryIcon id="pln" /> Beli Sekarang
              </button>
              <button type="button" className={styles.heroSecondaryBtn} onClick={() => { setSelectedCategory('all'); setSearchQuery(''); document.getElementById('categoryTitle')?.scrollIntoView({ behavior: 'auto' }); }}>
                <CategoryIcon id="all" /> Lihat Kategori
              </button>
            </div>
          </div>
          <img className={styles.heroArtwork} src="/assets/produk-digital/hero-warrior.png" alt="" fetchPriority="high" />
        </section>

        {/* Section Header */}
        <div className={styles.sectionHeader} id="catalogGrid">
          <div>
            <h2 className={styles.sectionTitle}>{showFeaturedPreview ? 'Pilihan Produk Digital' : selectedCategory === 'all' ? 'Rekomendasi Produk untuk Kamu' : DEFAULT_DIGITAL_CATEGORIES.find((c) => c.id === selectedCategory)?.t || 'Produk Digital'}</h2>
            <p className={styles.sectionSubTitle}>{searchQuery ? 'Hasil pencarian' : showFeaturedPreview ? 'Pratinjau etalase. Harga dan stok belum tersedia.' : 'Harga dan stok terkini dari katalog digital.'}</p>
          </div>
          {!showFeaturedPreview && <button type="button" className={styles.seeAll} onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}>Lihat Kategori <span aria-hidden="true">→</span></button>}
        </div>

        {showFeaturedPreview ? (
          <div className={styles.productGrid}>
            {UPCOMING_PREVIEW.map((item) => (
              <article key={item.name} className={`${styles.productCard} ${styles.previewCard}`}>
                <div className={`${styles.cardVisual} ${styles.previewVisual}`} data-brand={item.art} aria-hidden="true">
                  {item.image ? <img src={`/assets/produk-digital/brands/${item.image}`} alt="" loading="lazy" /> : <span className={styles.mlbbMark}>ML</span>}
                  {item.wordmark && <span className={styles.previewWordmark}>{item.wordmark}</span>}
                </div>
                <div className={styles.cardTags}><span className={styles.providerName}>{item.brand}</span></div>
                <h3 className={styles.cardTitle}>{item.name}</h3>
                <p className={styles.cardDesc}>{item.description}</p>
                <div className={styles.previewStatus}>Harga &amp; stok belum diatur</div>
                <div className={styles.cardActions}>
                  <button type="button" className={styles.btnPrimary} disabled>Segera Hadir</button>
                </div>
              </article>
            ))}
          </div>
        ) : catalogStatus === 'loading' ? (
          <div className={styles.productGrid} role="status" aria-busy="true" aria-label="Memuat katalog produk">
            <span className={styles.srOnly}>Memuat katalog produk...</span>
            {Array.from({ length: 10 }).map((_, idx) => (
              <article key={`skeleton-${idx}`} className={styles.skeletonCard} aria-hidden="true">
                <div className={`${styles.skeletonMedia} ${styles.skeletonSk}`} />
                <div className={styles.skeletonBody}>
                  <div className={`${styles.skeletonTag} ${styles.skeletonSk}`} />
                  <div className={`${styles.skeletonTitle} ${styles.skeletonSk}`} />
                  <div className={`${styles.skeletonDesc1} ${styles.skeletonSk}`} />
                  <div className={`${styles.skeletonDesc2} ${styles.skeletonSk}`} />
                  <div className={styles.skeletonPriceRow}>
                    <div className={`${styles.skeletonPrice} ${styles.skeletonSk}`} />
                    <div className={`${styles.skeletonStock} ${styles.skeletonSk}`} />
                  </div>
                  <div className={`${styles.skeletonButton} ${styles.skeletonSk}`} />
                </div>
              </article>
            ))}
          </div>
        ) : catalogStatus === 'error' ? (
          <div className={styles.catalogEmpty} role="status">
            <CategoryIcon id="all" />
            <div>
              <strong>Katalog gagal dimuat</strong>
              <p>Terjadi kendala saat mengambil data produk.</p>
            </div>
            <button className={styles.btnSecondary} onClick={() => window.location.reload()}>Muat ulang</button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className={styles.catalogEmpty} role="status">
            <CategoryIcon id={catalogStatus === 'ready' ? 'search' : 'all'} />
            <div>
              <strong>{searchQuery ? 'Produk tidak ditemukan' : 'Belum ada produk di kategori ini'}</strong>
              <p>Coba kategori lain atau ubah kata pencarian.</p>
            </div>
          </div>
        ) : (
          <div className={styles.productGrid}>
            {filteredProducts.map((prod) => (
              <article key={prod.id || prod.slug} className={styles.productCard}>
                <div className={styles.cardVisual} aria-hidden="true">
                  {prod.gambar_url ? (
                    <img className={styles.cardImage} src={prod.gambar_url} alt="" loading="lazy" />
                  ) : prod.pv === 'Mobile Legends' ? (
                    <div className={styles.previewVisual} data-brand="mlbb" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
                      <span className={styles.mlbbMark}>ML</span>
                      <span className={styles.previewWordmark}>MOBILE LEGENDS</span>
                    </div>
                  ) : prod.pv === 'Genshin Impact' ? (
                    <div className={styles.previewVisual} data-brand="genshin" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
                      <span style={{ color: '#e0c068', fontSize: '26px', fontWeight: 900, letterSpacing: '-0.05em' }}>GI</span>
                      <span className={styles.previewWordmark} style={{ color: '#e0c068', fontSize: '11px', letterSpacing: '0.08em' }}>GENSHIN IMPACT</span>
                    </div>
                  ) : prod.pv === 'Chronal Nexus' ? (
                    <div className={styles.previewVisual} data-brand="chronal" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
                      <span style={{ color: '#55d9b0', fontSize: '26px', fontWeight: 900, letterSpacing: '-0.05em' }}>CN</span>
                      <span className={styles.previewWordmark} style={{ color: '#55d9b0', fontSize: '11px', letterSpacing: '0.08em' }}>CHRONAL NEXUS</span>
                    </div>
                  ) : (
                    <div className={styles.cardArtwork}>
                      <b>{prod.n}</b>
                      <CategoryIcon id={prod.c} />
                    </div>
                  )}
                  {prod.old && <span className={styles.discountTag}>-{Math.max(1, Math.round((1 - prod.pr / prod.old) * 100))}%</span>}
                </div>
                <div className={styles.cardTags}>
                  <span className={styles.providerName}>{prod.pv}</span>
                  {prod.is_limited_edition && (
                    <span className={styles.tagPill} style={{ background: '#fef3c7', color: '#b45309' }}>
                      Best Value
                    </span>
                  )}
                </div>
                <h3 className={styles.cardTitle}>
                  <button type="button" className={styles.cardTitleButton} onClick={() => { setSelectedProduct(prod); setSelectedQuantity(1); }}>
                    {prod.n}
                  </button>
                </h3>
                <p className={styles.cardDesc}>{prod.ds}</p>
                <div className={styles.cardPricing}>
                  <span className={styles.cardPrice}>{formatRupiah(prod.pr)}</span>
                  <span className={`${styles.cardStock} ${prod.st <= 0 ? styles.cardStockEmpty : prod.st <= 5 ? styles.cardStockLimited : ''}`}>{prod.st > 5 ? 'Stok Tersedia' : prod.st > 0 ? 'Stok Terbatas' : 'Stok habis'}</span>
                  {prod.old && <span className={styles.cardOldPrice}>{formatRupiah(prod.old)}</span>}
                </div>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    disabled={prod.st <= 0}
                    onClick={() => handleBuyNow(prod, 1)}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    Beli Sekarang
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Segera Hadir Section */}
        {selectedCategory === 'all' && !searchQuery.trim() && UPCOMING_PREVIEW.length > 0 && (
          <section style={{ marginTop: '42px' }}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle} style={{ fontSize: '18px' }}>Segera Hadir</h3>
                <p className={styles.sectionSubTitle}>Produk yang sedang disiapkan dan akan segera dibuka untuk pemesanan.</p>
              </div>
            </div>
            <div className={styles.productGrid}>
              {UPCOMING_PREVIEW.map((item) => (
                <article key={item.name} className={`${styles.productCard} ${styles.previewCard}`}>
                  <div className={`${styles.cardVisual} ${styles.previewVisual}`} data-brand={item.art} aria-hidden="true">
                    {item.image ? <img src={`/assets/produk-digital/brands/${item.image}`} alt="" loading="lazy" /> : <span className={styles.mlbbMark}>ML</span>}
                    {item.wordmark && <span className={styles.previewWordmark}>{item.wordmark}</span>}
                  </div>
                  <div className={styles.cardTags}><span className={styles.providerName}>{item.brand}</span></div>
                  <h4 className={styles.cardTitle}>{item.name}</h4>
                  <p className={styles.cardDesc}>{item.description}</p>
                  <div className={styles.previewStatus}>Harga &amp; stok belum diatur</div>
                  <div className={styles.cardActions}>
                    <button type="button" className={styles.btnPrimary} disabled>Segera Hadir</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className={styles.categorySection} aria-labelledby="categoryTitle">
          <div className={styles.categoryHeading}>
            <div>
              <h2 className={styles.sectionTitle} id="categoryTitle">Jelajahi Kategori</h2>
              <p>Pilih kategori sesuai kebutuhanmu.</p>
            </div>
          </div>
          <div className={styles.categoryGrid}>
            {DEFAULT_DIGITAL_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`${styles.categoryTile} ${selectedCategory === cat.id ? styles.categoryTileActive : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <CategoryIcon id={cat.id} />
                {cat.t}
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className={styles.modalOverlay} onClick={() => setSelectedProduct(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{selectedProduct.n}</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setSelectedProduct(null)}
                aria-label="Tutup modal"
              >
                <CategoryIcon id="close" />
              </button>
            </div>
            <p style={{ color: '#a4b0b4', fontSize: '14px', lineHeight: 1.5, margin: '0 0 16px' }}>
              {selectedProduct.ds}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', color: '#a4b0b4' }}>Harga Satuan:</span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#55d9b0' }}>
                {formatRupiah(selectedProduct.pr)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Jumlah:</span>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
              >
                -
              </button>
              <span style={{ fontWeight: 800, minWidth: '24px', textAlign: 'center' }}>
                {selectedQuantity}
              </span>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setSelectedQuantity(Math.min(selectedProduct.st || 10, selectedQuantity + 1))}
              >
                +
              </button>
              <span style={{ marginLeft: 'auto', fontWeight: 800, color: '#55d9b0' }}>
                Subtotal: {formatRupiah(selectedProduct.pr * selectedQuantity)}
              </span>
            </div>
            <div>
              <button
                type="button"
                className={styles.btnPrimary}
                style={{ width: '100%', minHeight: '42px', fontSize: '13px' }}
                onClick={() => {
                  handleBuyNow(selectedProduct, selectedQuantity);
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Beli Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#0f172a',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            zIndex: 200,
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function DigitalStorePage() {
  return (
    <Suspense
      fallback={
        <div className={styles.deniedWrap}>
          <p style={{ color: '#64748b', fontWeight: 600 }}>Memuat JOKI.IN Digital Store...</p>
        </div>
      }
    >
      <DigitalStoreContent />
    </Suspense>
  );
}
