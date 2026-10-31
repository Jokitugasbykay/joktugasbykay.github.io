'use client';

import React from 'react';

interface GlobalFooterProps {
  onSwitchTab?: (tab: string) => void;
}

export default function GlobalFooter({ onSwitchTab }: GlobalFooterProps) {
  const openWhatsApp = (num: string, text: string) => {
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <footer id="globalFooter">
      <div className="footer-container">
        <div className="footer-grid">
          {/* Kolom 1: Brand */}
          <div className="footer-col">
            <a
              href="/"
              aria-label="Beranda JOKI.IN"
              style={{
                display: 'inline-flex',
                maxWidth: '100%',
                marginBottom: '12px',
                transform: 'translateX(-12px)'
              }}
            >
              <img
                className="header-brand-lockup header-brand-light"
                src="/assets/brand-light-lockup.png?v=20261001-wordmark"
                alt="JOKI.IN"
                draggable={false}
                style={{ height: '66px', maxWidth: '100%', objectFit: 'contain' }}
              />
              <img
                className="header-brand-lockup header-brand-dark"
                src="/assets/brand-dark-lockup.png?v=20261001-wordmark"
                alt="JOKI.IN"
                draggable={false}
                style={{ height: '66px', maxWidth: '100%', objectFit: 'contain' }}
              />
            </a>
            <div className="tagline">Teman Tugas Mahasiswa</div>
            <p>
              JOKI.IN membantu kamu menyelesaikan berbagai kebutuhan tugas akademik dengan proses mudah,
              cepat, dan terpercaya.
            </p>

            <div className="footer-title" style={{ marginTop: '25px', marginBottom: '15px', fontSize: '0.9em' }}>
              Hubungi Admin Kami
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a
                href="#wa-admin1"
                className="footer-admin-card"
                onClick={(e) => {
                  e.preventDefault();
                  openWhatsApp('6282245046266', 'Halo Admin 1, saya butuh bantuan tugas.');
                }}
              >
                <div className="footer-admin-icon">
                  <img src="/assets/whatsapp-help.webp" alt="WhatsApp" />
                </div>
                <div className="footer-admin-info">
                  <h4>Admin 1</h4>
                  <p>+62 822-4504-6266</p>
                </div>
              </a>
              <a
                href="#wa-admin2"
                className="footer-admin-card"
                onClick={(e) => {
                  e.preventDefault();
                  openWhatsApp('601155639233', 'Halo Admin 2, saya butuh bantuan tugas.');
                }}
              >
                <div className="footer-admin-icon">
                  <img src="/assets/whatsapp-help.webp" alt="WhatsApp" />
                </div>
                <div className="footer-admin-info">
                  <h4>Admin 2</h4>
                  <p>+60 11-5563-9233</p>
                </div>
              </a>
              <a
                href="#wa-admin3"
                className="footer-admin-card"
                onClick={(e) => {
                  e.preventDefault();
                  openWhatsApp('6289620750316', 'Halo Admin 3, saya butuh bantuan tugas.');
                }}
              >
                <div className="footer-admin-icon">
                  <img src="/assets/whatsapp-help.webp" alt="WhatsApp" />
                </div>
                <div className="footer-admin-info">
                  <h4>Admin 3</h4>
                  <p>+62 896-2075-0316</p>
                </div>
              </a>
            </div>

            <div className="social-btn-group" style={{ marginTop: '20px' }}>
              <a
                href="https://www.instagram.com/allaboutjoki.in?stkn=MWhoNXozOTh3enpubg=="
                className="social-btn"
                target="_blank"
                rel="noopener noreferrer"
                title="Instagram"
              >
                <img src="/assets/icon/instagram-logo.webp" alt="Instagram" />
              </a>
              <a
                href="https://www.tiktok.com/@jokiintugasmahasiswa?_r=1&_t=ZS-99m1BX7I0w9"
                className="social-btn"
                target="_blank"
                rel="noopener noreferrer"
                title="TikTok"
              >
                <img src="/assets/icon/tiktok icon.png" alt="TikTok" />
              </a>
            </div>
          </div>

          {/* Kolom 2: Layanan */}
          <div className="footer-col">
            <div className="footer-title">Layanan</div>
            <ul className="footer-list">
              <li>
                <a
                  href="#layanan"
                  onClick={(e) => {
                    e.preventDefault();
                    onSwitchTab?.('layanan');
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>{' '}
                  Joki Tugas
                </a>
              </li>
              <li>
                <a
                  href="#makalah"
                  onClick={(e) => {
                    e.preventDefault();
                    onSwitchTab?.('layanan');
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>{' '}
                  Makalah
                </a>
              </li>
              <li>
                <a
                  href="#ppt"
                  onClick={(e) => {
                    e.preventDefault();
                    onSwitchTab?.('layanan');
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>{' '}
                  PPT / Presentasi
                </a>
              </li>
              <li>
                <a
                  href="#desain"
                  onClick={(e) => {
                    e.preventDefault();
                    onSwitchTab?.('layanan');
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>{' '}
                  Desain Tugas
                </a>
              </li>
              <li>
                <a
                  href="#editing"
                  onClick={(e) => {
                    e.preventDefault();
                    onSwitchTab?.('layanan');
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>{' '}
                  Editing & Formatting
                </a>
              </li>
              <li>
                <a
                  href="#artikel"
                  onClick={(e) => {
                    e.preventDefault();
                    onSwitchTab?.('layanan');
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>{' '}
                  Artikel & Essay
                </a>
              </li>
              <li>
                <a
                  href="#konsultasi"
                  onClick={(e) => {
                    e.preventDefault();
                    openWhatsApp('601155639233', 'Halo Admin, saya mau konsultasi tugas.');
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>{' '}
                  Konsultasi Tugas
                </a>
              </li>
            </ul>
          </div>

          {/* Kolom 3: Bantuan */}
          <div className="footer-col">
            <div className="footer-title">Bantuan</div>
            <ul className="footer-list">
              <li>
                <a
                  href="#carapesan"
                  onClick={(e) => {
                    e.preventDefault();
                    onSwitchTab?.('carapesan');
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>{' '}
                  Cara Order
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  onClick={(e) => {
                    e.preventDefault();
                    onSwitchTab?.('bantuan');
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>{' '}
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="#hubungi"
                  onClick={(e) => {
                    e.preventDefault();
                    openWhatsApp('601155639233', 'Halo Admin JOKI.IN, saya butuh bantuan.');
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>{' '}
                  Hubungi Kami
                </a>
              </li>
              <li>
                <a
                  href="#panduan"
                  onClick={(e) => {
                    e.preventDefault();
                    onSwitchTab?.('carapesan');
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>{' '}
                  Panduan Pemesanan
                </a>
              </li>
              <li>
                <a
                  href="#revisi"
                  onClick={(e) => {
                    e.preventDefault();
                    onSwitchTab?.('bantuan');
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>{' '}
                  Kebijakan Revisi
                </a>
              </li>
            </ul>
          </div>

          {/* Kolom 4: Tentang JOKI.IN */}
          <div className="footer-col">
            <div className="footer-title">Tentang JOKI.IN</div>
            <ul className="footer-list">
              <li>
                <a href="/information/">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>{' '}
                  Pusat Informasi
                </a>
              </li>
              <li>
                <a href="/information/#info-why">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>{' '}
                  Mengapa JOKI.IN?
                </a>
              </li>
              <li>
                <a href="/information/#info-revision">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>{' '}
                  Garansi & Revisi
                </a>
              </li>
              <li>
                <a href="/information/#info-terms">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>{' '}
                  Syarat & Ketentuan
                </a>
              </li>
              <li>
                <a href="/information/#info-privacy">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>{' '}
                  Kebijakan Privasi
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <div>© 2026 JOKI.IN. All rights reserved.</div>
          <div className="footer-legal-links">
            <a href="/information/#info-terms">Syarat & Ketentuan</a>
            <a href="/information/#info-privacy">Kebijakan Privasi</a>
          </div>
          <div className="system-status">
            <span className="status-dot"></span> Sistem berjalan normal
          </div>
        </div>
      </div>
    </footer>
  );
}
