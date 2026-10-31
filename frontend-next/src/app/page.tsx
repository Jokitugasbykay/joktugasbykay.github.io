'use client';

import React, { useState } from 'react';
import PromoStrip from '@/components/PromoStrip';
import Header from '@/components/Header';
import NavPills from '@/components/NavPills';
import HomeBanner from '@/components/HomeBanner';
import SearchBox from '@/components/SearchBox';
import HomeCategories from '@/components/HomeCategories';
import RecommendationsSection from '@/components/RecommendationsSection';
import PopularServices from '@/components/PopularServices';
import TestimonialsMarquee from '@/components/TestimonialsMarquee';
import GlobalFooter from '@/components/GlobalFooter';
import ServiceDetailModal from '@/components/ServiceDetailModal';
import CartModal from '@/components/CartModal';
import GuestTrackModal from '@/components/GuestTrackModal';
import OrderModal from '@/components/OrderModal';
import { PRODUCTS, ORDER_STEPS, FAQ_ITEMS, REVIEWS, CATEGORIES } from '@/data/catalog-data';
import type { CatalogProduct } from '@/types/catalog';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('beranda');
  const [searchQuery, setSearchQuery] = useState('');
  const [hargaFilter, setHargaFilter] = useState('Semua');

  // Modals state
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<CatalogProduct | null>(null);
  const [selectedOrderProduct, setSelectedOrderProduct] = useState<CatalogProduct | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isTrackOpen, setIsTrackOpen] = useState(false);
  const [cartItems, setCartItems] = useState<{ product: CatalogProduct; quantity: number }[]>([]);

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const openWhatsApp = (num: string, text: string) => {
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleAddToCart = (product: CatalogProduct) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleCheckoutFromDetail = (product: CatalogProduct) => {
    setSelectedDetailProduct(null);
    setSelectedOrderProduct(product);
  };

  // Filtered products for Harga tab
  const filteredHargaProducts = PRODUCTS.filter((p) => {
    if (hargaFilter === 'Semua') return true;
    return p.category === hargaFilter;
  });

  return (
    <>
      {/* 1. Promo countdown banner */}
      <PromoStrip />

      {/* 2. Container utama */}
      <div className="container">
        {/* Header dengan logo dan actions */}
        <Header
          cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenTrack={() => setIsTrackOpen(true)}
        />

        {/* Tab navigasi pills */}
        <NavPills activeTab={activeTab} onTabChange={setActiveTab} />

        {/* ==================== TAB 1: BERANDA ==================== */}
        <div id="tab-beranda" className={activeTab === 'beranda' ? 'tab-content active' : 'tab-content'}>
          {/* Hero Banner Desktop & Mobile */}
          <HomeBanner
            onSwitchTab={setActiveTab}
            onConsultWA={() => openWhatsApp('601155639233', 'Halo Admin JOKI.IN, saya mau konsultasi tugas.')}
          />

          {/* Search Box */}
          <SearchBox
            value={searchQuery}
            onChange={(val) => {
              setSearchQuery(val);
              if (val.trim()) setActiveTab('layanan');
            }}
          />

          {/* 8 Category icon buttons */}
          <HomeCategories
            onSelectCategory={() => setActiveTab('layanan')}
            onConsultWA={() => openWhatsApp('601155639233', 'Halo Admin JOKI.IN, saya mau konsultasi tugas.')}
          />

          {/* Recommendations carousel */}
          <RecommendationsSection
            products={PRODUCTS}
            onSelectProduct={(p) => setSelectedDetailProduct(p)}
          />

          {/* Popular services grid */}
          <PopularServices
            products={PRODUCTS}
            onSelectProduct={(p) => setSelectedDetailProduct(p)}
            onViewAll={() => setActiveTab('layanan')}
          />

          {/* Testimonial marquee */}
          <TestimonialsMarquee reviews={REVIEWS} />

          {/* Tombol Lihat Semua Layanan */}
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button
              className="btn-outline"
              type="button"
              onClick={() => setActiveTab('layanan')}
            >
              Lihat Semua Layanan →
            </button>
          </div>
        </div>

        {/* ==================== TAB 2: LAYANAN ==================== */}
        <div id="tab-layanan" className={activeTab === 'layanan' ? 'tab-content active' : 'tab-content'}>
          <SearchBox
            placeholder="Cari layanan yang kamu butuhkan..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <span className="section-subtitle">LAYANAN KAMI</span>
          <h3 className="section-title" style={{ marginTop: 0, marginBottom: '5px' }}>
            Solusi untuk Kebutuhan Kuliahmu
          </h3>
          <p className="section-desc">
            Berbagai layanan akademik dan desain untuk membantu menyelesaikan kebutuhan tugasmu
            dengan lebih cepat, rapi, dan sesuai kebutuhan.
          </p>
          <div className="services-grid" id="full-layanan">
            {PRODUCTS.filter((p) =>
              !searchQuery.trim() ||
              p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.desc.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((p) => (
              <div key={p.id} className="service-card">
                {p.image ? (
                  <img
                    className="service-photo"
                    src={p.image}
                    alt={p.title}
                    loading="lazy"
                    style={{
                      height: '126px',
                      flexBasis: '126px',
                      margin: '-18px -18px 14px -18px',
                      width: 'calc(100% + 36px)',
                      objectFit: 'cover',
                      borderRadius: '16px 16px 0 0'
                    }}
                  />
                ) : (
                  <div className="service-icon" style={{ fontSize: '2rem', marginBottom: '10px' }}>
                    {p.icon || '📄'}
                  </div>
                )}
                <h3>{p.title}</h3>
                <p style={{ marginBottom: '10px' }}>{p.desc}</p>
                <div className="layanan-section-title">Apa yang kamu dapatkan?</div>
                <ul className="layanan-check-list">
                  {p.benefits.slice(0, 4).map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
                {p.target && (
                  <div className="layanan-target">
                    <strong>Cocok untuk:</strong> {p.target}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                  <button
                    className="btn-wa"
                    type="button"
                    style={{ flex: 'none', padding: '12px', boxShadow: 'none' }}
                    onClick={() => openWhatsApp('601155639233', `Halo Admin, saya mau pesan layanan ${p.title}.`)}
                  >
                    Hubungi Admin
                  </button>
                  <button
                    className="btn-outline"
                    type="button"
                    style={{ flex: 1, padding: '12px' }}
                    onClick={() => setSelectedDetailProduct(p)}
                  >
                    Lihat Detail
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ==================== TAB 3: HARGA ==================== */}
        <div id="tab-harga" className={activeTab === 'harga' ? 'tab-content active' : 'tab-content'}>
          <SearchBox
            placeholder="Cari layanan atau harga..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <span className="section-subtitle">PRICE LIST</span>
          <h3 className="section-title" style={{ marginTop: 0, marginBottom: '5px' }}>
            Daftar Harga Layanan
          </h3>
          <p className="section-desc">Temukan layanan yang sesuai dengan kebutuhan dan budget kamu.</p>

          <div className="filter-sort-bar">
            <div className="filter-pills" id="hargaFilterContainer">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`filter-pill ${hargaFilter === cat.id ? 'active' : ''}`}
                  onClick={() => setHargaFilter(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="services-grid" id="full-harga" style={{ marginTop: '20px' }}>
            {filteredHargaProducts.map((p) => (
              <div key={p.id} className="service-card" data-price={p.price}>
                <div className="service-icon">{p.icon || '📄'}</div>
                <h3>{p.title}</h3>
                <span className="category-badge">{p.category}</span>
                <p>{p.desc}</p>
                <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: 'var(--primary)', fontSize: '1.05rem' }}>{p.price}</strong>
                  <button
                    className="btn-header"
                    type="button"
                    onClick={() => setSelectedDetailProduct(p)}
                  >
                    Detail
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ==================== TAB 4: TESTIMONI ==================== */}
        <div id="tab-testimoni" className={activeTab === 'testimoni' ? 'tab-content active' : 'tab-content'}>
          <span className="section-subtitle">TESTIMONIALS</span>
          <h3 className="section-title" style={{ marginTop: 0, marginBottom: '5px' }}>
            Ulasan Kepuasan Mahasiswa
          </h3>
          <p className="section-desc">
            Rating rata-rata 4.9 dari 5.0 berdasarkan ribuan tugas yang telah selesai dikerjakan secara profesional.
          </p>

          <div className="services-grid" style={{ marginTop: '20px' }}>
            {REVIEWS.map((rev) => (
              <div key={rev.id} className="service-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong>{rev.name}</strong>
                  <span style={{ color: 'var(--warning-star)', fontWeight: 700 }}>★ {rev.rating}/5</span>
                </div>
                <span className="category-badge" style={{ marginBottom: '10px', display: 'inline-block' }}>{rev.service}</span>
                <p style={{ fontStyle: 'italic', color: 'var(--text-main)', margin: '10px 0' }}>"{rev.review}"</p>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{rev.university} · {rev.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ==================== TAB 5: CARA PESAN ==================== */}
        <div id="tab-carapesan" className={activeTab === 'carapesan' ? 'tab-content active' : 'tab-content'}>
          <span className="section-subtitle">PANDUAN PEMESANAN</span>
          <h3 className="section-title" style={{ marginTop: 0, marginBottom: '20px' }}>
            5 Langkah Mudah Pesan Tugas
          </h3>
          <div className="steps-container" id="full-carapesan">
            {ORDER_STEPS.map((st) => (
              <div key={st.num} className="step-card">
                <span className="step-num">{st.num}</span>
                <h4>{st.title}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9em', margin: 0 }}>
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ==================== TAB 6: BANTUAN / FAQ ==================== */}
        <div id="tab-bantuan" className={activeTab === 'bantuan' ? 'tab-content active' : 'tab-content'}>
          <span className="section-subtitle">PUSAT BANTUAN</span>
          <h3 className="section-title" style={{ marginTop: 0, marginBottom: '20px' }}>
            Pertanyaan yang Sering Diajukan (FAQ)
          </h3>
          <div id="full-faq">
            {FAQ_ITEMS.map((f, idx) => (
              <div
                key={idx}
                className={`faq-item ${openFaq === idx ? 'active' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <div
                  className="faq-question"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                >
                  {f.q}
                  <span className="faq-icon">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: openFaq === idx ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease'
                      }}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </div>
                {openFaq === idx && <div className="faq-answer">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Footer resmi */}
        <GlobalFooter onSwitchTab={setActiveTab} />
      </div>

      {/* ==================== MODALS ==================== */}
      {/* 1. Modal Detail Layanan */}
      <ServiceDetailModal
        product={selectedDetailProduct}
        onClose={() => setSelectedDetailProduct(null)}
        onCheckout={handleCheckoutFromDetail}
      />

      {/* 2. Modal Keranjang */}
      <CartModal
        isOpen={isCartOpen}
        items={cartItems}
        onClose={() => setIsCartOpen(false)}
        onClear={() => setCartItems([])}
        onCheckout={() => {
          setIsCartOpen(false);
          if (cartItems.length > 0) {
            setSelectedOrderProduct(cartItems[0].product);
          }
        }}
      />

      {/* 3. Modal Lacak Pesanan (Guest Tracking) */}
      <GuestTrackModal
        isOpen={isTrackOpen}
        onClose={() => setIsTrackOpen(false)}
      />

      {/* 4. Modal Formulir Pemesanan */}
      {selectedOrderProduct && (
        <OrderModal
          product={selectedOrderProduct}
          onClose={() => setSelectedOrderProduct(null)}
        />
      )}
    </>
  );
}
