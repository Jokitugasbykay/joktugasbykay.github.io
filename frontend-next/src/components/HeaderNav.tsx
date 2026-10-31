'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function HeaderNav() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let initial: 'light' | 'dark' = prefersDark ? 'dark' : 'light';
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') initial = saved;
    } catch (_) {}
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  // When on root storefront (/), official storefront Navbar is used instead
  if (pathname === '/') {
    return null;
  }

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    try { localStorage.setItem('theme', nextTheme); } catch (_) {}
  };

  const tooltipLabel = theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap';

  return (
    <header className="site-header">
      <a href="/" className="header-brand" aria-label="Kembali ke Beranda JOKI.IN">
        <img
          src="/assets/brand-light-lockup.png"
          alt="JOKI.IN"
          className="brand-logo-img brand-light"
          width="150"
          height="38"
        />
        <img
          src="/assets/brand-dark-lockup.png"
          alt="JOKI.IN"
          className="brand-logo-img brand-dark"
          width="150"
          height="38"
          style={{ display: 'none' }}
        />
      </a>
      <nav className="header-nav" aria-label="Navigasi Header">
        <a href="/" className="nav-link">
          Kembali ke Storefront
        </a>
        <div className="theme-toggle-wrapper">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={tooltipLabel}
          >
            {theme === 'dark' ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <span className="theme-tooltip" role="tooltip" aria-hidden="true">
            {tooltipLabel}
          </span>
        </div>
      </nav>
    </header>
  );
}
