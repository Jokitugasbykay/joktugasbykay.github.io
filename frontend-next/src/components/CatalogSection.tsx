'use client';

import React, { useState } from 'react';
import { CATEGORIES, PRODUCTS } from '@/data/catalog-data';
import type { CatalogProduct } from '@/types/catalog';
import OrderModal from './OrderModal';
import styles from './storefront.module.css';

export default function CatalogSection() {
  const [selectedCategory, setSelectedCategory] = useState('semua');
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);

  const filteredProducts =
    selectedCategory === 'semua'
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === selectedCategory);

  return (
    <section id="katalog" className={styles.sectionContainer}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Katalog Layanan Akademik</h2>
        <p className={styles.sectionDesc}>
          Pilih jenis tugas yang ingin kamu konsultasikan atau pesan dengan transparan dan terpercaya.
        </p>
      </header>

      {/* Category Chips */}
      <div className={styles.categoryChips} role="tablist" aria-label="Kategori Layanan">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`${styles.chip} ${selectedCategory === cat.id ? styles.chipActive : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
            role="tab"
            aria-selected={selectedCategory === cat.id}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className={styles.productsGrid}>
        {filteredProducts.map((prod) => (
          <article key={prod.id} className={styles.productCard}>
            <div className={styles.cardImgWrap}>
              <img
                src={prod.image}
                alt={prod.title}
                className={styles.cardImg}
                loading="lazy"
              />
              <span className={styles.badgeCategory}>{prod.category}</span>
            </div>

            <div className={styles.cardBody}>
              <h3 className={styles.cardTitle}>{prod.title}</h3>
              <p className={styles.cardDesc}>{prod.desc}</p>

              <ul className={styles.benefitsList}>
                {prod.benefits.map((b, idx) => (
                  <li key={idx} className={styles.benefitItem}>
                    <span className={styles.benefitDot}>✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className={styles.cardFooter}>
                <div>
                  <div className={styles.priceLabel}>Biaya Layanan</div>
                  <div className={styles.priceVal}>{prod.price}</div>
                </div>
                <button
                  type="button"
                  className={styles.orderBtn}
                  onClick={() => setSelectedProduct(prod)}
                >
                  Pesan Sekarang
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Interactive Order Modal */}
      {selectedProduct && (
        <OrderModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </section>
  );
}
