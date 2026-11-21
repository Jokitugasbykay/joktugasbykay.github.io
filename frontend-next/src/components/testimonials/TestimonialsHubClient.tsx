'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import type { ServiceItem, ReviewItem } from '@/lib/testimonials';
import { ALL_SERVICES, ALL_REVIEWS } from '@/lib/testimonials';

export default function TestimonialsHubClient() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeCategory, setActiveCategory] = useState<string>('Semua');

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('jokiin_theme', next);
    } catch (_) {}
  };

  const categories = ['Semua', ...Array.from(new Set(ALL_SERVICES.map((s) => s.category || 'Lainnya')))];

  const serviceSummaries = ALL_SERVICES.map((service) => {
    const serviceReviews = ALL_REVIEWS.filter((r) => r.service_id === service.id);
    const count = serviceReviews.length;
    const avg = count > 0 ? (serviceReviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / count).toFixed(1) : '-';
    const latestReview = serviceReviews.length > 0 ? serviceReviews[0] : null;

    return {
      service,
      count,
      avg,
      latestReview
    };
  });

  const filteredSummaries = activeCategory === 'Semua'
    ? serviceSummaries
    : serviceSummaries.filter((s) => s.service.category === activeCategory);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '0 20px', flex: 1 }}>
        <Header theme={theme} onToggleTheme={toggleTheme} />

        <div style={{ margin: '20px 0 32px', textAlign: 'center' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'rgba(31, 209, 139, 0.12)',
              color: 'var(--accent-green)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Ulasan Terverifikasi
          </span>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-main)', marginTop: '10px', marginBottom: '8px' }}>
            Testimoni & Kepuasan Pelanggan JOKI.IN
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', maxWidth: '600px', margin: '0 auto' }}>
            Pilih layanan di bawah untuk melihat rincian ulasan, kepuasan, dan pengalaman nyata mahasiswa yang telah menyelesaikan tugas bersama kami.
          </p>
        </div>

        {/* Category Filter Chips */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '24px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '8px 16px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: activeCategory === cat ? 'var(--accent-green)' : 'var(--border-color)',
                background: activeCategory === cat ? 'var(--accent-green)' : 'var(--bg-card)',
                color: activeCategory === cat ? '#04251a' : 'var(--text-main)'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid of Service Testimonials */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px',
            marginBottom: '40px'
          }}
        >
          {filteredSummaries.map(({ service, count, avg, latestReview }) => (
            <div
              key={service.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--accent-green)',
                      textTransform: 'uppercase'
                    }}
                  >
                    {service.category}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                    <span style={{ color: 'var(--accent-yellow)' }}>★</span>
                    <span>{avg}</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({count})</span>
                  </div>
                </div>

                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                  {service.name}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '14px' }}>
                  {service.description || 'Layanan bantuan pengerjaan tugas akademik berkualitas.'}
                </p>

                {latestReview && (
                  <div
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '12px',
                      fontSize: '12px',
                      color: 'var(--text-main)',
                      lineHeight: '1.5',
                      fontStyle: 'italic'
                    }}
                  >
                    "{latestReview.comment.length > 90 ? latestReview.comment.slice(0, 87) + '...' : latestReview.comment}"
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Link
                  href={`/testimonials/${service.slug}/`}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--accent-green)',
                    background: 'transparent',
                    color: 'var(--accent-green)',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  Lihat {count} Ulasan
                </Link>
                <Link
                  href={`/payment/?service=${service.slug}`}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--accent-green)',
                    color: '#04251a',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  Pesan
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
