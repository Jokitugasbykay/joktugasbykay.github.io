'use client';

import React from 'react';
import Link from 'next/link';
import { formatRupiah } from '@/lib/constants';
import type { Product } from '@/lib/types';

interface ProductCardProps {
  product: Product;
  onOrder?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

export default function ProductCard({ product, onOrder, onAddToCart }: ProductCardProps) {
  const diskon = Number(product.diskon_persen || 0);
  const hargaDasar = Number(product.harga_dasar || 0);
  const hargaAkhir = diskon > 0 ? Math.round(hargaDasar * (1 - diskon / 100)) : hargaDasar;
  const isSoldOut = Number(product.stok || 0) <= 0;
  const soldCount = product.sold_count ?? 80;

  return (
    <article
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        position: 'relative',
        transition: 'transform 0.2s, border-color 0.2s'
      }}
    >
      {product.is_limited_edition && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'var(--accent-yellow)',
            color: '#2b2100',
            fontSize: '10px',
            fontWeight: 800,
            padding: '3px 8px',
            borderRadius: '4px',
            letterSpacing: '0.05em'
          }}
        >
          LIMITED
        </div>
      )}

      {/* Category Tag */}
      <div
        style={{
          fontSize: '11px',
          fontWeight: 800,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em'
        }}
      >
        {product.kategori}
      </div>

      {/* Product Name */}
      <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
        {product.nama}
      </h3>

      {product.deskripsi && (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4, flexGrow: 1 }}>
          {product.deskripsi}
        </p>
      )}

      {/* Price & Stock Section */}
      <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-green)' }}>
            {formatRupiah(hargaAkhir)}
          </span>
          {diskon > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
              {formatRupiah(hargaDasar)}
            </span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '6px',
            fontSize: '12px',
            color: 'var(--text-muted)'
          }}
        >
          <span style={{ color: isSoldOut ? 'var(--danger)' : 'var(--text-muted)', fontWeight: isSoldOut ? 700 : 500 }}>
            {isSoldOut ? 'Stok Habis' : `Sisa ${product.stok} slot`}
          </span>
          <span style={{ fontWeight: 600 }}>{soldCount} terjual</span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            type="button"
            disabled={isSoldOut}
            onClick={() => onOrder && onOrder(product)}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: '10px',
              border: '1px solid var(--accent-green)',
              background: isSoldOut ? 'transparent' : 'var(--accent-green)',
              color: isSoldOut ? 'var(--text-muted)' : '#04251a',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isSoldOut ? 'not-allowed' : 'pointer',
              opacity: isSoldOut ? 0.45 : 1
            }}
          >
            {isSoldOut ? 'Habis' : 'Pesan'}
          </button>

          {onAddToCart && (
            <button
              type="button"
              disabled={isSoldOut}
              onClick={() => onAddToCart(product)}
              style={{
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'transparent',
                color: 'var(--text-main)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isSoldOut ? 'not-allowed' : 'pointer',
                opacity: isSoldOut ? 0.45 : 1
              }}
              title="Tambah ke Keranjang"
              aria-label="Tambah ke Keranjang"
            >
              +
            </button>
          )}
        </div>

        <div style={{ marginTop: '10px', textAlign: 'center' }}>
          <Link
            href={`/testimonials/${product.slug}/`}
            style={{
              fontSize: '11px',
              color: 'var(--accent-green)',
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            Lihat Testimoni Layanan
          </Link>
        </div>
      </div>
    </article>
  );
}
