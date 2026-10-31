'use client';

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './digital.module.css';
import { DigitalProduct, DigitalCartItem } from '../../types/digital';
import {
  ADMIN_KAYLA_ID,
  DEFAULT_DIGITAL_CATEGORIES,
  DEFAULT_DIGITAL_HERO_SLIDES,
  DIGITAL_API_ENDPOINTS,
  SAMPLE_DIGITAL_PRODUCTS,
  formatRupiah,
} from '../../data/digital-data';

function DigitalStoreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'forbidden' | 'unauthenticated'>('loading');
  const [products, setProducts] = useState<DigitalProduct[]>(SAMPLE_DIGITAL_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<DigitalCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
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
        .catch(() => {
          // Fallback ke authorized jika verifikasi offline atau token ada
          setAuthStatus('authorized');
        });
    } catch (_) {
      setAuthStatus('authorized');
    }
  }, [router]);

  const loadLiveProducts = async (token?: string) => {
    try {
      const res = await fetch(DIGITAL_API_ENDPOINTS.PRODUCTS, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.products) && data.products.length > 0) {
          const mapped: DigitalProduct[] = data.products.map((p: any) => ({
            id: p.id,
            c: p.kategori || 'ai',
            n: p.nama,
            pv: 'JOKI.IN Store',
            ds: p.deskripsi || '',
            pr: Number(p.harga_dasar) * (1 - (Number(p.diskon_persen) || 0) / 100),
            st: Number(p.stok) || 0,
            old: p.diskon_persen ? Number(p.harga_dasar) : undefined,
            slug: p.slug,
            is_active: p.is_active,
          }));
          setProducts(mapped);
        }
      }
    } catch (_) {}
  };

  // Muat keranjang dari local storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('jokiin_digital_cart');
      if (raw) setCart(JSON.parse(raw));
    } catch (_) {}
  }, []);

  const saveCart = (newCart: DigitalCartItem[]) => {
    setCart(newCart);
    try {
      localStorage.setItem('jokiin_digital_cart', JSON.stringify(newCart));
    } catch (_) {}
  };

  const handleAddToCart = (product: DigitalProduct, quantity: number = 1) => {
    const existingIndex = cart.findIndex((item) => item.productId === (product.id || product.slug));
    let nextCart: DigitalCartItem[];
    if (existingIndex >= 0) {
      nextCart = [...cart];
      nextCart[existingIndex].quantity += quantity;
    } else {
      nextCart = [
        ...cart,
        {
          productId: product.id || product.slug || 'prod',
          productName: product.n,
          price: product.pr,
          quantity,
          slug: product.slug,
        },
      ];
    }
    saveCart(nextCart);
    showToast(`${product.n} berhasil ditambahkan ke keranjang.`);
    if (selectedProduct) setSelectedProduct(null);
  };

  const handleRemoveFromCart = (productId: string) => {
    const nextCart = cart.filter((item) => item.productId !== productId);
    saveCart(nextCart);
  };

  const cartTotalCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartTotalPrice = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

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

  if (authStatus === 'loading') {
    return (
      <div className={styles.deniedWrap}>
        <p style={{ color: '#64748b', fontWeight: 600 }}>Memeriksa hak akses Admin Kayla...</p>
      </div>
    );
  }

  if (authStatus === 'forbidden') {
    return (
      <div className={styles.deniedWrap}>
        <div className={styles.deniedCard}>
          <div className={styles.deniedBadge}>AKSES TERBATAS</div>
          <h2 style={{ margin: '0 0 12px', fontSize: '20px' }}>Khusus Admin Kayla</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px' }}>
            Halaman ini sedang dalam masa pengembangan dan pengujian internal khusus Admin Kayla.
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              background: '#2563eb',
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
      <div className={styles.adminBar}>
        Mode ADMIN_ONLY : etalase privat khusus Admin Kayla : data katalog dan gateway pembayaran terisolasi
      </div>

      <header className={styles.header}>
        <div className={styles.navWrap}>
          <Link href="/produk-digital" className={styles.logo} aria-label="JOKI.IN Digital Store">
            <i className={styles.logoIcon}>J</i>
            JOKI.IN
            <small className={styles.logoTag}>Digital Store</small>
          </Link>

          <form className={styles.searchForm} onSubmit={(e) => e.preventDefault()}>
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
                x
              </button>
            )}
          </form>

          <button
            className={styles.actionBtn}
            type="button"
            onClick={() => setIsCartOpen(true)}
            aria-label="Keranjang belanja"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 4h2l2.4 11h10.2L20 7H6.2" />
              <circle cx="9" cy="19.5" r="1.5" />
              <circle cx="17" cy="19.5" r="1.5" />
            </svg>
            {cartTotalCount > 0 && <span className={styles.badge}>{cartTotalCount}</span>}
          </button>

          <a href="/" className={styles.backLink}>
            Kembali ke JOKI.IN
          </a>
        </div>

        <nav className={styles.catNav} aria-label="Kategori Produk">
          <button
            type="button"
            className={`${styles.catBtn} ${selectedCategory === 'all' ? styles.catBtnActive : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            Semua Produk
          </button>
          {DEFAULT_DIGITAL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`${styles.catBtn} ${selectedCategory === cat.id ? styles.catBtnActive : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.t}
            </button>
          ))}
        </nav>
      </header>

      <main className={styles.mainContent}>
        {/* Hero Banner */}
        <section className={styles.hero}>
          <span className={styles.heroTag}>{DEFAULT_DIGITAL_HERO_SLIDES[0].l}</span>
          <h1 className={styles.heroTitle}>{DEFAULT_DIGITAL_HERO_SLIDES[0].h}</h1>
          <p className={styles.heroDesc}>{DEFAULT_DIGITAL_HERO_SLIDES[0].p}</p>
          <button
            type="button"
            className={styles.heroBtn}
            onClick={() => {
              const el = document.getElementById('catalogGrid');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {DEFAULT_DIGITAL_HERO_SLIDES[0].a}
          </button>
        </section>

        {/* Section Header */}
        <div className={styles.sectionHeader} id="catalogGrid">
          <h2 className={styles.sectionTitle}>
            {selectedCategory === 'all'
              ? 'Semua Produk Tersedia'
              : DEFAULT_DIGITAL_CATEGORIES.find((c) => c.id === selectedCategory)?.t || 'Katalog Produk'}
          </h2>
          <span style={{ fontSize: '13px', color: '#64748b' }}>{filteredProducts.length} produk</span>
        </div>

        {/* Product Grid */}
        <div className={styles.productGrid}>
          {filteredProducts.map((prod) => (
            <article key={prod.id || prod.slug} className={styles.productCard}>
              <div className={styles.cardTags}>
                <span className={styles.tagPill}>{prod.pv}</span>
                {prod.is_limited_edition && (
                  <span className={styles.tagPill} style={{ background: '#fef3c7', color: '#b45309' }}>
                    Limited
                  </span>
                )}
              </div>
              <h3 className={styles.cardTitle}>{prod.n}</h3>
              <p className={styles.cardDesc}>{prod.ds}</p>
              <div className={styles.cardPricing}>
                <span className={styles.cardPrice}>{formatRupiah(prod.pr)}</span>
                {prod.old && <span className={styles.cardOldPrice}>{formatRupiah(prod.old)}</span>}
              </div>
              <div className={`${styles.cardStock} ${prod.st <= 0 ? styles.cardStockEmpty : ''}`}>
                {prod.st > 0 ? `Tersedia: ${prod.st} akun` : 'Stok sedang kosong'}
              </div>
              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={prod.st <= 0}
                  onClick={() => {
                    setSelectedProduct(prod);
                    setSelectedQuantity(1);
                  }}
                >
                  Detail & Pesan
                </button>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  disabled={prod.st <= 0}
                  onClick={() => handleAddToCart(prod, 1)}
                  aria-label="Tambah ke keranjang"
                >
                  + Keranjang
                </button>
              </div>
            </article>
          ))}
        </div>
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
                x
              </button>
            </div>
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.5, margin: '0 0 16px' }}>
              {selectedProduct.ds}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', color: '#64748b' }}>Harga Satuan:</span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#1d4ed8' }}>
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
              <span style={{ marginLeft: 'auto', fontWeight: 800, color: '#1d4ed8' }}>
                Subtotal: {formatRupiah(selectedProduct.pr * selectedQuantity)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => {
                  router.push(
                    `/produk-digital/checkout?slug=${encodeURIComponent(
                      selectedProduct.slug || selectedProduct.id || ''
                    )}&qty=${selectedQuantity}`
                  );
                }}
              >
                Beli Langsung Sekarang
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => handleAddToCart(selectedProduct, selectedQuantity)}
              >
                + Keranjang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer / Modal */}
      {isCartOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCartOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Keranjang Belanja</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setIsCartOpen(false)}
                aria-label="Tutup keranjang"
              >
                x
              </button>
            </div>

            {cart.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748b', margin: '24px 0' }}>
                Keranjang belanja masih kosong.
              </p>
            ) : (
              <div>
                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
                  {cart.map((item) => (
                    <div
                      key={item.productId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: '1px solid #e2e7f1',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{item.productName}</div>
                        <div style={{ color: '#64748b', fontSize: '12px' }}>
                          {item.quantity} x {formatRupiah(item.price)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, color: '#1d4ed8', fontSize: '14px' }}>
                          {formatRupiah(item.price * item.quantity)}
                        </span>
                        <button
                          type="button"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 700,
                          }}
                          onClick={() => handleRemoveFromCart(item.productId)}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 800,
                    fontSize: '16px',
                    margin: '16px 0',
                  }}
                >
                  <span>Total Pesanan:</span>
                  <span style={{ color: '#1d4ed8' }}>{formatRupiah(cartTotalPrice)}</span>
                </div>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  style={{ width: '100%' }}
                  onClick={() => {
                    setIsCartOpen(false);
                    const firstItem = cart[0];
                    if (firstItem) {
                      router.push(
                        `/produk-digital/checkout?slug=${encodeURIComponent(
                          firstItem.slug || firstItem.productId
                        )}&qty=${firstItem.quantity}`
                      );
                    }
                  }}
                >
                  Lanjut ke Pembayaran
                </button>
              </div>
            )}
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
