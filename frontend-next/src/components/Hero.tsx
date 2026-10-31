import React from 'react';
import styles from './storefront.module.css';

export default function Hero() {
  return (
    <section className={styles.heroSection}>
      <div className={styles.heroBadge}>
        GARANSI REVISI & KERAHASIAAN TERJAGA 100%
      </div>
      <h1 className={styles.heroTitle}>
        JOKI.IN, Teman Tugas Mahasiswa <br />
        <span className={styles.heroHighlight}>Solusi Akademik Cepat & Berkualitas</span>
      </h1>
      <p className={styles.heroDesc}>
        Dikerjakan oleh tim ahli akademik berpengalaman untuk mendampingi penyusunan makalah, tugas kuliah, coding, skripsi, olah data, dan desain presentasi secara profesional.
      </p>

      <div className={styles.heroCtaGroup}>
        <a href="#katalog" className={styles.primaryCta}>
          Lihat Katalog Layanan
        </a>
        <a
          href="https://wa.me/601155639233?text=Halo%20Admin%20JOKI.IN%2C%20saya%20mau%20konsultasi%20tugas"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.secondaryCta}
        >
          Konsultasi WhatsApp
        </a>
      </div>

      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <div className={styles.statValue}>4.9 / 5.0</div>
          <div className={styles.statLabel}>Rating Kepuasan Mahasiswa</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>5.000+</div>
          <div className={styles.statLabel}>Pesanan Tugas Selesai</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>100%</div>
          <div className={styles.statLabel}>Tepat Waktu & Amanah</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>No Repo</div>
          <div className={styles.statLabel}>Cek Turnitin Aman Tanpa Tersimpan</div>
        </div>
      </div>
    </section>
  );
}
