'use client';

import React from 'react';
import ProductCard from './ProductCard';
import type { Product } from '@/lib/types';

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  onOrder?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

export default function ProductGrid({
  products,
  loading = false,
  onOrder,
  onAddToCart
}: ProductGridProps) {
  if (loading) {
    return (
      <div
        style={{
          padding: '60px 0',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '14px'
        }}
      >
        Memuat daftar katalog layanan...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div
        style={{
          padding: '48px 0',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '14px',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)'
        }}
      >
        Tidak ada produk pada kategori ini.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '20px'
      }}
    >
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onOrder={onOrder}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}
