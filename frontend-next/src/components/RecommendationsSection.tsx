'use client';

import React, { useState, useEffect } from 'react';
import type { CatalogProduct } from '@/types/catalog';

interface RecommendationsProps {
  products: CatalogProduct[];
  onSelectProduct: (p: CatalogProduct) => void;
}

export default function RecommendationsSection({ products, onSelectProduct }: RecommendationsProps) {
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  const total = products.length;

  // Auto slide every 4 seconds unless reduced motion
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const timer = setInterval(() => {
      setRecommendationIndex((prev) => (prev + 1) % total);
    }, 4000);
    return () => clearInterval(timer);
  }, [total]);

  const getCardClass = (index: number) => {
    const delta = (index - recommendationIndex + total) % total;
    let cls = 'recommendation-card';
    if (delta === 0) cls += ' is-featured';
    else if (delta === 1) cls += ' is-next';
    else if (delta === total - 1) cls += ' is-prev';
    else if (delta === 2) cls += ' is-far-next';
    else if (delta === total - 2) cls += ' is-far-prev';
    return cls;
  };

  return (
    <section className="recommendations-section" aria-labelledby="recommendationsTitle">
      <div className="recommendations-heading">
        <div>
          <span className="section-subtitle">Pilihan untuk kamu</span>
          <h3 className="section-title" id="recommendationsTitle">Rekomendasi Produk</h3>
        </div>
      </div>
      <div className="recommendation-viewport" id="recommendationViewport">
        <div className="recommendation-track" id="recommendationTrack">
          {products.map((product, index) => (
            <article key={product.id} className={getCardClass(index)}>
              {product.image ? (
                <img
                  className="recommendation-card-image"
                  src={product.image}
                  alt={product.title}
                  loading="lazy"
                />
              ) : (
                <div className="recommendation-card-image service-icon" aria-hidden="true">
                  {product.icon || '📄'}
                </div>
              )}
              <div className="recommendation-card-body">
                <span className="category-badge">{product.category}</span>
                <h4>{product.title}</h4>
                <p>{product.desc}</p>
                <div className="recommendation-card-footer">
                  <span className="recommendation-card-price">{product.price}</span>
                  <button
                    className="btn-header recommendation-order"
                    type="button"
                    onClick={() => onSelectProduct(product)}
                  >
                    Pilih
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="recommendation-dots" id="recommendationDots" aria-label="Halaman rekomendasi">
        {products.map((_, index) => (
          <button
            key={index}
            className={`recommendation-dot ${index === recommendationIndex ? 'active' : ''}`}
            type="button"
            aria-label={`Buka rekomendasi ${index + 1}`}
            onClick={() => setRecommendationIndex(index)}
          ></button>
        ))}
      </div>
    </section>
  );
}
