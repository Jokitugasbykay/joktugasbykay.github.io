'use client';

import React from 'react';
import type { CatalogProduct } from '@/types/catalog';

interface PopularServicesProps {
  products: CatalogProduct[];
  onSelectProduct: (p: CatalogProduct) => void;
  onViewAll: () => void;
}

export default function PopularServices({ products, onSelectProduct, onViewAll }: PopularServicesProps) {
  // Top 4 popular services
  const popular = products.slice(0, 4);

  return (
    <>
      <div className="popular-title-row">
        <div>
          <span className="section-subtitle">Layanan Populer</span>
          <h3 className="section-title">Pilihan mahasiswa setiap hari</h3>
        </div>
        <a
          href="#layanan"
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.preventDefault();
            onViewAll();
          }}
        >
          Lihat Semua Layanan
        </a>
      </div>

      <div className="services-grid popular-grid" id="preview-layanan">
        {popular.map((prod) => (
          <div
            key={prod.id}
            className="service-card"
            data-price={prod.price}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectProduct(prod)}
          >
            <div className="service-icon">{prod.icon || '📄'}</div>
            <h3>{prod.title}</h3>
            <span className="category-badge">{prod.category}</span>
            <p>{prod.desc}</p>
            <button
              className="btn-outline"
              type="button"
              style={{
                width: '100%',
                border: 'none',
                padding: 0,
                textAlign: 'left',
                justifyContent: 'flex-start',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectProduct(prod);
              }}
            >
              Lihat Detail
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
