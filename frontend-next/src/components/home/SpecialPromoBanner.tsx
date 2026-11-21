'use client';

import React, { useState, useEffect } from 'react';
import { formatRupiah } from '@/lib/constants';
import type { PromoResponse, Product } from '@/lib/types';

interface SpecialPromoBannerProps {
  promo: PromoResponse | null;
  product?: Product | null;
  onBuyNow?: () => void;
  onAddToCart?: () => void;
  onExpire?: () => void;
}

export default function SpecialPromoBanner({
  promo,
  product,
  onBuyNow,
  onAddToCart,
  onExpire
}: SpecialPromoBannerProps) {
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    if (!promo || !promo.penawaran_spesial_aktif || !promo.promo_deadline) {
      setIsExpired(true);
      return;
    }

    const serverNow = promo.server_time ? Date.parse(promo.server_time) : Date.now();
    const localNow = Date.now();
    const skew = Number.isFinite(serverNow) ? serverNow - localNow : 0;
    const target = Date.parse(promo.promo_deadline);

    if (!Number.isFinite(target)) {
      setIsExpired(true);
      return;
    }

    function updateCountdown(): boolean {
      const current = Date.now() + skew;
      const diff = target - current;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (onExpire) onExpire();
        return false;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setIsExpired(false);
      setTimeLeft({ days, hours, minutes, seconds });
      return true;
    }

    const validAtStart = updateCountdown();
    if (!validAtStart) return;

    const timer = setInterval(() => {
      const active = updateCountdown();
      if (!active) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [promo, onExpire]);

  // Strict visibility guards: promo must be active, not expired, product must exist, be active and in-stock
  if (
    !promo ||
    !promo.penawaran_spesial_aktif ||
    isExpired ||
    !product ||
    !product.is_active ||
    (typeof product.stok === 'number' && product.stok <= 0)
  ) {
    return null;
  }

  const pad = (n: number) => String(n).padStart(2, '0');

  // Dynamic pricing calculations
  const originalPrice = Number(product.harga_dasar || 0);
  const discountPercent = Number(product.diskon_persen || 0);
  const finalPrice = discountPercent > 0
    ? Math.round(originalPrice * (1 - discountPercent / 100))
    : originalPrice;

  // Dynamic description items
  const descriptionPoints = product.deskripsi
    ? product.deskripsi.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean)
    : [];

  // Dynamic stock & sold calculations
  const stockVal = typeof product.stok === 'number' ? product.stok : 0;
  const soldVal = typeof product.sold_count === 'number' ? product.sold_count : 0;
  const totalBase = stockVal + soldVal > 0 ? (stockVal + soldVal) : 20;
  const progressPercent = Math.min(100, Math.max(5, Math.round((soldVal / totalBase) * 100)));

  return (
    <section style={{ margin: '24px 0 36px' }} aria-label="Penawaran Spesial">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
        <div>
          <span
            style={{
              display: 'inline-block',
              background: 'var(--accent-yellow)',
              color: '#2b2100',
              fontWeight: 800,
              fontSize: '11px',
              letterSpacing: '0.08em',
              padding: '4px 12px',
              borderRadius: '999px'
            }}
          >
            PROMO TERBATAS
          </span>
          <h2 style={{ margin: '8px 0 0', fontSize: '26px', fontWeight: 800, lineHeight: 1.2 }}>
            {promo.promo_judul || 'Penawaran Spesial Minggu Ini'}
          </h2>
        </div>

        {/* Countdown Blocks */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            ...(timeLeft.days > 0 ? [{ label: 'HARI', val: pad(timeLeft.days) }] : []),
            { label: 'JAM', val: pad(timeLeft.hours) },
            { label: 'MENIT', val: pad(timeLeft.minutes) },
            { label: 'DETIK', val: pad(timeLeft.seconds) }
          ].map(item => (
            <div
              key={item.label}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '6px 10px',
                textAlign: 'center',
                minWidth: '56px'
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-yellow)', fontVariantNumeric: 'tabular-nums' }}>
                {item.val}
              </div>
              <small style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>{item.label}</small>
            </div>
          ))}
        </div>
      </div>

      {/* Main Promo Card */}
      <div className="promo-lim">
        <div
          style={{
            position: 'relative',
            borderRadius: '19px',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            padding: '24px',
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap',
            zIndex: 1
          }}
        >
          {/* Visual Left */}
          <div
            style={{
              flex: '1 1 300px',
              minHeight: '200px',
              borderRadius: '16px',
              background: product.gambar_url
                ? `url(${product.gambar_url}) center / cover no-repeat`
                : 'linear-gradient(135deg, #1b3b8f, #6a4bd8 55%, #1fd18b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '28px',
              textAlign: 'center',
              lineHeight: 1.15,
              color: '#ffffff',
              padding: '20px'
            }}
          >
            {!product.gambar_url && product.nama}
          </div>

          {/* Info Right */}
          <div style={{ flex: '2 1 340px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>{product.nama}</h3>
            {descriptionPoints.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6 }}>
                {descriptionPoints.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
            )}

            <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-green)' }}>
                  {formatRupiah(finalPrice)}
                </span>
                {discountPercent > 0 && (
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                    {formatRupiah(originalPrice)}
                  </span>
                )}
              </div>

              {/* Progress Slot & Sold Info */}
              <div style={{ margin: '8px 0 12px' }}>
                <div style={{ height: '8px', borderRadius: '8px', background: 'var(--border-color)', overflow: 'hidden' }}>
                  <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #ffd54a, #1fd18b)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>Sisa: {stockVal} slot</span>
                  <span style={{ fontWeight: 600 }}>{soldVal} terjual</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={onBuyNow}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid var(--accent-green)',
                    background: 'var(--accent-green)',
                    color: '#04251a',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Beli Sekarang
                </button>
                <button
                  type="button"
                  onClick={onAddToCart}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--accent-green)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Tambah ke Keranjang
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
