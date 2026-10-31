'use client';

import React from 'react';

interface HomeBannerProps {
  onSwitchTab: (tab: string) => void;
  onConsultWA: () => void;
}

export default function HomeBanner({ onSwitchTab, onConsultWA }: HomeBannerProps) {
  return (
    <>
      <section className="home-banner" aria-labelledby="home-banner-title" draggable="true">
        <img
          className="home-banner__photo home-banner__photo--light"
          src="assets/hero-jokiin-study.webp?v=20261003-mintwhite"
          alt=""
          width={1942}
          height={809}
        />
        <img
          className="home-banner__photo home-banner__photo--dark"
          src="assets/hero-jokiin-study-dark.webp"
          alt=""
          width={1942}
          height={809}
        />
        <div className="home-banner__content">
          <h1 id="home-banner-title">
            Tugas Kamu,<br />Serahkan ke <span>JOKI.IN</span>
          </h1>
          <p className="home-banner__description">
            Solusi tugas kuliah yang aman, cepat, dan berkualitas. Fokus pada hal penting, biar kami yang bantu selesaikan.
          </p>
          <div className="home-banner__actions">
            <button type="button" onClick={() => onSwitchTab('layanan')}>
              Lihat Layanan
            </button>
            <button type="button" onClick={onConsultWA}>
              Konsultasi via WhatsApp
            </button>
          </div>
          <div className="home-banner__stats">
            <span><strong>500+</strong> Pesanan Selesai</span>
            <span><strong data-user-rating>4.5/5</strong> Rating Pengguna</span>
            <span><strong>100%</strong> Privasi Terjaga</span>
            <span><strong>24/7</strong> Siap Membantu</span>
          </div>
        </div>
      </section>

      <div className="hero-box home-hero-mobile">
        <div className="hero-content">
          <h2>
            Tugas Kamu,<br />Serahkan ke <span>JOKI.IN</span>
          </h2>
          <p>
            Solusi tugas kuliah yang aman, cepat, dan berkualitas. Fokus pada hal penting, biar kami yang bantu selesaikan.
          </p>
          <div className="hero-actions">
            <button className="btn-outline" onClick={() => onSwitchTab('layanan')}>
              Lihat Layanan
            </button>
            <button className="btn-wa" onClick={onConsultWA}>
              Konsultasi via WhatsApp
            </button>
          </div>
        </div>
        <div className="hero-stats">
          <span><strong>500+</strong> Pesanan Selesai</span>
          <span><strong data-user-rating>4.5/5</strong> Rating Pengguna</span>
          <span><strong>100%</strong> Privasi Terjaga</span>
          <span><strong>24/7</strong> Siap Membantu</span>
        </div>
      </div>
    </>
  );
}
