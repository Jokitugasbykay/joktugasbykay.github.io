import React from 'react';
import { REVIEWS } from '@/data/catalog-data';
import styles from './storefront.module.css';

export default function TestimonialsSection() {
  return (
    <section id="testimoni" className={styles.sectionContainer}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Apa Kata Mahasiswa?</h2>
        <p className={styles.sectionDesc}>
          Ulasan jujur dari mahasiswa berbagai perguruan tinggi yang telah mempercayakan tugasnya kepada JOKI.IN.
        </p>
      </header>

      <div className={styles.reviewsGrid}>
        {REVIEWS.map((rev) => (
          <article key={rev.id} className={styles.reviewCard}>
            <div className={styles.reviewHead}>
              <span className={styles.reviewerName}>{rev.name}</span>
              <span className={styles.reviewDate}>{rev.date}</span>
            </div>
            <div className={styles.reviewService}>{rev.service} • {rev.university}</div>
            <div className={styles.starRating} aria-label={`Rating ${rev.rating} dari 5 bintang`}>
              {'★'.repeat(rev.rating)}
            </div>
            <p className={styles.reviewText}>&ldquo;{rev.review}&rdquo;</p>
          </article>
        ))}
      </div>
    </section>
  );
}
