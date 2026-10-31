import React from 'react';
import { ORDER_STEPS } from '@/data/catalog-data';
import styles from './storefront.module.css';

export default function StepsSection() {
  return (
    <section id="cara-pesan" className={styles.sectionContainer}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>4 Langkah Mudah Pesan Tugas</h2>
        <p className={styles.sectionDesc}>
          Proses pemesanan cepat, transparan, dan dapat dipantau langsung dari website.
        </p>
      </header>

      <div className={styles.stepsGrid}>
        {ORDER_STEPS.map((step) => (
          <div key={step.num} className={styles.stepCard}>
            <div className={styles.stepNum}>{step.num}</div>
            <h3 className={styles.stepTitle}>{step.title}</h3>
            <p className={styles.stepDesc}>{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
