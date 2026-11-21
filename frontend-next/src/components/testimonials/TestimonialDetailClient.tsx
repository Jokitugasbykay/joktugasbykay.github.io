'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import TestimonialCard from '@/components/testimonials/TestimonialCard';
import type { ServiceReviewStats } from '@/lib/testimonials';

interface TestimonialDetailClientProps {
  stats: ServiceReviewStats;
}

export default function TestimonialDetailClient({ stats }: TestimonialDetailClientProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [selectedStar, setSelectedStar] = useState<number>(0);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('jokiin_theme', next);
    } catch (_) {}
  };

  const { service, totalReviews, averageRating, satisfactionPercentage, distribution, reviews } = stats;

  const filteredReviews = selectedStar === 0 ? reviews : reviews.filter((r) => Math.round(Number(r.rating) || 5) === selectedStar);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '0 20px', flex: 1 }}>
        <Header theme={theme} onToggleTheme={toggleTheme} />

        {/* Breadcrumb Navigation */}
        <nav style={{ margin: '16px 0 24px', fontSize: '13px', color: 'var(--text-muted)' }} aria-label="Breadcrumb">
          <Link href="/" style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
            Beranda
          </Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <Link href="/testimonials/" style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
            Testimoni
          </Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{service.name}</span>
        </nav>

        {/* Hero / Summary Card */}
        <section
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            padding: '28px',
            marginBottom: '32px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ flex: '1 1 500px' }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: 'rgba(31, 209, 139, 0.12)',
                  color: 'var(--accent-green)',
                  marginBottom: '10px'
                }}
              >
                {service.category}
              </span>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px', lineHeight: 1.25 }}>
                {service.name}
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '18px', maxWidth: '640px' }}>
                {service.description || 'Layanan bantuan pengerjaan tugas dan konsultasi terpercaya dari tim spesialis JOKI.IN.'}
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Link
                  href={`/payment/?service=${service.slug}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    background: 'var(--accent-green)',
                    color: '#04251a',
                    fontWeight: 700,
                    fontSize: '13px',
                    transition: 'opacity 0.2s ease'
                  }}
                >
                  Pesan Layanan Ini
                </Link>
                <Link
                  href="/testimonials/"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: '13px'
                  }}
                >
                  Lihat Semua Layanan
                </Link>
              </div>
            </div>

            {/* Score & Distribution Widget */}
            <div
              style={{
                flex: '1 1 320px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '42px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                  {averageRating > 0 ? averageRating.toFixed(1) : '-'}
                </div>
                <div>
                  <div style={{ color: 'var(--accent-yellow)', fontSize: '18px', letterSpacing: '1px' }}>
                    ★★★★★
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {totalReviews} ulasan terverifikasi
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: 600 }}>
                    {satisfactionPercentage}% pelanggan puas
                  </div>
                </div>
              </div>

              {/* Histogram */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = distribution[star as 1 | 2 | 3 | 4 | 5] || 0;
                  const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                  return (
                    <div
                      key={star}
                      onClick={() => setSelectedStar(selectedStar === star ? 0 : star)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        background: selectedStar === star ? 'rgba(31, 209, 139, 0.08)' : 'transparent'
                      }}
                      title={`Filter bintang ${star}`}
                    >
                      <span style={{ width: '22px', fontWeight: 600, color: 'var(--text-main)' }}>{star}★</span>
                      <div
                        style={{
                          flex: 1,
                          height: '8px',
                          background: 'var(--border-color)',
                          borderRadius: '999px',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: 'var(--accent-green)',
                            borderRadius: '999px'
                          }}
                        />
                      </div>
                      <span style={{ width: '28px', textAlign: 'right', color: 'var(--text-muted)' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Filter Bar & Reviews Count */}
        <section style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>
              Ulasan Pengguna ({filteredReviews.length})
            </h2>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setSelectedStar(0)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: selectedStar === 0 ? 'var(--accent-green)' : 'var(--border-color)',
                  background: selectedStar === 0 ? 'var(--accent-green)' : 'var(--bg-card)',
                  color: selectedStar === 0 ? '#04251a' : 'var(--text-main)'
                }}
              >
                Semua ({totalReviews})
              </button>
              {[5, 4, 3].map((star) => {
                const count = distribution[star as 1 | 2 | 3 | 4 | 5] || 0;
                if (count === 0 && totalReviews > 0) return null;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedStar(star)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: selectedStar === star ? 'var(--accent-green)' : 'var(--border-color)',
                      background: selectedStar === star ? 'var(--accent-green)' : 'var(--bg-card)',
                      color: selectedStar === star ? '#04251a' : 'var(--text-main)'
                    }}
                  >
                    ★ {star} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Testimonials Grid */}
          {filteredReviews.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                {totalReviews === 0
                  ? 'Belum ada ulasan untuk layanan ini'
                  : `Tidak ada ulasan dengan rating ${selectedStar} bintang`}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 18px' }}>
                {totalReviews === 0
                  ? 'Jadilah pelanggan pertama yang memberikan ulasan setelah menyelesaikan pesanan tugasmu!'
                  : 'Pilih filter rating lain atau tampilkan seluruh ulasan.'}
              </p>
              {totalReviews > 0 && selectedStar > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelectedStar(0)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: 'var(--accent-green)',
                    color: '#04251a',
                    fontWeight: 600,
                    fontSize: '13px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Tampilkan Semua Ulasan
                </button>
              ) : (
                <Link
                  href={`/payment/?service=${service.slug}`}
                  style={{
                    display: 'inline-block',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: 'var(--accent-green)',
                    color: '#04251a',
                    fontWeight: 700,
                    fontSize: '13px'
                  }}
                >
                  Pesan Layanan Sekarang
                </Link>
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px'
              }}
            >
              {filteredReviews.map((rev) => (
                <TestimonialCard key={rev.id} review={rev} serviceName={service.name} />
              ))}
            </div>
          )}
        </section>
      </div>

      <Footer />
    </div>
  );
}
