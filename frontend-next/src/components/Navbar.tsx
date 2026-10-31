'use client';

import React, { useState, useEffect } from 'react';
import styles from './storefront.module.css';

export default function Navbar() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    let currentTheme: 'light' | 'dark' = 'light';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    try {
      const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (saved === 'light' || saved === 'dark') {
        currentTheme = saved;
      } else {
        currentTheme = prefersDark ? 'dark' : 'light';
      }
    } catch {
      currentTheme = prefersDark ? 'dark' : 'light';
    }
    setTheme(currentTheme);
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Ignored
    }
  };

  return (
    <nav className={styles.navContainer} aria-label="Navigasi Utama">
      <a href="/" className={styles.brandLink} aria-label="Beranda JOKI.IN">
        <img
          src="/assets/brand-light-lockup.png"
          alt="JOKI.IN"
          width="135"
          height="34"
          className={styles.brandLight}
        />
        <img
          src="/assets/brand-dark-lockup.png"
          alt="JOKI.IN"
          width="135"
          height="34"
          className={styles.brandDark}
        />
      </a>

      <div className={styles.navLinks}>
        <a href="#katalog" className={styles.navLink}>Layanan</a>
        <a href="#cara-pesan" className={styles.navLink}>Cara Pesan</a>
        <a href="#testimoni" className={styles.navLink}>Ulasan</a>
        <a href="/information/" className={styles.navLink}>Pusat Informasi</a>
      </div>

      <div className={styles.navActions}>
        <button
          type="button"
          onClick={toggleTheme}
          className={styles.loginBtn}
          aria-label={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          style={{ cursor: 'pointer', padding: '8px 12px' }}
        >
          {theme === 'dark' ? 'Terang' : 'Gelap'}
        </button>
        <a href="/login/" className={styles.loginBtn}>Masuk</a>
      </div>
    </nav>
  );
}
